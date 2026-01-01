import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, subDays } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorUtils";
import { FishingAreaSelect } from "@/components/FishingAreaSelect";
import { getPersonalizedFishTypeOptions, fishPrioritiesByStyle } from "@/utils/fishTypeMapping";

import { 
  Calendar as CalendarIcon, 
  Clock,
  Camera,
  X,
  Loader2,
  History,
  AlertCircle,
  Fish
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";

// Historical catch form validation schema
const historicalCatchFormSchema = z.object({
  capturedAt: z.date({ required_error: "Dátum úlovku je povinný" }).refine(
    (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    },
    { message: "Historický úlovok musí byť z minulosti (nie dnešný ani budúci dátum)" }
  ),
  capturedTime: z.string().optional(),
  weight: z.string().min(1, "Váha je povinná").refine((val) => {
    const weight = parseFloat(val);
    return !isNaN(weight) && weight > 0;
  }, { message: "Váha musí byť väčšia ako 0" }),
  lengthCm: z.union([
    z.literal("").transform(() => undefined),
    z.coerce.number().positive("Dĺžka musí byť kladné číslo")
  ]).optional(),
  fishType: z.string().min(1, "Druh ryby je povinný"),
  spot: z.string().min(1, "Revír/lokalita je povinná"),
  notes: z.string().optional(),
});

type HistoricalCatchFormData = z.infer<typeof historicalCatchFormSchema>;

interface HistoricalCatchFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function HistoricalCatchFormDialog({ isOpen, onClose, onSuccess }: HistoricalCatchFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  // Get personalized fish options based on user's fishing style preference
  const userFishingStyle = (user as any)?.preferences?.fishingStyle || null;
  const fishOptions = getPersonalizedFishTypeOptions(userFishingStyle);
  const hasPriorityFish = 'priorityOptions' in fishOptions;

  // Get default fish type based on user's fishing style
  const getDefaultFishType = () => {
    if (userFishingStyle && fishPrioritiesByStyle[userFishingStyle]) {
      return fishPrioritiesByStyle[userFishingStyle][0] || "kapor_rybnicny";
    }
    return "kapor_supinac";
  };

  const form = useForm<HistoricalCatchFormData>({
    resolver: zodResolver(historicalCatchFormSchema),
    defaultValues: {
      capturedAt: subDays(new Date(), 7), // Default to 7 days ago
      capturedTime: "",
      weight: "",
      fishType: getDefaultFishType(),
      spot: "",
      notes: ""
    }
  });

  const watchedFishType = form.watch("fishType");
  const isCatfish = watchedFishType === "sumec" || watchedFishType === "sumec_velky";

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        capturedAt: subDays(new Date(), 7),
        capturedTime: "",
        weight: "",
        fishType: getDefaultFishType(),
        spot: "",
        notes: ""
      });
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
    }
  }, [isOpen, form]);

  // Create historical catch mutation
  const createHistoricalCatchMutation = useMutation({
    mutationFn: async (data: HistoricalCatchFormData) => {
      // Combine date and time if provided
      let capturedAt = new Date(data.capturedAt);
      if (data.capturedTime) {
        const [hours, minutes] = data.capturedTime.split(':').map(Number);
        capturedAt.setHours(hours, minutes, 0, 0);
      }

      const formData = new FormData();
      formData.append('capturedAt', capturedAt.toISOString());
      formData.append('weight', data.weight);
      formData.append('fishType', data.fishType);
      formData.append('spot', data.spot);
      formData.append('isHistorical', 'true'); // Mark as historical
      
      if (data.lengthCm) {
        formData.append('lengthCm', data.lengthCm.toString());
      }
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      // Add photos
      selectedPhotos.forEach(photo => {
        formData.append('photos', photo);
      });

      const response = await fetch("/api/diary/catches/historical", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Chyba pri ukladaní");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      toast({
        title: "🕰️ Historický úlovok uložený",
        description: "Váš starší úlovok bol pridaný do archívu.",
        variant: "success" as any,
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'catch');
    }
  });

  const handleClose = () => {
    form.reset();
    setSelectedPhotos([]);
    setPhotoPreviewUrls([]);
    onClose();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedPhotos(prev => [...prev, ...files]);
      
      // Create preview URLs
      const newUrls = files.map(file => URL.createObjectURL(file));
      setPhotoPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = (data: HistoricalCatchFormData) => {
    createHistoricalCatchMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-amber-500/30 border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <span className="text-2xl">🕰️</span>
            <span>Pridať historický úlovok</span>
          </DialogTitle>
          <DialogDescription className="text-amber-400/80">
            Použi len na úlovky z minulosti
          </DialogDescription>
        </DialogHeader>

        {/* Info Alert */}
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-200 text-sm">
            Tento úlovok sa uloží ako historický a <strong>nebude započítaný</strong> do súťaží, 
            súbojov, štatistík ani odznakov. Slúži len ako osobný archív spomienok.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date Field - Required */}
            <FormField
              control={form.control}
              name="capturedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-white">
                    Dátum úlovku <span className="text-amber-500">*</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-slate-800 border-slate-600 hover:bg-slate-700",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="input-historical-date"
                        >
                          {field.value ? (
                            format(field.value, "d. MMMM yyyy", { locale: sk })
                          ) : (
                            <span>Vyber dátum</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date >= today;
                        }}
                        initialFocus
                        locale={sk}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fish Type - Required */}
            <FormField
              control={form.control}
              name="fishType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">
                    Druh ryby <span className="text-amber-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-historical-fish-type">
                        <SelectValue placeholder="Vyber druh ryby" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-800 border-slate-600 max-h-60">
                      {hasPriorityFish && (
                        <>
                          {(fishOptions as any).priorityOptions.map((fish: { value: string; label: string }) => (
                            <SelectItem key={fish.value} value={fish.value} className="text-white">
                              {fish.label}
                            </SelectItem>
                          ))}
                          <SelectSeparator />
                        </>
                      )}
                      {(hasPriorityFish ? (fishOptions as any).otherOptions : fishOptions).map((fish: { value: string; label: string }) => (
                        <SelectItem key={fish.value} value={fish.value} className="text-white">
                          {fish.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location/Spot - Required */}
            <FormField
              control={form.control}
              name="spot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">
                    Revír / Lokalita <span className="text-amber-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Napr. VN Orava, Dunaj - Bratislava" 
                      className="bg-slate-800 border-slate-600 text-white"
                      data-testid="input-historical-spot"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Weight - Required */}
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">
                    Váha (kg) <span className="text-amber-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      step="0.1" 
                      min="0.1"
                      placeholder="0.0" 
                      className="bg-slate-800 border-slate-600 text-white"
                      data-testid="input-historical-weight"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Length - Optional (highlighted for catfish) */}
            <FormField
              control={form.control}
              name="lengthCm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-white flex items-center gap-2",
                    isCatfish && "text-amber-400 font-semibold"
                  )}>
                    Dĺžka (cm)
                    {isCatfish && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                        Odporúčané pre sumca
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      type="number" 
                      min="1"
                      placeholder="0" 
                      className={cn(
                        "bg-slate-800 border-slate-600 text-white",
                        isCatfish && "border-amber-500/50 ring-1 ring-amber-500/30"
                      )}
                      data-testid="input-historical-length"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time - Optional */}
            <FormField
              control={form.control}
              name="capturedTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Čas úlovku (voliteľné)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="time" 
                      className="bg-slate-800 border-slate-600 text-white"
                      data-testid="input-historical-time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes - Optional */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Poznámka (voliteľné)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Krátka poznámka k úlovku..." 
                      className="bg-slate-800 border-slate-600 text-white resize-none"
                      rows={3}
                      data-testid="input-historical-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload - Optional */}
            <div className="space-y-2">
              <FormLabel className="text-white">Fotografia (voliteľné)</FormLabel>
              
              {photoPreviewUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <label className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors">
                <Camera className="w-5 h-5 text-slate-400" />
                <span className="text-slate-400 text-sm">Pridať fotku</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  data-testid="input-historical-photo"
                />
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                disabled={createHistoricalCatchMutation.isPending}
                data-testid="button-submit-historical-catch"
              >
                {createHistoricalCatchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ukladám...
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4 mr-2" />
                    Uložiť historický úlovok
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

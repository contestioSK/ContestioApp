import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";
import { FishSymbol, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BaitManufacturer {
  id: number;
  name: string;
}

interface BaitProductLine {
  id: number;
  manufacturerId: number;
  name: string;
}

interface BaitFlavor {
  id: number;
  productLineId: number;
  name: string;
}

interface ArsenalBait {
  id: number;
  diameter: string | null;
  notes: string | null;
  createdAt: string;
  manufacturer: {
    id: number;
    name: string;
  };
  productLine: {
    id: number;
    name: string;
  };
  flavor: {
    id: number;
    name: string;
  };
}

const DIAMETER_OPTIONS = ["16mm", "20mm", "24mm", "30mm"] as const;

export default function ArsenalPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [selectedProductLine, setSelectedProductLine] = useState<string | null>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [selectedDiameter, setSelectedDiameter] = useState<string | null>(null);
  const [bulkDiameter, setBulkDiameter] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Fetch manufacturers
  const { data: manufacturers, isLoading: loadingManufacturers } = useQuery<BaitManufacturer[]>({
    queryKey: ['/api/baits/manufacturers'],
  });

  // Fetch product lines when manufacturer is selected
  const { data: productLines, isLoading: loadingProductLines } = useQuery<BaitProductLine[]>({
    queryKey: ['/api/baits/product-lines', selectedManufacturer],
    queryFn: async () => {
      const response = await fetch(`/api/baits/product-lines?manufacturerId=${selectedManufacturer}`);
      if (!response.ok) throw new Error('Failed to fetch product lines');
      return response.json();
    },
    enabled: !!selectedManufacturer,
  });

  // Fetch flavors when product line is selected
  const { data: flavors, isLoading: loadingFlavors } = useQuery<BaitFlavor[]>({
    queryKey: ['/api/baits/flavors', selectedProductLine],
    queryFn: async () => {
      const response = await fetch(`/api/baits/flavors?productLineId=${selectedProductLine}`);
      if (!response.ok) throw new Error('Failed to fetch flavors');
      return response.json();
    },
    enabled: !!selectedProductLine,
  });

  // Fetch user's arsenal baits
  const { data: arsenalBaits, isLoading: loadingArsenal } = useQuery<ArsenalBait[]>({
    queryKey: ['/api/diary/arsenal/baits'],
  });

  // Add bait mutation
  const addBaitMutation = useMutation({
    mutationFn: async (data: { manufacturerId: number; productLineId: number; flavorId: number; diameter?: string; notes?: string }) => {
      return await apiRequest('POST', '/api/diary/arsenal/baits', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/baits'] });
      toast({
        title: "Boilies pridané",
        description: "Boilies boli úspešne pridané do arzenálu",
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať boilies do arzenálu",
        variant: "destructive",
      });
    },
  });

  // Delete bait mutation
  const deleteBaitMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/diary/arsenal/baits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/baits'] });
      toast({
        title: "Boilies odstránené",
        description: "Boilies boli úspešne odstránené z arzenálu",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť boilies z arzenálu",
        variant: "destructive",
      });
    },
  });

  // Bulk add mutation
  const bulkAddMutation = useMutation({
    mutationFn: async (data: { manufacturerId: number; productLineId: number; diameter?: string }) => {
      return await apiRequest('POST', '/api/diary/arsenal/baits/bulk', data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/baits'] });
      toast({
        title: "Príchute pridané",
        description: `Úspešne pridaných ${data.count} príchutí do arzenálu`,
      });
      setBulkDialogOpen(false);
      setBulkDiameter(null);
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať príchute do arzenálu",
        variant: "destructive",
      });
    },
  });

  // Reset dependent selections when parent changes
  const handleManufacturerChange = (value: string) => {
    setSelectedManufacturer(value);
    setSelectedProductLine(null);
    setSelectedFlavor(null);
  };

  const handleProductLineChange = (value: string) => {
    setSelectedProductLine(value);
    setSelectedFlavor(null);
  };

  const resetForm = () => {
    setSelectedManufacturer(null);
    setSelectedProductLine(null);
    setSelectedFlavor(null);
    setSelectedDiameter(null);
    setNotes("");
  };

  const handleAddBait = () => {
    if (!selectedManufacturer || !selectedProductLine || !selectedFlavor) {
      toast({
        title: "Chyba",
        description: "Vyberte výrobcu, produktový rad a príchuť",
        variant: "destructive",
      });
      return;
    }

    addBaitMutation.mutate({
      manufacturerId: parseInt(selectedManufacturer),
      productLineId: parseInt(selectedProductLine),
      flavorId: parseInt(selectedFlavor),
      diameter: selectedDiameter || undefined,
      notes: notes || undefined,
    });
  };

  const handleBulkAdd = () => {
    if (!selectedManufacturer || !selectedProductLine) {
      toast({
        title: "Chyba",
        description: "Vyberte výrobcu a produktový rad",
        variant: "destructive",
      });
      return;
    }

    bulkAddMutation.mutate({
      manufacturerId: parseInt(selectedManufacturer),
      productLineId: parseInt(selectedProductLine),
      diameter: bulkDiameter || undefined,
    });
  };

  return (
    <DiaryLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FishSymbol className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white">
                  Arzenál Boilies
                </h1>
                <p className="text-sm md:text-base text-muted-foreground dark:text-gray-400">
                  Databáza boilies od najväčších výrobcov
                </p>
              </div>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-bait">
                  <Plus className="mr-2 h-4 w-4" />
                  Pridať boilies
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700">
                <DialogHeader>
                  <DialogTitle className="dark:text-white">Pridať boilies do arzenálu</DialogTitle>
                  <DialogDescription className="dark:text-gray-400">
                    Vyberte boilies z databázy a pridajte ich do svojho arzenálu
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
            {/* Manufacturer Selection */}
            <div className="space-y-2">
              <Label htmlFor="manufacturer" className="dark:text-gray-200">
                1. Výrobca
              </Label>
              {loadingManufacturers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Načítavam výrobcov...
                </div>
              ) : (
                <Select
                  value={selectedManufacturer || ""}
                  onValueChange={handleManufacturerChange}
                >
                  <SelectTrigger
                    id="manufacturer"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    data-testid="select-manufacturer"
                  >
                    <SelectValue placeholder="Vyberte výrobcu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers?.map((manufacturer) => (
                      <SelectItem
                        key={manufacturer.id}
                        value={manufacturer.id.toString()}
                      >
                        {manufacturer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Product Line Selection */}
            <div className="space-y-2">
              <Label htmlFor="productLine" className="dark:text-gray-200">
                2. Produktový rad
              </Label>
              {!selectedManufacturer ? (
                <p className="text-sm text-muted-foreground dark:text-gray-500 py-2">
                  Najprv vyberte výrobcu
                </p>
              ) : loadingProductLines ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Načítavam produktové rady...
                </div>
              ) : (
                <Select
                  value={selectedProductLine || ""}
                  onValueChange={handleProductLineChange}
                  disabled={!selectedManufacturer}
                >
                  <SelectTrigger
                    id="productLine"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    data-testid="select-product-line"
                  >
                    <SelectValue placeholder="Vyberte produktový rad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productLines?.map((productLine) => (
                      <SelectItem
                        key={productLine.id}
                        value={productLine.id.toString()}
                      >
                        {productLine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Flavor Selection */}
            <div className="space-y-2">
              <Label htmlFor="flavor" className="dark:text-gray-200">
                3. Príchuť
              </Label>
              {!selectedProductLine ? (
                <p className="text-sm text-muted-foreground dark:text-gray-500 py-2">
                  Najprv vyberte produktový rad
                </p>
              ) : loadingFlavors ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Načítavam príchute...
                </div>
              ) : (
                <Select
                  value={selectedFlavor || ""}
                  onValueChange={setSelectedFlavor}
                  disabled={!selectedProductLine}
                >
                  <SelectTrigger
                    id="flavor"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    data-testid="select-flavor"
                  >
                    <SelectValue placeholder="Vyberte príchuť..." />
                  </SelectTrigger>
                  <SelectContent>
                    {flavors?.map((flavor) => (
                      <SelectItem key={flavor.id} value={flavor.id.toString()}>
                        {flavor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Diameter Selection */}
            <div className="space-y-2">
              <Label htmlFor="diameter" className="dark:text-gray-200">
                4. Priemer (voliteľné)
              </Label>
              <Select
                value={selectedDiameter || ""}
                onValueChange={setSelectedDiameter}
              >
                <SelectTrigger
                  id="diameter"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  data-testid="select-diameter"
                >
                  <SelectValue placeholder="Vyberte priemer..." />
                </SelectTrigger>
                <SelectContent>
                  {DIAMETER_OPTIONS.map((diameter) => (
                    <SelectItem key={diameter} value={diameter}>
                      {diameter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="dark:text-gray-200">
                Poznámky (voliteľné)
              </Label>
              <Textarea
                id="notes"
                placeholder="Napríklad: farba, efektivita, kde najlepšie funguje..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-2 pt-4">
              {selectedProductLine && flavors && flavors.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Rýchle pridanie
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Pridať všetky príchute ({flavors.length}) z tohto radu naraz
                    </p>
                  </div>
                  <Button
                    onClick={() => setBulkDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="ml-2 border-blue-300 dark:border-blue-700"
                    data-testid="button-bulk-add"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Pridať všetky
                  </Button>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="dark:bg-gray-700 dark:text-gray-200"
                >
                  Zrušiť
                </Button>
                <Button
                  onClick={handleAddBait}
                  disabled={!selectedManufacturer || !selectedProductLine || !selectedFlavor || addBaitMutation.isPending}
                  data-testid="button-save-bait"
                >
                  {addBaitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Pridať do arzenálu
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Confirmation Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Pridať všetky príchute</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Potvrďte hromadné pridanie všetkých príchutí z vybraného produktového radu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedManufacturer && selectedProductLine && (
              <div className="p-4 bg-muted dark:bg-gray-700 rounded-lg space-y-2">
                <p className="text-sm font-medium dark:text-white">
                  Výrobca: {manufacturers?.find(m => m.id === parseInt(selectedManufacturer))?.name}
                </p>
                <p className="text-sm font-medium dark:text-white">
                  Rad: {productLines?.find(p => p.id === parseInt(selectedProductLine))?.name}
                </p>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Počet príchutí: <span className="font-bold">{flavors?.length || 0}</span>
                </p>
              </div>
            )}

            {/* Diameter Selection for Bulk */}
            <div className="space-y-2">
              <Label htmlFor="bulk-diameter" className="dark:text-gray-200">
                Priemer pre všetky (voliteľné)
              </Label>
              <Select
                value={bulkDiameter || ""}
                onValueChange={setBulkDiameter}
              >
                <SelectTrigger
                  id="bulk-diameter"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  data-testid="select-bulk-diameter"
                >
                  <SelectValue placeholder="Vyberte priemer..." />
                </SelectTrigger>
                <SelectContent>
                  {DIAMETER_OPTIONS.map((diameter) => (
                    <SelectItem key={diameter} value={diameter}>
                      {diameter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground dark:text-gray-500">
                Ak vyberiete priemer, všetky príchute budú mať rovnaký priemer
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkDialogOpen(false);
                setBulkDiameter(null);
              }}
              className="dark:bg-gray-700 dark:text-gray-200"
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleBulkAdd}
              disabled={bulkAddMutation.isPending}
              data-testid="button-confirm-bulk-add"
            >
              {bulkAddMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pridať {flavors?.length || 0} príchutí
            </Button>
          </div>
        </DialogContent>
      </Dialog>
          </div>
        </div>

        {/* Arsenal List */}
        {loadingArsenal ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : arsenalBaits && arsenalBaits.length > 0 ? (
          <div className="space-y-4">
            {arsenalBaits.map((bait) => (
              <Card key={bait.id} className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground dark:text-white mb-2">
                        {bait.manufacturer.name} - {bait.productLine.name}
                      </h3>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                          <span className="font-medium">Príchuť:</span> {bait.flavor.name}
                        </p>
                        {bait.diameter && (
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            <span className="font-medium">Priemer:</span> {bait.diameter}
                          </p>
                        )}
                        {bait.notes && (
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            <span className="font-medium">Poznámky:</span> {bait.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteBaitMutation.mutate(bait.id)}
                      disabled={deleteBaitMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      data-testid={`button-delete-bait-${bait.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="py-12 text-center">
              <FishSymbol className="h-12 w-12 mx-auto mb-4 text-muted-foreground dark:text-gray-500" />
              <h3 className="text-lg font-medium text-foreground dark:text-white mb-2">
                Žiadne boilies v arzenáli
              </h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                Začnite pridaním svojich prvých boilies
              </p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Pridať boilies
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Note */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Databáza obsahuje:</strong> 20 výrobcov boilies s desiatkami produktových radov a stovkami príchutí.
              V budúcich verziách budete môcť priradiť konkrétne boilies k úlovkom a sledovať štatistiky.
            </p>
          </CardContent>
        </Card>
      </div>
    </DiaryLayout>
  );
}

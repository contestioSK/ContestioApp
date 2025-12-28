import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";
import { 
  Package, 
  Loader2, 
  Plus, 
  Search, 
  Star, 
  Trash2, 
  Filter, 
  X,
  Fish,
  Archive,
  Sparkle,
  Target
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============ TYPES ============

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
  isFavorite: boolean;
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

interface EquipmentManufacturer {
  id: number;
  name: string;
}

interface EquipmentCategory {
  id: number;
  name: string;
  slug: string;
}

interface EquipmentProduct {
  id: number;
  name: string;
  manufacturer: EquipmentManufacturer;
  category: EquipmentCategory;
}

interface ArsenalEquipment {
  id: number;
  quantity: number;
  notes: string | null;
  isFavorite: boolean;
  createdAt: string;
  product: {
    id: number;
    name: string;
  };
  manufacturer: EquipmentManufacturer;
  category: EquipmentCategory;
}

const DIAMETER_OPTIONS = ["16mm", "20mm", "24mm", "30mm"] as const;

export default function GearArsenalPage() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<"baits" | "equipment">("baits");

  // ============ BAITS STATE ============
  const [baitDialogOpen, setBaitDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedBaitManufacturer, setSelectedBaitManufacturer] = useState<string | null>(null);
  const [selectedProductLine, setSelectedProductLine] = useState<string | null>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [selectedDiameter, setSelectedDiameter] = useState<string | null>(null);
  const [bulkDiameter, setBulkDiameter] = useState<string | null>(null);
  const [baitNotes, setBaitNotes] = useState("");

  // ============ EQUIPMENT STATE ============
  const [equipmentSubTab, setEquipmentSubTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipmentManufacturer, setSelectedEquipmentManufacturer] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [addEquipmentDialogOpen, setAddEquipmentDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EquipmentProduct | null>(null);

  // ============ BAITS QUERIES ============
  const { data: baitManufacturers, isLoading: loadingBaitManufacturers } = useQuery<BaitManufacturer[]>({
    queryKey: ['/api/baits/manufacturers'],
  });

  const { data: productLines, isLoading: loadingProductLines } = useQuery<BaitProductLine[]>({
    queryKey: ['/api/baits/product-lines', selectedBaitManufacturer],
    queryFn: async () => {
      const response = await fetch(`/api/baits/product-lines?manufacturerId=${selectedBaitManufacturer}`);
      if (!response.ok) throw new Error('Failed to fetch product lines');
      return response.json();
    },
    enabled: !!selectedBaitManufacturer,
  });

  const { data: flavors, isLoading: loadingFlavors } = useQuery<BaitFlavor[]>({
    queryKey: ['/api/baits/flavors', selectedProductLine],
    queryFn: async () => {
      const response = await fetch(`/api/baits/flavors?productLineId=${selectedProductLine}`);
      if (!response.ok) throw new Error('Failed to fetch flavors');
      return response.json();
    },
    enabled: !!selectedProductLine,
  });

  const { data: arsenalBaits, isLoading: loadingArsenalBaits } = useQuery<ArsenalBait[]>({
    queryKey: ['/api/diary/arsenal/baits'],
  });

  // ============ EQUIPMENT QUERIES ============
  const { data: equipmentManufacturers } = useQuery<EquipmentManufacturer[]>({
    queryKey: ['/api/equipment/manufacturers'],
  });

  const { data: categories } = useQuery<EquipmentCategory[]>({
    queryKey: ['/api/equipment/categories'],
  });

  const { data: searchResults, isLoading: searching } = useQuery<EquipmentProduct[]>({
    queryKey: ['/api/equipment/search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/equipment/search?q=${encodeURIComponent(searchQuery)}&limit=30`);
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const { data: filteredProducts, isLoading: loadingProducts } = useQuery<EquipmentProduct[]>({
    queryKey: ['/api/equipment/products', selectedEquipmentManufacturer, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEquipmentManufacturer) params.set('manufacturerId', selectedEquipmentManufacturer);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      params.set('limit', '100');
      const res = await fetch(`/api/equipment/products?${params}`);
      return res.json();
    },
    enabled: !!selectedEquipmentManufacturer || !!selectedCategory,
  });

  const { data: myEquipment, isLoading: loadingMyEquipment } = useQuery<ArsenalEquipment[]>({
    queryKey: ['/api/diary/arsenal/equipment'],
  });

  // ============ BAITS MUTATIONS ============
  const addBaitMutation = useMutation({
    mutationFn: async (data: { manufacturerId: number; productLineId: number; flavorId: number; diameter?: string; notes?: string }) => {
      return await apiRequest('POST', '/api/diary/arsenal/baits', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/baits'] });
      toast({
        title: "✅ Boilies pridané",
        description: "Boilies boli úspešne pridané do arzenálu",
      });
      setBaitDialogOpen(false);
      resetBaitForm();
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať boilies do arzenálu",
        variant: "destructive",
      });
    },
  });

  const deleteBaitMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/diary/arsenal/baits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/baits'] });
      toast({
        title: "Odstránené",
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

  const bulkAddMutation = useMutation({
    mutationFn: async (data: { manufacturerId: number; productLineId: number; diameter?: string }) => {
      return await apiRequest('POST', '/api/diary/arsenal/baits/bulk', data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/baits'] });
      
      if (data.count === 0) {
        toast({
          title: "Už máte všetky príchute",
          description: `Všetky príchute (${data.skipped}) z tohto radu už máte v arzenáli`,
        });
      } else {
        const skipMessage = data.skipped > 0 ? ` (${data.skipped} už v arzenáli)` : '';
        toast({
          title: "✅ Príchute pridané",
          description: `Úspešne pridaných ${data.count} príchutí${skipMessage}`,
        });
      }
      
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

  const toggleBaitFavoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('PATCH', `/api/diary/arsenal/baits/${id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/baits'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/baits'] });
      toast({
        title: "Chyba",
        description: "Nepodarilo sa označiť obľúbené",
        variant: "destructive",
      });
    },
  });

  // ============ EQUIPMENT MUTATIONS ============
  const addEquipmentMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest('POST', '/api/diary/arsenal/equipment', { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/equipment'] });
      toast({
        title: "✅ Pridané",
        description: "Vybavenie bolo pridané do tvojho arzenálu",
      });
      setAddEquipmentDialogOpen(false);
      setSelectedProduct(null);
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať vybavenie",
        variant: "destructive",
      });
    },
  });

  const toggleEquipmentFavoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('PATCH', `/api/diary/arsenal/equipment/${id}/favorite`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/equipment'] });
    },
  });

  const removeEquipmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/diary/arsenal/equipment/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/equipment'] });
      toast({
        title: "Odstránené",
        description: "Vybavenie bolo odstránené z arzenálu",
      });
    },
  });

  // ============ HANDLERS ============
  const handleBaitManufacturerChange = (value: string) => {
    setSelectedBaitManufacturer(value);
    setSelectedProductLine(null);
    setSelectedFlavor(null);
  };

  const handleProductLineChange = (value: string) => {
    setSelectedProductLine(value);
    setSelectedFlavor(null);
  };

  const resetBaitForm = () => {
    setSelectedBaitManufacturer(null);
    setSelectedProductLine(null);
    setSelectedFlavor(null);
    setSelectedDiameter(null);
    setBaitNotes("");
  };

  const handleAddBait = () => {
    if (!selectedBaitManufacturer || !selectedProductLine || !selectedFlavor) {
      toast({
        title: "Chyba",
        description: "Vyberte výrobcu, produktový rad a príchuť",
        variant: "destructive",
      });
      return;
    }

    addBaitMutation.mutate({
      manufacturerId: parseInt(selectedBaitManufacturer),
      productLineId: parseInt(selectedProductLine),
      flavorId: parseInt(selectedFlavor),
      diameter: selectedDiameter || undefined,
      notes: baitNotes || undefined,
    });
  };

  const handleBulkAdd = () => {
    if (!selectedBaitManufacturer || !selectedProductLine) {
      toast({
        title: "Chyba",
        description: "Vyberte výrobcu a produktový rad",
        variant: "destructive",
      });
      return;
    }

    bulkAddMutation.mutate({
      manufacturerId: parseInt(selectedBaitManufacturer),
      productLineId: parseInt(selectedProductLine),
      diameter: bulkDiameter || undefined,
    });
  };

  const handleEquipmentAddClick = (product: EquipmentProduct) => {
    setSelectedProduct(product);
    setAddEquipmentDialogOpen(true);
  };

  const clearFilters = () => {
    setSelectedEquipmentManufacturer("");
    setSelectedCategory("");
    setSearchQuery("");
  };

  // ============ COMPUTED VALUES ============
  const displayProducts = searchQuery.length >= 2 ? searchResults : filteredProducts;
  const hasFilters = selectedEquipmentManufacturer || selectedCategory || searchQuery.length >= 2;

  const groupedEquipment = myEquipment?.reduce((acc, item) => {
    const categoryName = item.category?.name || "Ostatné";
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, ArsenalEquipment[]>);

  const baitsCount = arsenalBaits?.length || 0;
  const equipmentCount = myEquipment?.length || 0;

  return (
    <DiaryLayout>
      <div className="px-4 md:px-6 pt-4 pb-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-teal-500" />
            Môj Arzenál
          </h1>
          <p className="text-muted-foreground">
            Spravuj svoje nástrahy a vybavenie na jednom mieste
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "baits" | "equipment")}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 border border-white/5">
            <TabsTrigger 
              value="baits" 
              className="data-[state=active]:bg-lime-600/20 data-[state=active]:text-lime-400"
              data-testid="tab-baits"
            >
              <Package className="h-4 w-4 mr-2" />
              Nástrahy
              <Badge variant="secondary" className="ml-2 bg-lime-900/50 text-lime-400">
                {baitsCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="equipment"
              className="data-[state=active]:bg-teal-600/20 data-[state=active]:text-teal-400"
              data-testid="tab-equipment"
            >
              <Archive className="h-4 w-4 mr-2" />
              Vybavenie
              <Badge variant="secondary" className="ml-2 bg-teal-900/50 text-teal-400">
                {equipmentCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* ============ BAITS TAB ============ */}
          <TabsContent value="baits" className="space-y-5 mt-5 animate-in fade-in-50 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-lime-500/20 rounded-lg">
                  <Fish className="h-6 w-6 text-lime-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide">Arzenál Boilies</h2>
                  <p className="text-sm text-muted-foreground italic">
                    Databáza boilies od najväčších výrobcov
                  </p>
                </div>
              </div>
              
              <Dialog open={baitDialogOpen} onOpenChange={setBaitDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-lime-600 hover:bg-lime-700" data-testid="button-add-bait">
                    <Plus className="mr-2 h-4 w-4" />
                    Pridať boilies
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle>Pridať boilies do arzenálu</DialogTitle>
                    <DialogDescription>
                      Vyberte boilies z databázy a pridajte ich do svojho arzenálu
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Manufacturer Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">1. Výrobca</Label>
                      {loadingBaitManufacturers ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Načítavam výrobcov...
                        </div>
                      ) : (
                        <Select
                          value={selectedBaitManufacturer || ""}
                          onValueChange={handleBaitManufacturerChange}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-bait-manufacturer">
                            <SelectValue placeholder="Vyberte výrobcu..." />
                          </SelectTrigger>
                          <SelectContent>
                            {baitManufacturers?.map((manufacturer) => (
                              <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                                {manufacturer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Product Line Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="productLine">2. Produktový rad</Label>
                      {!selectedBaitManufacturer ? (
                        <p className="text-sm text-muted-foreground py-2">Najprv vyberte výrobcu</p>
                      ) : loadingProductLines ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Načítavam produktové rady...
                        </div>
                      ) : (
                        <Select
                          value={selectedProductLine || ""}
                          onValueChange={handleProductLineChange}
                          disabled={!selectedBaitManufacturer}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-product-line">
                            <SelectValue placeholder="Vyberte produktový rad..." />
                          </SelectTrigger>
                          <SelectContent>
                            {productLines?.map((productLine) => (
                              <SelectItem key={productLine.id} value={productLine.id.toString()}>
                                {productLine.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Flavor Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="flavor">3. Príchuť</Label>
                      {!selectedProductLine ? (
                        <p className="text-sm text-muted-foreground py-2">Najprv vyberte produktový rad</p>
                      ) : loadingFlavors ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Načítavam príchute...
                        </div>
                      ) : (
                        <Select
                          value={selectedFlavor || ""}
                          onValueChange={setSelectedFlavor}
                          disabled={!selectedProductLine}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-flavor">
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
                      <Label htmlFor="diameter">4. Priemer (voliteľné)</Label>
                      <Select
                        value={selectedDiameter || ""}
                        onValueChange={setSelectedDiameter}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-diameter">
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
                      <Label htmlFor="notes">Poznámky (voliteľné)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Napríklad: farba, efektivita, kde najlepšie funguje..."
                        value={baitNotes}
                        onChange={(e) => setBaitNotes(e.target.value)}
                        className="bg-slate-800 border-slate-600"
                        rows={3}
                      />
                    </div>

                    {/* Bulk add option */}
                    {selectedProductLine && flavors && flavors.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-lime-900/20 rounded-lg border border-lime-800">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-lime-100">Rýchle pridanie</p>
                          <p className="text-xs text-lime-300">
                            Pridať všetky príchute ({flavors.length}) z tohto radu naraz
                          </p>
                        </div>
                        <Button
                          onClick={() => setBulkDialogOpen(true)}
                          variant="outline"
                          size="sm"
                          className="ml-2 border-lime-700 text-lime-300"
                          data-testid="button-bulk-add"
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Pridať všetky
                        </Button>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setBaitDialogOpen(false)}>
                        Zrušiť
                      </Button>
                      <Button
                        onClick={handleAddBait}
                        disabled={!selectedBaitManufacturer || !selectedProductLine || !selectedFlavor || addBaitMutation.isPending}
                        className="bg-lime-600 hover:bg-lime-700"
                        data-testid="button-save-bait"
                      >
                        {addBaitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pridať do arzenálu
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Bulk Add Dialog */}
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogContent className="max-w-md bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle>Pridať všetky príchute</DialogTitle>
                  <DialogDescription>
                    Potvrďte hromadné pridanie všetkých príchutí z vybraného produktového radu
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {selectedBaitManufacturer && selectedProductLine && (
                    <div className="p-4 bg-slate-800 rounded-lg space-y-2">
                      <p className="text-sm font-medium">
                        Výrobca: {baitManufacturers?.find(m => m.id === parseInt(selectedBaitManufacturer))?.name}
                      </p>
                      <p className="text-sm font-medium">
                        Rad: {productLines?.find(p => p.id === parseInt(selectedProductLine))?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Počet príchutí: <span className="font-bold">{flavors?.length || 0}</span>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Priemer pre všetky (voliteľné)</Label>
                    <Select value={bulkDiameter || ""} onValueChange={setBulkDiameter}>
                      <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-bulk-diameter">
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
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setBulkDialogOpen(false); setBulkDiameter(null); }}>
                    Zrušiť
                  </Button>
                  <Button
                    onClick={handleBulkAdd}
                    disabled={bulkAddMutation.isPending}
                    className="bg-lime-600 hover:bg-lime-700"
                    data-testid="button-confirm-bulk-add"
                  >
                    {bulkAddMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Pridať {flavors?.length || 0} príchutí
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Baits List */}
            {loadingArsenalBaits ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
              </div>
            ) : arsenalBaits && arsenalBaits.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {arsenalBaits.map((bait) => (
                  <Card 
                    key={bait.id} 
                    className={`bg-slate-900/50 border-white/5 hover:border-lime-500/30 transition-all duration-200 group ${
                      bait.isFavorite ? 'ring-1 ring-yellow-400/30 shadow-[0_0_15px_rgba(250,204,21,0.15)]' : ''
                    }`}
                    data-testid={`bait-item-${bait.id}`}
                  >
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex-1 mb-3">
                        <p className="text-xs font-bold text-lime-400 uppercase tracking-wide mb-1">{bait.manufacturer.name}</p>
                        <p className="text-sm font-semibold truncate">{bait.productLine.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{bait.flavor.name}</p>
                        {bait.diameter && (
                          <Badge variant="secondary" className="mt-2 text-xs bg-lime-900/50 text-lime-400">
                            {bait.diameter}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBaitFavoriteMutation.mutate(bait.id)}
                          disabled={toggleBaitFavoriteMutation.isPending}
                          className="h-9 w-9 p-0 hover:bg-yellow-900/50 touch-manipulation"
                          data-testid={`button-favorite-bait-${bait.id}`}
                        >
                          <Star className={`h-4 w-4 ${bait.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'}`} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteBaitMutation.mutate(bait.id)}
                          disabled={deleteBaitMutation.isPending}
                          className="h-9 w-9 p-0 text-slate-500 hover:text-red-400 hover:bg-red-900/50 touch-manipulation"
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
              <div className="text-center py-10 text-muted-foreground">
                <div className="relative inline-block mb-4">
                  <Fish className="h-14 w-14 mx-auto text-lime-400/30" />
                  <Sparkle className="h-5 w-5 absolute -top-1 -right-1 text-lime-400 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Začni budovať svoj arzenál!</h3>
                <p className="mb-4 max-w-xs mx-auto text-sm">Pridaj svoje obľúbené boilies a maj prehľad o tom, čo máš na rybačke.</p>
                <Button onClick={() => setBaitDialogOpen(true)} className="bg-lime-600 hover:bg-lime-700 h-11 px-5">
                  <Plus className="h-4 w-4 mr-2" />
                  Pridať prvé boilies
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ============ EQUIPMENT TAB ============ */}
          <TabsContent value="equipment" className="space-y-5 mt-5 animate-in fade-in-50 duration-300">
            <Tabs value={equipmentSubTab} onValueChange={setEquipmentSubTab}>
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="browse" data-testid="subtab-browse">
                  <Search className="h-4 w-4 mr-2" />
                  Prehliadať
                </TabsTrigger>
                <TabsTrigger value="my-equipment" data-testid="subtab-my-equipment">
                  <Package className="h-4 w-4 mr-2" />
                  Môj arzenál ({equipmentCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browse" className="space-y-4 mt-4">
                <Card className="bg-slate-900/50 border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5 text-teal-400" />
                      Vyhľadávanie a filtre
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Hľadaj produkt alebo výrobcu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-600"
                        data-testid="input-search-equipment"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select value={selectedEquipmentManufacturer} onValueChange={setSelectedEquipmentManufacturer}>
                        <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-equipment-manufacturer">
                          <SelectValue placeholder="Výrobca" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentManufacturers?.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-category">
                          <SelectValue placeholder="Kategória" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {hasFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                        <X className="h-4 w-4" />
                        Zrušiť filtre
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {(searching || loadingProducts) && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                  </div>
                )}

                {displayProducts && displayProducts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Nájdených {displayProducts.length} produktov
                    </p>
                    <div className="grid gap-2">
                      {displayProducts.map((product) => (
                        <Card
                          key={product.id}
                          className="cursor-pointer bg-slate-900/50 border-white/5 hover:border-teal-500/30 transition-colors"
                          onClick={() => handleEquipmentAddClick(product)}
                          data-testid={`product-${product.id}`}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="text-teal-400">{product.manufacturer.name}</span>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs bg-teal-900/50 text-teal-400">
                                  {product.category.name}
                                </Badge>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="shrink-0 text-teal-400">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {!hasFilters && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Archive className="h-12 w-12 mx-auto mb-4 opacity-50 text-teal-400" />
                    <p>Použi vyhľadávanie alebo filtre na nájdenie vybavenia</p>
                  </div>
                )}

                {hasFilters && !searching && !loadingProducts && (!displayProducts || displayProducts.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Žiadne produkty nenájdené</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-equipment" className="space-y-4 mt-4">
                {loadingMyEquipment ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                  </div>
                ) : myEquipment && myEquipment.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupedEquipment || {}).map(([categoryName, items]) => (
                      <div key={categoryName}>
                        <h3 className="font-black text-lg mb-3 text-teal-400 uppercase tracking-wide">{categoryName}</h3>
                        <div className="grid gap-2">
                          {items.map((item) => (
                            <Card 
                              key={item.id} 
                              className="bg-slate-900/50 border-white/5"
                              data-testid={`arsenal-item-${item.id}`}
                            >
                              <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.product?.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.manufacturer?.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => toggleEquipmentFavoriteMutation.mutate(item.id)}
                                    data-testid={`btn-favorite-${item.id}`}
                                  >
                                    <Star className={`h-4 w-4 ${item.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`} />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeEquipmentMutation.mutate(item.id)}
                                    data-testid={`btn-remove-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <div className="relative inline-block mb-4">
                      <Archive className="h-14 w-14 mx-auto text-teal-400/30" />
                      <Target className="h-5 w-5 absolute -top-1 -right-1 text-teal-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Tvoj arzenál čaká!</h3>
                    <p className="mb-4 max-w-xs mx-auto text-sm">Prehľadaj databázu 1800+ produktov a pridaj si svoje prúty, navijaky a viac.</p>
                    <Button onClick={() => setEquipmentSubTab("browse")} className="bg-teal-600 hover:bg-teal-700 h-11 px-5">
                      <Search className="h-4 w-4 mr-2" />
                      Prehľadať vybavenie
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Add Equipment Dialog */}
        <Dialog open={addEquipmentDialogOpen} onOpenChange={setAddEquipmentDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Pridať do arzenálu</DialogTitle>
              <DialogDescription>
                Chceš pridať toto vybavenie do svojho arzenálu?
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.manufacturer.name} • {selectedProduct.category.name}
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAddEquipmentDialogOpen(false)}>
                    Zrušiť
                  </Button>
                  <Button
                    onClick={() => addEquipmentMutation.mutate(selectedProduct.id)}
                    disabled={addEquipmentMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700"
                    data-testid="btn-confirm-add"
                  >
                    {addEquipmentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Pridať
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </DiaryLayout>
  );
}

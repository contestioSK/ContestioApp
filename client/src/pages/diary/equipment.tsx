import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";
import { Package, Loader2, Plus, Search, Star, Trash2, Filter, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Manufacturer {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Product {
  id: number;
  name: string;
  manufacturer: Manufacturer;
  category: Category;
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
  manufacturer: Manufacturer;
  category: Category;
}

export default function EquipmentPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: manufacturers } = useQuery<Manufacturer[]>({
    queryKey: ['/api/equipment/manufacturers'],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/equipment/categories'],
  });

  const { data: searchResults, isLoading: searching } = useQuery<Product[]>({
    queryKey: ['/api/equipment/search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/equipment/search?q=${encodeURIComponent(searchQuery)}&limit=30`);
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const { data: filteredProducts, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/equipment/products', selectedManufacturer, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedManufacturer) params.set('manufacturerId', selectedManufacturer);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      params.set('limit', '100');
      const res = await fetch(`/api/equipment/products?${params}`);
      return res.json();
    },
    enabled: !!selectedManufacturer || !!selectedCategory,
  });

  const { data: myEquipment, isLoading: loadingMyEquipment } = useQuery<ArsenalEquipment[]>({
    queryKey: ['/api/diary/arsenal/equipment'],
  });

  const addToArsenalMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest('POST', '/api/diary/arsenal/equipment', { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/equipment'] });
      toast({
        title: "✅ Pridané",
        description: "Vybavenie bolo pridané do tvojho arzenálu",
      });
      setAddDialogOpen(false);
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

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('PATCH', `/api/diary/arsenal/equipment/${id}/favorite`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/arsenal/equipment'] });
    },
  });

  const removeMutation = useMutation({
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

  const handleAddClick = (product: Product) => {
    setSelectedProduct(product);
    setAddDialogOpen(true);
  };

  const clearFilters = () => {
    setSelectedManufacturer("");
    setSelectedCategory("");
    setSearchQuery("");
  };

  const displayProducts = searchQuery.length >= 2 ? searchResults : filteredProducts;
  const hasFilters = selectedManufacturer || selectedCategory || searchQuery.length >= 2;

  const groupedEquipment = myEquipment?.reduce((acc, item) => {
    const categoryName = item.category?.name || "Ostatné";
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, ArsenalEquipment[]>);

  return (
    <DiaryLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-teal-500" />
              Rybárske vybavenie
            </h1>
            <p className="text-muted-foreground">
              Prehľadaj databázu 1800+ produktov a buduj svoj arzenál
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="browse" data-testid="tab-browse">
              <Search className="h-4 w-4 mr-2" />
              Prehliadať
            </TabsTrigger>
            <TabsTrigger value="my-equipment" data-testid="tab-my-equipment">
              <Package className="h-4 w-4 mr-2" />
              Môj arzenál ({myEquipment?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
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
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                    <SelectTrigger data-testid="select-manufacturer">
                      <SelectValue placeholder="Výrobca" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturers?.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category">
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
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleAddClick(product)}
                      data-testid={`product-${product.id}`}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{product.manufacturer.name}</span>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              {product.category.name}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="shrink-0">
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
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Použi vyhľadávanie alebo filtre na nájdenie vybavenia</p>
              </div>
            )}

            {hasFilters && !searching && !loadingProducts && (!displayProducts || displayProducts.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Žiadne produkty nenájdené</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-equipment" className="space-y-4">
            {loadingMyEquipment ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : myEquipment && myEquipment.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedEquipment || {}).map(([categoryName, items]) => (
                  <div key={categoryName}>
                    <h3 className="font-semibold text-lg mb-3 capitalize">{categoryName}</h3>
                    <div className="grid gap-2">
                      {items.map((item) => (
                        <Card key={item.id} data-testid={`arsenal-item-${item.id}`}>
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
                                onClick={() => toggleFavoriteMutation.mutate(item.id)}
                                data-testid={`btn-favorite-${item.id}`}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    item.isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                                  }`}
                                />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeMutation.mutate(item.id)}
                                data-testid={`btn-remove-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Tvoj arzenál je prázdny</p>
                <Button onClick={() => setActiveTab("browse")}>
                  <Search className="h-4 w-4 mr-2" />
                  Prehľadať vybavenie
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pridať do arzenálu</DialogTitle>
              <DialogDescription>
                Chceš pridať toto vybavenie do svojho arzenálu?
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="p-4 bg-accent/50 rounded-lg">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.manufacturer.name} • {selectedProduct.category.name}
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Zrušiť
                  </Button>
                  <Button
                    onClick={() => addToArsenalMutation.mutate(selectedProduct.id)}
                    disabled={addToArsenalMutation.isPending}
                    data-testid="btn-confirm-add"
                  >
                    {addToArsenalMutation.isPending ? (
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

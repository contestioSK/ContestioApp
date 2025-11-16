import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";
import { FishSymbol, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function ArsenalPage() {
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [selectedProductLine, setSelectedProductLine] = useState<string | null>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);

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

  return (
    <DiaryLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-4">
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
        </div>

        {/* Cascade Selection */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Vyberte Boilies</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Kaskádový výber: Výrobca → Produktový rad → Príchuť
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Selected Bait Summary */}
        {selectedManufacturer && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Vybraté Boilies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground dark:text-gray-400">
                  Výrobca:
                </span>
                <p className="text-base font-semibold text-foreground dark:text-white">
                  {manufacturers?.find(m => m.id.toString() === selectedManufacturer)?.name}
                </p>
              </div>
              {selectedProductLine && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground dark:text-gray-400">
                    Produktový rad:
                  </span>
                  <p className="text-base font-semibold text-foreground dark:text-white">
                    {productLines?.find(p => p.id.toString() === selectedProductLine)?.name}
                  </p>
                </div>
              )}
              {selectedFlavor && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground dark:text-gray-400">
                    Príchuť:
                  </span>
                  <p className="text-base font-semibold text-foreground dark:text-white">
                    {flavors?.find(f => f.id.toString() === selectedFlavor)?.name}
                  </p>
                </div>
              )}
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

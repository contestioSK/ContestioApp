import { useState } from "react";
import DiaryLayout from "@/components/DiaryLayout";
import { Plus, Search, PackageOpen, FishSymbol } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type EquipmentCategory = "rods" | "reels" | "lures" | "other";

interface CategoryCard {
  id: EquipmentCategory;
  icon: React.ElementType;
  title: string;
  description: string;
}

const categories: CategoryCard[] = [
  {
    id: "rods",
    icon: PackageOpen,
    title: "Prúty",
    description: "Rybárske prúty a rybačky"
  },
  {
    id: "reels",
    icon: PackageOpen,
    title: "Navijaky",
    description: "Navijaky a cievky"
  },
  {
    id: "lures",
    icon: FishSymbol,
    title: "Návnady",
    description: "Umelé a živé návnady"
  },
  {
    id: "other",
    icon: PackageOpen,
    title: "Ostatné",
    description: "Ďalšie vybavenie"
  }
];

// Placeholder data - will be replaced with real data from backend
const placeholderEquipment = {
  rods: [
    { id: 1, name: "Shimano Alivio CX 3.60m", type: "Kaprový prút", length: "3.60m", weight: "3.5 lbs" },
    { id: 2, name: "Daiwa Ninja 2.70m", type: "Spinningový prút", length: "2.70m", weight: "10-30g" },
  ],
  reels: [
    { id: 1, name: "Shimano Baitrunner DL 6000", type: "Kaprový naviják", ratio: "4.8:1", capacity: "300m/0.35mm" },
  ],
  lures: [
    { id: 1, name: "Boilies Strawberry 20mm", type: "Boilies", flavor: "Jahoda", size: "20mm" },
    { id: 2, name: "Mepps Aglia 3", type: "Rotačka", color: "Strieborná", size: "3" },
  ],
  other: [
    { id: 1, name: "Rod Pod Deluxe", type: "Stojan na prúty", capacity: "4 prúty" },
  ]
};

export default function ArsenalPage() {
  const [activeCategory, setActiveCategory] = useState<EquipmentCategory>("rods");
  const [searchQuery, setSearchQuery] = useState("");

  const currentEquipment = placeholderEquipment[activeCategory] || [];

  const filteredEquipment = currentEquipment.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DiaryLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white mb-2">
                Môj Arzenál
              </h1>
              <p className="text-sm md:text-base text-muted-foreground dark:text-gray-400">
                Správa rybárskeho vybavenia a náčinia
              </p>
            </div>
            <Button 
              className="w-full md:w-auto"
              data-testid="button-add-equipment"
            >
              <Plus className="mr-2 h-4 w-4" />
              Pridať vybavenie
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Hľadať vybavenie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              data-testid="input-search-equipment"
            />
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            const count = placeholderEquipment[category.id]?.length || 0;

            return (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isActive
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "dark:bg-gray-800 dark:border-gray-700"
                }`}
                onClick={() => setActiveCategory(category.id)}
                data-testid={`card-category-${category.id}`}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground dark:text-gray-400"}`} />
                    <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-200">
                      {count}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm md:text-base dark:text-white">{category.title}</CardTitle>
                  <CardDescription className="text-xs hidden md:block dark:text-gray-400">
                    {category.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Equipment List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold text-foreground dark:text-white">
              {categories.find(c => c.id === activeCategory)?.title}
            </h2>
            <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
              {filteredEquipment.length} položiek
            </Badge>
          </div>

          {filteredEquipment.length === 0 ? (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="py-12 text-center">
                <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground dark:text-gray-500" />
                <h3 className="text-lg font-medium text-foreground dark:text-white mb-2">
                  Žiadne vybavenie
                </h3>
                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                  {searchQuery 
                    ? "Žiadne vybavenie nezodpovedá vášmu vyhľadávaniu"
                    : "Začnite pridaním svojho prvého vybavenia"}
                </p>
                <Button variant="outline" data-testid="button-add-first-equipment">
                  <Plus className="mr-2 h-4 w-4" />
                  Pridať vybavenie
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredEquipment.map((item: any) => (
                <Card key={item.id} className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground dark:text-white mb-1">
                          {item.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground dark:text-gray-400">
                          {Object.entries(item)
                            .filter(([key]) => key !== 'id' && key !== 'name')
                            .map(([key, value]) => (
                              <span key={key} className="flex items-center">
                                <span className="font-medium mr-1">{String(value)}</span>
                              </span>
                            ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="dark:text-gray-300 dark:hover:bg-gray-700">
                        Upraviť
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Info Note */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Tip:</strong> Evidencia vybavenia vám pomôže sledovať, aké náčinie používate pri jednotlivých úlovkoch a výpravách.
              V budúcich verziách budete môcť priradiť konkrétne vybavenie k úlovkom.
            </p>
          </CardContent>
        </Card>
      </div>
    </DiaryLayout>
  );
}

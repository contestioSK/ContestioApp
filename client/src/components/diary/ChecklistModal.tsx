import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { 
  Check, 
  Plus, 
  RotateCcw, 
  Save, 
  FileText,
  Briefcase,
  Tent,
  Fish,
  UtensilsCrossed,
  Shirt,
  Droplets,
  X
} from "lucide-react";

const STORAGE_KEY = "fishingChecklist_v9";
const TEMPLATES_KEY = "fishingChecklistTemplates_v1";

type ChecklistItem = {
  id: string;
  name: string;
  packed: boolean;
  isCustom?: boolean;
};

type ChecklistCategory = {
  id: string;
  name: string;
  icon: string;
  items: ChecklistItem[];
};

type ChecklistTemplate = {
  id: string;
  name: string;
  categories: ChecklistCategory[];
  isDefault?: boolean;
};

const getCategoryIcon = (iconName: string) => {
  const iconClass = "h-4 w-4 text-muted-foreground";
  const strokeWidth = 1.75;
  switch (iconName) {
    case "documents": return <FileText className={iconClass} strokeWidth={strokeWidth} />;
    case "camping": return <Tent className={iconClass} strokeWidth={strokeWidth} />;
    case "fishing": return <Fish className={iconClass} strokeWidth={strokeWidth} />;
    case "food": return <UtensilsCrossed className={iconClass} strokeWidth={strokeWidth} />;
    case "clothes": return <Shirt className={iconClass} strokeWidth={strokeWidth} />;
    case "hygiene": return <Droplets className={iconClass} strokeWidth={strokeWidth} />;
    case "gear": return <Briefcase className={iconClass} strokeWidth={strokeWidth} />;
    default: return <FileText className={iconClass} strokeWidth={strokeWidth} />;
  }
};

const DEFAULT_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "kaprarina",
    name: "Kaprárina",
    isDefault: true,
    categories: [
      {
        id: "documents",
        name: "Doklady & Povolenia",
        icon: "documents",
        items: [
          { id: "doc1", name: "Rybársky lístok", packed: false },
          { id: "doc2", name: "Občiansky preukaz", packed: false }
        ]
      },
      {
        id: "camping",
        name: "Bivakovanie & Spanie",
        icon: "camping",
        items: [
          { id: "camp1", name: "Bivak, prehoz, podlaha", packed: false },
          { id: "camp2", name: "Rybárske lehátko (posteľ)", packed: false },
          { id: "camp3", name: "Spací vak", packed: false },
          { id: "camp4", name: "Vankúš", packed: false },
          { id: "camp5", name: "Rybárske kreslo", packed: false },
          { id: "camp6", name: "Bivakový stolík", packed: false },
          { id: "camp7", name: "Osvetlenie a stojany", packed: false },
          { id: "camp8", name: "Čelovka", packed: false },
          { id: "camp9", name: "Powerbanka / Zdroj energie", packed: false },
          { id: "camp10", name: "Nabíjacie káble", packed: false }
        ]
      },
      {
        id: "fishing",
        name: "Rybárska Technika",
        icon: "fishing",
        items: [
          { id: "fish1", name: "Prúty (hlavné/spod)", packed: false },
          { id: "fish2", name: "Navijaky", packed: false },
          { id: "fish3", name: "Vidličky a hrazdy", packed: false },
          { id: "fish4", name: "Stojan na prúty", packed: false },
          { id: "fish5", name: "Signalizátory záberu", packed: false },
          { id: "fish6", name: "Backleady (zadné olová)", packed: false },
          { id: "fish7", name: "Vlasce, šnúry a šokové vlasce", packed: false },
          { id: "fish8", name: "Rybárska bižutéria", packed: false },
          { id: "fish9", name: "Záťaže / Olová", packed: false },
          { id: "fish10", name: "Kobra, Raketa (Spomb) alebo Prak", packed: false }
        ]
      },
      {
        id: "bait",
        name: "Návnady & Starostlivosť",
        icon: "fishing",
        items: [
          { id: "bait1", name: "Boilies a návnady", packed: false },
          { id: "bait2", name: "Vanička / Kolíska", packed: false },
          { id: "bait3", name: "Podložka pod ryby", packed: false },
          { id: "bait4", name: "Vážiaci sak", packed: false },
          { id: "bait5", name: "Váha", packed: false },
          { id: "bait6", name: "Dezinfekcia na rany", packed: false },
          { id: "bait7", name: "Trojnožka (na váženie)", packed: false }
        ]
      },
      {
        id: "food",
        name: "Kuchyňa & Jedlo",
        icon: "food",
        items: [
          { id: "food1", name: "Jedálenská sada / príbor", packed: false },
          { id: "food2", name: "Kanvica a kempingový riad", packed: false },
          { id: "food3", name: "Panvica", packed: false },
          { id: "food4", name: "Poháre", packed: false },
          { id: "food5", name: "Zásoba vody (kanister)", packed: false },
          { id: "food6", name: "Káva a čaj", packed: false },
          { id: "food7", name: "Dochucovadlá / korenie", packed: false },
          { id: "food8", name: "Hotové jedlá", packed: false }
        ]
      },
      {
        id: "clothes",
        name: "Oblečenie",
        icon: "clothes",
        items: [
          { id: "cloth1", name: "Tričko", packed: false },
          { id: "cloth2", name: "Mikina", packed: false },
          { id: "cloth3", name: "Nohavice + Tepláky", packed: false },
          { id: "cloth4", name: "Spodná bielizeň", packed: false },
          { id: "cloth5", name: "Ponožky", packed: false },
          { id: "cloth6", name: "Náhradné / Teplé oblečenie", packed: false },
          { id: "cloth7", name: "Termo tričko", packed: false },
          { id: "cloth8", name: "Tričko s dlhým rukávom", packed: false },
          { id: "cloth9", name: "Kraťasy", packed: false },
          { id: "cloth10", name: "Čiapka a nákrčník", packed: false },
          { id: "cloth11", name: "Šiltovky", packed: false },
          { id: "cloth12", name: "Pršiplášť / Pončo", packed: false },
          { id: "cloth13", name: "Polarizačné okuliare", packed: false },
          { id: "cloth14", name: "Obuv (Pevná obuv, šľapky)", packed: false }
        ]
      },
      {
        id: "hygiene",
        name: "Hygiena & Ostatné",
        icon: "hygiene",
        items: [
          { id: "hyg1", name: "Uterák", packed: false },
          { id: "hyg2", name: "Hygienické potreby", packed: false },
          { id: "hyg3", name: "Repelent", packed: false },
          { id: "hyg4", name: "Nôž", packed: false },
          { id: "hyg5", name: "Vrecia na odpad", packed: false }
        ]
      }
    ]
  },
  {
    id: "privlac",
    name: "Prívlač",
    isDefault: true,
    categories: [
      {
        id: "documents",
        name: "Doklady",
        icon: "documents",
        items: [
          { id: "pdoc1", name: "Rybársky lístok", packed: false },
          { id: "pdoc2", name: "Občiansky preukaz", packed: false }
        ]
      },
      {
        id: "gear",
        name: "Výbava",
        icon: "gear",
        items: [
          { id: "pgear1", name: "Prívlačový prút", packed: false },
          { id: "pgear2", name: "Navijak + náhradná cievka", packed: false },
          { id: "pgear3", name: "Podberák (pogumovaný)", packed: false },
          { id: "pgear4", name: "Peán / Kliešte", packed: false },
          { id: "pgear5", name: "Krabička s nástrahami (woblery/gumy)", packed: false },
          { id: "pgear6", name: "Lanká a karabínky", packed: false },
          { id: "pgear7", name: "Polarizačné okuliare", packed: false }
        ]
      },
      {
        id: "clothes",
        name: "Oblečenie & Iné",
        icon: "clothes",
        items: [
          { id: "pcloth1", name: "Brodáky / Gumáky", packed: false },
          { id: "pcloth2", name: "Vesta / Ruksak", packed: false },
          { id: "pcloth3", name: "Šiltovka", packed: false },
          { id: "pcloth4", name: "Repelent", packed: false },
          { id: "pcloth5", name: "Voda a snack", packed: false }
        ]
      }
    ]
  }
];

type ChecklistModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ChecklistModal({ isOpen, onClose }: ChecklistModalProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("kaprarina");
  const [customTemplates, setCustomTemplates] = useState<ChecklistTemplate[]>([]);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [addItemCategory, setAddItemCategory] = useState<string>("");
  const [newItemName, setNewItemName] = useState("");
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ categoryId: string; itemId: string; itemName: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedTemplates = localStorage.getItem(TEMPLATES_KEY);
    
    if (savedTemplates) {
      try {
        setCustomTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error("Failed to parse custom templates", e);
      }
    }
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setCategories(parsed.categories || []);
        setSelectedTemplate(parsed.templateId || "kaprarina");
      } catch (e) {
        console.error("Failed to parse checklist data", e);
        loadTemplate("kaprarina");
      }
    } else {
      loadTemplate("kaprarina");
    }
  }, []);

  // Save to localStorage whenever categories change
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        templateId: selectedTemplate,
        categories
      }));
    }
  }, [categories, selectedTemplate]);

  const loadTemplate = (templateId: string) => {
    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      const resetCategories = template.categories.map(cat => ({
        ...cat,
        id: `${templateId}_${cat.id}`,
        items: cat.items.map(item => ({
          ...item,
          id: `${templateId}_${item.id}`,
          packed: false
        }))
      }));
      setCategories(resetCategories);
      setSelectedTemplate(templateId);
    }
  };

  const toggleItem = (categoryId: string, itemId: string) => {
    const scrollPos = scrollContainerRef.current?.scrollTop ?? 0;
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map(item => 
            item.id === itemId ? { ...item, packed: !item.packed } : item
          )
        };
      }
      return cat;
    }));
    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPos;
      }
    });
  };

  const addCustomItem = () => {
    if (!newItemName.trim() || !addItemCategory) return;
    
    const newItem: ChecklistItem = {
      id: `custom_${Date.now()}`,
      name: newItemName.trim(),
      packed: false,
      isCustom: true
    };
    
    setCategories(prev => prev.map(cat => {
      if (cat.id === addItemCategory) {
        return { ...cat, items: [...cat.items, newItem] };
      }
      return cat;
    }));
    
    setNewItemName("");
    setIsAddItemOpen(false);
    toast({
      title: "✅ Položka pridaná",
      description: `"${newItem.name}" bola pridaná do zoznamu.`,
      variant: "success" as any,
    });
  };

  const removeItem = (categoryId: string, itemId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.filter(item => item.id !== itemId)
        };
      }
      return cat;
    }));
  };

  const stripTemplatePrefix = (id: string): string => {
    return id.replace(/^(kaprarina|privlac|custom_\d+)_/, '');
  };

  const saveAsTemplate = () => {
    if (!newTemplateName.trim()) return;
    
    const templateId = `custom_${Date.now()}`;
    const newTemplate: ChecklistTemplate = {
      id: templateId,
      name: newTemplateName.trim(),
      categories: categories.map(cat => {
        const baseCatId = stripTemplatePrefix(cat.id);
        return {
          ...cat,
          id: baseCatId,
          items: cat.items.map(item => {
            const baseItemId = stripTemplatePrefix(item.id);
            return { ...item, id: baseItemId, packed: false };
          })
        };
      })
    };
    
    const updatedTemplates = [...customTemplates, newTemplate];
    setCustomTemplates(updatedTemplates);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updatedTemplates));
    
    setNewTemplateName("");
    setIsSaveTemplateOpen(false);
    toast({
      title: "✅ Šablóna uložená",
      description: `Šablóna "${newTemplate.name}" bola uložená.`,
      variant: "success" as any,
    });
  };

  const resetChecklist = () => {
    loadTemplate(selectedTemplate);
    setIsResetConfirmOpen(false);
    toast({
      title: "🔄 Zoznam resetovaný",
      description: "Všetky položky boli označené ako nezbalené.",
    });
  };

  // Calculate progress
  const { totalItems, packedItems, progressPercent } = useMemo(() => {
    let total = 0;
    let packed = 0;
    categories.forEach(cat => {
      cat.items.forEach(item => {
        total++;
        if (item.packed) packed++;
      });
    });
    return {
      totalItems: total,
      packedItems: packed,
      progressPercent: total > 0 ? Math.round((packed / total) * 100) : 0
    };
  }, [categories]);

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  // Progress Ring Component
  const ProgressRing = () => {
    const radius = 45;
    const stroke = 8;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;
    
    const ringColor = progressPercent === 100 
      ? "text-green-500" 
      : progressPercent >= 50 
        ? "text-yellow-500" 
        : "text-blue-500";

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="text-muted"
            />
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className={cn("transition-all duration-300", ringColor)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-lg font-bold", ringColor)}>{progressPercent}%</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {packedItems} / {totalItems} položiek
        </p>
        {progressPercent === 100 && (
          <Badge className="bg-green-500 text-white rounded-lg">
            <Check className="h-4 w-4 mr-1" strokeWidth={1.75} />
            Všetko zbalené!
          </Badge>
        )}
      </div>
    );
  };

  const Content = () => (
    <div className="flex flex-col h-full max-h-[80vh] md:max-h-[85vh]">
      {/* Header with Progress */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-b border-border">
        <ProgressRing />
        
        <div className="flex-1 w-full sm:w-auto space-y-2">
          <div className="flex flex-wrap gap-2">
            <Select value={selectedTemplate} onValueChange={loadTemplate}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-template">
                <SelectValue placeholder="Vybrať šablónu" />
              </SelectTrigger>
              <SelectContent>
                {allTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.isDefault && "(predvolená)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsSaveTemplateOpen(true)}
              data-testid="button-save-template"
            >
              <Save className="h-4 w-4 mr-1 text-muted-foreground" strokeWidth={1.75} />
              <span className="hidden sm:inline">Uložiť</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4 mr-1 text-muted-foreground" strokeWidth={1.75} />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Accordion Categories */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        <Accordion type="multiple" defaultValue={categories.map(c => c.id)} className="space-y-2">
          {categories.map(category => {
            const categoryPacked = category.items.filter(i => i.packed).length;
            const categoryTotal = category.items.length;
            const categoryComplete = categoryPacked === categoryTotal;
            
            return (
              <AccordionItem 
                key={category.id} 
                value={category.id}
                className={cn(
                  "border rounded-lg px-4",
                  categoryComplete 
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                    : "bg-card border-border"
                )}
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 w-full">
                    <div className={cn(
                      "p-2 rounded-lg",
                      categoryComplete 
                        ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {getCategoryIcon(category.icon)}
                    </div>
                    <span className="font-medium text-foreground flex-1 text-left">{category.name}</span>
                    <Badge variant={categoryComplete ? "default" : "secondary"} className="mr-2">
                      {categoryPacked}/{categoryTotal}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pb-2">
                    {category.items.map(item => (
                      <div 
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          item.packed 
                            ? "bg-green-100 dark:bg-green-900/30" 
                            : "bg-muted/50 hover:bg-muted"
                        )}
                        onClick={() => toggleItem(category.id, item.id)}
                        data-testid={`item-${item.id}`}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                          item.packed 
                            ? "bg-green-500 border-green-500 text-white" 
                            : "border-muted-foreground/30"
                        )}>
                          {item.packed && <Check className="h-4 w-4" strokeWidth={1.75} />}
                        </div>
                        <span className={cn(
                          "flex-1 text-foreground",
                          item.packed && "line-through text-muted-foreground"
                        )}>
                          {item.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete({ categoryId: category.id, itemId: item.id, itemName: item.name });
                          }}
                          data-testid={`delete-${item.id}`}
                        >
                          <X className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* FAB for adding items */}
      <Button
        className="fixed bottom-24 right-6 h-14 w-14 rounded-xl shadow-lg z-50"
        size="icon"
        onClick={() => {
          setAddItemCategory(categories[0]?.id || "");
          setIsAddItemOpen(true);
        }}
        data-testid="fab-add-item"
      >
        <Plus className="h-6 w-6" strokeWidth={1.75} />
      </Button>

      {/* Add Item Dialog */}
      <AlertDialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pridať vlastnú položku</AlertDialogTitle>
            <AlertDialogDescription>
              Pridajte vlastnú položku do zvolenej kategórie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <Select value={addItemCategory} onValueChange={setAddItemCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Vyberte kategóriu" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Názov položky..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
              data-testid="input-new-item"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={addCustomItem} disabled={!newItemName.trim()}>
              Pridať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Template Dialog */}
      <AlertDialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uložiť ako šablónu</AlertDialogTitle>
            <AlertDialogDescription>
              Uložte aktuálny zoznam ako vlastnú šablónu pre budúce použitie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Názov šablóny..."
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveAsTemplate()}
              data-testid="input-template-name"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={saveAsTemplate} disabled={!newTemplateName.trim()}>
              Uložiť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetovať zoznam?</AlertDialogTitle>
            <AlertDialogDescription>
              Všetky položky budú označené ako nezbalené. Vlastné položky zostanú zachované.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={resetChecklist}>
              Resetovať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť položku?</AlertDialogTitle>
            <AlertDialogDescription>
              Naozaj chceš odstrániť <span className="font-medium text-foreground">"{itemToDelete?.itemName}"</span> zo zoznamu? Položku môžeš vrátiť cez Reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (itemToDelete) {
                  removeItem(itemToDelete.categoryId, itemToDelete.itemId);
                  setItemToDelete(null);
                }
              }}
            >
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-left border-b border-border pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Mám všetko zbalené?
              </DrawerTitle>
              <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DrawerHeader>
          <Content />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Mám všetko zbalené?
          </DialogTitle>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}

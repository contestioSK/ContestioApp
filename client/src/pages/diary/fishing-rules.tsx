import { useState } from "react";
import DiaryLayout from "@/components/DiaryLayout";
import { Search, Shield, Ruler, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Typy pre karty a tabuľky
type QuickLinkType = "sizes" | "closedSeasons" | "dailyHours";

interface QuickLinkCard {
  id: QuickLinkType;
  icon: React.ElementType;
  title: string;
}

// Dáta pre karty rýchleho prístupu
const quickLinks: QuickLinkCard[] = [
  {
    id: "sizes",
    icon: Ruler,
    title: "Lovné Miery"
  },
  {
    id: "closedSeasons",
    icon: Shield,
    title: "Doby Hájenia"
  },
  {
    id: "dailyHours",
    icon: Clock,
    title: "Denná Doba Lovu"
  }
];

// Statické dáta pre tabuľku "Lovné miery"
const sizeLimitsData = [
  { fish: "Kapor", minMax: "40 cm", note: "Najmenšia miera" },
  { fish: "Šťuka", minMax: "50 cm / 90 cm", note: "Najmenšia / najväčšia" },
  { fish: "Zubáč", minMax: "50 cm", note: "Najmenšia miera" },
  { fish: "Sumec", minMax: "70 cm", note: "Najmenšia miera" },
  { fish: "Amur", minMax: "60 cm", note: "Najmenšia miera" },
  { fish: "Pstruh potočný", minMax: "25 cm", note: "Najmenšia miera" },
  { fish: "Pstruh dúhový", minMax: "25 cm", note: "Najmenšia miera" },
  { fish: "Lipeň", minMax: "30 cm", note: "Najmenšia miera" },
  { fish: "Mrena", minMax: "40 cm", note: "Najmenšia miera" }
];

// Statické dáta pre tabuľku "Doby hájenia"
const closedSeasonsData = [
  { fish: "Šťuka", from: "1. január", to: "31. marec" },
  { fish: "Zubáč", from: "1. január", to: "31. marec" },
  { fish: "Sumec", from: "1. máj", to: "30. jún" },
  { fish: "Pstruh potočný", from: "1. október", to: "31. január" },
  { fish: "Pstruh dúhový", from: "1. október", to: "31. január" },
  { fish: "Lipeň", from: "1. apríl", to: "31. máj" },
  { fish: "Mrena", from: "1. apríl", to: "31. máj" },
  { fish: "Jalec", from: "1. apríl", to: "30. jún" }
];

// Statické dáta pre tabuľku "Denná doba lovu"
const dailyHoursData = [
  { month: "Január", carpWaters: "8:00 - 16:00", troutWaters: "9:00 - 15:00" },
  { month: "Február", carpWaters: "8:00 - 17:00", troutWaters: "9:00 - 16:00" },
  { month: "Marec", carpWaters: "7:00 - 18:00", troutWaters: "8:00 - 17:00" },
  { month: "Apríl", carpWaters: "6:00 - 19:00", troutWaters: "7:00 - 18:00" },
  { month: "Máj", carpWaters: "5:00 - 20:00", troutWaters: "6:00 - 19:00" },
  { month: "Jún", carpWaters: "5:00 - 21:00", troutWaters: "6:00 - 20:00" },
  { month: "Júl", carpWaters: "5:00 - 21:00", troutWaters: "6:00 - 20:00" },
  { month: "August", carpWaters: "6:00 - 20:00", troutWaters: "7:00 - 19:00" },
  { month: "September", carpWaters: "7:00 - 19:00", troutWaters: "8:00 - 18:00" },
  { month: "Október", carpWaters: "7:00 - 18:00", troutWaters: "8:00 - 17:00" },
  { month: "November", carpWaters: "8:00 - 16:00", troutWaters: "9:00 - 15:00" },
  { month: "December", carpWaters: "8:00 - 16:00", troutWaters: "9:00 - 15:00" }
];

export default function FishingRulesPage() {
  const [activeSection, setActiveSection] = useState<QuickLinkType>("sizes");
  const [searchQuery, setSearchQuery] = useState("");

  const renderTable = () => {
    switch (activeSection) {
      case "sizes":
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sidebar border-b border-sidebar-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Druh Ryby
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Najmenšia / Najväčšia Miera
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Poznámka
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizeLimitsData.map((row, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-border hover:bg-sidebar-accent transition-colors"
                    data-testid={`row-size-limit-${index}`}
                  >
                    <td className="px-6 py-4 text-sm text-foreground font-medium" data-testid={`text-fish-${index}`}>
                      {row.fish}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-size-${index}`}>
                      {row.minMax}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-note-${index}`}>
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "closedSeasons":
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sidebar border-b border-sidebar-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Druh Ryby
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Od
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Do
                  </th>
                </tr>
              </thead>
              <tbody>
                {closedSeasonsData.map((row, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-border hover:bg-sidebar-accent transition-colors"
                    data-testid={`row-closed-season-${index}`}
                  >
                    <td className="px-6 py-4 text-sm text-foreground font-medium" data-testid={`text-season-fish-${index}`}>
                      {row.fish}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-season-from-${index}`}>
                      {row.from}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-season-to-${index}`}>
                      {row.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "dailyHours":
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sidebar border-b border-sidebar-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Mesiac
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Kaprové Vody
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Pstruhové Vody
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyHoursData.map((row, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-border hover:bg-sidebar-accent transition-colors"
                    data-testid={`row-daily-hours-${index}`}
                  >
                    <td className="px-6 py-4 text-sm text-foreground font-medium" data-testid={`text-month-${index}`}>
                      {row.month}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-carp-hours-${index}`}>
                      {row.carpWaters}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-trout-hours-${index}`}>
                      {row.troutWaters}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DiaryLayout>
      <div className="space-y-8">
        {/* Hlavička */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Rybársky Poriadok
          </h1>
          <p className="text-muted-foreground text-lg">
            Interaktívna databáza rybárskych pravidiel a predpisov
          </p>
        </div>

        {/* Vyhľadávacie pole */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Vyhľadať pravidlo alebo druh ryby..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-lg bg-background border-border"
            data-testid="input-search-rules"
          />
        </div>

        {/* Karty pre rýchly prístup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeSection === link.id;

            return (
              <Card
                key={link.id}
                onClick={() => setActiveSection(link.id)}
                className={`
                  p-6 cursor-pointer transition-all duration-200
                  ${isActive 
                    ? 'bg-sidebar-primary border-sidebar-primary shadow-lg' 
                    : 'bg-card border-border hover:border-sidebar-primary hover:shadow-md'
                  }
                `}
                data-testid={`card-${link.id}`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`
                    p-4 rounded-full
                    ${isActive 
                      ? 'bg-sidebar-primary-foreground/10' 
                      : 'bg-sidebar-accent'
                    }
                  `}>
                    <Icon className={`
                      h-8 w-8
                      ${isActive 
                        ? 'text-sidebar-primary-foreground' 
                        : 'text-sidebar-primary'
                      }
                    `} />
                  </div>
                  <h3 className={`
                    text-lg font-semibold
                    ${isActive 
                      ? 'text-sidebar-primary-foreground' 
                      : 'text-foreground'
                    }
                  `}>
                    {link.title}
                  </h3>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Oblasť pre zobrazenie obsahu */}
        <Card className="bg-card border-border">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {quickLinks.find(link => link.id === activeSection)?.title}
            </h2>
            {renderTable()}
          </div>
        </Card>
      </div>
    </DiaryLayout>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SpecialCompetitionStatus } from "../types";

interface SpecialLeaderboardProps {
  data: SpecialCompetitionStatus[];
}

export function SpecialLeaderboard({ data }: SpecialLeaderboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Špeciálne súťaže - aktuálne vedenie</CardTitle>
        <CardDescription>
          Prehľad lídrov vo všetkých špeciálnych súťažiach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((competition) => (
            <div 
              key={competition.id}
              className="p-4 border rounded-lg bg-muted/5 hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{competition.icon}</span>
                <h4 className="font-medium text-sm">{competition.name}</h4>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Vedúci tím:</span>
                  <Badge variant="secondary" className="text-xs">
                    {competition.currentLeader}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Hodnota:</span>
                  <span className="font-semibold text-lg">
                    {competition.value} {competition.unit}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
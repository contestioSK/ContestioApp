import { useState } from "react";
import { Swords, ArrowRight } from "lucide-react";
import DiaryLayout from "@/components/DiaryLayout";
import { BattleVictoryModal, type BattleVictoryStats } from "@/components/diary/BattleVictoryModal";

export default function BattleVictoryDemo() {
  const [showVictory, setShowVictory] = useState(false);
  const [participantCount, setParticipantCount] = useState(12);

  const mockStats: BattleVictoryStats = {
    rank: 1,
    totalWeight: 42.5,
    fishCount: 8,
    bigFishWeight: 14.8,
    bigFishSpecies: "Kapor Lysec",
    battleName: "Víkendový Duel",
    participantCount,
    winnerName: "Peter Kováč",
    winnerAvatar: "",
    isPremium: false
  };

  return (
    <DiaryLayout>
      {showVictory && (
        <BattleVictoryModal 
          stats={mockStats} 
          onClose={() => setShowVictory(false)} 
        />
      )}

      <div className="relative min-h-[80vh] flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-md animate-in fade-in duration-700">
          <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl rotate-3 group hover:rotate-6 transition-transform">
            <Swords className="w-12 h-12 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          
          <div>
            <h1 className="text-3xl font-black italic uppercase text-foreground mb-2">Battle Victory Demo</h1>
            <p className="text-muted-foreground">Ukážka optimalizovanej Victory obrazovky s Big Fish.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-muted-foreground">Počet účastníkov:</span>
              <div className="flex gap-2">
                {[3, 6, 12].map(count => (
                  <button
                    key={count}
                    onClick={() => setParticipantCount(count)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      participantCount === count
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                    data-testid={`button-participants-${count}`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {participantCount <= 4 ? '"Zaslúžené Víťazstvo"' : 
               participantCount <= 10 ? '"Rozdrvil si Konkurenciu"' : 
               '"Totálna Dominancia"'}
            </p>
          </div>

          <button 
            onClick={() => setShowVictory(true)}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            data-testid="button-simulate-victory"
          >
            <span>Simulovať Výhru</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </DiaryLayout>
  );
}

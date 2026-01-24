import { useState, useMemo } from "react";
import { Users, Trophy, Fish, Crown, Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Team, TeamMember, Catch } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";

type TeamWithDetails = Team & {
  members?: TeamMember[];
};

interface TeamOverviewContentProps {
  team: TeamWithDetails;
  catches: Catch[];
  rank?: number;
  onCatchClick?: (catch_: Catch) => void;
  onClose?: () => void;
  showExpandedCatches?: boolean;
}

export default function TeamOverviewContent({
  team,
  catches,
  rank,
  onCatchClick,
  onClose,
  showExpandedCatches = false,
}: TeamOverviewContentProps) {
  const [expanded, setExpanded] = useState(showExpandedCatches);
  
  const teamCatches = useMemo(() => {
    return [...catches]
      .filter(c => c.teamId === team.id)
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
  }, [catches, team.id]);

  const stats = useMemo(() => {
    const totalWeight = teamCatches.reduce((sum, c) => sum + parseFloat(String(c.weight)), 0);
    const catchCount = teamCatches.length;
    const avgWeight = catchCount > 0 ? totalWeight / catchCount : 0;
    const biggestCatch = teamCatches.reduce((max, c) => 
      parseFloat(String(c.weight)) > parseFloat(String(max?.weight || '0')) ? c : max, 
      teamCatches[0] || null
    );
    return { totalWeight, catchCount, avgWeight, biggestCatch };
  }, [teamCatches]);

  const displayedCatches = expanded ? teamCatches : teamCatches.slice(0, 5);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      'pending': { text: 'Čaká na schválenie', color: 'bg-yellow-500/20 text-yellow-500' },
      'approved': { text: 'Tím je v hre', color: 'bg-emerald-500/20 text-emerald-500' },
      'rejected': { text: 'Vyradený', color: 'bg-red-500/20 text-red-500' },
    };
    return labels[status] || { text: status, color: 'bg-muted text-muted-foreground' };
  };

  const statusInfo = getStatusLabel(team.status);

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground flex items-center gap-3">
              <Users className="text-cyan-500" />
              {team.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {team.sector && (
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full font-medium">
                  Sektor {team.sector}
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-3 bg-muted/50 hover:bg-muted rounded-full transition-colors text-foreground"
            >
              <span className="sr-only">Zavrieť</span>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* QUICK STATS 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500 w-fit mx-auto mb-1">
              <Fish size={16} />
            </div>
            <div className="text-xl font-black text-foreground">{stats.catchCount}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Úlovky</div>
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 w-fit mx-auto mb-1">
              <Trophy size={16} />
            </div>
            <div className="text-xl font-black text-foreground">{stats.totalWeight.toFixed(1)} <span className="text-xs font-normal">kg</span></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Celková váha</div>
          </div>
          <div 
            className={`bg-muted/30 border border-border rounded-xl p-3 text-center ${stats.biggestCatch && onCatchClick ? 'cursor-pointer hover:bg-muted/50 hover:border-amber-500/30 transition-all' : ''}`}
            onClick={() => stats.biggestCatch && onCatchClick?.(stats.biggestCatch)}
          >
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 w-fit mx-auto mb-1">
              <Crown size={16} />
            </div>
            <div className="text-xl font-black text-foreground">
              {stats.biggestCatch ? `${parseFloat(String(stats.biggestCatch.weight)).toFixed(1)}` : '-'} 
              <span className="text-xs font-normal">kg</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Najväčšia ryba</div>
            {stats.biggestCatch && onCatchClick && (
              <div className="text-[9px] text-amber-500 mt-0.5">Klikni pre detail</div>
            )}
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 w-fit mx-auto mb-1">
              <MapPin size={16} />
            </div>
            <div className="text-xl font-black text-foreground">{rank || '-'}.</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Poradie</div>
          </div>
        </div>

        {/* ČLENOVIA TÍMU */}
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Členovia tímu</h3>
          <div className="space-y-2">
            {team.members?.map((member) => (
              <div 
                key={member.id} 
                className="bg-muted/30 border border-border rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold">
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-foreground text-sm">{member.name}</div>
                </div>
                {member.role === 'captain' && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full">
                    Kapitán
                  </span>
                )}
              </div>
            ))}
            {(!team.members || team.members.length === 0) && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Žiadni členovia
              </div>
            )}
          </div>
        </div>

        {/* ÚLOVKY TÍMU */}
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
            Úlovky tímu ({teamCatches.length})
          </h3>
          
          {teamCatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-border">
              Zatiaľ bez úlovkov
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {displayedCatches.map((c) => (
                  <div 
                    key={c.id}
                    className={`bg-muted/30 border border-border rounded-xl p-3 ${onCatchClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                    onClick={() => onCatchClick?.(c)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${parseFloat(String(c.weight)) >= 10 ? 'bg-amber-500/20 text-amber-500' : 'bg-cyan-500/20 text-cyan-500'}`}>
                          {parseFloat(String(c.weight)) >= 10 ? <Crown size={14} /> : <Fish size={14} />}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">{c.fishType || 'Ryba'}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {c.submittedAt ? formatDistanceToNow(new Date(c.submittedAt), { addSuffix: true, locale: sk }) : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-black text-foreground">
                        {parseFloat(String(c.weight)).toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* EXPAND/COLLAPSE */}
              {teamCatches.length > 5 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full mt-3 py-2 bg-muted/30 hover:bg-muted/50 border border-border rounded-xl text-sm font-bold text-foreground flex items-center justify-center gap-2 transition-colors"
                >
                  {expanded ? (
                    <>
                      <ChevronUp size={16} />
                      Skryť ({teamCatches.length - 5} ďalších)
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Zobraziť všetky ({teamCatches.length - 5} ďalších)
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

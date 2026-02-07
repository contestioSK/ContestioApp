import { Check, Camera, Trash2, Plus, X, Medal, Flag, BarChart3, Lock, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";

export interface StepDef {
  id: number;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}

export function StepIndicator({ currentStep, steps }: { currentStep: number; steps: StepDef[] }) {
  return (
    <div className="flex items-center justify-between mb-8 relative max-w-3xl mx-auto px-2 mt-8">
      <div className="absolute left-0 right-0 top-[20px] h-0.5 bg-slate-800 -z-10" />
      <motion.div
        className="absolute left-0 top-[20px] h-0.5 bg-orange-500 -z-10"
        initial={{ width: "0%" }}
        animate={{ width: `${steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0}%` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        return (
          <div key={step.id} className="flex flex-col items-center gap-3 relative">
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.1 : 1,
                backgroundColor: isActive ? "#F97316" : isCompleted ? "#10B981" : "#0F172A",
                borderColor: isActive ? "#F97316" : isCompleted ? "#10B981" : "#334155"
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-lg z-10 transition-colors duration-300 ${isActive ? 'shadow-orange-500/30' : ''}`}
            >
              {isCompleted ? <Check size={20} className="text-white" /> : <step.icon size={20} className={isActive || isCompleted ? "text-white" : "text-slate-500"} />}
            </motion.div>
            <div className="absolute top-12 w-20 text-center hidden md:block">
              <span className={`text-[9px] uppercase font-black tracking-widest block mb-0.5 transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {step.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PrizeInput({ rank, value, onChange, placeholder }: { rank: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative group">
      <div className={`absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border-2 z-10 shadow-lg transform group-hover:scale-110 transition-transform
        ${rank === '1' ? 'bg-yellow-500 border-yellow-400 text-black shadow-yellow-500/20' :
          rank === '2' ? 'bg-slate-300 border-slate-200 text-black shadow-slate-500/20' :
          'bg-orange-700 border-orange-600 text-white shadow-orange-900/20'}`}>
        {rank}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 bg-slate-950 border-slate-800 focus:border-orange-500 text-white placeholder:text-slate-600 h-12 rounded-xl transition-all hover:border-slate-700"
        placeholder={placeholder}
      />
    </div>
  );
}

export function LogoUpload({ logoPreview, onSelect, onRemove }: { logoPreview: string | null; onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return (
    <div className="space-y-4">
      <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
        <Camera size={14} /> Logo súťaže
        <span className="text-slate-600 font-medium normal-case tracking-normal">(nepovinné)</span>
      </label>
      <div className="relative group">
        {logoPreview ? (
          <div className="aspect-square rounded-2xl border-2 border-dashed border-orange-500/50 overflow-hidden relative">
            <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
            <button onClick={onRemove} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900 cursor-pointer flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800 shadow-inner">
              <Camera className="w-6 h-6 opacity-50 text-slate-400" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Nahrať Logo</span>
            <input type="file" className="hidden" accept="image/*" onChange={onSelect} />
          </label>
        )}
      </div>
    </div>
  );
}

export interface SectorData {
  sectorName: string;
  places: string[];
}

export function SectorGrid({
  hasSectors,
  setHasSectors,
  sectorPlaces,
  onAddSector,
  onRemoveSector,
  onUpdateSectorName,
  onAddPlace,
  onRemovePlace,
  onUpdatePlace,
  isLocked,
}: {
  hasSectors: boolean;
  setHasSectors: (v: boolean) => void;
  sectorPlaces: SectorData[];
  onAddSector: () => void;
  onRemoveSector: (idx: number) => void;
  onUpdateSectorName: (idx: number, name: string) => void;
  onAddPlace: (sectorIdx: number) => void;
  onRemovePlace: (sectorIdx: number, placeIdx: number) => void;
  onUpdatePlace: (sectorIdx: number, placeIdx: number, name: string) => void;
  isLocked: boolean;
}) {
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <span className="text-slate-500 text-2xl">🔒</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Sektory sú zamknuté</h3>
        <p className="text-slate-400 text-sm max-w-md">
          Pre oddelené poradie sektorov potrebujete balík <strong className="text-orange-500">PRO</strong> alebo vyšší.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div>
            <h3 className="font-black text-white text-base uppercase">Aktivovať Sektory</h3>
            <p className="text-sm text-slate-500">Každý sektor bude mať vlastné poradie.</p>
          </div>
          <Switch checked={hasSectors} onCheckedChange={setHasSectors} />
        </div>
        {!hasSectors && sectorPlaces.length > 0 && (
          <p className="text-[10px] text-slate-500 pl-4 flex items-center gap-1">
            ℹ️ Nastavené sektory sú zachované v pamäti.
          </p>
        )}
      </div>

      {hasSectors && (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sectorPlaces.map((sector, sIdx) => (
              <div key={sIdx} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <Input
                    value={sector.sectorName}
                    onChange={(e) => onUpdateSectorName(sIdx, e.target.value)}
                    className="bg-transparent border-transparent text-lg font-black text-white px-0 h-auto focus-visible:ring-0"
                  />
                  <Button variant="ghost" size="sm" onClick={() => onRemoveSector(sIdx)} className="text-red-500 hover:bg-red-500/10">
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sector.places.map((place, pIdx) => (
                    <div key={pIdx} className="flex gap-1 group">
                      <Input
                        value={place}
                        onChange={(e) => onUpdatePlace(sIdx, pIdx, e.target.value)}
                        className="bg-slate-900 border-slate-800 text-xs h-8 text-slate-300 focus:text-white rounded-lg"
                      />
                      <button onClick={() => onRemovePlace(sIdx, pIdx)} className="text-slate-600 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => onAddPlace(sIdx)} className="h-8 border-dashed border-slate-800 text-slate-500 text-xs hover:text-orange-500 hover:border-orange-500/50 rounded-lg">
                    <Plus size={12} className="mr-1" /> Stanovište
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={onAddSector} className="h-full min-h-[150px] border-dashed border-slate-800 text-slate-500 hover:text-orange-500 hover:border-orange-500/50 bg-transparent flex flex-col gap-2 rounded-2xl">
              <Plus size={24} />
              <span className="uppercase font-bold text-xs">Pridať sektor</span>
            </Button>
          </div>
        </div>
      )}

      {!hasSectors && sectorPlaces.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          <span className="text-4xl block mb-4">📍</span>
          <p className="text-sm">Zapni prepínač vyššie, ak chceš rozdeliť súťaž na sektory.</p>
        </div>
      )}
    </>
  );
}

export function SideCompetitionsSection({
  sideCompetitions,
  onToggle,
  isConflict,
  isLocked,
  trophyCompetitions,
  milestoneCompetitions,
  statsCompetitions,
  getLabelFn,
}: {
  sideCompetitions: string[];
  onToggle: (comp: string) => void;
  isConflict: (comp: string) => boolean;
  isLocked: boolean;
  trophyCompetitions: string[];
  milestoneCompetitions: string[];
  statsCompetitions: string[];
  getLabelFn: (comp: string) => string;
}) {
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <span className="text-slate-500 text-2xl">🔒</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Špeciálne súťaže sú zamknuté</h3>
        <p className="text-slate-400 text-sm max-w-md">
          Pre doplnkové kategórie potrebujete balík <strong className="text-orange-500">PRO</strong> alebo vyšší.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Medal size={16} className="text-orange-500" />
          Hlavné Trofeje
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {trophyCompetitions.map((comp) => {
            const isSelected = sideCompetitions.includes(comp);
            return (
              <div
                key={comp}
                onClick={() => onToggle(comp)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${isSelected ? 'bg-orange-500/10 border-orange-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-600'}`}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-400'}`}>{getLabelFn(comp)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Flag size={16} className="text-blue-500" />
          Míľniky
        </h3>
        <p className="text-xs text-slate-500 -mt-2 mb-2">Ocenenia za prvý/posledný úlovok a prvé prekročenie váhy.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {milestoneCompetitions.map((comp) => {
            const isSelected = sideCompetitions.includes(comp);
            return (
              <div
                key={comp}
                onClick={() => onToggle(comp)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${isSelected ? 'bg-blue-500/10 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-400'}`}>{getLabelFn(comp)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 group cursor-help" title="Tieto poradia sú navyše. Hlavné bodovanie je nastavené v kroku Pravidlá.">
          <BarChart3 size={16} className="text-purple-500" />
          Doplnkové Rebríčky
          <Info size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statsCompetitions.map((comp) => {
            const isSelected = sideCompetitions.includes(comp);
            const conflict = isConflict(comp);
            return (
              <div
                key={comp}
                onClick={() => onToggle(comp)}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-center gap-1 relative overflow-hidden h-[72px] ${
                  conflict
                    ? 'bg-slate-900/30 border-slate-800/50 cursor-not-allowed hover:bg-red-900/10 hover:border-red-900/30'
                    : 'cursor-pointer ' + (isSelected ? 'bg-purple-500/10 border-purple-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600')
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-purple-500 border-purple-500' : conflict ? 'border-slate-700 bg-slate-800' : 'border-slate-600'}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                    {conflict && <Lock size={10} className="text-slate-500" />}
                  </div>
                  <span className={`font-bold text-sm ${isSelected ? 'text-white' : conflict ? 'text-slate-500' : 'text-slate-400'}`}>
                    {getLabelFn(comp)}
                  </span>
                </div>
                {conflict && (
                  <div className="absolute right-2 top-2">
                    <span className="text-[9px] font-black uppercase bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">Nedostupné</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

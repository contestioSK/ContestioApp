import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Lock, 
  Check, 
  Fish, 
  Camera, 
  Swords, 
  Cloud,
  Sparkles,
  Tag,
  Crown,
  X
} from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { apiRequest } from "@/lib/queryClient";

interface PremiumUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: string;
}

const MONTHLY_PRICE = 5.90;
const YEARLY_PRICE = 59.90;
const YEARLY_MONTHLY_EQUIVALENT = 4.99;
const YEARLY_SAVINGS = 11;

export function PremiumUpsellModal({ isOpen, onClose, trigger }: PremiumUpsellModalProps) {
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState(false);

  const validatePromoMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/promo-codes/validate", { code, scope: "diary" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.valid && data.promoCode?.type === "percent") {
        setAppliedDiscount(data.promoCode.value);
        setPromoError(null);
        setPromoSuccess(true);
      } else if (data.valid && data.promoCode?.type === "days") {
        setPromoError(`Tento kód poskytuje ${data.promoCode.value} dní zadarmo`);
        setPromoSuccess(true);
      } else {
        setPromoError(data.message || "Neplatný promo kód");
        setAppliedDiscount(null);
        setPromoSuccess(false);
      }
    },
    onError: () => {
      setPromoError("Nepodarilo sa overiť promo kód");
      setAppliedDiscount(null);
      setPromoSuccess(false);
    },
  });

  const handleApplyPromo = () => {
    if (promoCode.trim()) {
      validatePromoMutation.mutate(promoCode.trim().toUpperCase());
    }
  };

  const calculateDiscountedPrice = (price: number): number => {
    if (!appliedDiscount) return price;
    return Number((price * (1 - appliedDiscount / 100)).toFixed(2));
  };

  const discountedMonthly = calculateDiscountedPrice(MONTHLY_PRICE);
  const discountedYearly = calculateDiscountedPrice(YEARLY_PRICE);
  const discountedYearlyMonthly = Number((discountedYearly / 12).toFixed(2));

  const benefits = [
    { 
      icon: Fish, 
      text: "Neobmedzená kapacita úlovkov", 
      freeLimit: "Free: 50",
      variant: "cyan" as const
    },
    { 
      icon: Camera, 
      text: "Neobmedzená história výprav", 
      freeLimit: "Free: posledné 3",
      variant: "emerald" as const
    },
    { 
      icon: Camera, 
      text: "Neobmedzené fotky k úlovkom", 
      freeLimit: "Free: 1 fotka",
      variant: "purple" as const
    },
    { 
      icon: Swords, 
      text: "Vytváranie vlastných Súbojov", 
      freeLimit: null,
      variant: "orange" as const
    },
    { 
      icon: Cloud, 
      text: "Predpoveď počasia a aktivity rýb", 
      freeLimit: null,
      variant: "cyan" as const
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-white">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 via-amber-500/10 to-amber-400/10" />
          
          <div className="relative p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <TacticalIcon icon={Crown} variant="amber" size="lg" showLabel={false} />
              </div>
              <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                Lovte bez obmedzení s Contestio Premium
              </DialogTitle>
              {trigger && (
                <p className="text-slate-400 text-center text-sm mt-2">
                  Pre túto funkciu potrebujete Premium
                </p>
              )}
            </DialogHeader>

            <div className="space-y-3 mb-6">
              {benefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                >
                  <TacticalIconInline icon={benefit.icon} variant={benefit.variant} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium">{benefit.text}</span>
                    </div>
                    {benefit.freeLimit && (
                      <span className="text-xs text-slate-500 ml-6">{benefit.freeLimit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-center">
                <p className="text-xs text-slate-400 mb-1">Mesačne</p>
                {appliedDiscount ? (
                  <>
                    <p className="text-lg text-slate-500 line-through">{MONTHLY_PRICE.toFixed(2)} €</p>
                    <p className="text-2xl font-bold text-white">{discountedMonthly.toFixed(2)} €</p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-white">{MONTHLY_PRICE.toFixed(2)} €</p>
                )}
                <p className="text-xs text-slate-500 mt-1">Flexibilné zrušenie</p>
                <Button 
                  className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white"
                  data-testid="btn-subscribe-monthly"
                >
                  Vybrať
                </Button>
              </div>

              <div className="relative p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/50 text-center">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-slate-900 rounded-full">
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    Ušetríte ~{YEARLY_SAVINGS} €
                  </span>
                </div>
                <p className="text-xs text-amber-400 mb-1 mt-2">Ročne</p>
                {appliedDiscount ? (
                  <>
                    <p className="text-lg text-slate-500 line-through">{YEARLY_PRICE.toFixed(2)} €</p>
                    <p className="text-2xl font-bold text-amber-400">{discountedYearly.toFixed(2)} €</p>
                    <p className="text-xs text-slate-400 mt-1">
                      (Len {discountedYearlyMonthly.toFixed(2)} € mesačne)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-amber-400">{YEARLY_PRICE.toFixed(2)} €</p>
                    <p className="text-xs text-slate-400 mt-1">
                      (Len {YEARLY_MONTHLY_EQUIVALENT.toFixed(2)} € mesačne)
                    </p>
                  </>
                )}
                <Button 
                  className="w-full mt-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
                  data-testid="btn-subscribe-yearly"
                >
                  Vybrať
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Máte promo kód?"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError(null);
                    setPromoSuccess(false);
                  }}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 uppercase"
                  data-testid="input-promo-code"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleApplyPromo}
                disabled={!promoCode.trim() || validatePromoMutation.isPending}
                className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
                data-testid="btn-apply-promo"
              >
                {validatePromoMutation.isPending ? "..." : "Použiť"}
              </Button>
            </div>

            {promoError && !promoSuccess && (
              <p className="text-red-400 text-xs text-center mb-4">{promoError}</p>
            )}
            {promoSuccess && appliedDiscount && (
              <p className="text-green-400 text-xs text-center mb-4">
                <Check className="h-3 w-3 inline mr-1" />
                Zľava {appliedDiscount}% bola aplikovaná!
              </p>
            )}

            <button
              onClick={onClose}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-400 transition-colors"
              data-testid="btn-close-premium-modal"
            >
              Možno neskôr
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

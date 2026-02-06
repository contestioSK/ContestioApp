import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, AlertTriangle, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing-token">("loading");
  const [isResendSent, setIsResendSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendEmail, setResendEmail] = useState("");
  const [hasEmailFromUrl, setHasEmailFromUrl] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    const emailParam = urlParams.get("email");

    if (emailParam) {
      setResendEmail(decodeURIComponent(emailParam));
      setHasEmailFromUrl(true);
    }

    if (!tokenParam) {
      setStatus("missing-token");
      return;
    }

    setToken(tokenParam);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (cooldown > 0) interval = setInterval(() => setCooldown((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: async (verificationToken: string) => {
      const response = await apiRequest("GET", `/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`);
      return response.json();
    },
    onSuccess: () => {
      setStatus("success");
    },
    onError: () => {
      setStatus("error");
    },
  });

  useEffect(() => {
    if (token && status === "loading") {
      verifyMutation.mutate(token);
    }
  }, [token, status]);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-verification", { email: resendEmail });
      return response.json();
    },
    onSuccess: () => {
      setIsResendSent(true);
      setCooldown(60);
    },
    onError: () => {
      setIsResendSent(true);
      setCooldown(60);
    },
  });

  const handleResend = () => {
    if (resendEmail) {
      resendMutation.mutate();
    }
  };

  const pageWrapper = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 selection:bg-orange-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>
      {children}
    </div>
  );

  if (status === "loading" || verifyMutation.isPending) {
    return pageWrapper(
      <Card className="w-full max-w-md bg-slate-900/60 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Aktivujeme účet...</h2>
            <p className="text-sm text-slate-400">Ešte chvíľu. Dokončujeme overenie.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isResendSent) {
    return pageWrapper(
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card className="w-full max-w-md bg-slate-900/60 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                <Mail className="text-emerald-500 w-6 h-6" />
              </div>
            </div>
            <CardTitle className="text-xl font-black text-white uppercase italic">Odoslané</CardTitle>
            <CardDescription className="text-slate-400">Ak je tvoj email v systéme, nový odkaz je na ceste.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-center">
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-400">Tip:</span> Skontroluj aj SPAM alebo Promo priečinky.
              </p>
            </div>

            <Button
              onClick={() => setLocation("/auth/login")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold h-12 border border-slate-700"
            >
              Späť na prihlásenie
            </Button>

            {cooldown > 0 && (
              <div className="text-center">
                <span className="text-[10px] text-slate-600">
                  Poslať znova možné o {cooldown}s
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "error" || status === "missing-token") {
    return pageWrapper(
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex justify-center"
      >
        <Card className="w-full max-w-md bg-slate-900/60 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
                <AlertTriangle className="text-red-500 w-6 h-6" />
              </div>
            </div>
            <CardTitle className="text-xl font-black text-white uppercase italic" data-testid="text-error-title">
              {status === "missing-token" ? "Chýbajúci kód" : "Odkaz vypršal"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {status === "missing-token"
                ? "V URL chýba overovací token. Použi odkaz z emailu."
                : "Odkaz už nie je platný. Pošli si nový."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "error" && (
              <>
                {!hasEmailFromUrl && (
                  <Input
                    type="email"
                    placeholder="Zadaj svoj email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white focus:border-orange-500/50 h-11"
                  />
                )}
                <Button
                  onClick={handleResend}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12"
                  disabled={resendMutation.isPending || !resendEmail}
                >
                  {resendMutation.isPending ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : null}
                  Poslať nový aktivačný e-mail
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              onClick={() => setLocation("/auth/login")}
              className="w-full text-slate-500 hover:text-white"
              data-testid="button-go-to-login"
            >
              Späť na prihlásenie
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return pageWrapper(
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 text-center p-8 backdrop-blur-md relative z-10">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="w-10 h-10 text-emerald-500" />
        </div>

        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2" data-testid="text-success-title">
          Účet aktivovaný
        </h2>
        <p className="text-slate-400 mb-8 leading-relaxed text-sm">
          Môžeš sa prihlásiť a vstúpiť do arény.
        </p>

        <Button
          onClick={() => setLocation("/auth/login")}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest h-12 rounded-xl shadow-[0_10px_40px_-10px_rgba(249,115,22,0.5)] transition-all active:scale-[0.98]"
          data-testid="button-go-to-login"
        >
          Prihlásiť sa
        </Button>
      </Card>
    </motion.div>
  );
}

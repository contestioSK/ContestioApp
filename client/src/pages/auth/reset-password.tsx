import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(7, "Minimálne 7 znakov")
    .regex(/[^A-Za-z0-9]/, "Vyžaduje sa špeciálny znak (napr. !, ?, #, _)"),
  confirmPassword: z.string().min(1, "Potvrdenie hesla je povinné"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Heslá sa nezhodujú",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

type StatusType = {
  type: 'error' | 'success' | null;
  message: string;
  isTokenError?: boolean;
};

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusType>({ type: null, message: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [resetStatus, setResetStatus] = useState<"form" | "success" | "error" | "missing-token">("form");

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    if (!tokenParam) {
      setResetStatus("missing-token");
      return;
    }
    setToken(tokenParam);
  }, []);

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      if (!token) throw new Error("Token is missing");
      setStatus({ type: null, message: "" });
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      setResetStatus("success");
    },
    onError: (err: Error) => {
      let userMessage = "Niečo sa pokazilo. Skús to znova.";
      let isTokenError = false;

      if (err.message.includes("400") || err.message.includes("Invalid") || err.message.includes("expired") || err.message.includes("kód")) {
        userMessage = "Reset odkaz je neplatný alebo expiroval.";
        isTokenError = true;
      } else if (err.message.includes("weak")) {
        userMessage = "Heslo je príliš slabé.";
      }

      if (isTokenError) {
        setResetStatus("error");
      } else {
        setStatus({ type: 'error', message: userMessage, isTokenError: false });
      }
    },
  });

  const StatusBox = ({ s }: { s: StatusType }) => {
    if (!s.type) return null;
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`text-xs text-center p-2 rounded-lg flex items-center justify-center gap-2 ${
          s.type === 'error'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}
      >
        {s.type === 'error' && <AlertCircle size={14} />}
        {s.type === 'success' && <CheckCircle2 size={14} />}
        {s.message}
      </motion.div>
    );
  };

  const pageWrapper = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 selection:bg-orange-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>
      {children}
    </div>
  );

  if (resetStatus === "missing-token" || resetStatus === "error") {
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
              {resetStatus === "missing-token" ? "Chýbajúci reset kód" : "Odkaz vypršal"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {resetStatus === "missing-token"
                ? "V URL chýba reset token. Použi odkaz z emailu."
                : "Pošli si nový reset odkaz."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setLocation("/auth/forgot-password")}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12"
            >
              Poslať nový odkaz
            </Button>
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

  if (resetStatus === "success") {
    return pageWrapper(
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 text-center p-8 backdrop-blur-md relative z-10">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase italic mb-2" data-testid="text-success-title">
            HOTOVO!
          </h2>
          <p className="text-slate-400 mb-6 text-sm">Tvoje heslo bolo úspešne zmenené.</p>
          <Button
            onClick={() => setLocation("/auth/login")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold h-12"
            data-testid="button-go-to-login"
          >
            Prihlásiť sa s novým heslom
          </Button>
        </Card>
      </motion.div>
    );
  }

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
              <Lock className="text-orange-500 w-6 h-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black text-white uppercase italic">Nové heslo</CardTitle>
          <CardDescription className="text-slate-400">Nastav si nové bezpečné heslo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => resetMutation.mutate(d))} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-slate-400">Nové heslo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPass ? "text" : "password"}
                          className="bg-slate-950 border-slate-700 text-white focus:border-orange-500/50 pr-10 h-11"
                          placeholder="********"
                          autoComplete="new-password"
                          autoFocus
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                        >
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <p className="text-[10px] text-slate-500 mt-1">Min. 7 znakov, špeciálny znak</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-slate-400">Potvrdiť heslo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPass ? "text" : "password"}
                          className="bg-slate-950 border-slate-700 text-white focus:border-orange-500/50 pr-10 h-11"
                          placeholder="********"
                          autoComplete="new-password"
                          data-testid="input-confirm-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                        >
                          {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <AnimatePresence>
                {status.type === 'error' && <StatusBox s={status} />}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest h-12 rounded-xl shadow-[0_4px_14px_-4px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98]"
                disabled={resetMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetMutation.isPending ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Uložiť nové heslo"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-xs text-slate-500 hover:text-white inline-flex items-center gap-1 transition-colors">
              Späť na prihlásenie
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

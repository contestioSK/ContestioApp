import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { SiGoogle } from "react-icons/si";

const loginSchema = z.object({
  email: z.string().email("Zadajte platný email"),
  password: z.string().min(1, "Heslo je povinné"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginStatusType = {
  type: 'error' | 'success' | 'loading' | null;
  message: string;
  showResend: boolean;
};

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<LoginStatusType>({ type: null, message: "", showResend: false });
  const [resendCooldown, setResendCooldown] = useState(0);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      interval = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResendActivation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (resendCooldown > 0) return;
    setResendCooldown(30);
    toast({ title: "Aktivácia odoslaná", description: "Skontroluj si email." });
  };

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      setLoginStatus({ type: 'loading', message: "Prihlasujem...", showResend: false });
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async () => {
      setLoginStatus({ type: 'success', message: "Vitaj späť! Presmerujem...", showResend: false });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Prihlásenie úspešné!",
        description: "Vitajte späť v PriVode.",
      });
      
      const returnTo = localStorage.getItem('contestio_returnTo');
      localStorage.removeItem('contestio_returnTo');
      const safeReturn = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null;
      window.location.href = safeReturn || "/diary";
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      const isActivation = error.message.includes("403");
      const msg = isActivation 
        ? "Účet nie je aktivovaný. Skontroluj email." 
        : "Nesprávny email alebo heslo. Skús to znova alebo obnov heslo.";
      
      setLoginStatus({ 
        type: 'error', 
        message: msg,
        showResend: isActivation 
      });

      toast({
        title: "Chyba prihlásenia",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  };

  const StatusBox = ({ status }: { status: LoginStatusType }) => {
    if (!status.type) return null;
    return (
      <motion.div 
        initial={{ opacity: 0, height: 0 }} 
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`text-xs text-center p-2 rounded-lg flex flex-col items-center justify-center gap-1 mb-3 ${
          status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          'text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          {status.type === 'error' && <AlertCircle size={14} />}
          {status.type === 'success' && <CheckCircle2 size={14} />}
          {status.type === 'loading' && <Loader2 size={14} className="animate-spin" />}
          {status.message}
        </div>
        
        {status.showResend && (
          <button 
            onClick={handleResendActivation} 
            disabled={resendCooldown > 0}
            className="underline text-[10px] font-bold mt-1 hover:text-white transition-colors disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Počkaj ${resendCooldown}s` : "Poslať aktiváciu znova"}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 selection:bg-orange-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex justify-center"
      >
        <Card className="w-full max-w-md bg-slate-900/60 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10">
          <CardHeader className="text-center pb-2 pt-5">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shadow-inner">
                <LogIn className="text-orange-500 w-5 h-5" />
              </div>
            </div>
            
            <div className="flex justify-center mb-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500">VSTUP DO ARÉNY</span>
            </div>

            <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter italic" data-testid="text-login-title">
              Vitaj späť
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium text-sm">
              Prihlás sa a pokračuj v love, úlovkoch a rebríčkoch.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loginMutation.isPending}
              variant="outline"
              className="w-full border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 h-11 font-bold transition-all hover:border-slate-600"
              data-testid="button-google-login"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-3" />
              ) : (
                <SiGoogle className="w-4 h-4 mr-3" />
              )}
              Pokračovať cez Google
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <Separator className="bg-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-[#0b1221] px-4 text-slate-600">Alebo manuálne</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-slate-400">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="vas@email.sk"
                          disabled={loginMutation.isPending}
                          className="bg-slate-950 border-slate-700 text-white focus:border-orange-500/50 h-11"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-xs uppercase font-bold text-slate-400">Heslo</FormLabel>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            disabled={loginMutation.isPending}
                            className="bg-slate-950 border-slate-700 text-white focus:border-orange-500/50 pr-10 h-11"
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FormControl>
                      <div className="flex justify-end mt-1">
                        <Link href="/auth/forgot-password" className="text-xs p-1 -mr-1 text-slate-500 hover:text-orange-500 font-medium transition-colors">
                          Obnoviť heslo
                        </Link>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-2">
                  <AnimatePresence>
                    {loginStatus.type === 'error' && <StatusBox status={loginStatus} />}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest h-12 rounded-xl shadow-[0_4px_14px_-4px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98]"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      "Pokračovať"
                    )}
                  </Button>

                  <AnimatePresence>
                    {loginStatus.type !== 'error' && loginStatus.type !== null && (
                      <div className="mt-3">
                        <StatusBox status={loginStatus} />
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </Form>
            
            <div className="pt-2">
              <Link href="/auth/register">
                <div
                  className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-800/60 transition-colors group"
                  data-testid="link-register"
                >
                  <p className="text-xs text-slate-400 mb-0.5">Nemáš ešte účet?</p>
                  <span className="text-sm font-bold text-orange-500 group-hover:text-orange-400 transition-colors flex items-center justify-center gap-1">
                    Zaregistruj sa za minútku <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

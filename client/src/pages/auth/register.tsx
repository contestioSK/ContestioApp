import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Eye, EyeOff, Fish, Trophy, ArrowRight, Anchor, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { SiGoogle } from "react-icons/si";

const registerSchema = z.object({
  email: z.string().email("Zadajte platný email"),
  password: z
    .string()
    .min(7, "Minimálne 7 znakov")
    .regex(/[^A-Za-z0-9]/, "Vyžaduje sa špeciálny znak (napr. !, ?, #, _)"),
  firstName: z.string().min(1, "Povinné").max(100, "Meno je príliš dlhé"),
  lastName: z.string().min(1, "Povinné").max(100, "Priezvisko je príliš dlhé"),
  role: z.enum(["fisherman", "organizer"], { required_error: "Vyber, kto si" }),
  isNewsletterSubscribed: z.boolean().default(false),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "fisherman",
      isNewsletterSubscribed: false,
    },
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      interval = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      setSubmittedEmail(data.email);
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: () => {
      setRegistrationSuccess(true);
      toast({
        title: "Registrácia úspešná!",
        description: "Skontrolujte svoj email a aktivujte účet.",
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Chyba registrácie",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  };

  const handleResendEmail = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(30);
    toast({ title: "Email odoslaný", description: `Aktivačný link bol znova poslaný na ${submittedEmail}` });
  };

  const handleChangeEmail = () => {
    setRegistrationSuccess(false);
    form.setValue("email", submittedEmail);
    setTimeout(() => form.setFocus("email"), 50);
    setSubmittedEmail("");
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 selection:bg-cyan-500/30">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
        </div>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 text-center p-8 backdrop-blur-md relative z-10">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Mail className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Skontroluj si email</h2>
            <p className="text-slate-400 mb-2 leading-relaxed text-sm">
              Na adresu <span className="text-white font-bold">{submittedEmail}</span> sme ti poslali aktivačný link.
            </p>
            <div className="space-y-3 mt-8">
              <Button
                onClick={() => setLocation("/auth/login")}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold h-12"
              >
                Prejsť na prihlásenie
              </Button>
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={handleChangeEmail}
                  className="text-xs text-slate-500 hover:text-cyan-500 flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft size={12} /> Zmeniť email
                </button>
                <button
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0}
                  className={`text-xs flex items-center gap-1 transition-colors ${
                    resendCooldown > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <RefreshCw size={12} className={resendCooldown > 0 ? "animate-spin" : ""} />
                  {resendCooldown > 0 ? `Skús o ${resendCooldown}s` : "Poslať znova"}
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 selection:bg-cyan-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex justify-center"
      >
        <Card className="w-full max-w-lg bg-slate-900/60 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center transform -rotate-6 shadow-lg shadow-orange-500/20">
                  <Fish className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-black italic text-white tracking-tighter">PRIVODE</span>
              </div>
            </div>
            <CardTitle className="text-3xl font-black text-white uppercase tracking-tighter italic" data-testid="text-register-title">
              Začni loviť trofeje
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Pridaj sa do PriVode a súťaž s kamarátmi.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading || registerMutation.isPending}
              variant="outline"
              className="w-full border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 h-12 font-bold transition-all hover:border-slate-600"
              data-testid="button-google-register"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-3" />
              ) : (
                <SiGoogle className="w-5 h-5 mr-3" />
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Čo chceš robiť v PriVode?
                      </FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          onClick={() => field.onChange("fisherman")}
                          className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all duration-200 ${
                            field.value === 'fisherman'
                              ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                              : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                          data-testid="option-fisherman"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Anchor className={field.value === 'fisherman' ? "text-cyan-500" : "text-slate-600"} size={20} />
                            <span className="text-xs font-black uppercase tracking-widest">Rybár</span>
                          </div>
                          <span className={`text-[10px] text-center leading-tight ${
                            field.value === 'fisherman' ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            Zapisuj úlovky, súťaž v rebríčkoch
                          </span>
                        </div>
                        <div
                          onClick={() => field.onChange("organizer")}
                          className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all duration-200 ${
                            field.value === 'organizer'
                              ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                              : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                          data-testid="option-organizer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className={field.value === 'organizer' ? "text-blue-500" : "text-slate-600"} size={20} />
                            <span className="text-xs font-black uppercase tracking-widest">Organizátor</span>
                          </div>
                          <span className={`text-[10px] text-center leading-tight ${
                            field.value === 'organizer' ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            Tvor súboje a spravuj eventy
                          </span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase font-bold text-slate-400">Meno</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={registerMutation.isPending}
                            className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500/50 h-11"
                            data-testid="input-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase font-bold text-slate-400">Priezvisko</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={registerMutation.isPending}
                            className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500/50 h-11"
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-slate-400">Emailová adresa</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="napr. peto@rybar.sk"
                          disabled={registerMutation.isPending}
                          className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500/50 h-11"
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
                      <FormLabel className="text-xs uppercase font-bold text-slate-400">Heslo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            disabled={registerMutation.isPending}
                            className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500/50 pr-10 h-11"
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                            aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FormControl>
                      <p className="text-[10px] text-slate-500 mt-1.5 ml-1">
                        Min. 7 znakov, aspoň jeden špeciálny znak (napr. !, ?, #, _)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isNewsletterSubscribed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={registerMutation.isPending}
                          className="border-slate-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                          data-testid="checkbox-newsletter"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="text-xs font-medium text-slate-300 cursor-pointer block">
                          Posielajte mi novinky a tipy na lov
                        </FormLabel>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          1x týždenne, odhlásiť sa môžeš kedykoľvek.
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-black uppercase tracking-widest h-14 rounded-xl shadow-[0_10px_40px_-10px_rgba(249,115,22,0.5)] transition-all active:scale-[0.98]"
                    disabled={registerMutation.isPending || googleLoading}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <span className="flex items-center gap-2">
                        Vytvoriť Účet <ArrowRight size={18} />
                      </span>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-slate-600 leading-relaxed">
                    Kliknutím súhlasíš s{" "}
                    <a href="#" className="text-slate-400 hover:text-white underline decoration-slate-700">Podmienkami</a>
                    {" "}a{" "}
                    <a href="#" className="text-slate-400 hover:text-white underline decoration-slate-700">Zásadami ochrany súkromia</a>.
                  </p>
                </div>
              </form>
            </Form>

            <div className="pt-2">
              <Link href="/auth/login">
                <div
                  className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-800/60 transition-colors group"
                  data-testid="link-login"
                >
                  <p className="text-xs text-slate-400 mb-0.5">Už máš účet?</p>
                  <span className="text-sm font-bold text-cyan-500 group-hover:text-cyan-400 transition-colors flex items-center justify-center gap-1">
                    Prihlásiť sa <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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

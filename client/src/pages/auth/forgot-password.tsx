import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

const forgotPasswordSchema = z.object({
  email: z.string().email("Zadajte platný email"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

type StatusType = {
  type: 'success' | 'loading' | null;
  message: string;
  detail?: string;
};

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<StatusType>({ type: null, message: "" });
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      interval = setInterval(() => setCooldown((p) => (p > 0 ? p - 1 : 0)), 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      setStatus({ type: 'loading', message: "Odosielam inštrukcie..." });
      const response = await apiRequest("POST", "/api/auth/reset-request", data);
      return response.json();
    },
    onSuccess: () => {
      setStatus({
        type: 'success',
        message: "Email odoslaný",
        detail: "Ak je e-mail v systéme, do pár minút ti príde reset odkaz.",
      });
      setCooldown(60);
    },
    onError: () => {
      setStatus({
        type: 'success',
        message: "Email odoslaný",
        detail: "Ak je e-mail v systéme, do pár minút ti príde reset odkaz.",
      });
      setCooldown(60);
    },
  });

  const StatusBox = ({ s }: { s: StatusType }) => {
    if (!s.type) return null;
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`text-xs text-center p-3 rounded-lg flex flex-col items-center justify-center gap-1 ${
          s.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          {s.type === 'success' && <CheckCircle2 size={14} />}
          {s.type === 'loading' && <Loader2 size={14} className="animate-spin" />}
          {s.message}
        </div>
        {s.detail && (
          <p className="text-[10px] text-slate-400 mt-1">{s.detail}</p>
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
          <CardHeader className="text-center pb-2 pt-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
                <KeyRound className="text-orange-500 w-6 h-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-white uppercase italic">
              Zabudol si heslo?
            </CardTitle>
            <CardDescription className="text-slate-400">
              Pošleme ti inštrukcie na obnovu.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {status.type !== 'success' ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase font-bold text-slate-400">Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="tvoj@email.sk"
                            className="bg-slate-950 border-slate-700 text-white focus:border-orange-500/50 h-11"
                            autoComplete="email"
                            autoFocus
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <AnimatePresence>
                    {status.type === 'loading' && <StatusBox s={status} />}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest h-12 rounded-xl shadow-[0_4px_14px_-4px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98]"
                    disabled={mutation.isPending || cooldown > 0}
                  >
                    {mutation.isPending ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : cooldown > 0 ? (
                      `Počkaj ${cooldown}s`
                    ) : (
                      "Poslať inštrukcie"
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="text-center space-y-4">
                <StatusBox s={status} />
              </div>
            )}

            <div className="text-center">
              <Link href="/auth/login" className="text-xs text-slate-500 hover:text-white inline-flex items-center gap-1 transition-colors">
                <ArrowLeft size={12} /> Späť na prihlásenie
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

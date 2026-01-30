import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, XCircle, FishIcon, Lock } from "lucide-react";
import { Link } from "wouter";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(7, "Heslo musí mať aspoň 7 znakov")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, "Heslo musí obsahovať aspoň jeden špeciálny znak"),
  confirmPassword: z.string().min(1, "Potvrdenie hesla je povinné"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Heslá sa nezhodujú",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<"form" | "success" | "error" | "missing-token">("form");

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Extract token from URL params
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
      if (!token) {
        throw new Error("Token is missing");
      }
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      setResetStatus("success");
      toast({
        title: "Heslo zmenené!",
        description: "Tvoje heslo bolo úspešne zmenené. Môžeš sa teraz prihlásiť.",
      });
    },
    onError: (error: Error) => {
      console.error("Password reset error:", error);
      setResetStatus("error");
      
      let errorMessage = "Nastala chyba pri zmene hesla.";
      if (error.message.includes("400")) {
        errorMessage = "Neplatný alebo expirovaný reset kód.";
      } else if (error.message.includes("Invalid or expired")) {
        errorMessage = "Neplatný alebo expirovaný reset kód. Požiadajte o nový.";
      }
      
      toast({
        title: "Chyba zmeny hesla",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordForm) => {
    resetMutation.mutate(data);
  };

  if (resetStatus === "missing-token") {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive dark:text-red-400">
              Chýbajúci reset kód
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                V URL chýba reset token. Prosím, použite odkaz z emailu.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button asChild className="w-full" data-testid="button-go-to-login">
                <Link href="/auth/login">
                  Prejsť na prihlásenie
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetStatus === "success") {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary dark:text-blue-400" data-testid="text-success-title">
              Heslo zmenené!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground dark:text-gray-400">
              Tvoje heslo bolo úspešne zmenené. Môžeš sa teraz prihlásiť s novým heslom.
            </p>
            <div className="pt-4">
              <Button asChild className="w-full" data-testid="button-go-to-login">
                <Link href="/auth/login">
                  Prihlásiť sa
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetStatus === "error") {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive dark:text-red-400" data-testid="text-error-title">
              Chyba zmeny hesla
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Nepodarilo sa zmeniť heslo. Reset kód môže byť neplatný alebo expirovaný.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button asChild className="w-full" data-testid="button-try-login">
                <Link href="/auth/login">
                  Skúsiť prihlásenie
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <FishIcon className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary dark:text-blue-400">Contestio</h1>
          </div>
          <CardTitle className="text-2xl font-bold dark:text-white">Resetovať heslo</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Zadaj nové heslo pre tvoj účet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-gray-200">Nové heslo</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="********" 
                        {...field}
                        data-testid="input-password"
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                    </FormControl>
                    <FormMessage className="dark:text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-gray-200">Potvrdiť heslo</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="********" 
                        {...field}
                        data-testid="input-confirm-password"
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                    </FormControl>
                    <FormMessage className="dark:text-red-400" />
                  </FormItem>
                )}
              />

              <Alert className="dark:bg-gray-800 dark:border-gray-700">
                <Lock className="h-4 w-4" />
                <AlertDescription className="dark:text-gray-300">
                  Heslo musí mať aspoň 7 znakov a obsahovať aspoň jeden špeciálny znak.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={resetMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetujem heslo...
                  </>
                ) : (
                  "Resetovať heslo"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Spomínate si na heslo?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Prihlásiť sa
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

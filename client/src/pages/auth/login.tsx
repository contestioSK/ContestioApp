import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, FishIcon, Chrome, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import contestioLogo from "@assets/contestio logo_1760283270014.png";

// Login validation schema
const loginSchema = z.object({
  email: z.string().email("Zadajte platný email"),
  password: z.string().min(1, "Heslo je povinné"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate auth cache to refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Prihlásenie úspešné!",
        description: "Vitajte späť v Contestio.",
      });
      
      // Redirect to home page
      setLocation("/");
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      let errorMessage = "Nastala chyba pri prihlasovaní. Skúste to znovu.";
      
      // Handle specific error cases
      if (error.message.includes("401")) {
        errorMessage = "Nesprávny email alebo heslo.";
      } else if (error.message.includes("403")) {
        errorMessage = "Váš účet nie je aktivovaný. Skontrolujte svoj email.";
      }
      
      toast({
        title: "Chyba prihlásenia",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={contestioLogo} alt="Contestio" className="h-10" />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-login-title">
            Prihlásenie
          </CardTitle>
          <p className="text-muted-foreground">
            Prihláste sa do svojho účtu
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google OAuth Button */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full"
            disabled={loginMutation.isPending}
            data-testid="button-google-login"
          >
            <Chrome className="w-4 h-4 mr-2" />
            Prihlásiť sa cez Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Alebo</span>
            </div>
          </div>

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="vas@email.sk"
                        disabled={loginMutation.isPending}
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
                    <FormLabel>Heslo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Vaše heslo"
                          disabled={loginMutation.isPending}
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loginMutation.isPending}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Prihlasuje...
                  </>
                ) : (
                  "Prihlásiť sa"
                )}
              </Button>
            </form>
          </Form>

          {/* Email verification reminder */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ak sa nemôžete prihlásiť, skontrolujte si email a aktivujte svoj účet.
            </AlertDescription>
          </Alert>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Nemáte ešte účet? </span>
            <Button variant="link" className="p-0 h-auto font-semibold" asChild data-testid="link-register">
              <Link href="/auth/register">
                Zaregistrujte sa
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
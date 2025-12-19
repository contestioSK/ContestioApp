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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, User, Eye, EyeOff, FishIcon, Chrome } from "lucide-react";
import { Link } from "wouter";
import contestioLogo from "@assets/contestio logo_1760283270014.png";

// Registration validation schema
const registerSchema = z.object({
  email: z.string().email("Zadajte platný email"),
  password: z
    .string()
    .min(7, "Heslo musí mať aspoň 7 znakov")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Heslo musí obsahovať aspoň jeden špeciálny znak (!@#$%^&* atď.)"),
  firstName: z.string().min(1, "Meno je povinné").max(100, "Meno je príliš dlhé"),
  lastName: z.string().min(1, "Priezvisko je povinné").max(100, "Priezvisko je príliš dlhé"),
  role: z.enum(["fisherman", "organizer"], {
    required_error: "Vyberte typ účtu",
  }),
  isNewsletterSubscribed: z.boolean().optional().default(false),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: undefined,
      isNewsletterSubscribed: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
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
        description: error.message || "Nastala chyba pri registrácii. Skúste to znovu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              Skontrolujte svoj email
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Poslali sme vám email s odkazom na aktiváciu účtu. 
              Kliknite na odkaz v emaili a môžete sa prihlásiť.
            </p>
            <div className="pt-4">
              <Button asChild className="w-full">
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={contestioLogo} alt="Contestio" className="h-10" />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-register-title">
            Vytvorte si účet
          </CardTitle>
          <p className="text-muted-foreground">
            Zaregistrujte sa a začnite používať Contestio
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google OAuth Button */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full"
            disabled={registerMutation.isPending}
            data-testid="button-google-register"
          >
            <Chrome className="w-4 h-4 mr-2" />
            Registrovať sa cez Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Alebo</span>
            </div>
          </div>

          {/* Registration Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meno</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Vaše meno"
                          disabled={registerMutation.isPending}
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
                      <FormLabel>Priezvisko</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Vaše priezvisko"
                          disabled={registerMutation.isPending}
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="vas@email.sk"
                        disabled={registerMutation.isPending}
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
                          placeholder="Aspoň 7 znakov + špeciálny znak"
                          disabled={registerMutation.isPending}
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={registerMutation.isPending}
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

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ účtu</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={registerMutation.isPending}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Vyberte typ účtu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fisherman" data-testid="option-fisherman">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>Rybár</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="organizer" data-testid="option-organizer">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>Organizátor súťaží</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isNewsletterSubscribed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={registerMutation.isPending}
                        data-testid="checkbox-newsletter"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Chcem dostávať novinky o súťažiach a tipy na rybolov.
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrujem...
                  </>
                ) : (
                  "Registrovať sa"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Už máte účet? </span>
            <Button variant="link" className="p-0 h-auto font-semibold" asChild data-testid="link-login">
              <Link href="/auth/login">
                Prihláste sa
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
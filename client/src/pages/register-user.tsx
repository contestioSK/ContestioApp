import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Mail, Lock, UserCheck } from "lucide-react";

const userRegistrationSchema = z.object({
  firstName: z.string().min(1, "Krstné meno je povinné").max(50, "Krstné meno je príliš dlhé"),
  lastName: z.string().min(1, "Priezvisko je povinné").max(50, "Priezvisko je príliš dlhé"),
  email: z.string().email("Neplatný email").max(255, "Email je príliš dlhý"),
  password: z.string().min(6, "Heslo musí mať aspoň 6 znakov").max(100, "Heslo je príliš dlhé"),
  confirmPassword: z.string(),
  bio: z.string().max(500, "Bio môže mať maximálne 500 znakov").optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Heslá sa nezhodujú",
  path: ["confirmPassword"],
});

type UserRegistrationForm = z.infer<typeof userRegistrationSchema>;

export default function RegisterUser() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserRegistrationForm>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      bio: "",
    },
  });

  const onSubmit = async (data: UserRegistrationForm) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest({
        url: "/api/users/register",
        method: "POST",
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          bio: data.bio,
          role: "public", // Automatically set role to public for regular users
        },
      });

      toast({
        title: "Registrácia úspešná!",
        description: "Váš účet bol vytvorený. Môžete sa teraz prihlásiť.",
      });

      // Redirect to login page after successful registration
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 2000);

    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Chyba pri registrácii",
        description: error.response?.data?.message || "Nepodarilo sa vytvoriť účet. Skúste to znovu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-register-user-title">
            Registrácia bežného užívateľa
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Vytvorte si účet a začnite si viesť rybársky denník
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto mt-4 rounded-full"></div>
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-center">Základné údaje</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Krstné meno *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input 
                              {...field} 
                              className="pl-10" 
                              placeholder="Vaše krstné meno"
                              data-testid="input-first-name"
                            />
                          </div>
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
                        <FormLabel>Priezvisko *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input 
                              {...field} 
                              className="pl-10" 
                              placeholder="Vaše priezvisko"
                              data-testid="input-last-name"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input 
                            {...field} 
                            type="email" 
                            className="pl-10" 
                            placeholder="vas.email@priklad.sk"
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heslo *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input 
                              {...field} 
                              type="password" 
                              className="pl-10" 
                              placeholder="Minimálne 6 znakov"
                              data-testid="input-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potvrdiť heslo *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input 
                              {...field} 
                              type="password" 
                              className="pl-10" 
                              placeholder="Zopakujte heslo"
                              data-testid="input-confirm-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Bio */}
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>O mne (voliteľné)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Napíšte niečo o sebe, vašich rybárskych skúsenostiach..."
                          className="min-h-[100px]"
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting}
                  data-testid="button-submit-registration"
                >
                  {isSubmitting ? "Vytváram účet..." : "Vytvoriť účet"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Už máte účet?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal text-primary"
              onClick={() => window.location.href = '/api/login'}
              data-testid="link-login"
            >
              Prihlásiť sa
            </Button>
          </p>
        </div>

        {/* Features Preview */}
        <div className="mt-12 bg-muted/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
            Čo vám ponúkame
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-medium text-foreground mb-1">Rybársky denník</h4>
              <p className="text-muted-foreground">Zaznamenávajte úlovky a miesta</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-medium text-foreground mb-1">Súťaže</h4>
              <p className="text-muted-foreground">Zapojte sa do existujúcich súťaží</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-medium text-foreground mb-1">Komunita</h4>
              <p className="text-muted-foreground">Spojte sa s inými rybármi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
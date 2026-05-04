import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { SiFacebook, SiInstagram, SiLinkedin } from "react-icons/si";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const contactFormSchema = z.object({
  name: z.string().min(2, "Meno musí mať aspoň 2 znaky"),
  email: z.string().email("Zadajte platnú emailovú adresu"),
  phone: z.string().optional(),
  subject: z.string().min(5, "Predmet musí mať aspoň 5 znakov"),
  message: z.string().min(10, "Správa musí mať aspoň 10 znakov"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Contact() {
  const { toast } = useToast();
  
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    // Simulácia odoslania správy
    console.log("Contact form data:", data);
    
    toast({
      title: "Správa odoslaná!",
      description: "Ďakujeme za tvoju správu. Odpovieme ti čo najskôr.",
    });
    
    form.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="text-contact-title">
            Kontaktujte nás
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Máš otázky o platforme PriVode? Radi ti pomôžeme s čímkoľvek potrebuješ.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Kontaktné informácie
              </h2>
              
              <div className="space-y-6">
                <Card className="p-6">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Email</h3>
                        <p className="text-muted-foreground">info@privode.eu</p>
                        <p className="text-muted-foreground">podpora@privode.eu</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Telefón</h3>
                        <p className="text-muted-foreground">+421 xxx xxx xxx</p>
                        <p className="text-sm text-muted-foreground">Pon - Pia: 9:00 - 17:00</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Adresa</h3>
                        <p className="text-muted-foreground">
                          Contestio s.r.o.<br />
                          Hlavná ulica 123<br />
                          010 01 Žilina<br />
                          Slovenská republika
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Pracovný čas</h3>
                        <div className="text-muted-foreground space-y-1">
                          <p>Pondelok - Piatok: 9:00 - 17:00</p>
                          <p>Sobota - Nedeľa: Zatvorené</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardContent className="p-0">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Sociálne siete</h3>
                      <div className="flex items-center space-x-4">
                        <a
                          href="#"
                          className="w-10 h-10 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 rounded-full flex items-center justify-center transition-colors group"
                          data-testid="social-facebook"
                          aria-label="Facebook"
                        >
                          <SiFacebook className="w-5 h-5 text-[#1877F2] group-hover:scale-110 transition-transform" />
                        </a>
                        <a
                          href="#"
                          className="w-10 h-10 bg-[#E4405F]/10 hover:bg-[#E4405F]/20 rounded-full flex items-center justify-center transition-colors group"
                          data-testid="social-instagram"
                          aria-label="Instagram"
                        >
                          <SiInstagram className="w-5 h-5 text-[#E4405F] group-hover:scale-110 transition-transform" />
                        </a>
                        <a
                          href="#"
                          className="w-10 h-10 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 rounded-full flex items-center justify-center transition-colors group"
                          data-testid="social-linkedin"
                          aria-label="LinkedIn"
                        >
                          <SiLinkedin className="w-5 h-5 text-[#0A66C2] group-hover:scale-110 transition-transform" />
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sledujte nás na sociálnych sieťach pre najnovšie informácie a aktuality.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl font-bold text-foreground">
                  Napíšte nám správu
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meno a priezvisko *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Tvoje meno a priezvisko"
                                data-testid="input-name"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emailová adresa *</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="vas.email@example.com"
                                data-testid="input-email"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefónne číslo</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+421 xxx xxx xxx"
                              data-testid="input-phone"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Predmet správy *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Stručne opíšte dôvod kontaktovania"
                              data-testid="input-subject"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Správa *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Napíš nám detaily tvojej otázky alebo požiadavky..."
                              className="min-h-32"
                              data-testid="textarea-message"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        size="lg"
                        className="w-full md:w-auto"
                        data-testid="button-send-message"
                        disabled={form.formState.isSubmitting}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {form.formState.isSubmitting ? "Odesilam..." : "Odoslať správu"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Potrebuješ rýchlu pomoc?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Pre naliehavé otázky alebo technickú podporu počas súťaže nás kontaktujte priamo. 
              Naša podpora je k dispozícii počas pracovných hodín.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:podpora@privode.eu"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                data-testid="button-support-email"
              >
                Technická podpora
              </a>
              <a
                href="tel:+421000000000"
                className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors"
                data-testid="button-support-phone"
              >
                Zavolať priamo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, XCircle, Mail, FishIcon } from "lucide-react";
import { Link } from "wouter";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error" | "missing-token">("loading");

  useEffect(() => {
    // Extract token from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    
    if (!tokenParam) {
      setVerificationStatus("missing-token");
      return;
    }
    
    setToken(tokenParam);
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async (verificationToken: string) => {
      const response = await apiRequest("GET", `/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`);
      return response.json();
    },
    onSuccess: () => {
      setVerificationStatus("success");
      toast({
        title: "Email overený!",
        description: "Tvoj účet bol úspešne aktivovaný. Môžeš sa teraz prihlásiť.",
      });
    },
    onError: (error: Error) => {
      console.error("Email verification error:", error);
      setVerificationStatus("error");
      
      let errorMessage = "Nastala chyba pri overovaní emailu.";
      if (error.message.includes("400")) {
        errorMessage = "Neplatný alebo expirovaný overovací kód.";
      } else if (error.message.includes("404")) {
        errorMessage = "Používateľ nebol nájdený.";
      }
      
      toast({
        title: "Chyba overenia",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Auto-verify when token is available
  useEffect(() => {
    if (token && verificationStatus === "loading") {
      verifyMutation.mutate(token);
    }
  }, [token, verificationStatus]);

  const handleResendVerification = () => {
    toast({
      title: "Funkcia nedostupná",
      description: "Ak potrebujete nový overovací email, kontaktujte podporu.",
      variant: "destructive",
    });
  };

  if (verificationStatus === "missing-token") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">
              Chýbajúci overovací kód
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                V URL chýba overovací token. Prosím, použite odkaz z emailu.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/auth/login">
                  Prejsť na prihlásenie
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/register">
                  Zaregistrovať sa
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "loading" || verifyMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <FishIcon className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">Contestio</h1>
            </div>
            <CardTitle className="text-2xl font-bold" data-testid="text-verifying-title">
              Overujeme tvoj email
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">
              Prosím, chvíľu čakajte...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary" data-testid="text-success-title">
              Email overený!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Tvoj účet bol úspešne aktivovaný. Môžeš sa teraz prihlásiť a začať používať Contestio.
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

  if (verificationStatus === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive" data-testid="text-error-title">
              Chyba overenia
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Nepodarilo sa overiť tvoj email. Overovací kód môže byť neplatný alebo expirovaný.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button asChild className="w-full" data-testid="button-register-again">
                <Link href="/auth/register">
                  Zaregistrovať sa znovu
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full" data-testid="button-try-login">
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

  return null;
}
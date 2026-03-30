import { useState } from "react";
import { WashingMachine, LogIn, UserPlus, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: "Revisa tu correo para restablecer tu contraseña" });
      setForgotMode(false);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: error, variant: "destructive" });
      } else {
        toast({ title: "Cuenta creada. Revisa tu correo para confirmar." });
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: error, variant: "destructive" });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <WashingMachine className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">LavaExpress</CardTitle>
          <p className="text-sm text-muted-foreground">
            {forgotMode ? "Recuperar contraseña" : isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {isSignUp ? (
                <><UserPlus className="h-4 w-4 mr-1" /> Crear cuenta</>
              ) : (
                <><LogIn className="h-4 w-4 mr-1" /> Iniciar sesión</>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Alquileres from "@/pages/Alquileres";
import Caja from "@/pages/Caja";
import Reportes from "@/pages/Reportes";
import Usuarios from "@/pages/Usuarios";
import Servicios from "@/pages/Servicios";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import OAuthConsent from "@/pages/OAuthConsent";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading, error, isPasswordRecovery } = useAuth();

  // If user landed via a password recovery link, show the reset form
  if (isPasswordRecovery) {
    return (
      <Routes>
        <Route path="*" element={<ResetPassword />} />
      </Routes>
    );
  }

  if (loading || role === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-lg font-medium text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Intenta recargar la página o borra las cookies si el problema
            persiste.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // At this point we have a user and `role` is either a valid value or
  // `null` to indicate there really is no role assigned.
  if (role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-lg font-medium">Cuenta sin rol asignado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Contacta al administrador para que te asigne un rol (admin o
            entrega).
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = role === "admin";

  return (
    <AppLayout>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        {isAdmin ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alquileres" element={<Alquileres />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Alquileres />} />
            <Route path="/alquileres" element={<Alquileres />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  WashingMachine,
  Wallet,
  BarChart3,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const allNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/alquileres", label: "Alquileres", icon: WashingMachine, roles: ["admin", "entrega"] },
  { to: "/caja", label: "Caja", icon: Wallet, roles: ["admin"] },
  { to: "/reportes", label: "Reportes", icon: BarChart3, roles: ["admin"] },
  { to: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { to: "/servicios", label: "Servicios", icon: Settings, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { role, signOut, user } = useAuth();

  const navItems = allNavItems.filter((item) => role && item.roles.includes(role));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <WashingMachine className="h-6 w-6 text-sidebar-primary" />
            <span className="font-bold text-base tracking-tight">LavaExpress</span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="ml-2 text-sidebar-muted hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-sidebar-border pb-2 px-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent w-full"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </nav>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

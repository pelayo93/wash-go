import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type AppRole = "admin" | "entrega";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  // undefined = still fetching, null = query completed but no role assigned
  role: AppRole | null | undefined;
  loading: boolean;
  // a human-readable message when something goes wrong fetching auth info
  error: string | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // role is undefined while we are still waiting for the database call.
  // once the query finishes it will be either a valid AppRole or null
  // (meaning there is no role assigned). This makes it easy to avoid
  // rendering the "sin rol" message until we really know the result.
  const [role, setRole] = useState<AppRole | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ROLE_CACHE_PREFIX = "user_role_";

  const cacheRole = (userId: string | undefined, value: AppRole | null) => {
    if (!userId) return;
    try {
      localStorage.setItem(ROLE_CACHE_PREFIX + userId, value ?? "null");
    } catch (e) {
      console.warn("failed to write role cache", e);
    }
  };

  const readCachedRole = (userId: string | undefined): AppRole | null | undefined => {
    if (!userId) return undefined;
    try {
      const v = localStorage.getItem(ROLE_CACHE_PREFIX + userId);
      if (v === null) return undefined;
      return v === "null" ? null : (v as AppRole);
    } catch (e) {
      console.warn("failed to read role cache", e);
      return undefined;
    }
  };

  const fetchRole = async (userId: string) => {
    // race the actual query against a manual timeout to avoid hanging when
    // the tab is in the background and the browser throttles the network.
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), 10000);
    });

    try {
      const { data, error } = (await Promise.race([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
        timeoutPromise,
      ])) as { data: { role: string } | null; error: any };

      if (error) throw error;
      const resolved = (data?.role as AppRole) ?? null;
      console.debug("fetchRole result", { userId, resolved });
      setRole(resolved);
      cacheRole(userId, resolved);
    } catch (err) {
      console.error("failed to fetch role", err);
      if ((err as Error).message === "timeout") {
        setError("La consulta de rol tardó demasiado");
        toast({
          title: "Error de red",
          description: "No se pudo comprobar tu rol. Intenta recargar",
          variant: "destructive",
        });
      }
      // if the request fails we won't leave the app indefinitely stuck
      // in loading state; treat as no role so the user can contact the
      // administrator or sign out and try again.
      setRole(null);
      cacheRole(userId, null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const handleSession = async (session: Session | null) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // try JWT metadata first
        const metaRole = session.user.app_metadata?.role as AppRole | undefined;
        if (metaRole !== undefined) {
          console.debug("using role from JWT metadata", { user: session.user.id, role: metaRole });
          setRole(metaRole);
          cacheRole(session.user.id, metaRole);
        } else {
          // read cached role to avoid spinner while we refresh in background
          const cached = readCachedRole(session.user.id);
          if (cached !== undefined) {
            console.debug("using cached role", { user: session.user.id, role: cached });
            setRole(cached);
          } else {
            // unknown until fetch completes
            setRole(undefined);
          }

          // refresh in background, don't await to avoid blocking UI
          fetchRole(session.user.id).catch((e) => console.debug("background fetchRole error", e));
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.debug("auth event", event, session);
      await handleSession(session);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => handleSession(session))
      .catch((err) => {
        console.error("getSession error", err);
        setError("falló la comprobación de sesión");
        toast({ title: "Error al consultar sesión", variant: "destructive" });
        setLoading(false);
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // keep the role up to date by subscribing to the user_roles row for
  // the current user. this is quick even if the tab was backgrounded.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`role-update-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setRole(payload.new.role as AppRole);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setRole(payload.new.role as AppRole);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setRole(null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // if loading lasts too long we assume the session/token is bad and clear
  // the stored auth data so the app doesn't hang forever. this mirrors the
  // effect the user gets by manually clearing cookies/localstorage.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      console.warn("authentication check timed out");
      setError("La verificación de sesión tardó demasiado");
      toast({
        title: "Error de autenticación",
        description:
          "Recarga la página o borra las cookies si el problema persiste",
        variant: "destructive",
      });
      supabase.auth.signOut();
      setLoading(false);
      setRole(null);
      setUser(null);
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <AuthContext.Provider
      value={{ user, session, role, loading, error, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { VgrLogo } from "@/components/brand/VgrLogo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { reclamarAdmin } from "@/lib/donaciones.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso administrativo — Voice of God Recordings" },
      { name: "description", content: "Inicio de sesión para el panel administrativo de donaciones." },
      { property: "og:title", content: "Acceso administrativo — Voice of God Recordings" },
      { property: "og:description", content: "Inicio de sesión para administradores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const reclamar = useServerFn(reclamarAdmin);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/admin" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const finishAuth = async () => {
    try {
      const result = await reclamar();
      if (result.ok) {
        toast.success("Cuenta activada como administrador.");
      } else if (result.error && !result.error.includes("Ya existe un administrador")) {
        toast.warning(result.error);
      }
    } catch {
      // La cuenta puede existir y necesitar que el administrador la asigne más tarde.
    } finally {
      navigate({ to: "/admin", replace: true });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await finishAuth();
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
      if (error) throw error;
      if (!data.session) {
        toast.success("Revise su correo para confirmar la cuenta.");
        return;
      }
      await finishAuth();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de autenticación";
      toast.error(message.includes("Invalid login credentials") ? "Credenciales inválidas. Revise el email y la contraseña." : message);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (r.error) toast.error("No se pudo iniciar sesión con Google");
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <VgrLogo size="sm" className="justify-center" />
          <h1 className="mt-6 text-center text-2xl font-semibold">{mode === "in" ? "Acceso administrativo" : "Crear cuenta"}</h1>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Contraseña</Label>
              <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {mode === "in" ? "Iniciar sesión" : "Crear cuenta"}
            </Button>
          </form>
          <Button variant="outline" className="mt-3 h-11 w-full" onClick={google}>
            Continuar con Google
          </Button>
          <button className="mt-4 w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "¿No tiene cuenta? Crear una" : "¿Ya tiene cuenta? Iniciar sesión"}
          </button>
        </div>
      </main>
    </div>
  );
}

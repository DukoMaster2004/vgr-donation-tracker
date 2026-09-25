import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AUTH_CHECK_TIMEOUT_MS = 6000;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // A hung/slow auth check must never freeze the button click forever.
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }; error: Error }>((resolve) =>
        setTimeout(
          () => resolve({ data: { user: null }, error: new Error("timeout") }),
          AUTH_CHECK_TIMEOUT_MS,
        ),
      ),
    ]);
    if (result.error || !result.data.user) throw redirect({ to: "/auth" });
    return { user: result.data.user };
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
  component: () => <Outlet />,
});

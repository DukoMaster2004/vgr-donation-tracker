import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VgrLogo } from "@/components/brand/VgrLogo";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}>
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="min-w-0">
          <VgrLogo size="sm" className="[&>span]:hidden sm:[&>span]:inline" />
        </Link>
        <nav className="flex items-center gap-1">
          {right ?? (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/registro">Registrar</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/admin">Administración</Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

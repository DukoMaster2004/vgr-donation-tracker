import { cn } from "@/lib/utils";

// Official VGR logo slot. Replace OFFICIAL_LOGO_URL with the real logo when available.
// Until then a clearly-marked placeholder is shown (no invented logo).
export const OFFICIAL_LOGO_URL: string | null = null;

export function VgrLogo({ size = "md", showName = true, className }: { size?: "sm" | "md" | "lg"; showName?: boolean; className?: string }) {
  const box = { sm: "h-9 w-9 text-[9px]", md: "h-12 w-12 text-[10px]", lg: "h-20 w-20 text-xs" }[size];
  const name = { sm: "text-lg", md: "text-2xl", lg: "text-4xl sm:text-5xl" }[size];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {OFFICIAL_LOGO_URL ? (
        <img src={OFFICIAL_LOGO_URL} alt="Logo Voice of God Recordings" className={cn(box, "object-contain")} />
      ) : (
        <div
          className={cn(box, "flex shrink-0 items-center justify-center rounded-md border-2 border-dashed border-gold/70 font-semibold uppercase tracking-wide text-muted-foreground")}
          title="Espacio reservado para el logo oficial de VGR"
          aria-label="Espacio para el logo oficial de VGR"
        >
          Logo
        </div>
      )}
      {showName && <span className={cn(name, "font-serif font-semibold italic leading-none")}>Voice of God Recordings</span>}
    </div>
  );
}

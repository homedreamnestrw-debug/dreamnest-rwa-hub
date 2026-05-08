import { Button } from "@/components/ui/button";
import { LANGUAGE_OPTIONS, StudioLanguage } from "@/lib/studioLanguage";
import { cn } from "@/lib/utils";

interface Props {
  value: StudioLanguage;
  onChange: (v: StudioLanguage) => void;
  className?: string;
  size?: "sm" | "xs";
}

export function LanguageSelector({ value, onChange, className, size = "sm" }: Props) {
  return (
    <div className={cn("inline-flex rounded-md border bg-background p-0.5", className)}>
      {LANGUAGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded px-2 py-1 text-xs transition-colors",
            size === "xs" && "px-1.5 py-0.5 text-[11px]",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
          title={opt.label}
        >
          <span className="mr-1">{opt.flag}</span>
          <span className="hidden sm:inline">{opt.label}</span>
          <span className="sm:hidden uppercase">{opt.value}</span>
        </button>
      ))}
    </div>
  );
}

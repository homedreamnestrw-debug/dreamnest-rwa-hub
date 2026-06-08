import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null; // percentage change vs prev
  invertDelta?: boolean; // true: lower is better (expenses)
}

export function KpiCard({ label, value, sub, delta, invertDelta }: Props) {
  const hasDelta = delta !== undefined && delta !== null && isFinite(delta);
  const positive = hasDelta && delta! > 0;
  const negative = hasDelta && delta! < 0;
  const good = invertDelta ? negative : positive;
  const bad = invertDelta ? positive : negative;
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold font-serif">{value}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{sub ?? ""}</span>
          {hasDelta && (
            <span className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              good && "text-emerald-600",
              bad && "text-destructive",
              !good && !bad && "text-muted-foreground",
            )}>
              {positive ? <ArrowUp className="h-3 w-3" /> : negative ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(delta!).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

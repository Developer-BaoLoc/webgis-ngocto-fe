import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "blue" | "green" | "amber" | "slate";
}

const accentStyles = {
  blue: "border-t-primary",
  green: "border-t-emerald-500",
  amber: "border-t-amber-500",
  slate: "border-t-slate-400",
};

export function StatCard({ label, value, hint, accent = "blue" }: StatCardProps) {
  return (
    <Card className={cn("border-t-4", accentStyles[accent])}>
      <CardContent className="pt-5">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </CardContent>
    </Card>
  );
}

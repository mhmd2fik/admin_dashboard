import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/40",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/10 text-info border-info/25",
  primary: "bg-primary/10 text-primary border-primary/25",
};

const MAP: Record<string, Tone> = {
  Approved: "success",
  Active: "success",
  Completed: "success",
  Published: "success",
  Delivered: "success",
  Present: "success",
  Passed: "success",
  "Pending Approval": "warning",
  Pending: "warning",
  "Pending Delivery": "warning",
  Draft: "neutral",
  Rejected: "danger",
  Blocked: "danger",
  Failed: "danger",
  Refunded: "danger",
  Expired: "danger",
  Optional: "neutral",
  Required: "info",
  Digital: "info",
  Physical: "primary",
};

export function StatusBadge({
  status,
  tone,
  className,
}: {
  status: string;
  tone?: Tone;
  className?: string;
}) {
  const t = tone ?? MAP[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[t],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

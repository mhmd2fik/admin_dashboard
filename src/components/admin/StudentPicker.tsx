import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/domain/store";
import { cn } from "@/lib/utils";

export function StudentPicker({
  value,
  onChange,
  exclude = [],
  emptyHint = "No students match your search.",
}: {
  value: string | null;
  onChange: (id: string) => void;
  exclude?: string[];
  emptyHint?: string;
}) {
  const { db } = useStore();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.students
      .filter((s) => !exclude.includes(s.id))
      .filter((s) =>
        term
          ? s.name.toLowerCase().includes(term) ||
            s.studentId.toLowerCase().includes(term) ||
            s.phone.includes(term)
          : true,
      )
      .slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.students, q, exclude.join(",")]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, student ID or phone…"
          className="pl-9"
        />
      </div>
      <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {results.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60",
                value === s.id && "bg-primary/10",
              )}
            >
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              <span className="num text-xs text-muted-foreground">{s.studentId}</span>
              {value === s.id && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

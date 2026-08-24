import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useStore } from "@/lib/domain/store";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { db } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search students and sessions…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search by name, student ID or session…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Students">
            {db.students.slice(0, 60).map((s) => (
              <CommandItem
                key={s.id}
                value={`${s.name} ${s.studentId} ${s.phone}`}
                onSelect={() =>
                  go(() => navigate({ to: "/students/$studentId", params: { studentId: s.id } }))
                }
              >
                {s.name}
                <span className="ml-auto text-xs text-muted-foreground">{s.studentId}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Sessions">
            {db.sessions.slice(0, 40).map((s) => (
              <CommandItem
                key={s.id}
                value={s.name}
                onSelect={() =>
                  go(() => navigate({ to: "/classes/$sessionId", params: { sessionId: s.id } }))
                }
              >
                {s.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

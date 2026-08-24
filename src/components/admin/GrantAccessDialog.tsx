import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Check, FileSpreadsheet, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/domain/store";
import { cn } from "@/lib/utils";

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const tail = (v: unknown) => digits(v).slice(-10);

export function GrantAccessDialog({
  open,
  onOpenChange,
  sessionId,
  expirationDays,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  expirationDays: number;
}) {
  const { db, grantFreeAccessMany } = useStore();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const alreadyIn = useMemo(
    () => new Set(db.enrollments.filter((e) => e.sessionId === sessionId).map((e) => e.studentId)),
    [db.enrollments, sessionId],
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.students
      .filter((s) => !alreadyIn.has(s.id))
      .filter((s) =>
        term
          ? s.name.toLowerCase().includes(term) ||
            s.studentId.toLowerCase().includes(term) ||
            s.phone.includes(term)
          : true,
      )
      .slice(0, 60);
  }, [db.students, alreadyIn, q]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const close = () => {
    onOpenChange(false);
    setSelected([]);
    setNote("");
    setQ("");
  };

  const importExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new Error("empty");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
      const phones = new Set<string>();
      for (const row of rows as unknown as unknown[][]) {
        for (const cell of row ?? []) {
          const d = tail(cell);
          if (d.length >= 10) phones.add(d);
        }
      }
      if (phones.size === 0) {
        toast.error("No phone numbers found in that file");
        return;
      }
      const matched: string[] = [];
      const unmatched: string[] = [];
      phones.forEach((p) => {
        const stu = db.students.find((s) => tail(s.phone) === p || tail(s.parentPhone) === p);
        if (stu) matched.push(stu.id);
        else unmatched.push(p);
      });
      const fresh = matched.filter((id) => !alreadyIn.has(id));
      setSelected((prev) => Array.from(new Set([...prev, ...fresh])));
      toast.success(`${fresh.length} student(s) selected from the file`, {
        description: [
          matched.length - fresh.length > 0
            ? `${matched.length - fresh.length} already have access`
            : "",
          unmatched.length > 0 ? `${unmatched.length} phone number(s) not found` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      });
    } catch {
      toast.error("Could not read that file. Use an .xlsx or .csv file with phone numbers.");
    }
  };

  const submit = () => {
    const res = grantFreeAccessMany(selected, sessionId, note.trim());
    if (res.granted === 0) {
      toast.error("No new students were granted access");
      return;
    }
    toast.success(`Session opened for free for ${res.granted} student(s)`, {
      description:
        res.skipped > 0
          ? `${res.skipped} skipped — they already had access.`
          : "No wallet charge — they count with the enrolled students.",
    });
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Open this session for free</DialogTitle>
          <DialogDescription>
            Pick as many students as you like, or upload an Excel/CSV file of phone numbers. Each
            student gets {expirationDays} days of access with no wallet charge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importExcel(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet className="h-4 w-4" /> Upload Excel of phone numbers
            </Button>
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                <X className="h-4 w-4" /> Clear {selected.length} selected
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, student ID or phone…"
              className="pl-9"
            />
          </div>

          <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {results.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No students match — students who already have access are hidden.
              </p>
            ) : (
              results.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60",
                      on && "bg-primary/10",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded border border-border",
                        on && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                    <span className="num text-xs text-muted-foreground">{s.phone}</span>
                    <span className="num text-xs text-muted-foreground">{s.studentId}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grant-note">Reason (optional)</Label>
            <Input
              id="grant-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. scholarship, compensation for a missed class"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={selected.length === 0} onClick={submit}>
            Open for {selected.length || "0"} student{selected.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

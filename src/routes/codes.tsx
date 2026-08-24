import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Copy,
  Download,
  MessageCircle,
  Plus,
  Search,
  Ticket,
  Trash2,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StudentPicker } from "@/components/admin/StudentPicker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/domain/store";
import { egp, fmtDate, fmtDateTime } from "@/lib/format";
import { exportWorkbook, stamp } from "@/lib/export";
import { waLink } from "@/lib/whatsapp";
import type { WalletCode } from "@/lib/domain/types";

export const Route = createFileRoute("/codes")({
  head: () => ({
    meta: [
      { title: "Wallet codes — Math Academy Admin" },
      {
        name: "description",
        content:
          "Generate single-use wallet recharge codes, send them to students and track exactly who redeemed each code and when.",
      },
      { property: "og:title", content: "Wallet codes — Math Academy Admin" },
      {
        property: "og:description",
        content: "Single-use recharge codes with full redemption history and Excel export.",
      },
    ],
  }),
  component: CodesPage,
});

const PAGE_SIZE = 15;

const statusOf = (c: WalletCode) => {
  if (c.redeemedBy) return "Used";
  if (!c.active) return "Deactivated";
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return "Expired";
  return "Unused";
};

function CodesPage() {
  const { db, generateCodes, redeemCode, setCodeActive, deleteCode } = useStore();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [batch, setBatch] = useState("all");
  const [page, setPage] = useState(1);

  const [genOpen, setGenOpen] = useState(false);
  const [value, setValue] = useState("120");
  const [quantity, setQuantity] = useState("10");
  const [batchName, setBatchName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [lastBatch, setLastBatch] = useState<WalletCode[]>([]);

  const [redeemFor, setRedeemFor] = useState<WalletCode | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [sendTo, setSendTo] = useState<WalletCode | null>(null);
  const [toDelete, setToDelete] = useState<WalletCode | null>(null);

  const batches = useMemo(
    () => Array.from(new Set(db.codes.map((c) => c.batch).filter(Boolean))).sort(),
    [db.codes],
  );

  const studentOf = (id?: string | null) => db.students.find((s) => s.id === id);

  const filtered = useMemo(() => {
    const term = q.trim().toUpperCase();
    return db.codes.filter((c) => {
      if (term) {
        const stu = studentOf(c.redeemedBy);
        const hit =
          c.code.includes(term) ||
          (stu?.name.toUpperCase().includes(term) ?? false) ||
          (stu?.studentId.toUpperCase().includes(term) ?? false);
        if (!hit) return false;
      }
      if (status !== "all" && statusOf(c) !== status) return false;
      if (batch !== "all" && c.batch !== batch) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.codes, db.students, q, status, batch]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const totals = useMemo(() => {
    const used = db.codes.filter((c) => c.redeemedBy);
    const unused = db.codes.filter((c) => statusOf(c) === "Unused");
    return {
      issued: db.codes.length,
      unused: unused.length,
      used: used.length,
      issuedValue: db.codes.reduce((a, c) => a + c.value, 0),
      usedValue: used.reduce((a, c) => a + c.value, 0),
    };
  }, [db.codes]);

  const generate = () => {
    const v = Number(value);
    const n = Number(quantity);
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Enter a valid code value in EGP");
      return;
    }
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      toast.error("Quantity must be between 1 and 500");
      return;
    }
    const created = generateCodes({
      value: v,
      quantity: n,
      batch: batchName.trim() || `${v} EGP · ${fmtDate(new Date().toISOString())}`,
      expiresAt: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null,
    });
    setLastBatch(created);
    setGenOpen(false);
    setPage(1);
    toast.success(`${created.length} code(s) generated`, {
      description: `${egp(v)} each — copy or export them to share with students.`,
    });
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  const exportCodes = (list: WalletCode[], name: string) => {
    if (list.length === 0) {
      toast.error("No codes to export");
      return;
    }
    exportWorkbook(`${name}-${stamp()}.xlsx`, [
      {
        name: "Codes",
        rows: list.map((c) => {
          const stu = studentOf(c.redeemedBy);
          return {
            Code: c.code,
            "Value (EGP)": c.value,
            Status: statusOf(c),
            Batch: c.batch,
            Created: fmtDateTime(c.createdAt),
            Expires: c.expiresAt ? fmtDate(c.expiresAt) : "No expiry",
            "Used by": stu?.name ?? "—",
            "Student ID": stu?.studentId ?? "—",
            "Used at": c.redeemedAt ? fmtDateTime(c.redeemedAt) : "—",
            Transaction: c.transactionId ?? "—",
          };
        }),
      },
    ]);
    toast.success("Excel file downloaded");
  };

  const doRedeem = () => {
    if (!redeemFor || !studentId) {
      toast.error("Pick a student first");
      return;
    }
    const res = redeemCode(redeemFor.code, studentId);
    if (res.ok) toast.success("Code redeemed", { description: res.message });
    else toast.error(res.message);
    setRedeemFor(null);
    setStudentId(null);
  };

  return (
    <div>
      <PageHeader
        title="Wallet codes"
        description="Generate single-use recharge codes, hand them to students and see exactly who used each code and when."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Codes" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => exportCodes(filtered, "wallet-codes")}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setGenOpen(true)}>
              <Plus className="h-4 w-4" /> Generate codes
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Codes issued</p>
          <p className="num mt-1 text-2xl font-semibold">{totals.issued}</p>
          <p className="text-xs text-muted-foreground">{egp(totals.issuedValue)} total value</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Still unused</p>
          <p className="num mt-1 text-2xl font-semibold">{totals.unused}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Redeemed</p>
          <p className="num mt-1 text-2xl font-semibold">{totals.used}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Value redeemed</p>
          <p className="num mt-1 text-2xl font-semibold">{egp(totals.usedValue)}</p>
        </div>
      </div>

      {lastBatch.length > 0 && (
        <div className="panel mb-4 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">Last generated batch</p>
              <p className="text-sm text-muted-foreground">
                {lastBatch.length} × {egp(lastBatch[0]!.value)} — {lastBatch[0]!.batch}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyText(lastBatch.map((c) => c.code).join("\n"), "All codes")}
              >
                <Copy className="h-4 w-4" /> Copy all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCodes(lastBatch, "code-batch")}
              >
                <Download className="h-4 w-4" /> Export batch
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLastBatch([])}>
                Dismiss
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lastBatch.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => copyText(c.code, c.code)}
                className="num rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
              >
                {c.code}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search a code or the student who used it…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Unused">Unused</SelectItem>
            <SelectItem value="Used">Used</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
            <SelectItem value="Deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={batch}
          onValueChange={(v) => {
            setBatch(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-56">
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All batches</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-x-auto">
        {db.codes.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No codes yet"
            description="Generate a batch of single-use codes with a fixed value — students redeem them to top up their wallet."
            action={<Button onClick={() => setGenOpen(true)}>Generate codes</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching codes"
            description="No code or redemption matches your search and filters."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Used by</TableHead>
                <TableHead>Used at</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const stu = studentOf(c.redeemedBy);
                const st = statusOf(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => copyText(c.code, c.code)}
                        className="num font-medium hover:underline"
                        title="Copy code"
                      >
                        {c.code}
                      </button>
                    </TableCell>
                    <TableCell className="num">{egp(c.value)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={st}
                        tone={st === "Used" ? "info" : st === "Unused" ? "success" : "danger"}
                      />
                    </TableCell>
                    <TableCell>
                      {stu ? (
                        <Link
                          to="/students/$studentId"
                          params={{ studentId: stu.id }}
                          className="font-medium hover:underline"
                        >
                          {stu.name}
                          <span className="num ml-2 text-xs text-muted-foreground">
                            {stu.studentId}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.redeemedAt ? fmtDateTime(c.redeemedAt) : "—"}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">
                      {c.batch}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {st === "Unused" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRedeemFor(c);
                                setStudentId(null);
                              }}
                            >
                              <Wallet className="h-4 w-4" /> Redeem
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Send ${c.code} on WhatsApp`}
                              onClick={() => {
                                setSendTo(c);
                                setStudentId(null);
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Deactivate ${c.code}`}
                              onClick={() => {
                                setCodeActive(c.id, false);
                                toast.success(`${c.code} deactivated`);
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {st === "Deactivated" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCodeActive(c.id, true);
                              toast.success(`${c.code} reactivated`);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Reactivate
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${c.code}`}
                          onClick={() => setToDelete(c)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {current} of {pages} · {filtered.length} code(s)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate wallet codes</DialogTitle>
            <DialogDescription>
              Each code is unique, worth the value you set and can be redeemed only once.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code-value">Value (EGP)</Label>
              <Input
                id="code-value"
                type="number"
                min={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code-qty">How many codes</Label>
              <Input
                id="code-qty"
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="code-batch">Batch name (optional)</Label>
              <Input
                id="code-batch"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. Ramadan offer — Cairo centre"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="code-expiry">Expiry date (optional)</Label>
              <Input
                id="code-expiry"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generate}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!redeemFor} onOpenChange={(v) => !v && setRedeemFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem {redeemFor?.code}</DialogTitle>
            <DialogDescription>
              {redeemFor ? egp(redeemFor.value) : ""} will be added to the selected student's wallet
              and the code will be locked as used.
            </DialogDescription>
          </DialogHeader>
          <StudentPicker value={studentId} onChange={setStudentId} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemFor(null)}>
              Cancel
            </Button>
            <Button onClick={doRedeem} disabled={!studentId}>
              Add to wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sendTo} onOpenChange={(v) => !v && setSendTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {sendTo?.code} on WhatsApp</DialogTitle>
            <DialogDescription>
              Pick the student who should receive this code — the message opens prefilled.
            </DialogDescription>
          </DialogHeader>
          <StudentPicker value={studentId} onChange={setStudentId} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTo(null)}>
              Cancel
            </Button>
            <Button
              disabled={!studentId}
              onClick={() => {
                const stu = studentOf(studentId);
                if (!stu || !sendTo) return;
                const text = `Hello ${stu.name},\n\nHere is your wallet recharge code: ${sendTo.code}\nValue: ${egp(sendTo.value)}\n${sendTo.expiresAt ? `Valid until: ${fmtDate(sendTo.expiresAt)}\n` : ""}\nEnter it in the app to top up your wallet. It can be used once only.`;
                window.open(waLink(stu.phone, text), "_blank");
                setSendTo(null);
                setStudentId(null);
              }}
            >
              <MessageCircle className="h-4 w-4" /> Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete this code?"
        description={
          <p>
            {toDelete?.code} will be removed permanently. Any wallet credit already given stays in
            the student's ledger.
          </p>
        }
        confirmLabel="Delete code"
        onConfirm={() => {
          if (toDelete) {
            deleteCode(toDelete.id);
            toast.success("Code deleted");
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}

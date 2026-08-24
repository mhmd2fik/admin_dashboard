import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Undo2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { egp, fmtDateTime } from "@/lib/format";
import { Label } from "@/components/ui/label";
import { exportWorkbook, stamp } from "@/lib/export";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Math Academy Admin" },
      {
        name: "description",
        content:
          "Track wallet recharges, session purchases, wallet code charges, refunds and revenue.",
      },
      { property: "og:title", content: "Payments — Math Academy Admin" },
      {
        property: "og:description",
        content: "Wallet recharges, purchases, refunds and revenue in one ledger.",
      },
    ],
  }),
  component: PaymentsPage,
});

const PAGE_SIZE = 12;

const TYPES = [
  "Fawry Wallet Recharge",
  "Session Purchase",
  "Refund",
  "Manual Wallet Adjustment",
  "Wallet Code Charge",
] as const;

function PaymentsPage() {
  const { db, ready, refundTransaction } = useStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [method, setMethod] = useState("all");
  const [page, setPage] = useState(1);
  const [toRefund, setToRefund] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const studentName = (id: string) => db.students.find((s) => s.id === id)?.name ?? "Unknown";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.transactions.filter((t) => {
      if (term) {
        const hit =
          t.id.toLowerCase().includes(term) ||
          studentName(t.studentId).toLowerCase().includes(term);
        if (!hit) return false;
      }
      if (type !== "all" && t.type !== type) return false;
      if (method !== "all" && t.method !== method) return false;
      if (
        status === "Refunded"
          ? !t.refunded
          : status !== "all" && (t.refunded || t.status !== status)
      )
        return false;
      const day = t.createdAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.transactions, db.students, q, type, method, status, from, to]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const totals = useMemo(() => {
    const revenue = db.transactions
      .filter((t) => t.amount < 0 && t.status === "Completed" && !t.refunded)
      .reduce((a, t) => a + Math.abs(t.amount), 0);
    const recharges = db.transactions
      .filter((t) => t.type === "Fawry Wallet Recharge" && t.status === "Completed")
      .reduce((a, t) => a + t.amount, 0);
    const refunds = db.transactions.filter((t) => t.refunded).length;
    const wallets = db.students.reduce((a, s) => a + s.wallet, 0);
    return { revenue, recharges, refunds, wallets };
  }, [db.transactions, db.students]);

  const target = db.transactions.find((t) => t.id === toRefund);

  const exportTransactions = () => {
    if (filtered.length === 0) {
      toast.error("No transactions match the current filters");
      return;
    }
    exportWorkbook(`payments-${stamp()}.xlsx`, [
      {
        name: "Transactions",
        rows: filtered.map((t) => {
          const stu = db.students.find((s) => s.id === t.studentId);
          return {
            "Transaction ID": t.id,
            Student: stu?.name ?? "Unknown",
            "Student ID": stu?.studentId ?? "",
            Type: t.type,
            Method: t.method,
            "Amount (EGP)": t.amount,
            "Balance after (EGP)": t.balanceAfter,
            Date: fmtDateTime(t.createdAt),
            Status: t.refunded ? "Refunded" : t.status,
          };
        }),
      },
      {
        name: "Summary",
        rows: [
          { Metric: "Revenue (EGP)", Value: totals.revenue },
          { Metric: "Wallet recharges (EGP)", Value: totals.recharges },
          { Metric: "Wallet balances (EGP)", Value: totals.wallets },
          { Metric: "Refunded transactions", Value: totals.refunds },
          { Metric: "Rows exported", Value: filtered.length },
        ],
      },
    ]);
    toast.success(`Exported ${filtered.length} transaction(s)`);
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Every wallet movement, purchase and refund."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Payments" }]}
        actions={
          <Button variant="outline" onClick={exportTransactions}>
            <Download className="h-4 w-4" /> Export to Excel
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue", value: egp(totals.revenue) },
          { label: "Wallet recharges", value: egp(totals.recharges) },
          { label: "Wallet balances", value: egp(totals.wallets) },
          { label: "Refunded transactions", value: String(totals.refunds) },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by student or transaction ID…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-72"
        />
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={method}
          onValueChange={(v) => {
            setMethod(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="Fawry">Fawry</SelectItem>
            <SelectItem value="Wallet">Wallet</SelectItem>
            <SelectItem value="Wallet Code">Wallet Code</SelectItem>
            <SelectItem value="Admin Adjustment">Admin Adjustment</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="Refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label htmlFor="from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
          <Label htmlFor="to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        {(from || to || status !== "all" || type !== "all" || method !== "all" || q) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setType("all");
              setMethod("all");
              setStatus("all");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        {!ready ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No transactions found"
            description="Try a different search or filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance after</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell>
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: t.studentId }}
                      className="font-medium hover:underline"
                    >
                      {studentName(t.studentId)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.type}</TableCell>
                  <TableCell className="text-muted-foreground">{t.method}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${t.amount < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {egp(t.amount, { sign: true })}
                  </TableCell>
                  <TableCell className="text-right">{egp(t.balanceAfter)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDateTime(t.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.refunded ? "Refunded" : t.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {t.amount < 0 && !t.refunded && t.status === "Completed" ? (
                      <Button variant="ghost" size="sm" onClick={() => setToRefund(t.id)}>
                        <Undo2 className="mr-1 h-4 w-4" /> Refund
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {current} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toRefund}
        onOpenChange={(o) => !o && setToRefund(null)}
        title="Refund transaction?"
        description={`${egp(Math.abs(target?.amount ?? 0))} will be credited back to the student's wallet.`}
        confirmLabel="Refund"
        onConfirm={() => {
          if (toRefund) {
            refundTransaction(toRefund);
            toast.success("Transaction refunded");
          }
          setToRefund(null);
        }}
      />
    </div>
  );
}

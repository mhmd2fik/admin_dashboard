import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  ListChecks,
  MessageCircle,
  Pencil,
  RotateCcw,
  Smartphone,
  Ticket,
  UserRound,
  Wallet as WalletIcon,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StudentFormDialog } from "@/components/admin/StudentFormDialog";
import { NotificationDialog } from "@/components/admin/NotificationDialog";
import { ExamAnswersDialog } from "@/components/admin/ExamAnswersDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/domain/store";
import { egp, fmtDate, fmtDateTime, initials } from "@/lib/format";
import { buildParentReport, waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/students/$studentId")({
  head: () => ({
    meta: [
      { title: "Student profile — Math Academy Admin" },
      {
        name: "description",
        content:
          "Student details, wallet history, session progress, exam answers and authorized device.",
      },
      { property: "og:title", content: "Student profile — Math Academy Admin" },
      {
        property: "og:description",
        content: "Manage a student's wallet, purchases, grades, device and notifications.",
      },
    ],
  }),
  component: StudentDetailPage,
});

function StudentDetailPage() {
  const { studentId } = Route.useParams();
  const { db, addTransaction, refundTransaction, resetDevice, update, redeemCode } = useStore();
  const student = db.students.find((s) => s.id === studentId);

  const [editOpen, setEditOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<"add" | "deduct" | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmAdjust, setConfirmAdjust] = useState(false);
  const [refundTx, setRefundTx] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [reportSession, setReportSession] = useState<string>("");
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [examView, setExamView] = useState<{ partId: string; enrollmentId: string } | null>(null);

  const txs = useMemo(
    () => db.transactions.filter((t) => t.studentId === studentId),
    [db.transactions, studentId],
  );
  const enrollments = useMemo(
    () => db.enrollments.filter((e) => e.studentId === studentId),
    [db.enrollments, studentId],
  );
  const notes = db.notifications.filter((n) => n.studentIds.includes(studentId));

  if (!student) {
    return (
      <EmptyState
        icon={UserRound}
        title="Student not found"
        description="This student may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link to="/students">Back to students</Link>
          </Button>
        }
      />
    );
  }

  const parsed = Number(amount);
  const validAmount = Number.isFinite(parsed) && parsed > 0;
  const refundTarget = txs.find((t) => t.id === refundTx);

  const applyAdjust = () => {
    const signed = adjustMode === "deduct" ? -parsed : parsed;
    addTransaction({
      studentId: student.id,
      type: "Manual Wallet Adjustment",
      amount: signed,
      method: "Admin Adjustment",
      note: note || (adjustMode === "add" ? "Manual credit" : "Manual deduction"),
    });
    toast.success("Wallet updated", {
      description: `${adjustMode === "add" ? "Added" : "Deducted"} ${egp(parsed)} for ${student.name}.`,
    });
    setAmount("");
    setNote("");
    setAdjustMode(null);
    setConfirmAdjust(false);
  };

  const setPartField = (enrollmentId: string, partId: string, patch: Record<string, unknown>) =>
    update((d) => {
      const e = d.enrollments.find((x) => x.id === enrollmentId);
      const p = e?.parts.find((x) => x.partId === partId);
      if (p) Object.assign(p, patch);
      return d;
    });

  return (
    <div>
      <PageHeader
        title={student.name}
        description={`${student.studentId} · ${student.level} · ${student.governorate}`}
        crumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Students", to: "/students" },
          { label: student.name },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => setNotifyOpen(true)}>
              <Bell className="h-4 w-4" /> Notify
            </Button>
            <Button variant="outline" onClick={() => setRedeemOpen(true)}>
              <Ticket className="h-4 w-4" /> Redeem code
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials(student.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{student.name}</p>
            <p className="num truncate text-xs text-muted-foreground">{student.studentId}</p>
          </div>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Wallet balance</p>
          <p className="num mt-1 text-2xl font-semibold">{egp(student.wallet)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Statuses</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={student.accountStatus} />
            <StatusBadge status={student.registrationStatus} />
          </div>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Sessions owned</p>
          <p className="num mt-1 text-2xl font-semibold">{enrollments.length}</p>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="wallet">Wallet &amp; payments</TabsTrigger>
          <TabsTrigger value="access">Authorized device</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="panel divide-y divide-border">
            {[
              ["Full name", student.name],
              ["Student ID", student.studentId],
              ["Student phone", student.phone],
              ["Parent phone", student.parentPhone],
              ["Level", student.level],
              ["Gender", student.gender],
              ["Governorate", student.governorate],
              ["Password", "•".repeat(student.password.length || 8)],
              ["Registered", fmtDateTime(student.registeredAt)],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 p-3 text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="truncate font-medium">{v}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress">
          {enrollments.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={WalletIcon}
                title="No purchased sessions"
                description="This student has not purchased any session yet."
              />
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((e) => {
                const ses = db.sessions.find((s) => s.id === e.sessionId);
                const parts = db.parts
                  .filter((p) => p.sessionId === e.sessionId)
                  .sort((a, b) => a.order - b.order);
                const required = parts.filter((p) => p.required);
                const done = required.filter(
                  (p) => e.parts.find((x) => x.partId === p.id)?.completed,
                ).length;
                const percent = required.length ? (done / required.length) * 100 : 0;
                const expired = new Date(e.expiresAt) < new Date();
                return (
                  <div key={e.id} className="panel overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{ses?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {student.level} ·{" "}
                          {db.categories.find((c) => c.id === ses?.categoryId)?.name} · purchased{" "}
                          {fmtDate(e.purchasedAt)} · expires {fmtDate(e.expiresAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={expired ? "Expired" : "Active"} />
                        <div className="w-32">
                          <Progress value={percent} />
                          <p className="num mt-1 text-xs text-muted-foreground">
                            {Math.round(percent)}% complete
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReportSession(e.sessionId)}
                        >
                          <MessageCircle className="h-4 w-4" /> Parent report
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Part</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Required</TableHead>
                            <TableHead>Detail</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead className="text-right">Admin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parts.map((p) => {
                            const pr = e.parts.find((x) => x.partId === p.id);
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium whitespace-nowrap">
                                  {p.title}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{p.type}</TableCell>
                                <TableCell>
                                  <StatusBadge status={p.required ? "Required" : "Optional"} />
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                                  {p.type === "Video" &&
                                    `${pr?.opens ?? 0}/${p.maxViews} opens · ${pr?.watchMinutes ?? 0} min · ${pr?.completionPct ?? 0}%`}
                                  {p.type === "Test" &&
                                    `Max ${p.totalDegree} · pass ${p.passingDegree}`}
                                  {p.type === "Homework" &&
                                    `${pr?.submitted ? "Submitted" : "Not submitted"}${pr?.graded ? " · graded" : ""}`}
                                  {p.type === "PDF" && (pr?.completed ? "Opened" : "Not opened")}
                                </TableCell>
                                <TableCell>
                                  {p.type === "Test" || p.type === "Homework" ? (
                                    <Input
                                      className="num h-8 w-20"
                                      value={pr?.grade ?? ""}
                                      onChange={(ev) =>
                                        setPartField(e.id, p.id, {
                                          grade:
                                            ev.target.value === "" ? null : Number(ev.target.value),
                                          graded: true,
                                        })
                                      }
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setPartField(e.id, p.id, {
                                          completed: !pr?.completed,
                                          completionPct: !pr?.completed ? 100 : 0,
                                        });
                                        toast.success("Progress updated");
                                      }}
                                    >
                                      {pr?.completed ? "Mark incomplete" : "Mark completed"}
                                    </Button>
                                    {(p.type === "Test" || p.type === "Homework") && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setExamView({ partId: p.id, enrollmentId: e.id })
                                        }
                                      >
                                        <ListChecks className="h-4 w-4" /> Answers
                                      </Button>
                                    )}
                                    {p.type === "Video" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setPartField(e.id, p.id, { opens: 0 });
                                          toast.success("View count reset");
                                        }}
                                      >
                                        Reset views
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wallet">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAdjustMode("add")}>
              <WalletIcon className="h-4 w-4" /> Add balance
            </Button>
            <Button variant="outline" onClick={() => setAdjustMode("deduct")}>
              <WalletIcon className="h-4 w-4" /> Deduct balance
            </Button>
          </div>
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Related</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance after</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="num whitespace-nowrap">{t.id}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {t.type}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {db.sessions.find((s) => s.id === t.relatedSessionId)?.name ?? t.note ?? "—"}
                    </TableCell>
                    <TableCell
                      className={`num text-right font-medium ${t.amount > 0 ? "text-success" : ""}`}
                    >
                      {egp(t.amount, { sign: true })}
                    </TableCell>
                    <TableCell className="num text-right">{egp(t.balanceAfter)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {fmtDate(t.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.amount < 0 && t.type !== "Manual Wallet Adjustment" ? (
                        t.refunded ? (
                          <StatusBadge status="Refunded" />
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setRefundTx(t.id)}>
                            <RotateCcw className="h-4 w-4" /> Refund
                          </Button>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {txs.length === 0 && (
              <EmptyState
                icon={WalletIcon}
                title="No transactions yet"
                description="Fawry recharges and purchases will appear here."
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="access">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel p-4">
              <h2 className="mb-3 text-sm font-semibold">Authorized device</h2>
              {student.device ? (
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Smartphone className="h-4 w-4" /> {student.device.label}
                  </p>
                  <p className="text-muted-foreground">{student.device.os}</p>
                  <p className="text-muted-foreground">
                    Registered {fmtDateTime(student.device.registeredAt)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No device registered yet. The first device used after approval will be locked in.
                </p>
              )}
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                disabled={!student.device}
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="h-4 w-4" /> Reset authorized device
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="panel divide-y divide-border">
            {notes.map((n) => (
              <div key={n.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">Audience: {n.audience}</p>
              </div>
            ))}
            {notes.length === 0 && (
              <EmptyState
                icon={Bell}
                title="No notifications yet"
                description="Send a notification to reach this student."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Wallet adjust */}
      <Dialog open={!!adjustMode} onOpenChange={(v) => !v && setAdjustMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{adjustMode === "add" ? "Add balance" : "Deduct balance"}</DialogTitle>
            <DialogDescription>
              Manual adjustments are recorded in the ledger as Admin Adjustment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount (EGP)</Label>
              <Input
                id="amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 250"
              />
              {!validAmount && amount !== "" && (
                <p className="text-xs text-destructive">Enter a positive amount.</p>
              )}
              {adjustMode === "deduct" && validAmount && parsed > student.wallet && (
                <p className="text-xs text-destructive">
                  Amount exceeds the current wallet balance ({egp(student.wallet)}).
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nte">Reason</Label>
              <Textarea id="nte" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustMode(null)}>
              Cancel
            </Button>
            <Button
              disabled={!validAmount || (adjustMode === "deduct" && parsed > student.wallet)}
              onClick={() => setConfirmAdjust(true)}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmAdjust}
        onOpenChange={setConfirmAdjust}
        destructive={adjustMode === "deduct"}
        title={adjustMode === "add" ? "Confirm wallet credit" : "Confirm wallet deduction"}
        description={
          <p>
            This will {adjustMode === "add" ? "credit" : "deduct"} the wallet immediately and create
            a transaction record.
          </p>
        }
        details={
          <div className="space-y-1">
            <p className="font-medium">{student.name}</p>
            <p className="num text-muted-foreground">
              {egp(student.wallet)} →{" "}
              {egp(student.wallet + (adjustMode === "deduct" ? -parsed : parsed))} (
              {adjustMode === "deduct" ? "−" : "+"}
              {egp(parsed || 0)})
            </p>
          </div>
        }
        confirmLabel={adjustMode === "add" ? "Add balance" : "Deduct balance"}
        onConfirm={applyAdjust}
      />

      <ConfirmDialog
        open={!!refundTx}
        onOpenChange={(v) => !v && setRefundTx(null)}
        title="Refund this purchase?"
        description={
          <p>
            The amount returns to the student's wallet as a separate refund transaction. The
            original purchase stays in history.
          </p>
        }
        details={
          refundTarget && (
            <div className="space-y-1">
              <p className="num font-medium">
                {refundTarget.id} · {refundTarget.type}
              </p>
              <p className="num text-muted-foreground">
                Refund {egp(Math.abs(refundTarget.amount))} to {student.name}
              </p>
            </div>
          )
        }
        confirmLabel="Refund"
        onConfirm={() => {
          if (!refundTarget) return;
          refundTransaction(refundTarget.id);
          toast.success("Refund completed", {
            description: `${egp(Math.abs(refundTarget.amount))} returned to the wallet.`,
          });
          setRefundTx(null);
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset authorized device?"
        description={
          <p>
            The current device will be unlinked. The next device the student logs in from becomes
            the new authorized device.
          </p>
        }
        details={<p className="font-medium">{student.device?.label ?? "—"}</p>}
        confirmLabel="Reset device"
        onConfirm={() => {
          resetDevice(student.id);
          toast.success("Device reset", { description: student.name });
          setResetOpen(false);
        }}
      />

      {/* WhatsApp parent report */}
      <Dialog open={!!reportSession && false} onOpenChange={() => setReportSession("")}>
        <DialogContent />
      </Dialog>
      <Dialog open={!!reportSession} onOpenChange={(v) => !v && setReportSession("")}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Parent WhatsApp report</DialogTitle>
            <DialogDescription>
              Sent to the parent phone {student.parentPhone}. "Attended" means the session was
              purchased.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {buildParentReport(db, student, reportSession)}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportSession("")}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                window.open(
                  waLink(student.parentPhone, buildParentReport(db, student, reportSession)),
                  "_blank",
                );
                toast.success("WhatsApp report opened");
              }}
            >
              <MessageCircle className="h-4 w-4" /> Send on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student} />

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem a wallet code</DialogTitle>
            <DialogDescription>
              Enter the code the student received. Each code works once and credits its value
              straight to {student.name}'s wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="redeem-code">Code</Label>
            <Input
              id="redeem-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="MTH-XXXX-XXXX"
              className="num"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!codeInput.trim()}
              onClick={() => {
                const res = redeemCode(codeInput, student.id);
                if (res.ok) {
                  toast.success("Code redeemed", { description: res.message });
                  setCodeInput("");
                  setRedeemOpen(false);
                } else {
                  toast.error(res.message);
                }
              }}
            >
              Add to wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExamAnswersDialog
        open={!!examView}
        onOpenChange={(v) => !v && setExamView(null)}
        part={db.parts.find((p) => p.id === examView?.partId) ?? null}
        progress={db.enrollments
          .find((e) => e.id === examView?.enrollmentId)
          ?.parts.find((x) => x.partId === examView?.partId)}
        studentName={student.name}
      />

      <NotificationDialog
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        selectedIds={[student.id]}
      />
    </div>
  );
}

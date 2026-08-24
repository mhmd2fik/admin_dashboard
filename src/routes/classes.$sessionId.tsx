import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileText,
  GraduationCap,
  ListChecks,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  Trash2,
  CalendarClock,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SessionFormDialog } from "@/components/admin/SessionFormDialog";
import { PartDialog } from "@/components/admin/PartDialog";
import { GrantAccessDialog } from "@/components/admin/GrantAccessDialog";
import { ExamAnswersDialog } from "@/components/admin/ExamAnswersDialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/domain/store";
import { egp, fmtDate } from "@/lib/format";
import { buildParentReport, waLink } from "@/lib/whatsapp";
import type { Part } from "@/lib/domain/types";

export const Route = createFileRoute("/classes/$sessionId")({
  head: () => ({
    meta: [
      { title: "Session builder — Math Academy Admin" },
      {
        name: "description",
        content:
          "Build a session: ordered video, test, homework and PDF parts with prerequisites and expiry rules.",
      },
      { property: "og:title", content: "Session builder — Math Academy Admin" },
      {
        property: "og:description",
        content: "Order parts, edit questions, clone content and publish sessions.",
      },
    ],
  }),
  component: SessionDetailPage,
});

const PART_ICON = {
  Video: Play,
  Test: ListChecks,
  Homework: FileText,
  PDF: FileText,
} as const;

function SessionDetailPage() {
  const { sessionId } = Route.useParams();
  const { db, saveSession, saveParts, deleteSession, clonePart, revokeAccess, extendAccess } =
    useStore();
  const session = db.sessions.find((s) => s.id === sessionId);

  const [editOpen, setEditOpen] = useState(false);
  const [partOpen, setPartOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [partToDelete, setPartToDelete] = useState<string | null>(null);
  const [deleteSessionOpen, setDeleteSessionOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneSource, setCloneSource] = useState("");
  const [clonePartId, setClonePartId] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [toRevoke, setToRevoke] = useState<string | null>(null);
  const [examView, setExamView] = useState<{ enrollmentId: string; partId: string } | null>(null);
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [reopenDate, setReopenDate] = useState("");

  const parts = useMemo(
    () => db.parts.filter((p) => p.sessionId === sessionId).sort((a, b) => a.order - b.order),
    [db.parts, sessionId],
  );

  const enrollments = db.enrollments.filter((e) => e.sessionId === sessionId);
  const examParts = parts.filter((p) => p.type === "Test" || p.type === "Homework");
  const paidCount = enrollments.filter((e) => e.source !== "Free").length;
  const freeCount = enrollments.length - paidCount;
  const revokeTarget = enrollments.find((e) => e.id === toRevoke);
  const revokeStudent = db.students.find((s) => s.id === revokeTarget?.studentId);

  const sendParentReport = (studentId: string) => {
    const stu = db.students.find((s) => s.id === studentId);
    if (!stu) return;
    window.open(waLink(stu.parentPhone, buildParentReport(db, stu, sessionId)), "_blank");
  };

  if (!session) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Session not found"
        description="This session may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link to="/classes">Back to classes</Link>
          </Button>
        }
      />
    );
  }

  const level = db.levels.find((l) => l.id === session.levelId);
  const category = db.categories.find((c) => c.id === session.categoryId);
  const prereq = db.sessions.find((s) => s.id === session.prerequisiteId);

  const persist = (list: Part[]) =>
    saveParts(
      sessionId,
      list.map((p, i) => ({ ...p, order: i + 1 })),
    );

  const move = (id: string, dir: -1 | 1) => {
    const i = parts.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= parts.length) return;
    const list = [...parts];
    const a = list[i]!;
    list[i] = list[j]!;
    list[j] = a;
    persist(list);
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = parts.findIndex((p) => p.id === dragId);
    const to = parts.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const list = [...parts];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved!);
    persist(list);
    setDragId(null);
    toast.success("Part order updated");
  };

  const cloneSourceParts = db.parts
    .filter((p) => p.sessionId === cloneSource)
    .sort((a, b) => a.order - b.order);
  const partTarget = parts.find((p) => p.id === partToDelete);

  return (
    <div>
      <PageHeader
        title={session.name}
        description={`${level?.name ?? "—"} · ${category?.name ?? "—"} · ${egp(session.price)} · ${session.expirationDays} days access`}
        crumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Classes", to: "/classes" },
          { label: session.name },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                saveSession({
                  ...session,
                  status: session.status === "Published" ? "Draft" : "Published",
                });
                toast.success(
                  session.status === "Published" ? "Session unpublished" : "Session published",
                );
              }}
            >
              {session.status === "Published" ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setDeleteSessionOpen(true)}>
              <Trash2 className="h-4 w-4 text-destructive" /> Delete
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Status</p>
          <div className="mt-2">
            <StatusBadge status={session.status} />
          </div>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Parts</p>
          <p className="num mt-1 text-2xl font-semibold">{parts.length}</p>
          <p className="text-xs text-muted-foreground">
            {parts.filter((p) => p.required).length} required
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Students enrolled</p>
          <p className="num mt-1 text-2xl font-semibold">{enrollments.length}</p>
          <p className="num text-xs text-muted-foreground">
            {paidCount} paid · {freeCount} free
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Prerequisite</p>
          <p className="mt-1 truncate text-sm font-medium">
            {prereq ? prereq.name : "Independent session"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="parts">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="parts">Parts &amp; content</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="students">Enrolled students</TabsTrigger>
        </TabsList>

        <TabsContent value="parts">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setEditingPart(null);
                setPartOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add part
            </Button>
            <Button variant="outline" onClick={() => setCloneOpen(true)}>
              <Copy className="h-4 w-4" /> Clone part from another session
            </Button>
          </div>

          {parts.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={ListChecks}
                title="No parts yet"
                description="Add video, test, homework and PDF parts — students follow the exact order you set."
              />
            </div>
          ) : (
            <ol className="space-y-2">
              {parts.map((p, i) => {
                const Icon = PART_ICON[p.type];
                return (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(p.id)}
                    className={`panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 sm:flex sm:justify-between ${
                      dragId === p.id ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">
                        {i + 1}
                      </span>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.type}
                          {p.type === "Video" && ` · max ${p.maxViews} opens`}
                          {p.type === "Test" &&
                            ` · ${p.questions?.length ?? 0} questions · ${p.totalDegree} degrees · pass ${p.passingDegree}`}
                          {p.type === "Homework" && ` · ${p.homeworkMode}`}
                          {p.type === "PDF" && ` · ${p.fileName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusBadge status={p.required ? "Required" : "Optional"} />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Move up"
                        disabled={i === 0}
                        onClick={() => move(p.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Move down"
                        disabled={i === parts.length - 1}
                        onClick={() => move(p.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${p.title}`}
                        onClick={() => {
                          setEditingPart(p);
                          setPartOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${p.title}`}
                        onClick={() => setPartToDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="details">
          <div className="panel divide-y divide-border">
            {[
              ["Session name", session.name],
              ["Level", level?.name ?? "—"],
              ["Category", category?.name ?? "—"],
              ["Price", egp(session.price)],
              ["Expiration", `${session.expirationDays} days from purchase date`],
              ["Prerequisite", prereq ? `${prereq.name} (purchase required)` : "None"],
              ["Status", session.status],
              ["Created", fmtDate(session.createdAt)],
              ["Description", session.description || "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="grid gap-1 p-3 text-sm sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-3"
              >
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {enrollments.length} student(s) have access — {paidCount} paid, {freeCount} opened for
              free.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setGrantOpen(true)}>
                <UserPlus className="h-4 w-4" /> Open for free
              </Button>
            </div>
          </div>
          <div className="panel overflow-x-auto">
            {enrollments.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No purchases yet"
                description="Students who purchase this session appear here — or open it for free to a specific student."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e) => {
                    const stu = db.students.find((s) => s.id === e.studentId);
                    const required = parts.filter((p) => p.required);
                    const done = required.filter(
                      (p) => e.parts.find((x) => x.partId === p.id)?.completed,
                    ).length;
                    const pctVal = required.length ? Math.round((done / required.length) * 100) : 0;
                    const expired = new Date(e.expiresAt) < new Date();
                    const free = e.source === "Free";
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Link
                            to="/students/$studentId"
                            params={{ studentId: e.studentId }}
                            className="font-medium hover:underline"
                          >
                            {stu?.name ?? "Unknown"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={free ? "Free" : "Paid"}
                            tone={free ? "primary" : "info"}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmtDate(e.purchasedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmtDate(e.expiresAt)}
                        </TableCell>
                        <TableCell className="num">{pctVal}%</TableCell>
                        <TableCell>
                          <StatusBadge status={expired ? "Expired" : "Active"} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendParentReport(e.studentId)}
                            >
                              <MessageCircle className="h-4 w-4" /> WhatsApp
                            </Button>
                            {examParts.map((ep) => (
                              <Button
                                key={ep.id}
                                size="sm"
                                variant="ghost"
                                onClick={() => setExamView({ enrollmentId: e.id, partId: ep.id })}
                              >
                                <ListChecks className="h-4 w-4" /> {ep.title}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReopenId(e.id);
                                setReopenDate(
                                  new Date(Date.now() + session.expirationDays * 86400000)
                                    .toISOString()
                                    .slice(0, 10),
                                );
                              }}
                            >
                              <CalendarClock className="h-4 w-4" /> Reopen
                            </Button>
                            {free && (
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Revoke free access for ${stu?.name ?? "student"}`}
                                onClick={() => setToRevoke(e.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <GrantAccessDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        sessionId={sessionId}
        expirationDays={session.expirationDays}
      />

      <ExamAnswersDialog
        open={!!examView}
        onOpenChange={(v) => !v && setExamView(null)}
        part={db.parts.find((p) => p.id === examView?.partId) ?? null}
        progress={db.enrollments
          .find((x) => x.id === examView?.enrollmentId)
          ?.parts.find((x) => x.partId === examView?.partId)}
        studentName={
          db.students.find(
            (st) =>
              st.id === db.enrollments.find((x) => x.id === examView?.enrollmentId)?.studentId,
          )?.name ?? "Student"
        }
      />

      <Dialog open={!!reopenId} onOpenChange={(v) => !v && setReopenId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reopen access</DialogTitle>
            <DialogDescription>
              Pick a new expiry date. The student keeps all existing progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reopen-date">New expiry date</Label>
            <Input
              id="reopen-date"
              type="date"
              value={reopenDate}
              onChange={(ev) => setReopenDate(ev.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenId(null)}>
              Cancel
            </Button>
            <Button
              disabled={!reopenDate}
              onClick={() => {
                if (!reopenId) return;
                extendAccess(reopenId, new Date(`${reopenDate}T23:59:59`).toISOString());
                toast.success("Access reopened", {
                  description: `Now expires ${fmtDate(reopenDate)}.`,
                });
                setReopenId(null);
              }}
            >
              Reopen session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toRevoke}
        onOpenChange={(v) => !v && setToRevoke(null)}
        title="Revoke free access?"
        description={
          <p>
            {revokeStudent?.name ?? "This student"} will lose access to this session. Progress for
            it is removed too.
          </p>
        }
        confirmLabel="Revoke access"
        onConfirm={() => {
          if (toRevoke) {
            revokeAccess(toRevoke);
            toast.success("Free access revoked");
          }
          setToRevoke(null);
        }}
      />

      <SessionFormDialog open={editOpen} onOpenChange={setEditOpen} session={session} />

      <PartDialog
        open={partOpen}
        onOpenChange={setPartOpen}
        sessionId={sessionId}
        part={editingPart}
        nextOrder={parts.length + 1}
        onSave={(p) => {
          const others = parts.filter((x) => x.id !== p.id);
          persist(editingPart ? parts.map((x) => (x.id === p.id ? p : x)) : [...others, p]);
        }}
      />

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone a part</DialogTitle>
            <DialogDescription>
              The copy is fully independent — later changes to the original never affect it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Source session</Label>
              <Select
                value={cloneSource}
                onValueChange={(v) => {
                  setCloneSource(v);
                  setClonePartId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {db.sessions
                    .filter((s) => s.id !== sessionId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Part</Label>
              <Select value={clonePartId} onValueChange={setClonePartId} disabled={!cloneSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a part" />
                </SelectTrigger>
                <SelectContent>
                  {cloneSourceParts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.type} · {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!clonePartId}
              onClick={() => {
                clonePart(clonePartId, sessionId);
                toast.success("Part cloned as an independent copy");
                setCloneOpen(false);
                setCloneSource("");
                setClonePartId("");
              }}
            >
              Clone part
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!partToDelete}
        onOpenChange={(o) => !o && setPartToDelete(null)}
        title="Delete part?"
        description={`"${partTarget?.title ?? ""}" and its questions will be permanently removed from ${session.name}.`}
        confirmLabel="Delete part"
        onConfirm={() => {
          persist(parts.filter((p) => p.id !== partToDelete));
          setPartToDelete(null);
          toast.success("Part deleted");
        }}
      />

      <ConfirmDialog
        open={deleteSessionOpen}
        onOpenChange={setDeleteSessionOpen}
        title="Delete session?"
        description={`"${session.name}", all of its parts and ${enrollments.length} enrollment record(s) will be permanently deleted.`}
        confirmLabel="Delete session"
        onConfirm={() => {
          deleteSession(sessionId);
          toast.success("Session deleted");
          window.history.back();
        }}
      />
    </div>
  );
}

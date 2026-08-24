import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Check, MoreHorizontal, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StudentFormDialog } from "@/components/admin/StudentFormDialog";
import { NotificationDialog } from "@/components/admin/NotificationDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/domain/store";
import { egp, fmtDate, initials } from "@/lib/format";
import { GOVERNORATES, LEVELS } from "@/lib/domain/types";

export const Route = createFileRoute("/students/")({
  validateSearch: (search: Record<string, unknown>): { tab?: "all" | "pending" } => ({
    tab: (search["tab"] as string) === "pending" ? "pending" : "all",
  }),
  head: () => ({
    meta: [
      { title: "Students — Math Academy Admin" },
      {
        name: "description",
        content:
          "Review registrations, manage wallets, devices, QR IDs and progress for every enrolled student.",
      },
      { property: "og:title", content: "Students — Math Academy Admin" },
      {
        property: "og:description",
        content: "Approve registrations and manage student data, wallets and progress.",
      },
    ],
  }),
  component: StudentsPage,
});

const PAGE_SIZE = 10;

function StudentsPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { db, ready, setRegistration, deleteStudent } = useStore();

  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [gender, setGender] = useState("all");
  const [gov, setGov] = useState("all");
  const [account, setAccount] = useState("all");
  const [reg, setReg] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.students.filter((s) => {
      if (tab === "pending" && s.registrationStatus !== "Pending Approval") return false;
      if (term) {
        const hit =
          s.name.toLowerCase().includes(term) ||
          s.phone.includes(term) ||
          s.studentId.toLowerCase().includes(term);
        if (!hit) return false;
      }
      if (level !== "all" && s.level !== level) return false;
      if (gender !== "all" && s.gender !== gender) return false;
      if (gov !== "all" && s.governorate !== gov) return false;
      if (account !== "all" && s.accountStatus !== account) return false;
      if (reg !== "all" && s.registrationStatus !== reg) return false;
      return true;
    });
  }, [db.students, q, level, gender, gov, account, reg, tab]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pendingCount = db.students.filter(
    (s) => s.registrationStatus === "Pending Approval",
  ).length;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetFilters = () => {
    setQ("");
    setLevel("all");
    setGender("all");
    setGov("all");
    setAccount("all");
    setReg("all");
    setPage(1);
  };

  const target = db.students.find((s) => s.id === toDelete);

  return (
    <div>
      <PageHeader
        title="Students"
        description="Registrations, wallets, devices and progress in one place."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Students" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setNotifyOpen(true)}>
              <Bell className="h-4 w-4" />
              Notify {selected.length > 0 && `(${selected.length})`}
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add student
            </Button>
          </>
        }
      />

      <Tabs
        value={tab ?? "all"}
        onValueChange={(v) => {
          setPage(1);
          void navigate({ search: { tab: v as "all" | "pending" } });
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">All students ({db.students.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending approval ({pendingCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="panel mb-4 p-3">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, phone or student ID…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={level} onValueChange={(v) => (setLevel(v), setPage(1))}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gender} onValueChange={(v) => (setGender(v), setPage(1))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any gender</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gov} onValueChange={(v) => (setGov(v), setPage(1))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Governorate" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All governorates</SelectItem>
                {GOVERNORATES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={account} onValueChange={(v) => (setAccount(v), setPage(1))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any account</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reg} onValueChange={(v) => (setReg(v), setPage(1))}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Registration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any registration</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={resetFilters}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {!ready ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students match your filters"
            description="Adjust the search term or clear the filters to see all registered students."
            action={
              <Button variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={rows.every((r) => selected.includes(r.id))}
                        onCheckedChange={(v) =>
                          setSelected(
                            v ? [...new Set([...selected, ...rows.map((r) => r.id)])] : [],
                          )
                        }
                        aria-label="Select page"
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Phones</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Governorate</TableHead>
                    <TableHead className="text-right">Wallet</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(s.id)}
                          onCheckedChange={() => toggle(s.id)}
                          aria-label={`Select ${s.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          to="/students/$studentId"
                          params={{ studentId: s.id }}
                          className="flex min-w-0 items-center gap-2.5"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                              {initials(s.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm font-medium whitespace-nowrap group-hover:text-primary">
                            {s.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="num text-muted-foreground">{s.studentId}</TableCell>
                      <TableCell className="num text-xs whitespace-nowrap text-muted-foreground">
                        <div>{s.phone}</div>
                        <div className="opacity-70">Parent: {s.parentPhone}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {s.level}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.gender}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {s.governorate}
                      </TableCell>
                      <TableCell className="num text-right font-medium">{egp(s.wallet)}</TableCell>
                      <TableCell>
                        <StatusBadge status={s.accountStatus} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.registrationStatus} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${s.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to="/students/$studentId" params={{ studentId: s.id }}>
                                Open profile
                              </Link>
                            </DropdownMenuItem>
                            {s.registrationStatus !== "Approved" && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setRegistration(s.id, "Approved");
                                  toast.success(`${s.name} approved`, {
                                    description: "The student can now log in.",
                                  });
                                }}
                              >
                                <Check className="h-4 w-4" /> Approve registration
                              </DropdownMenuItem>
                            )}
                            {s.registrationStatus !== "Rejected" && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setRegistration(s.id, "Rejected");
                                  toast("Registration rejected", { description: s.name });
                                }}
                              >
                                <X className="h-4 w-4" /> Reject registration
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setToDelete(s.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Delete student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3 text-sm">
              <p className="text-muted-foreground">
                Showing {(current - 1) * PAGE_SIZE + 1}–
                {Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                >
                  Previous
                </Button>
                <span className="num text-xs text-muted-foreground">
                  Page {current} / {pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === pages}
                  onClick={() => setPage(current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {tab === "pending" && pendingCount > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Pending students cannot log in. Approve a registration to activate the account, then the
          first device used becomes the authorized device.
        </p>
      )}

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <NotificationDialog open={notifyOpen} onOpenChange={setNotifyOpen} selectedIds={selected} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete student permanently?"
        description={
          <p>
            This removes the student account, wallet history, purchases, progress and book orders.
            This action cannot be undone.
          </p>
        }
        details={
          target && (
            <div className="space-y-1">
              <p className="font-medium">{target.name}</p>
              <p className="num text-muted-foreground">
                {target.studentId} · Wallet {egp(target.wallet)} · Registered{" "}
                {fmtDate(target.registeredAt)}
              </p>
            </div>
          )
        }
        confirmLabel="Delete student"
        onConfirm={() => {
          if (!target) return;
          deleteStudent(target.id);
          toast.success("Student deleted", { description: target.name });
          setToDelete(null);
        }}
      />
    </div>
  );
}

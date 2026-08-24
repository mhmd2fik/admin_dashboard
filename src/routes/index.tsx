import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BadgeCheck,
  ClipboardList,
  CreditCard,
  Ticket,
  RotateCcw,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { egp, fmtDate, num } from "@/lib/format";
import type { TxType } from "@/lib/domain/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Math Academy Admin" },
      {
        name: "description",
        content:
          "Business overview for an online mathematics teacher: revenue, students by level, payments and pending actions.",
      },
      { property: "og:title", content: "Dashboard — Math Academy Admin" },
      {
        property: "og:description",
        content: "Revenue analytics, student levels, payments and pending admin actions in EGP.",
      },
    ],
  }),
  component: DashboardPage,
});

const RANGES = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last 12 months", days: 365 },
];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--info)",
];

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  trend?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="num mt-2 text-2xl font-semibold">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
            <ArrowUpRight className="h-3 w-3" />
            {trend}
          </span>
        )}
        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--popover-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: "11px" },
};

function DashboardPage() {
  const { db, ready } = useStore();
  const [rangeDays, setRangeDays] = useState(180);
  const [levelFilter, setLevelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TxType>("all");

  const levelOf = useMemo(() => new Map(db.students.map((s) => [s.id, s.level])), [db.students]);

  const inRange = useMemo(() => {
    const from = Date.now() - rangeDays * 86400000;
    return db.transactions.filter((t) => {
      if (+new Date(t.createdAt) < from) return false;
      if (levelFilter !== "all" && levelOf.get(t.studentId) !== levelFilter) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      return true;
    });
  }, [db.transactions, rangeDays, levelFilter, typeFilter, levelOf]);

  const stats = useMemo(() => {
    const all = db.transactions;
    const sum = (fn: (t: (typeof all)[number]) => boolean) =>
      all.filter(fn).reduce((a, t) => a + Math.abs(t.amount), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      totalStudents: db.students.length,
      activeStudents: db.students.filter(
        (s) => s.registrationStatus === "Approved" && s.accountStatus === "Active",
      ).length,
      pending: db.students.filter((s) => s.registrationStatus === "Pending Approval").length,
      recharge: sum((t) => t.type === "Fawry Wallet Recharge"),
      codeCharge: sum((t) => t.type === "Wallet Code Charge"),
      sessionSales: sum((t) => t.type === "Session Purchase"),
      refunds: sum((t) => t.type === "Refund"),
      month: all
        .filter((t) => +new Date(t.createdAt) >= +monthStart && t.type === "Session Purchase")
        .reduce((a, t) => a + Math.abs(t.amount), 0),
    };
  }, [db.students, db.transactions]);

  const revenueSeries = useMemo(() => {
    const buckets = new Map<string, number>();
    const months = rangeDays > 120;
    inRange
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const d = new Date(t.createdAt);
        const key = months
          ? d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
          : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        buckets.set(key, (buckets.get(key) ?? 0) + Math.abs(t.amount));
      });
    return [...buckets.entries()]
      .map(([label, value]) => ({ label, value }))
      .reverse()
      .slice(-14);
  }, [inRange, rangeDays]);

  const levelRows = useMemo(() => {
    return db.levels.map((lvl) => {
      const studs = db.students.filter((s) => s.level === lvl.name);
      const ids = new Set(studs.map((s) => s.id));
      const revenue = db.transactions
        .filter((t) => ids.has(t.studentId) && t.amount < 0)
        .reduce((a, t) => a + Math.abs(t.amount), 0);
      const sessions = db.enrollments.filter((e) => ids.has(e.studentId)).length;
      return { level: lvl.name, students: studs.length, revenue, sessions };
    });
  }, [db.levels, db.students, db.transactions, db.enrollments]);

  const topSessions = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    db.transactions
      .filter((t) => t.type === "Session Purchase" && t.relatedSessionId)
      .forEach((t) => {
        const cur = map.get(t.relatedSessionId!) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += Math.abs(t.amount);
        map.set(t.relatedSessionId!, cur);
      });
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        name: db.sessions.find((s) => s.id === id)?.name ?? "Unknown",
        level:
          db.levels.find((l) => l.id === db.sessions.find((s) => s.id === id)?.levelId)?.name ??
          "—",
        ...v,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [db.transactions, db.sessions, db.levels]);

  const pendingStudents = db.students
    .filter((s) => s.registrationStatus === "Pending Approval")
    .slice(0, 5);
  const pendingGrading = db.enrollments.flatMap((e) =>
    e.parts.filter((p) => p.submitted && !p.graded).map(() => e),
  );

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Business overview for your online mathematics academy."
        crumbs={[{ label: "Dashboard" }]}
        actions={
          <>
            <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.days} value={String(r.days)}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {db.levels.map((l) => (
                  <SelectItem key={l.id} value={l.name}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All transactions</SelectItem>
                <SelectItem value="Session Purchase">Session purchases</SelectItem>
                <SelectItem value="Wallet Code Charge">Wallet code charges</SelectItem>
                <SelectItem value="Fawry Wallet Recharge">Fawry recharges</SelectItem>
                <SelectItem value="Refund">Refunds</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total students"
          value={num(stats.totalStudents)}
          hint="across 6 levels"
          icon={Users}
        />
        <Kpi
          label="Active students"
          value={num(stats.activeStudents)}
          hint="approved & unblocked"
          icon={BadgeCheck}
        />
        <Kpi
          label="Pending approvals"
          value={num(stats.pending)}
          hint="awaiting review"
          icon={ClipboardList}
        />
        <Kpi
          label="Wallet recharges"
          value={egp(stats.recharge)}
          hint="via Fawry, all time"
          icon={Wallet}
        />
        <Kpi
          label="Session sales"
          value={egp(stats.sessionSales)}
          hint="all time"
          icon={CreditCard}
        />
        <Kpi
          label="Wallet code charges"
          value={egp(stats.codeCharge)}
          hint="credited via codes"
          icon={Ticket}
        />
        <Kpi
          label="Refunds"
          value={egp(stats.refunds)}
          hint="returned to wallets"
          icon={RotateCcw}
        />
        <Kpi
          label="Current month revenue"
          value={egp(stats.month)}
          trend="live"
          hint="session sales"
          icon={ArrowUpRight}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Revenue over time"
            subtitle={`Spending from student wallets · ${RANGES.find((r) => r.days === rangeDays)?.label}`}
          >
            {revenueSeries.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No revenue in this range"
                description="Try widening the date range or clearing filters."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueSeries} margin={{ left: -18, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [egp(v), "Revenue"]} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
        <ChartCard title="Students by level" subtitle="Distribution across the six levels">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={levelRows}
                dataKey="students"
                nameKey="level"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {levelRows.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v: number, n) => [`${v} students`, n]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue by level" subtitle="Total wallet spending per level (EGP)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={levelRows} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="level"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tickFormatter={(v: string) => v.replace(" – Baccalaureate", " Bacc.")}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [egp(v), "Revenue"]}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="panel overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Top sessions</h2>
            <p className="text-xs text-muted-foreground">Highest revenue sessions</p>
          </div>
          <div className="divide-y divide-border">
            {topSessions.map((s, i) => (
              <Link
                key={s.id}
                to="/classes/$sessionId"
                params={{ sessionId: s.id }}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/40"
              >
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.level} · {s.count} purchases
                  </p>
                </div>
                <span className="num shrink-0 text-sm font-semibold">{egp(s.revenue)}</span>
              </Link>
            ))}
            {topSessions.length === 0 && (
              <EmptyState icon={CreditCard} title="No session sales yet" />
            )}
          </div>
        </div>
      </div>

      <div className="panel mt-4 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">Level overview</h2>
          <p className="text-xs text-muted-foreground">
            Students, revenue and purchased sessions per level
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Sessions purchased</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levelRows.map((r) => (
                <TableRow key={r.level}>
                  <TableCell className="font-medium whitespace-nowrap">{r.level}</TableCell>
                  <TableCell className="num text-right">{r.students}</TableCell>
                  <TableCell className="num text-right">{r.sessions}</TableCell>
                  <TableCell className="num text-right font-medium">{egp(r.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="panel overflow-hidden lg:col-span-2">
          <Tabs defaultValue="payments">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
              <TabsList>
                <TabsTrigger value="payments">Recent payments</TabsTrigger>
                <TabsTrigger value="students">Recent students</TabsTrigger>
              </TabsList>
              <Button asChild variant="ghost" size="sm">
                <Link to="/payments">View ledger</Link>
              </Button>
            </div>
            <TabsContent value="payments" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {db.transactions.slice(0, 7).map((t) => {
                      const stu = db.students.find((s) => s.id === t.studentId);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {stu?.name}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {t.type}
                          </TableCell>
                          <TableCell
                            className={`num text-right font-medium ${t.amount < 0 ? "text-foreground" : "text-success"}`}
                          >
                            {egp(t.amount, { sign: true })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {fmtDate(t.createdAt)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={t.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="students" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="whitespace-nowrap">Registered</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...db.students]
                      .sort((a, b) => +new Date(b.registeredAt) - +new Date(a.registeredAt))
                      .slice(0, 7)
                      .map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            <Link
                              to="/students/$studentId"
                              params={{ studentId: s.id }}
                              className="hover:text-primary hover:underline"
                            >
                              {s.name}
                            </Link>
                          </TableCell>
                          <TableCell className="num text-muted-foreground">{s.studentId}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {s.level}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {fmtDate(s.registeredAt)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={s.registrationStatus} />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Pending actions</h2>
            <p className="text-xs text-muted-foreground">Items waiting for you</p>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center gap-3 p-4">
              <ClipboardList className="h-4 w-4 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{stats.pending} student registrations</p>
                <p className="truncate text-xs text-muted-foreground">
                  {pendingStudents.map((s) => s.name.split(" ")[0]).join(", ") || "None"}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/students" search={{ tab: "pending" } as never}>
                  Review
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3 p-4">
              <ClipboardList className="h-4 w-4 shrink-0 text-info" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{pendingGrading.length} homework to grade</p>
                <p className="text-xs text-muted-foreground">Submitted, awaiting manual grading</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Ticket className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {db.codes.filter((c) => !c.redeemedBy && c.active).length} unused wallet codes
                </p>
                <p className="text-xs text-muted-foreground">
                  {egp(
                    db.codes
                      .filter((c) => !c.redeemedBy && c.active)
                      .reduce((a, c) => a + c.value, 0),
                  )}{" "}
                  still to be charged
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/codes">Open</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpenCheck,
  ChevronRight,
  FolderTree,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SessionFormDialog } from "@/components/admin/SessionFormDialog";
import { FileUpload } from "@/components/admin/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useStore } from "@/lib/domain/store";
import { egp, fmtDate } from "@/lib/format";
import { uid } from "@/lib/domain/seed";
import {
  LEVELS,
  type Category,
  type Level,
  type LevelName,
  type Session,
} from "@/lib/domain/types";

export const Route = createFileRoute("/classes/")({
  head: () => ({
    meta: [
      { title: "Classes — Levels, Categories & Sessions" },
      {
        name: "description",
        content:
          "Browse levels, open a category and manage only the sessions inside it — with pricing, prerequisites and publishing.",
      },
      { property: "og:title", content: "Classes — Levels, Categories & Sessions" },
      {
        property: "og:description",
        content: "A guided level → category → session workflow for your academy content.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const {
    db,
    ready,
    saveSession,
    deleteSession,
    saveLevel,
    deleteLevel,
    saveCategory,
    deleteCategory,
  } = useStore();

  const [levelId, setLevelId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [sessionOpen, setSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [levelDialog, setLevelDialog] = useState<Level | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<Level | null>(null);
  const [catDialog, setCatDialog] = useState<Category | null>(null);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);

  const levels = useMemo(() => [...db.levels].sort((a, b) => a.order - b.order), [db.levels]);
  const level = levels.find((l) => l.id === levelId) ?? null;
  const categories = useMemo(
    () => db.categories.filter((c) => c.levelId === levelId).sort((a, b) => a.order - b.order),
    [db.categories, levelId],
  );
  const category = categories.find((c) => c.id === categoryId) ?? null;
  const sessions = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.sessions
      .filter((s) => s.categoryId === categoryId && (!term || s.name.toLowerCase().includes(term)))
      .sort((a, b) => a.order - b.order);
  }, [db.sessions, categoryId, q]);

  const enrolled = (id: string) => db.enrollments.filter((e) => e.sessionId === id).length;
  const partsOf = (id: string) => db.parts.filter((p) => p.sessionId === id).length;

  const crumbs = [
    { label: "Dashboard", to: "/" },
    ...(level
      ? [
          { label: "Classes" },
          ...(category
            ? [{ label: level.name }, { label: category.name }]
            : [{ label: level.name }]),
        ]
      : [{ label: "Classes" }]),
  ];

  const addLevel = () =>
    setLevelDialog({
      id: uid("lvl"),
      name: LEVELS[0],
      image: "",
      published: false,
      order: db.levels.length + 1,
    });

  const addCategory = () =>
    levelId &&
    setCatDialog({
      id: uid("cat"),
      levelId,
      name: "",
      order: categories.length + 1,
      published: true,
    });

  /* ---------------------------------------------------------------- levels */
  if (!level) {
    return (
      <div>
        <PageHeader
          title="Classes"
          description="Pick a level, then a category, then work on its sessions."
          crumbs={crumbs}
          actions={
            <Button onClick={addLevel}>
              <Plus className="h-4 w-4" /> Add level
            </Button>
          }
        />
        {!ready ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : levels.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon={Layers}
              title="No levels yet"
              description="Levels are the top of your content tree — create the first one."
              action={
                <Button onClick={addLevel}>
                  <Plus className="h-4 w-4" /> Add level
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {levels.map((l) => {
              const cats = db.categories.filter((c) => c.levelId === l.id).length;
              const sess = db.sessions.filter((s) => s.levelId === l.id).length;
              const studs = db.students.filter((s) => s.level === l.name).length;
              return (
                <article key={l.id} className="panel panel-hover overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLevelId(l.id)}
                    className="block w-full text-left"
                  >
                    <div className="relative h-28 w-full overflow-hidden bg-accent">
                      {l.image ? (
                        <img
                          src={l.image}
                          alt={`${l.name} cover`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-[image:var(--gradient-primary)] text-primary-foreground">
                          <Layers className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">{l.name}</h2>
                        <p className="num mt-0.5 text-xs text-muted-foreground">
                          {cats} categories · {sess} sessions · {studs} students
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                    <StatusBadge status={l.published ? "Published" : "Draft"} />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          saveLevel({ ...l, published: !l.published });
                          toast.success(l.published ? "Level unpublished" : "Level published");
                        }}
                      >
                        {l.published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${l.name}`}
                        onClick={() => setLevelDialog({ ...l })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${l.name}`}
                        onClick={() => setLevelToDelete(l)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <LevelDialog
          value={levelDialog}
          onChange={setLevelDialog}
          exists={db.levels.some((l) => l.id === levelDialog?.id)}
          onSave={(l) => {
            saveLevel(l);
            toast.success("Level saved");
            setLevelDialog(null);
          }}
        />
        <ConfirmDialog
          open={!!levelToDelete}
          onOpenChange={(o) => !o && setLevelToDelete(null)}
          title="Delete level?"
          description={`"${levelToDelete?.name ?? ""}" will be deleted with ${db.categories.filter((c) => c.levelId === levelToDelete?.id).length} categories and ${db.sessions.filter((s) => s.levelId === levelToDelete?.id).length} sessions.`}
          confirmLabel="Delete level"
          onConfirm={() => {
            if (levelToDelete) {
              deleteLevel(levelToDelete.id);
              toast.success("Level deleted");
            }
            setLevelToDelete(null);
          }}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------ categories */
  if (!category) {
    return (
      <div>
        <PageHeader
          title={level.name}
          description="Categories inside this level — open one to see its sessions."
          crumbs={crumbs}
          actions={
            <>
              <Button variant="outline" onClick={() => setLevelId(null)}>
                <ArrowLeft className="h-4 w-4" /> All levels
              </Button>
              <Button onClick={addCategory}>
                <Plus className="h-4 w-4" /> Add category
              </Button>
            </>
          }
        />
        {categories.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon={FolderTree}
              title="No categories in this level"
              description="Add a category such as Algebra, Geometry or Mechanics."
              action={
                <Button onClick={addCategory}>
                  <Plus className="h-4 w-4" /> Add category
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((c) => {
              const list = db.sessions.filter((s) => s.categoryId === c.id);
              return (
                <article key={c.id} className="panel panel-hover">
                  <button
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                      <FolderTree className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold">{c.name}</span>
                      <span className="num block text-xs text-muted-foreground">
                        {list.length} sessions ·{" "}
                        {list.filter((s) => s.status === "Published").length} published
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </button>
                  <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                    <StatusBadge status={c.published ? "Published" : "Draft"} />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          saveCategory({ ...c, published: !c.published });
                          toast.success(
                            c.published ? "Category unpublished" : "Category published",
                          );
                        }}
                      >
                        {c.published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => setCatDialog({ ...c })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => setCatToDelete(c)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <CategoryDialog
          value={catDialog}
          onChange={setCatDialog}
          exists={db.categories.some((c) => c.id === catDialog?.id)}
          levels={levels}
          onSave={(c) => {
            saveCategory({ ...c, name: c.name.trim() });
            toast.success("Category saved");
            setCatDialog(null);
          }}
        />
        <ConfirmDialog
          open={!!catToDelete}
          onOpenChange={(o) => !o && setCatToDelete(null)}
          title="Delete category?"
          description={`"${catToDelete?.name ?? ""}" will be deleted with ${db.sessions.filter((s) => s.categoryId === catToDelete?.id).length} session(s) inside it.`}
          confirmLabel="Delete category"
          onConfirm={() => {
            if (catToDelete) {
              deleteCategory(catToDelete.id);
              toast.success("Category deleted");
            }
            setCatToDelete(null);
          }}
        />
      </div>
    );
  }

  /* -------------------------------------------------------------- sessions */
  return (
    <div>
      <PageHeader
        title={category.name}
        description={`Sessions in ${level.name} → ${category.name}`}
        crumbs={crumbs}
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoryId(null)}>
              <ArrowLeft className="h-4 w-4" /> Categories
            </Button>
            <Button
              onClick={() => {
                setEditingSession(null);
                setSessionOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New session
            </Button>
          </>
        }
      />

      <Input
        placeholder="Search sessions in this category…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 w-full sm:w-72"
      />

      {sessions.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={GraduationCap}
            title="No sessions here yet"
            description="Create a session and add its video, test, homework and PDF parts."
            action={
              <Button
                onClick={() => {
                  setEditingSession(null);
                  setSessionOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> New session
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sessions.map((s) => (
            <article key={s.id} className="panel panel-hover p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <Link
                    to="/classes/$sessionId"
                    params={{ sessionId: s.id }}
                    className="truncate text-base font-semibold hover:underline"
                  >
                    {s.name}
                  </Link>
                  {s.prerequisiteId && (
                    <p className="truncate text-xs text-muted-foreground">
                      Requires: {db.sessions.find((x) => x.id === s.prerequisiteId)?.name}
                    </p>
                  )}
                </div>
                <StatusBadge status={s.status} />
              </div>

              <dl className="num mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-muted/60 p-2">
                  <dt className="text-muted-foreground">Price</dt>
                  <dd className="font-semibold">{egp(s.price)}</dd>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <BookOpenCheck className="h-3 w-3" /> Parts
                  </dt>
                  <dd className="font-semibold">{partsOf(s.id)}</dd>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" /> Enrolled
                  </dt>
                  <dd className="font-semibold">{enrolled(s.id)}</dd>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <dt className="text-muted-foreground">Access</dt>
                  <dd className="font-semibold">{s.expirationDays} days</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Created {fmtDate(s.createdAt)}
                </span>
                <div className="flex items-center gap-1">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/classes/$sessionId" params={{ sessionId: s.id }}>
                      Open builder
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      saveSession({
                        ...s,
                        status: s.status === "Published" ? "Draft" : "Published",
                      });
                      toast.success(
                        s.status === "Published" ? "Session unpublished" : "Session published",
                      );
                    }}
                  >
                    {s.status === "Published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => {
                      setEditingSession(s);
                      setSessionOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${s.name}`}
                    onClick={() => setSessionToDelete(s)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <SessionFormDialog
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        session={editingSession}
        defaultLevelId={level.id}
        defaultCategoryId={category.id}
      />

      <ConfirmDialog
        open={!!sessionToDelete}
        onOpenChange={(o) => !o && setSessionToDelete(null)}
        title="Delete session?"
        description={`"${sessionToDelete?.name ?? ""}", its parts and ${enrolled(sessionToDelete?.id ?? "")} enrollment record(s) will be permanently deleted.`}
        confirmLabel="Delete session"
        onConfirm={() => {
          if (sessionToDelete) {
            deleteSession(sessionToDelete.id);
            toast.success("Session deleted");
          }
          setSessionToDelete(null);
        }}
      />
    </div>
  );
}

function LevelDialog({
  value,
  onChange,
  exists,
  onSave,
}: {
  value: Level | null;
  onChange: (v: Level | null) => void;
  exists: boolean;
  onSave: (l: Level) => void;
}) {
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exists ? "Edit level" : "Add level"}</DialogTitle>
          <DialogDescription>
            Levels group categories, sessions, books and students.
          </DialogDescription>
        </DialogHeader>
        {value && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select
                value={value.name}
                onValueChange={(v) => onChange({ ...value, name: v as LevelName })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FileUpload
              label="Level image"
              accept="image/*"
              value={value.image}
              fileName={value.image ? `${value.name} image` : null}
              onChange={(data) => onChange({ ...value, image: data ?? "" })}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onChange(null)}>
            Cancel
          </Button>
          <Button onClick={() => value && onSave(value)}>Save level</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  value,
  onChange,
  exists,
  levels,
  onSave,
}: {
  value: Category | null;
  onChange: (v: Category | null) => void;
  exists: boolean;
  levels: Level[];
  onSave: (c: Category) => void;
}) {
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exists ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>
            A category lives inside a single level and is never shared across levels.
          </DialogDescription>
        </DialogHeader>
        {value && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Category name</Label>
              <Input
                value={value.name}
                placeholder="Algebra"
                onChange={(e) => onChange({ ...value, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select
                value={value.levelId}
                onValueChange={(v) => onChange({ ...value, levelId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onChange(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!value || value.name.trim().length < 2) {
                toast.error("Enter a category name");
                return;
              }
              onSave(value);
            }}
          >
            Save category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/domain/store";
import { uid } from "@/lib/domain/seed";
import { FileUpload } from "./FileUpload";
import type { Session } from "@/lib/domain/types";

export function SessionFormDialog({
  open,
  onOpenChange,
  session,
  defaultLevelId,
  defaultCategoryId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session?: Session | null;
  defaultLevelId?: string;
  defaultCategoryId?: string;
}) {
  const { db, saveSession } = useStore();
  const [form, setForm] = useState<Session | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (session) {
      setForm({ ...session });
      return;
    }
    const levelId = defaultLevelId ?? db.levels[0]?.id ?? "";
    const cats = db.categories.filter((c) => c.levelId === levelId);
    setForm({
      id: uid("ses"),
      name: "",
      cover: "",
      price: 150,
      levelId,
      categoryId: defaultCategoryId ?? cats[0]?.id ?? "",
      description: "",
      expirationDays: 30,
      prerequisiteId: null,
      status: "Draft",
      order:
        db.sessions.filter((s) => s.categoryId === (defaultCategoryId ?? cats[0]?.id)).length + 1,
      createdAt: new Date().toISOString(),
    });
  }, [open, session, defaultLevelId, defaultCategoryId, db.levels, db.categories, db.sessions]);

  if (!form) return null;

  const set = <K extends keyof Session>(k: K, v: Session[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const categories = db.categories.filter((c) => c.levelId === form.levelId);
  const prereqOptions = db.sessions.filter((s) => s.levelId === form.levelId && s.id !== form.id);

  const submit = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e["name"] = "Enter a session name (min 3 characters).";
    if (!form.categoryId) e["categoryId"] = "Pick a category for this session.";
    if (!(form.price >= 0)) e["price"] = "Price must be 0 or more.";
    if (!(form.expirationDays >= 1)) e["expirationDays"] = "Expiration must be at least 1 day.";
    setErrors(e);
    if (Object.keys(e).length) return;
    saveSession({ ...form, name: form.name.trim(), description: form.description.trim() });
    toast.success(session ? "Session updated" : "Session created", { description: form.name });
    onOpenChange(false);
  };

  const Err = ({ k }: { k: string }) =>
    errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? "Edit session" : "New session"}</DialogTitle>
          <DialogDescription>
            Access expiry is counted from each student&apos;s own purchase date, not the publish
            date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-name">Session name</Label>
            <Input id="s-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <Err k="name" />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select
              value={form.levelId}
              onValueChange={(v) => {
                const cats = db.categories.filter((c) => c.levelId === v);
                setForm((f) =>
                  f ? { ...f, levelId: v, categoryId: cats[0]?.id ?? "", prerequisiteId: null } : f,
                );
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {db.levels.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Err k="categoryId" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-price">Price (EGP)</Label>
            <Input
              id="s-price"
              inputMode="numeric"
              className="num"
              value={String(form.price)}
              onChange={(e) => set("price", Number(e.target.value) || 0)}
            />
            <Err k="price" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-exp">Expiration (days from purchase)</Label>
            <Input
              id="s-exp"
              inputMode="numeric"
              className="num"
              value={String(form.expirationDays)}
              onChange={(e) => set("expirationDays", Number(e.target.value) || 0)}
            />
            <Err k="expirationDays" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <FileUpload
              label="Cover image"
              accept="image/*"
              value={form.cover}
              fileName={form.cover ? `${form.name || "session"} cover` : null}
              onChange={(data) => set("cover", data ?? "")}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea
              id="s-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Plain text summary shown to students before purchase."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prerequisite session</Label>
            <Select
              value={form.prerequisiteId ?? "none"}
              onValueChange={(v) => set("prerequisiteId", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Independent (no prerequisite)</SelectItem>
                {prereqOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Purchasing the prerequisite is enough to unlock this session.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as Session["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{session ? "Save changes" : "Create session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

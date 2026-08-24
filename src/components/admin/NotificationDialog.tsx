import { useState } from "react";
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

export function NotificationDialog({
  open,
  onOpenChange,
  selectedIds = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds?: string[];
}) {
  const { db, sendNotification } = useStore();
  const [audience, setAudience] = useState<string>(selectedIds.length ? "selected" : "all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  const recipients = () => {
    if (audience === "selected") return selectedIds;
    if (audience === "all")
      return db.students.filter((s) => s.registrationStatus === "Approved").map((s) => s.id);
    return db.students.filter((s) => s.level === audience).map((s) => s.id);
  };

  const send = () => {
    if (title.trim().length < 3 || body.trim().length < 5) {
      setError("Add a title (3+ chars) and a message body (5+ chars).");
      return;
    }
    const ids = recipients();
    if (!ids.length) {
      setError("No recipients match this audience.");
      return;
    }
    sendNotification({
      title: title.trim(),
      body: body.trim(),
      image: image.trim() || null,
      audience:
        audience === "selected"
          ? `${ids.length} selected students`
          : audience === "all"
            ? "All approved students"
            : audience,
      studentIds: ids,
    });
    toast.success("Notification sent", { description: `Delivered to ${ids.length} students.` });
    setTitle("");
    setBody("");
    setImage("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send notification</DialogTitle>
          <DialogDescription>
            Notifications appear in the student's platform notification center.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectedIds.length > 0 && (
                  <SelectItem value="selected">{selectedIds.length} selected students</SelectItem>
                )}
                <SelectItem value="all">All approved students</SelectItem>
                {db.levels.map((l) => (
                  <SelectItem key={l.id} value={l.name}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ntitle">Title</Label>
            <Input id="ntitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nbody">Message</Label>
            <Textarea id="nbody" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nimg">Image URL (optional)</Label>
            <Input
              id="nimg"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
            <p className="text-sm font-semibold">{title || "Notification title"}</p>
            <p className="text-sm text-muted-foreground">{body || "Message body preview…"}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={send}>Send notification</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

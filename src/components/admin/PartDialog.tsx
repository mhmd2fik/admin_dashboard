import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uid } from "@/lib/domain/seed";
import { FileUpload } from "./FileUpload";
import type { Part, PartType, Question } from "@/lib/domain/types";

const YT =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{6,}/;

function blankQuestion(type: Question["type"] = "MCQ"): Question {
  return {
    id: uid("q"),
    type,
    text: "",
    degree: 1,
    image: null,
    choices:
      type === "MCQ"
        ? [
            { id: uid("ch"), text: "", correct: true },
            { id: uid("ch"), text: "", correct: false },
          ]
        : [],
  };
}

export function PartDialog({
  open,
  onOpenChange,
  sessionId,
  part,
  nextOrder,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  part?: Part | null;
  nextOrder: number;
  onSave: (p: Part) => void;
}) {
  const [form, setForm] = useState<Part | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      part
        ? structuredClone(part)
        : {
            id: uid("part"),
            sessionId,
            type: "Video",
            title: "",
            order: nextOrder,
            required: true,
            clonedFrom: null,
            youtubeUrl: "",
            maxViews: 2,
            questions: [],
          },
    );
  }, [open, part, sessionId, nextOrder]);

  if (!form) return null;

  const set = <K extends keyof Part>(k: K, v: Part[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const isQuiz =
    form.type === "Test" || (form.type === "Homework" && form.homeworkMode === "Test-style");

  const setQuestions = (fn: (qs: Question[]) => Question[]) =>
    setForm((f) => (f ? { ...f, questions: fn(f.questions ?? []) } : f));

  const patchQuestion = (id: string, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const changeType = (type: PartType) =>
    setForm((f) => {
      if (!f) return f;
      const next: Part = { ...f, type };
      if (type === "Video") {
        next.youtubeUrl = next.youtubeUrl ?? "";
        next.maxViews = next.maxViews ?? 2;
      }
      if (type === "Test") {
        next.totalDegree = next.totalDegree ?? 10;
        next.passingDegree = next.passingDegree ?? 5;
        next.durationMinutes = next.durationMinutes ?? 20;
        next.questions = next.questions ?? [];
      }
      if (type === "Homework") {
        next.homeworkMode = next.homeworkMode ?? "Test-style";
        next.totalDegree = next.totalDegree ?? 10;
        next.questions = next.questions ?? [];
      }
      if (type === "PDF") next.fileName = next.fileName ?? "";
      return next;
    });

  const pasteImage = async (questionId: string, e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = () => patchQuestion(questionId, { image: String(reader.result) });
    reader.readAsDataURL(file);
    toast.success("Image attached to question");
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 2) e["title"] = "Enter a part title.";
    if (form.type === "Video") {
      if (!YT.test(form.youtubeUrl ?? "")) e["youtubeUrl"] = "Enter a valid YouTube URL.";
      if (!((form.maxViews ?? 0) >= 1)) e["maxViews"] = "Allow at least one open.";
    }
    if (form.type === "PDF" && !form.fileName?.trim()) e["fileName"] = "Enter the PDF file name.";
    if (form.type === "Test") {
      if (!((form.totalDegree ?? 0) > 0)) e["totalDegree"] = "Total degree must be greater than 0.";
      if ((form.passingDegree ?? 0) > (form.totalDegree ?? 0))
        e["passingDegree"] = "Passing degree cannot exceed the total degree.";
    }
    if (isQuiz) {
      const qs = form.questions ?? [];
      if (qs.length === 0) e["questions"] = "Add at least one question.";
      if (qs.some((q) => !q.text.trim())) e["questions"] = "Every question needs text.";
      if (
        qs.some(
          (q) =>
            q.type === "MCQ" &&
            (q.choices.length < 2 ||
              !q.choices.some((c) => c.correct) ||
              q.choices.some((c) => !c.text.trim())),
        )
      )
        e["questions"] = "Each MCQ needs at least two filled choices and one correct answer.";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ ...form, title: form.title.trim() });
    toast.success(part ? "Part updated" : "Part added");
    onOpenChange(false);
  };

  const Err = ({ k }: { k: string }) =>
    errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{part ? "Edit part" : "Add part"}</DialogTitle>
          <DialogDescription>
            Required parts must be completed in order; optional parts never block progression.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Part type</Label>
            <Select value={form.type} onValueChange={(v) => changeType(v as PartType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Test">Test</SelectItem>
                <SelectItem value="Homework">Homework</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            <Err k="title" />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Required part</p>
              <p className="text-xs text-muted-foreground">
                Counts towards session completion percentage.
              </p>
            </div>
            <Switch checked={form.required} onCheckedChange={(v) => set("required", v)} />
          </div>

          {form.type === "Video" && (
            <>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-yt">YouTube URL</Label>
                <Input
                  id="p-yt"
                  value={form.youtubeUrl ?? ""}
                  onChange={(e) => set("youtubeUrl", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
                <Err k="youtubeUrl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-views">Maximum opens</Label>
                <Input
                  id="p-views"
                  inputMode="numeric"
                  className="num"
                  value={String(form.maxViews ?? 0)}
                  onChange={(e) => set("maxViews", Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Each time the student opens the video one view is consumed.
                </p>
                <Err k="maxViews" />
              </div>
            </>
          )}

          {form.type === "PDF" && (
            <div className="space-y-1.5 sm:col-span-2">
              <FileUpload
                label="PDF file"
                kind="file"
                accept="application/pdf"
                value={form.fileData ?? (form.fileName ? "stored" : null)}
                fileName={form.fileName ?? null}
                onChange={(data, name) =>
                  setForm((f) => (f ? { ...f, fileData: data, fileName: name ?? "" } : f))
                }
              />
              <Err k="fileName" />
            </div>
          )}

          {form.type === "Homework" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Submission method</Label>
              <Select
                value={form.homeworkMode ?? "Test-style"}
                onValueChange={(v) => set("homeworkMode", v as Part["homeworkMode"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Test-style">Test-style questions</SelectItem>
                  <SelectItem value="PDF Upload">PDF upload (manually graded)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(form.type === "Test" || form.type === "Homework") && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="p-total">Total degree</Label>
                <Input
                  id="p-total"
                  inputMode="numeric"
                  className="num"
                  value={String(form.totalDegree ?? 0)}
                  onChange={(e) => set("totalDegree", Number(e.target.value) || 0)}
                />
                <Err k="totalDegree" />
              </div>
              {form.type === "Test" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-pass">Passing degree</Label>
                    <Input
                      id="p-pass"
                      inputMode="numeric"
                      className="num"
                      value={String(form.passingDegree ?? 0)}
                      onChange={(e) => set("passingDegree", Number(e.target.value) || 0)}
                    />
                    <Err k="passingDegree" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-dur">Duration (minutes)</Label>
                    <Input
                      id="p-dur"
                      inputMode="numeric"
                      className="num"
                      value={String(form.durationMinutes ?? 0)}
                      onChange={(e) => set("durationMinutes", Number(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Students get exactly one attempt.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {isQuiz && (
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Questions ({(form.questions ?? []).length})</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
              >
                <Plus className="h-4 w-4" /> Add question
              </Button>
            </div>
            <Err k="questions" />
            {(form.questions ?? []).map((q, qi) => (
              <div key={q.id} className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="num text-xs text-muted-foreground">Q{qi + 1}</span>
                  <Select
                    value={q.type}
                    onValueChange={(v) =>
                      patchQuestion(q.id, {
                        type: v as Question["type"],
                        choices:
                          v === "MCQ" && q.choices.length === 0
                            ? blankQuestion("MCQ").choices
                            : q.choices,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">Multiple choice (auto)</SelectItem>
                      <SelectItem value="Written">Written (manual)</SelectItem>
                      <SelectItem value="Photo">Photo upload (manual)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="num h-8 w-20"
                    aria-label="Question degree"
                    value={String(q.degree)}
                    onChange={(e) => patchQuestion(q.id, { degree: Number(e.target.value) || 0 })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete question"
                    className="ml-auto"
                    onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  value={q.text}
                  placeholder="Type the question — you can paste an image directly here."
                  onPaste={(e) => void pasteImage(q.id, e)}
                  onChange={(e) => patchQuestion(q.id, { text: e.target.value })}
                />
                {q.image ? (
                  <div className="mt-2 flex items-start gap-2">
                    <img
                      src={q.image}
                      alt={`Attachment for question ${qi + 1}`}
                      className="max-h-32 rounded-md border border-border"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patchQuestion(q.id, { image: null })}
                    >
                      Remove image
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <FileUpload
                      label="Question image"
                      hint="Upload from your device, or paste an image straight into the field above"
                      accept="image/*"
                      value={null}
                      onChange={(data) => patchQuestion(q.id, { image: data })}
                    />
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ImagePlus className="h-3.5 w-3.5" /> Pasting an image also attaches it.
                    </p>
                  </div>
                )}

                {q.type === "MCQ" && (
                  <div className="mt-3 space-y-2">
                    {q.choices.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={c.correct}
                          aria-label="Mark as correct answer"
                          onChange={() =>
                            patchQuestion(q.id, {
                              choices: q.choices.map((x) => ({ ...x, correct: x.id === c.id })),
                            })
                          }
                        />
                        <Input
                          className="h-8"
                          value={c.text}
                          placeholder="Answer choice"
                          onChange={(e) =>
                            patchQuestion(q.id, {
                              choices: q.choices.map((x) =>
                                x.id === c.id ? { ...x, text: e.target.value } : x,
                              ),
                            })
                          }
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Remove choice"
                          onClick={() =>
                            patchQuestion(q.id, { choices: q.choices.filter((x) => x.id !== c.id) })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        patchQuestion(q.id, {
                          choices: [...q.choices, { id: uid("ch"), text: "", correct: false }],
                        })
                      }
                    >
                      <Plus className="h-4 w-4" /> Add choice
                    </Button>
                  </div>
                )}
                {q.type !== "MCQ" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Graded manually by the admin after submission.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{part ? "Save part" : "Add part"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListChecks } from "lucide-react";
import type { Part, PartProgress } from "@/lib/domain/types";

export function ExamAnswersDialog({
  open,
  onOpenChange,
  part,
  progress,
  studentName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  part: Part | null;
  progress: PartProgress | undefined;
  studentName: string;
}) {
  const questions = part?.questions ?? [];
  const answers = progress?.answers ?? [];
  const total = part?.totalDegree ?? questions.reduce((a, q) => a + q.degree, 0);
  const scored = answers.reduce((a, x) => a + (x.awarded ?? 0), 0);
  const grade = progress?.grade ?? (answers.length ? scored : null);
  const passed = grade != null && grade >= (part?.passingDegree ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{part?.title ?? "Exam"} — answers</DialogTitle>
          <DialogDescription>
            {studentName}
            {grade != null ? ` · ${grade} / ${total}` : " · not attempted"}
            {part?.passingDegree != null && grade != null
              ? ` · pass mark ${part.passingDegree}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {questions.length === 0 ? (
          <EmptyState icon={ListChecks} title="This part has no questions" />
        ) : answers.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No answers submitted yet"
            description={`${studentName} has not attempted this exam.`}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={passed ? "Passed" : "Failed"} />
              <span className="num text-sm text-muted-foreground">
                {grade} / {total} degrees
              </span>
            </div>
            {questions.map((q, i) => {
              const a = answers.find((x) => x.questionId === q.id);
              const chosen = q.choices.find((c) => c.id === a?.choiceId);
              const right = q.choices.find((c) => c.correct);
              return (
                <div key={q.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium">
                      {i + 1}. {q.text}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={q.type} />
                      <span className="num text-xs text-muted-foreground">
                        {a?.awarded ?? 0} / {q.degree}
                      </span>
                    </div>
                  </div>
                  {q.image && (
                    <img
                      src={q.image}
                      alt={`Question ${i + 1} illustration`}
                      className="mt-2 max-h-40 rounded-md border border-border"
                    />
                  )}
                  <div className="mt-2 space-y-1 text-sm">
                    {q.type === "MCQ" ? (
                      <>
                        <p>
                          <span className="text-muted-foreground">Student answer: </span>
                          <span className={a?.correct ? "text-success" : "text-destructive"}>
                            {chosen?.text ?? "No answer"}
                          </span>
                        </p>
                        {!a?.correct && (
                          <p>
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-success">{right?.text ?? "—"}</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground">Student answer:</p>
                        <p className="rounded-md bg-muted/40 p-2 whitespace-pre-wrap">
                          {a?.text || "No answer"}
                        </p>
                        {a?.image && (
                          <img
                            src={a.image}
                            alt="Student uploaded answer"
                            className="max-h-56 rounded-md border border-border"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

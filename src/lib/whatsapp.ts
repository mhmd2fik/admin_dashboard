import type { DB, Student } from "./domain/types";

export function buildParentReport(db: DB, student: Student, sessionId: string) {
  const session = db.sessions.find((s) => s.id === sessionId);
  if (!session) return "";
  const enr = db.enrollments.find((e) => e.studentId === student.id && e.sessionId === sessionId);
  const parts = db.parts.filter((p) => p.sessionId === sessionId);
  const video = parts.find((p) => p.type === "Video");
  const test = parts.find((p) => p.type === "Test");
  const hw = parts.find((p) => p.type === "Homework");
  const pg = (id?: string) => enr?.parts.find((p) => p.partId === id);
  const vp = pg(video?.id);
  const tp = pg(test?.id);
  const hp = pg(hw?.id);
  const grade = tp?.grade ?? null;
  const passed = grade != null && grade >= (test?.passingDegree ?? 0);

  return [
    `Progress report — ${session.name}`,
    ``,
    `Student: ${student.name}`,
    `Level: ${student.level}`,
    `Session: ${session.name}`,
    `Purchased (attended): ${enr ? "Yes" : "No"}`,
    enr ? `Purchase date: ${new Date(enr.purchasedAt).toLocaleDateString("en-GB")}` : "",
    `Video completion: ${vp?.completionPct ?? 0}%`,
    `Watch duration: ${vp?.watchMinutes ?? 0} minutes`,
    test
      ? `Test grade: ${grade ?? "Not attempted"}${grade != null ? ` / ${test.totalDegree}` : ""}`
      : "",
    test && grade != null ? `Result: ${passed ? "Passed" : "Failed"}` : "",
    hw ? `Homework: ${hp?.submitted ? "Submitted" : "Not submitted"}` : "",
    hw && hp?.grade != null ? `Homework grade: ${hp.grade} / ${hw.totalDegree}` : "",
    ``,
    `Math Academy — Mr. Abdulaziz Tammam`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const waLink = (phone: string, message: string) =>
  `https://wa.me/2${phone.replace(/^0/, "0")}?text=${encodeURIComponent(message)}`;

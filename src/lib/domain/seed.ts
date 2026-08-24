import {
  GOVERNORATES,
  LEVELS,
  type Answer,
  type Category,
  type DB,
  type Enrollment,
  type Level,
  type Notification,
  type Part,
  type PartProgress,
  type Session,
  type Student,
  type Transaction,
} from "./types";

/** Deterministic PRNG so SSR and client render identical seed data. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rng = makeRng(20260809);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)]!;
const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

const BASE = new Date("2026-08-09T12:00:00Z").getTime();
const DAY = 86400000;
const daysAgo = (d: number, h = 9) => new Date(BASE - d * DAY + (h - 12) * 3600000).toISOString();

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateStudentId(existing: Set<string>): string {
  let id = "";
  do {
    id = "";
    for (let i = 0; i < 7; i++) id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
    id = `${id.slice(0, 3)}-${id.slice(3)}`;
  } while (existing.has(id));
  return id;
}
function seededStudentId(existing: Set<string>): string {
  let id = "";
  do {
    id = "";
    for (let i = 0; i < 7; i++) id += ID_ALPHABET[Math.floor(rng() * ID_ALPHABET.length)];
    id = `${id.slice(0, 3)}-${id.slice(3)}`;
  } while (existing.has(id));
  return id;
}

export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

const MALE = [
  "Ahmed Hassan",
  "Mohamed Saleh",
  "Youssef Ibrahim",
  "Omar Khaled",
  "Mahmoud Fathy",
  "Karim Adel",
  "Mostafa Sobhy",
  "Abdelrahman Tarek",
  "Hazem Nabil",
  "Ziad Mansour",
  "Amr Shawky",
  "Seif Eldin Ashraf",
  "Kareem Roshdy",
  "Marwan Gamal",
  "Bassem Lotfy",
  "Tamer Wagdy",
  "Ali Abdelaziz",
  "Hossam Ezzat",
];
const FEMALE = [
  "Nour Mostafa",
  "Salma Ayman",
  "Habiba Sherif",
  "Farida Magdy",
  "Mariam Yasser",
  "Aya Kamal",
  "Rana Elsayed",
  "Malak Hesham",
  "Jana Reda",
  "Menna Allah Samir",
  "Nada Fouad",
  "Yasmin Refaat",
  "Alaa Hamdy",
  "Shahd Ehab",
  "Doaa Rageb",
  "Sara Zaki",
];

const CATEGORY_MAP: Record<string, string[]> = {
  "3rd Preparatory": ["Algebra", "Geometry"],
  "1st Secondary": ["Algebra", "Trigonometry"],
  "1st Secondary – Baccalaureate": ["Pure Mathematics", "Statistics"],
  "2nd Secondary": ["Algebra", "Geometry", "Statistics"],
  "2nd Secondary – Baccalaureate": ["Analysis", "Mechanics"],
  "3rd Secondary": ["Mechanics", "Algebra", "Calculus"],
};

const SESSION_TITLES: Record<string, string[]> = {
  Algebra: [
    "Quadratic Equations",
    "Polynomial Division",
    "Complex Numbers",
    "Matrices & Determinants",
  ],
  Geometry: ["Circle Theorems", "Similarity & Ratios", "Analytic Geometry Basics"],
  Trigonometry: ["Trigonometric Identities", "Solving Triangles"],
  "Pure Mathematics": ["Functions & Domains", "Sequences and Series"],
  Statistics: ["Probability Fundamentals", "Normal Distribution"],
  Analysis: ["Limits & Continuity", "Differentiation Rules"],
  Mechanics: ["Newton's Laws Applied", "Moments & Equilibrium", "Projectile Motion"],
  Calculus: ["Integration Techniques", "Applications of Derivatives", "Definite Integrals"],
};

function buildParts(session: Session, idx: number): Part[] {
  const p = (i: number, o: Partial<Part> & { type: Part["type"]; title: string }): Part => ({
    id: `${session.id}_p${i}`,
    sessionId: session.id,
    order: i,
    required: true,
    ...o,
  });
  const parts: Part[] = [
    p(1, {
      type: "Video",
      title: `${session.name} — Explanation`,
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      maxViews: 2,
    }),
    p(2, {
      type: "PDF",
      title: `${session.name} — Summary Notes`,
      fileName: `${session.name.toLowerCase().replace(/[^a-z]+/g, "-")}-notes.pdf`,
      required: false,
    }),
    p(3, {
      type: "Test",
      title: `${session.name} — Quiz`,
      totalDegree: 20,
      passingDegree: 12,
      durationMinutes: 25,
      questions: [
        {
          id: `${session.id}_q1`,
          type: "MCQ",
          text: "Which of the following statements is correct for the given expression?",
          degree: 10,
          choices: [
            { id: "c1", text: "Option A", correct: true },
            { id: "c2", text: "Option B", correct: false },
            { id: "c3", text: "Option C", correct: false },
            { id: "c4", text: "Option D", correct: false },
          ],
        },
        {
          id: `${session.id}_q2`,
          type: "Written",
          text: "Prove the main result discussed in the session, showing all steps.",
          degree: 10,
          choices: [],
        },
      ],
    }),
  ];
  if (idx % 2 === 0) {
    parts.push(
      p(4, {
        type: "Homework",
        title: `${session.name} — Homework`,
        homeworkMode: idx % 4 === 0 ? "PDF Upload" : "Test-style",
        totalDegree: 30,
        passingDegree: 15,
        questions: [
          {
            id: `${session.id}_hq1`,
            type: "Photo",
            text: "Solve exercises 1–5 from the sheet and upload a clear photo of your solution.",
            degree: 30,
            choices: [],
          },
        ],
      }),
    );
  }
  return parts;
}

export function buildSeed(): DB {
  const levels: Level[] = LEVELS.map((name, i) => ({
    id: `lvl_${i + 1}`,
    name,
    image: "",
    published: true,
    order: i + 1,
  }));

  const categories: Category[] = [];
  levels.forEach((lvl) => {
    CATEGORY_MAP[lvl.name]!.forEach((name, i) => {
      categories.push({
        id: `cat_${lvl.id}_${i + 1}`,
        levelId: lvl.id,
        name,
        order: i + 1,
        published: true,
      });
    });
  });

  const sessions: Session[] = [];
  const parts: Part[] = [];
  let sIdx = 0;
  categories.forEach((cat) => {
    const titles = SESSION_TITLES[cat.name] ?? ["Session One", "Session Two"];
    let prev: string | null = null;
    titles.forEach((title, i) => {
      sIdx++;
      const s: Session = {
        id: `ses_${sIdx}`,
        name: title,
        cover: "",
        price: [80, 100, 120, 150, 180][sIdx % 5]!,
        levelId: cat.levelId,
        categoryId: cat.id,
        description: `A focused recorded session covering ${title.toLowerCase()} with solved examples, a summary PDF and an assessment.`,
        expirationDays: [7, 14, 30, 60][sIdx % 4]!,
        prerequisiteId: i > 0 && sIdx % 3 === 0 ? prev : null,
        status: sIdx % 11 === 0 ? "Draft" : "Published",
        order: i + 1,
        createdAt: daysAgo(120 - sIdx),
      };
      prev = s.id;
      sessions.push(s);
      parts.push(...buildParts(s, sIdx));
    });
  });

  // ---- Students ---------------------------------------------------------
  const students: Student[] = [];
  const ids = new Set<string>();
  const total = 64;
  for (let i = 0; i < total; i++) {
    const gender = rng() > 0.45 ? "Male" : "Female";
    const name = gender === "Male" ? MALE[i % MALE.length]! : FEMALE[i % FEMALE.length]!;
    const studentId = seededStudentId(ids);
    ids.add(studentId);
    const pendingCount = i >= total - 9;
    const reg = pendingCount ? "Pending Approval" : rng() > 0.96 ? "Rejected" : "Approved";
    students.push({
      id: `stu_${i + 1}`,
      studentId,
      name: `${name}${i >= MALE.length && i >= FEMALE.length ? "" : ""}`,
      phone: `01${int(0, 2)}${int(10000000, 99999999)}`,
      parentPhone: `01${int(0, 2)}${int(10000000, 99999999)}`,
      level: pick(LEVELS),
      gender,
      governorate: pick(GOVERNORATES),
      password: "student123",
      photo: "",
      wallet: 0,
      accountStatus: rng() > 0.94 ? "Blocked" : "Active",
      registrationStatus: reg,
      registeredAt: daysAgo(pendingCount ? int(0, 6) : int(10, 200), int(8, 20)),
      device:
        reg === "Approved" && rng() > 0.2
          ? {
              id: `dev_${i}`,
              label: pick([
                "iPhone 13",
                "Samsung A54",
                "Redmi Note 12",
                "Oppo A78",
                "Windows Chrome",
              ]),
              os: pick(["iOS 17.2", "Android 14", "Android 13", "Windows 11"]),
              registeredAt: daysAgo(int(5, 120)),
            }
          : null,
    });
  }

  // ---- Money & enrollments ---------------------------------------------
  const transactions: Transaction[] = [];
  const enrollments: Enrollment[] = [];

  const WRITTEN_SAMPLES = [
    "I substituted the limits after simplifying the expression, then evaluated step by step.",
    "Used the chain rule, then simplified the derivative and solved for x.",
    "Applied the quadratic formula and rejected the negative root because x must be positive.",
    "Completed the square first, then read the vertex from the standard form.",
  ];

  const buildAnswers = (part: Part): Answer[] =>
    (part.questions ?? []).map((q) => {
      const right = rng() > 0.32;
      if (q.type === "MCQ") {
        const correctChoice = q.choices.find((c) => c.correct) ?? q.choices[0]!;
        const wrong = q.choices.filter((c) => !c.correct);
        const chosen = right
          ? correctChoice
          : (wrong[int(0, Math.max(0, wrong.length - 1))] ?? correctChoice);
        return {
          questionId: q.id,
          choiceId: chosen.id,
          correct: !!chosen.correct,
          awarded: chosen.correct ? q.degree : 0,
        };
      }
      if (q.type === "Photo") {
        return {
          questionId: q.id,
          image: null,
          text: "Photo of handwritten solution uploaded by the student.",
          correct: right,
          awarded: right ? q.degree : Math.round(q.degree / 2),
        };
      }
      return {
        questionId: q.id,
        text: pick(WRITTEN_SAMPLES),
        correct: right,
        awarded: right ? q.degree : Math.round(q.degree / 2),
      };
    });

  const push = (
    t: Omit<Transaction, "balanceBefore" | "balanceAfter" | "id"> & { id?: string },
  ) => {
    const stu = students.find((s) => s.id === t.studentId)!;
    const before = stu.wallet;
    const after = Math.round((before + t.amount) * 100) / 100;
    stu.wallet = after;
    const tx: Transaction = {
      id: t.id ?? `TRX-${(transactions.length + 1).toString().padStart(5, "0")}`,
      balanceBefore: before,
      balanceAfter: after,
      ...t,
    } as Transaction;
    transactions.push(tx);
    return tx;
  };

  const approved = students.filter((s) => s.registrationStatus === "Approved");
  approved.forEach((stu, i) => {
    const lvl = levels.find((l) => l.name === stu.level)!;
    const recharges = int(1, 3);
    for (let r = 0; r < recharges; r++) {
      push({
        studentId: stu.id,
        type: "Fawry Wallet Recharge",
        amount: [100, 250, 300, 500, 750][int(0, 4)]!,
        method: "Fawry",
        status: "Completed",
        createdAt: daysAgo(int(1, 150), int(9, 22)),
        externalRef: `FWR${int(100000, 999999)}`,
      });
    }
    const levelSessions = sessions.filter((s) => s.levelId === lvl.id && s.status === "Published");
    const buys = Math.min(levelSessions.length, int(0, 4));
    for (let b = 0; b < buys; b++) {
      const ses = levelSessions[b]!;
      if (stu.wallet < ses.price) continue;
      const when = daysAgo(int(1, 90), int(10, 21));
      const tx = push({
        studentId: stu.id,
        type: "Session Purchase",
        amount: -ses.price,
        method: "Wallet",
        status: "Completed",
        createdAt: when,
        relatedSessionId: ses.id,
      });
      const sesParts = parts.filter((p) => p.sessionId === ses.id);
      const progress: PartProgress[] = sesParts.map((p, pi) => {
        const done = pi < int(0, sesParts.length);
        const isExam =
          p.type === "Test" || (p.type === "Homework" && p.homeworkMode === "Test-style");
        const answers =
          isExam && done && (p.questions?.length ?? 0) > 0 ? buildAnswers(p) : undefined;
        return {
          partId: p.id,
          completed: done,
          opens: p.type === "Video" ? (done ? int(1, 2) : 0) : undefined,
          watchMinutes: p.type === "Video" ? (done ? int(18, 55) : int(0, 10)) : undefined,
          completionPct: p.type === "Video" ? (done ? 100 : int(0, 60)) : undefined,
          grade:
            p.type === "Test" || p.type === "Homework"
              ? done
                ? answers
                  ? answers.reduce((a, x) => a + (x.awarded ?? 0), 0)
                  : int(Math.floor((p.totalDegree ?? 20) * 0.3), p.totalDegree ?? 20)
                : null
              : undefined,
          submitted: p.type === "Homework" ? done : undefined,
          submittedAt: p.type === "Homework" && done ? when : null,
          graded: p.type === "Homework" ? done && rng() > 0.35 : undefined,
          answers,
        };
      });
      enrollments.push({
        id: `enr_${enrollments.length + 1}`,
        studentId: stu.id,
        sessionId: ses.id,
        purchasedAt: when,
        expiresAt: new Date(new Date(when).getTime() + ses.expirationDays * DAY).toISOString(),
        source: "Paid",
        parts: progress,
      });
      // occasional refund
      if (i % 17 === 0 && b === 0) {
        tx.refunded = true;
        push({
          studentId: stu.id,
          type: "Refund",
          amount: ses.price,
          method: "Wallet",
          status: "Completed",
          createdAt: daysAgo(int(1, 20), int(11, 19)),
          relatedSessionId: ses.id,
          refundOf: tx.id,
          note: "Refunded by admin",
        });
      }
    }

    if (i % 23 === 0) {
      push({
        studentId: stu.id,
        type: "Manual Wallet Adjustment",
        amount: 50,
        method: "Admin Adjustment",
        status: "Completed",
        createdAt: daysAgo(int(1, 40), 15),
        note: "Goodwill credit after platform issue",
      });
    }
  });

  transactions.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const notifications: Notification[] = [
    {
      id: "ntf_1",
      title: "New session published",
      body: "Integration Techniques is now available on your dashboard. Access expires 30 days after purchase.",
      image: null,
      audience: "3rd Secondary",
      studentIds: students.filter((s) => s.level === "3rd Secondary").map((s) => s.id),
      createdAt: daysAgo(2, 18),
    },
    {
      id: "ntf_2",
      title: "Revision marathon this Friday",
      body: "Join the live revision marathon at 6 PM. Bring your summary notes.",
      image: null,
      audience: "All approved students",
      studentIds: approved.map((s) => s.id),
      createdAt: daysAgo(9, 13),
    },
  ];

  return {
    students,
    levels,
    categories,
    sessions,
    parts,
    enrollments,
    transactions,
    notifications,
    codes: [],
  };
}

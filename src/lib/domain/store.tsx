import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildSeed, uid } from "./seed";
import type {
  Category,
  DB,
  Level,
  Notification,
  Part,
  Session,
  Student,
  Transaction,
  TxType,
  PaymentMethod,
  WalletCode,
} from "./types";

const STORAGE_KEY = "mathadmin.db.v1";

interface StoreValue {
  db: DB;
  ready: boolean;
  update: (fn: (draft: DB) => DB) => void;
  reset: () => void;
  // students
  saveStudent: (s: Student) => void;
  setRegistration: (id: string, status: Student["registrationStatus"]) => void;
  deleteStudent: (id: string) => void;
  resetDevice: (id: string) => void;
  // money
  addTransaction: (input: {
    studentId: string;
    type: TxType;
    amount: number;
    method: PaymentMethod;
    relatedSessionId?: string | null;
    relatedBookId?: string | null;
    note?: string;
    externalRef?: string | null;
    refundOf?: string | null;
  }) => Transaction | null;
  refundTransaction: (txId: string) => void;
  // content
  saveLevel: (l: Level) => void;
  deleteLevel: (id: string) => void;
  saveCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  saveSession: (s: Session) => void;
  deleteSession: (id: string) => void;
  saveParts: (sessionId: string, parts: Part[]) => void;
  clonePart: (partId: string, targetSessionId: string) => void;
  // misc
  sendNotification: (n: Omit<Notification, "id" | "createdAt">) => void;
  // access
  grantFreeAccess: (studentId: string, sessionId: string, note?: string) => boolean;
  grantFreeAccessMany: (
    studentIds: string[],
    sessionId: string,
    note?: string,
  ) => { granted: number; skipped: number };
  extendAccess: (enrollmentId: string, expiresAtISO: string) => void;
  revokeAccess: (enrollmentId: string) => void;
  // wallet codes
  generateCodes: (input: {
    value: number;
    quantity: number;
    batch: string;
    expiresAt?: string | null;
  }) => WalletCode[];
  redeemCode: (code: string, studentId: string) => { ok: boolean; message: string };
  setCodeActive: (id: string, active: boolean) => void;
  deleteCode: (id: string) => void;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomCode = () => {
  const block = (n: number) =>
    Array.from(
      { length: n },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join("");
  return `MTH-${block(4)}-${block(4)}`;
};

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => buildSeed());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DB;
        // forward-compatible defaults for stores saved before newer features
        parsed.codes = parsed.codes ?? [];
        parsed.enrollments = (parsed.enrollments ?? []).map((e) => ({
          ...e,
          source: e.source ?? "Paid",
        }));
        setDb(parsed);
      }
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }, [db, ready]);

  const update = useCallback(
    (fn: (draft: DB) => DB) => setDb((prev) => fn(structuredClone(prev))),
    [],
  );

  const value = useMemo<StoreValue>(() => {
    const nextTxId = (d: DB) => `TRX-${(d.transactions.length + 1).toString().padStart(5, "0")}`;

    return {
      db,
      ready,
      update,
      reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        setDb(buildSeed());
      },
      saveStudent: (s) =>
        update((d) => {
          const i = d.students.findIndex((x) => x.id === s.id);
          if (i >= 0) d.students[i] = s;
          else d.students.unshift(s);
          return d;
        }),
      setRegistration: (id, status) =>
        update((d) => {
          const s = d.students.find((x) => x.id === id);
          if (s) s.registrationStatus = status;
          return d;
        }),
      deleteStudent: (id) =>
        update((d) => {
          d.students = d.students.filter((s) => s.id !== id);
          d.enrollments = d.enrollments.filter((e) => e.studentId !== id);
          d.transactions = d.transactions.filter((t) => t.studentId !== id);

          return d;
        }),
      resetDevice: (id) =>
        update((d) => {
          const s = d.students.find((x) => x.id === id);
          if (s) s.device = null;
          return d;
        }),
      addTransaction: (input) => {
        let created: Transaction | null = null;
        update((d) => {
          const stu = d.students.find((s) => s.id === input.studentId);
          if (!stu) return d;
          const before = stu.wallet;
          const after = Math.round((before + input.amount) * 100) / 100;
          stu.wallet = after;
          created = {
            id: nextTxId(d),
            studentId: input.studentId,
            type: input.type,
            amount: input.amount,
            balanceBefore: before,
            balanceAfter: after,
            method: input.method,
            status: "Completed",
            createdAt: new Date().toISOString(),
            relatedSessionId: input.relatedSessionId ?? null,
            relatedBookId: input.relatedBookId ?? null,
            refundOf: input.refundOf ?? null,
            externalRef: input.externalRef ?? null,
            note: input.note ?? "",
          };
          d.transactions.unshift(created);
          return d;
        });
        return created;
      },
      refundTransaction: (txId) =>
        update((d) => {
          const tx = d.transactions.find((t) => t.id === txId);
          if (!tx || tx.refunded || tx.amount >= 0) return d;
          const stu = d.students.find((s) => s.id === tx.studentId);
          if (!stu) return d;
          tx.refunded = true;
          const before = stu.wallet;
          const amount = Math.abs(tx.amount);
          stu.wallet = Math.round((before + amount) * 100) / 100;
          d.transactions.unshift({
            id: nextTxId(d),
            studentId: tx.studentId,
            type: "Refund",
            amount,
            balanceBefore: before,
            balanceAfter: stu.wallet,
            method: "Wallet",
            status: "Completed",
            createdAt: new Date().toISOString(),
            relatedSessionId: tx.relatedSessionId ?? null,
            relatedBookId: tx.relatedBookId ?? null,
            refundOf: tx.id,
            note: "Refunded by admin",
          });
          if (tx.type === "Session Purchase" && tx.relatedSessionId) {
            d.enrollments = d.enrollments.filter(
              (e) => !(e.studentId === tx.studentId && e.sessionId === tx.relatedSessionId),
            );
          }
          return d;
        }),
      saveLevel: (l) =>
        update((d) => {
          const i = d.levels.findIndex((x) => x.id === l.id);
          if (i >= 0) d.levels[i] = l;
          else d.levels.push(l);
          return d;
        }),
      deleteLevel: (id) =>
        update((d) => {
          const cats = d.categories.filter((c) => c.levelId === id).map((c) => c.id);
          const ses = d.sessions.filter((s) => cats.includes(s.categoryId)).map((s) => s.id);
          d.levels = d.levels.filter((l) => l.id !== id);
          d.categories = d.categories.filter((c) => c.levelId !== id);
          d.sessions = d.sessions.filter((s) => !ses.includes(s.id));
          d.parts = d.parts.filter((p) => !ses.includes(p.sessionId));
          return d;
        }),
      saveCategory: (c) =>
        update((d) => {
          const i = d.categories.findIndex((x) => x.id === c.id);
          if (i >= 0) d.categories[i] = c;
          else d.categories.push(c);
          return d;
        }),
      deleteCategory: (id) =>
        update((d) => {
          const ses = d.sessions.filter((s) => s.categoryId === id).map((s) => s.id);
          d.categories = d.categories.filter((c) => c.id !== id);
          d.sessions = d.sessions.filter((s) => s.categoryId !== id);
          d.parts = d.parts.filter((p) => !ses.includes(p.sessionId));
          return d;
        }),
      saveSession: (s) =>
        update((d) => {
          const i = d.sessions.findIndex((x) => x.id === s.id);
          if (i >= 0) d.sessions[i] = s;
          else d.sessions.push(s);
          return d;
        }),
      deleteSession: (id) =>
        update((d) => {
          d.sessions = d.sessions.filter((s) => s.id !== id);
          d.parts = d.parts.filter((p) => p.sessionId !== id);
          d.enrollments = d.enrollments.filter((e) => e.sessionId !== id);
          return d;
        }),
      saveParts: (sessionId, parts) =>
        update((d) => {
          d.parts = [...d.parts.filter((p) => p.sessionId !== sessionId), ...parts];
          return d;
        }),
      clonePart: (partId, targetSessionId) =>
        update((d) => {
          const src = d.parts.find((p) => p.id === partId);
          if (!src) return d;
          const order = d.parts.filter((p) => p.sessionId === targetSessionId).length + 1;
          const copy: Part = structuredClone(src);
          copy.id = uid("part");
          copy.sessionId = targetSessionId;
          copy.order = order;
          copy.clonedFrom = null;
          copy.title = `${src.title} (copy)`;
          if (copy.questions) copy.questions = copy.questions.map((q) => ({ ...q, id: uid("q") }));
          d.parts.push(copy);
          return d;
        }),
      sendNotification: (n) =>
        update((d) => {
          d.notifications.unshift({ ...n, id: uid("ntf"), createdAt: new Date().toISOString() });
          return d;
        }),
      grantFreeAccess: (studentId, sessionId, note) => {
        let ok = false;
        update((d) => {
          const ses = d.sessions.find((s) => s.id === sessionId);
          const stu = d.students.find((s) => s.id === studentId);
          if (!ses || !stu) return d;
          if (d.enrollments.some((e) => e.studentId === studentId && e.sessionId === sessionId))
            return d;
          const now = new Date();
          d.enrollments.unshift({
            id: uid("enr"),
            studentId,
            sessionId,
            purchasedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + ses.expirationDays * 86400000).toISOString(),
            source: "Free",
            grantedAt: now.toISOString(),
            grantNote: note ?? "",
            parts: [],
          });
          ok = true;
          return d;
        });
        return ok;
      },
      grantFreeAccessMany: (studentIds, sessionId, note) => {
        let granted = 0;
        let skipped = 0;
        update((d) => {
          const ses = d.sessions.find((s) => s.id === sessionId);
          if (!ses) return d;
          const now = new Date();
          for (const studentId of studentIds) {
            const stu = d.students.find((s) => s.id === studentId);
            if (
              !stu ||
              d.enrollments.some((e) => e.studentId === studentId && e.sessionId === sessionId)
            ) {
              skipped++;
              continue;
            }
            d.enrollments.unshift({
              id: uid("enr"),
              studentId,
              sessionId,
              purchasedAt: now.toISOString(),
              expiresAt: new Date(now.getTime() + ses.expirationDays * 86400000).toISOString(),
              source: "Free",
              grantedAt: now.toISOString(),
              grantNote: note ?? "",
              parts: [],
            });
            granted++;
          }
          return d;
        });
        return { granted, skipped };
      },
      extendAccess: (enrollmentId, expiresAtISO) =>
        update((d) => {
          const e = d.enrollments.find((x) => x.id === enrollmentId);
          if (e) e.expiresAt = expiresAtISO;
          return d;
        }),
      revokeAccess: (enrollmentId) =>
        update((d) => {
          d.enrollments = d.enrollments.filter((e) => e.id !== enrollmentId);
          return d;
        }),
      generateCodes: ({ value, quantity, batch, expiresAt }) => {
        let created: WalletCode[] = [];
        update((d) => {
          const taken = new Set(d.codes.map((c) => c.code));
          const list: WalletCode[] = [];
          for (let i = 0; i < quantity; i++) {
            let code = randomCode();
            while (taken.has(code)) code = randomCode();
            taken.add(code);
            list.push({
              id: uid("code"),
              code,
              value,
              batch,
              createdAt: new Date().toISOString(),
              expiresAt: expiresAt ?? null,
              active: true,
              redeemedBy: null,
              redeemedAt: null,
              transactionId: null,
            });
          }
          created = list;
          d.codes = [...list, ...d.codes];
          return d;
        });
        return created;
      },
      redeemCode: (code, studentId) => {
        let result = { ok: false, message: "Code not found" };
        update((d) => {
          const target = code.trim().toUpperCase();
          const c = d.codes.find((x) => x.code.toUpperCase() === target);
          if (!c) return d;
          if (c.redeemedBy) {
            const who = d.students.find((s) => s.id === c.redeemedBy)?.name ?? "another student";
            result = { ok: false, message: `Already used by ${who}` };
            return d;
          }
          if (!c.active) {
            result = { ok: false, message: "This code is deactivated" };
            return d;
          }
          if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
            result = { ok: false, message: "This code has expired" };
            return d;
          }
          const stu = d.students.find((s) => s.id === studentId);
          if (!stu) {
            result = { ok: false, message: "Student not found" };
            return d;
          }
          const before = stu.wallet;
          stu.wallet = Math.round((before + c.value) * 100) / 100;
          const tx: Transaction = {
            id: nextTxId(d),
            studentId,
            type: "Wallet Code Charge",
            amount: c.value,
            balanceBefore: before,
            balanceAfter: stu.wallet,
            method: "Wallet Code",
            status: "Completed",
            createdAt: new Date().toISOString(),
            relatedSessionId: null,
            relatedBookId: null,
            externalRef: c.code,
            note: `Wallet recharge code ${c.code}`,
          };
          d.transactions.unshift(tx);
          c.redeemedBy = studentId;
          c.redeemedAt = tx.createdAt;
          c.transactionId = tx.id;
          result = { ok: true, message: `${c.value} EGP added to ${stu.name}'s wallet` };
          return d;
        });
        return result;
      },
      setCodeActive: (id, active) =>
        update((d) => {
          const c = d.codes.find((x) => x.id === id);
          if (c && !c.redeemedBy) c.active = active;
          return d;
        }),
      deleteCode: (id) =>
        update((d) => {
          d.codes = d.codes.filter((c) => c.id !== id);
          return d;
        }),
    };
  }, [db, ready, update]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

// ---- derived helpers -------------------------------------------------------
export function useLookups() {
  const { db } = useStore();
  return useMemo(() => {
    const levelById = new Map(db.levels.map((l) => [l.id, l]));
    const levelByName = new Map(db.levels.map((l) => [l.name, l]));
    const categoryById = new Map(db.categories.map((c) => [c.id, c]));
    const sessionById = new Map(db.sessions.map((s) => [s.id, s]));
    const studentById = new Map(db.students.map((s) => [s.id, s]));
    return { levelById, levelByName, categoryById, sessionById, studentById };
  }, [db]);
}

export type { StoreValue };

export const LEVELS = [
  "3rd Preparatory",
  "1st Secondary",
  "1st Secondary – Baccalaureate",
  "2nd Secondary",
  "2nd Secondary – Baccalaureate",
  "3rd Secondary",
] as const;

export type LevelName = (typeof LEVELS)[number];

export const GOVERNORATES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Dakahlia",
  "Red Sea",
  "Beheira",
  "Fayoum",
  "Gharbia",
  "Ismailia",
  "Menofia",
  "Minya",
  "Qaliubiya",
  "New Valley",
  "Suez",
  "Aswan",
  "Assiut",
  "Beni Suef",
  "Port Said",
  "Damietta",
  "Sharkia",
  "South Sinai",
  "Kafr El Sheikh",
  "Matrouh",
  "Luxor",
  "Qena",
  "North Sinai",
  "Sohag",
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

export type Gender = "Male" | "Female";
export type AccountStatus = "Active" | "Blocked";
export type RegistrationStatus = "Pending Approval" | "Approved" | "Rejected";

export interface Device {
  id: string;
  label: string;
  os: string;
  registeredAt: string;
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  phone: string;
  parentPhone: string;
  level: LevelName;
  gender: Gender;
  governorate: Governorate;
  password: string;
  photo: string;
  wallet: number;
  accountStatus: AccountStatus;
  registrationStatus: RegistrationStatus;
  registeredAt: string;
  device: Device | null;
}

export interface Level {
  id: string;
  name: LevelName;
  image: string;
  published: boolean;
  order: number;
}

export interface Category {
  id: string;
  levelId: string;
  name: string;
  order: number;
  published: boolean;
}

export type PartType = "Video" | "Test" | "Homework" | "PDF";

export interface Choice {
  id: string;
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  type: "MCQ" | "Written" | "Photo";
  text: string;
  degree: number;
  choices: Choice[];
  image?: string | null | undefined;
}

export interface Part {
  id: string;
  sessionId: string;
  type: PartType;
  title: string;
  order: number;
  required: boolean;
  clonedFrom?: string | null | undefined;
  // Video
  youtubeUrl?: string | undefined;
  maxViews?: number | undefined;
  // Test / Homework
  totalDegree?: number | undefined;
  passingDegree?: number | undefined;
  durationMinutes?: number | undefined;
  questions?: Question[] | undefined;
  homeworkMode?: "Test-style" | "PDF Upload" | undefined;
  // PDF
  fileName?: string | undefined;
  fileData?: string | null | undefined;
}

export interface Session {
  id: string;
  name: string;
  cover: string;
  price: number;
  levelId: string;
  categoryId: string;
  description: string;
  expirationDays: number;
  prerequisiteId: string | null;
  status: "Draft" | "Published";
  order: number;
  createdAt: string;
}

export interface Answer {
  questionId: string;
  /** MCQ selection */
  choiceId?: string | null | undefined;
  /** Written answer */
  text?: string | undefined;
  /** Photo answer (data URL) */
  image?: string | null | undefined;
  awarded?: number | null | undefined;
  correct?: boolean | null | undefined;
}

export interface PartProgress {
  partId: string;
  completed: boolean;
  opens?: number | undefined;
  watchMinutes?: number | undefined;
  completionPct?: number | undefined;
  grade?: number | null | undefined;
  submitted?: boolean | undefined;
  submittedAt?: string | null | undefined;
  graded?: boolean | undefined;
  answers?: Answer[] | undefined;
}

export interface Enrollment {
  id: string;
  studentId: string;
  sessionId: string;
  purchasedAt: string;
  expiresAt: string;
  source?: "Paid" | "Free" | undefined;
  grantedAt?: string | null | undefined;
  grantNote?: string | undefined;
  parts: PartProgress[];
}

export type TxType =
  | "Fawry Wallet Recharge"
  | "Session Purchase"
  | "Refund"
  | "Manual Wallet Adjustment"
  | "Wallet Code Charge";

export type PaymentMethod = "Fawry" | "Wallet" | "Admin Adjustment" | "Wallet Code";

export interface Transaction {
  id: string;
  studentId: string;
  type: TxType;
  amount: number; // signed: + credit, - debit
  balanceBefore: number;
  balanceAfter: number;
  relatedSessionId?: string | null | undefined;
  relatedBookId?: string | null | undefined;
  method: PaymentMethod;
  status: "Completed" | "Pending" | "Failed";
  createdAt: string;
  refunded?: boolean | undefined;
  refundOf?: string | null | undefined;
  externalRef?: string | null | undefined;
  note?: string | undefined;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  image?: string | null | undefined;
  audience: string;
  studentIds: string[];
  createdAt: string;
}

export interface WalletCode {
  id: string;
  code: string;
  value: number;
  batch: string;
  createdAt: string;
  expiresAt?: string | null | undefined;
  active: boolean;
  redeemedBy?: string | null | undefined;
  redeemedAt?: string | null | undefined;
  transactionId?: string | null | undefined;
}

export interface DB {
  students: Student[];
  levels: Level[];
  categories: Category[];
  sessions: Session[];
  parts: Part[];
  enrollments: Enrollment[];
  transactions: Transaction[];
  notifications: Notification[];
  codes: WalletCode[];
}

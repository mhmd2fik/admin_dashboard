export const egp = (n: number, opts: { sign?: boolean } = {}) => {
  const v = Math.abs(n).toLocaleString("en-EG", { maximumFractionDigits: 0 });
  const sign = opts.sign ? (n > 0 ? "+" : n < 0 ? "−" : "") : n < 0 ? "−" : "";
  return `${sign}${v} EGP`;
};

export const num = (n: number) => n.toLocaleString("en-US");

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const pct = (n: number) => `${Math.round(n)}%`;

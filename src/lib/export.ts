import * as XLSX from "xlsx";

export interface SheetSpec {
  name: string;
  rows: Record<string, string | number>[];
}

/** Export one or more sheets to a real .xlsx workbook. */
export function exportWorkbook(filename: string, sheets: SheetSpec[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ Empty: "No rows" }]);
    const widths = Object.keys(s.rows[0] ?? { Empty: "" }).map((k) => ({
      wch: Math.min(
        42,
        Math.max(k.length + 2, ...s.rows.map((r) => String(r[k] ?? "").length + 2), 10),
      ),
    }));
    ws["!cols"] = widths;
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 30));
  }
  XLSX.writeFile(wb, filename);
}

export const stamp = () => new Date().toISOString().slice(0, 10);

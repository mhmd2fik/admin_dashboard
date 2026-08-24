import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_MB = 8;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the file"));
    r.readAsDataURL(file);
  });
}

/**
 * Device file picker with drag & drop. Files are stored as data URLs so no
 * external hosting or link pasting is ever required.
 */
export function FileUpload({
  label,
  hint,
  accept = "image/*",
  kind = "image",
  value,
  fileName,
  onChange,
  className,
}: {
  label: string;
  hint?: string;
  accept?: string;
  kind?: "image" | "file";
  value?: string | null | undefined;
  fileName?: string | null | undefined;
  onChange: (data: string | null, name: string | null) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = async (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large — keep it under ${MAX_MB} MB.`);
      return;
    }
    try {
      const data = await readAsDataUrl(file);
      onChange(data, file.name);
      toast.success("File uploaded", { description: file.name });
    } catch {
      toast.error("Could not read that file. Try another one.");
    }
  };

  const has = !!value;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-muted/40 p-3 transition-colors",
          "hover:border-primary/60 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          over && "border-primary bg-accent/60",
        )}
      >
        {has && kind === "image" ? (
          <img
            src={value ?? ""}
            alt={fileName ? `Preview of ${fileName}` : "Uploaded preview"}
            className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
            {has ? (
              <FileText className="h-5 w-5" />
            ) : kind === "image" ? (
              <ImageIcon className="h-5 w-5" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {has ? fileName || "Uploaded file" : "Upload from your device"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {hint ?? `Click to browse or drag & drop · max ${MAX_MB} MB`}
          </p>
        </div>
        {has && (
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Remove ${label}`}
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null, null);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            void take(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

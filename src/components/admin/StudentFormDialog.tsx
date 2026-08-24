import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { GOVERNORATES, LEVELS, type Student } from "@/lib/domain/types";
import { generateStudentId } from "@/lib/domain/seed";
import { useStore } from "@/lib/domain/store";

const PHONE = /^01[0-2,5]\d{8}$/;

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student?: Student | null;
}) {
  const { db, saveStudent } = useStore();
  const [form, setForm] = useState<Student | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [govOpen, setGovOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (student) setForm({ ...student });
    else {
      const existing = new Set(db.students.map((s) => s.studentId));
      setForm({
        id: `stu_${Date.now()}`,
        studentId: generateStudentId(existing),
        name: "",
        phone: "",
        parentPhone: "",
        level: "3rd Secondary",
        gender: "Male",
        governorate: "Cairo",
        password: "",
        photo: "",
        wallet: 0,
        accountStatus: "Active",
        registrationStatus: "Pending Approval",
        registeredAt: new Date().toISOString(),
        device: null,
      });
    }
    setErrors({});
  }, [open, student, db.students]);

  if (!form) return null;

  const set = <K extends keyof Student>(k: K, v: Student[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const submit = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3)
      e["name"] = "Enter the student's full name (min 3 characters).";
    if (!PHONE.test(form.phone)) e["phone"] = "Enter a valid Egyptian mobile number (11 digits).";
    if (!PHONE.test(form.parentPhone)) e["parentPhone"] = "Enter a valid parent mobile number.";
    if (form.parentPhone === form.phone)
      e["parentPhone"] = "Parent phone must differ from the student phone.";
    if (!student && form.password.length < 6)
      e["password"] = "Password must be at least 6 characters.";
    setErrors(e);
    if (Object.keys(e).length) return;
    saveStudent({ ...form, name: form.name.trim() });
    toast.success(student ? "Student updated" : "Student created", {
      description: `${form.name} · ${form.studentId}`,
    });
    onOpenChange(false);
  };

  const Err = ({ k }: { k: string }) =>
    errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "Add student"}</DialogTitle>
          <DialogDescription>
            The Student ID is generated automatically and stays unique across the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <Err k="name" />
          </div>
          <div className="space-y-1.5">
            <Label>Student ID</Label>
            <Input value={form.studentId} readOnly className="num bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd">Password</Label>
            <Input
              id="pwd"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={student ? "Leave as is to keep current" : "Min 6 characters"}
            />
            <Err k="password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Student phone</Label>
            <Input
              id="phone"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="01xxxxxxxxx"
            />
            <Err k="phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pphone">Parent phone</Label>
            <Input
              id="pphone"
              inputMode="numeric"
              value={form.parentPhone}
              onChange={(e) => set("parentPhone", e.target.value)}
              placeholder="01xxxxxxxxx"
            />
            <Err k="parentPhone" />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={form.level} onValueChange={(v) => set("level", v as Student["level"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select
              value={form.gender}
              onValueChange={(v) => set("gender", v as Student["gender"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Governorate</Label>
            <Popover open={govOpen} onOpenChange={setGovOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {form.governorate}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search governorate…" />
                  <CommandList>
                    <CommandEmpty>No governorate found.</CommandEmpty>
                    <CommandGroup>
                      {GOVERNORATES.map((g) => (
                        <CommandItem
                          key={g}
                          value={g}
                          onSelect={() => {
                            set("governorate", g);
                            setGovOpen(false);
                          }}
                        >
                          {g}
                          {form.governorate === g && <Check className="ml-auto h-4 w-4" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Account status</Label>
            <Select
              value={form.accountStatus}
              onValueChange={(v) => set("accountStatus", v as Student["accountStatus"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Registration status</Label>
            <Select
              value={form.registrationStatus}
              onValueChange={(v) => set("registrationStatus", v as Student["registrationStatus"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Students can only log in after approval.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{student ? "Save changes" : "Create student"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

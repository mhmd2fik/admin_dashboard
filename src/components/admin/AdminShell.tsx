import { Link, useRouterState } from "@tanstack/react-router";
import {
  GraduationCap,
  LayoutDashboard,
  Ticket,
  Users,
  Wallet,
  Sigma,
  Search,
  Bell,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/domain/store";
import { GlobalSearch } from "./GlobalSearch";

const NAV = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Classes", url: "/classes", icon: GraduationCap },
  { title: "Students", url: "/students", icon: Users },
  { title: "Payments", url: "/payments", icon: Wallet },
  { title: "Codes", url: "/codes", icon: Ticket },
] as const;

function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { db } = useStore();
  const pending = db.students.filter((s) => s.registrationStatus === "Pending Approval").length;

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const badgeFor = (title: string) => (title === "Students" ? pending : 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Sigma className="h-5 w-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              Mr. Abdulaziz Math
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">Admin workspace</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const count = badgeFor(item.title);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                        {count > 0 && (
                          <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground group-data-[collapsible=icon]:hidden">
                            {count}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
              AT
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium text-sidebar-foreground">Abdulaziz Tammam</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">Teacher / Admin</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { db, reset } = useStore();
  const pending = db.students.filter((s) => s.registrationStatus === "Pending Approval").length;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger className="shrink-0" />
            <div className="min-w-0 flex-1">
              <GlobalSearch />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="relative shrink-0"
              aria-label="Pending approvals"
            >
              <Bell className="h-4 w-4" />
              {pending > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 shrink-0 gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      AT
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">Abdulaziz Tammam</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">Abdulaziz Tammam</p>
                  <p className="text-xs font-normal text-muted-foreground">Teacher / Admin only</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => reset()}>Reset demo data</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-7">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export { Search as SearchIcon };

import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { AdminPushPrompt } from "./AdminPushPrompt";

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex shrink-0 items-center gap-2 border-b bg-card px-3 sm:px-4 min-h-14 py-2 safe-top safe-x">
            <SidebarTrigger className="mr-3 tap-target" />
            <span className="text-sm text-muted-foreground truncate">Admin Panel</span>
            <div className="ml-auto flex items-center">
              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 overflow-auto scroll-touch bg-background p-3 sm:p-6 safe-x safe-bottom min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      <AdminPushPrompt />
    </SidebarProvider>
  );
}

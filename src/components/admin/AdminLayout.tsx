import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center border-b bg-card px-3 sm:px-4 h-14 safe-top safe-x">
            <SidebarTrigger className="mr-3 tap-target" />
            <span className="text-sm text-muted-foreground truncate">Admin Panel</span>
          </header>
          <main className="flex-1 overflow-auto scroll-touch bg-background p-3 sm:p-6 safe-x safe-bottom min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

    </SidebarProvider>
  );
}

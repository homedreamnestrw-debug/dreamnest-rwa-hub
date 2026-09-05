import { Outlet } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { AdminPushPrompt } from "./AdminPushPrompt";
import { Button } from "@/components/ui/button";

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex shrink-0 items-center gap-2 border-b bg-card px-3 sm:px-4 min-h-14 py-2 safe-top safe-x">
            <SidebarTrigger className="mr-3 tap-target" />
            <span className="text-sm text-muted-foreground truncate">Admin Panel</span>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  View Store
                </a>
              </Button>
              <Button asChild variant="outline" size="icon" className="sm:hidden h-9 w-9" aria-label="View Store">
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
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

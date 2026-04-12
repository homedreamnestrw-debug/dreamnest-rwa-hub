import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  BarChart3,
  Settings,
  Warehouse,
  FileText,
  DollarSign,
  Truck,
  LogOut,
  Monitor,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "POS Terminal", url: "/admin/pos", icon: Monitor },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Categories", url: "/admin/categories", icon: FolderTree },
  { title: "Customers", url: "/admin/customers", icon: Users },
  { title: "Staff", url: "/admin/staff", icon: Users },
  { title: "Messages", url: "/admin/messages", icon: MessageSquare },
];

const inventoryItems = [
  { title: "Stock", url: "/admin/stock", icon: Warehouse },
  { title: "Suppliers", url: "/admin/suppliers", icon: Truck },
  { title: "Purchase Orders", url: "/admin/purchase-orders", icon: FileText },
];

const financeItems = [
  { title: "Payment Approvals", url: "/admin/finance", icon: DollarSign },
  { title: "Invoices", url: "/admin/invoices", icon: FileText },
  { title: "Expenses", url: "/admin/expenses", icon: DollarSign },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const renderItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <NavLink to={item.url} end={item.url === "/admin"}>
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed && (
            <h2 className="font-serif text-lg font-semibold text-sidebar-foreground">
              DreamNest
            </h2>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Inventory</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(inventoryItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(financeItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/admin/settings")}>
              <NavLink to="/admin/settings">
                <Settings className="h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                {!collapsed && <span>View Store</span>}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

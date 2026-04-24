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
  Gift,
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

type Visibility = "admin" | "staff" | "both";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  visibility: Visibility;
};

const salesItems: NavItem[] = [
  { title: "POS Terminal", url: "/admin/pos", icon: Monitor, visibility: "both" },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart, visibility: "both" },
  { title: "Invoices", url: "/admin/invoices", icon: FileText, visibility: "both" },
  { title: "Gift Vouchers", url: "/admin/gift-vouchers", icon: Gift, visibility: "both" },
];

const catalogItems: NavItem[] = [
  { title: "Stock", url: "/admin/stock", icon: Warehouse, visibility: "both" },
];

const peopleItems: NavItem[] = [
  { title: "Customers", url: "/admin/customers", icon: Users, visibility: "both" },
  { title: "Messages", url: "/admin/messages", icon: MessageSquare, visibility: "both" },
  { title: "Staff", url: "/admin/staff", icon: Users, visibility: "admin" },
];

const operationsItems: NavItem[] = [
  { title: "Suppliers", url: "/admin/suppliers", icon: Truck, visibility: "admin" },
  { title: "Purchase Orders", url: "/admin/purchase-orders", icon: FileText, visibility: "admin" },
  { title: "Expenses", url: "/admin/expenses", icon: DollarSign, visibility: "admin" },
];

const insightsItems: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard, visibility: "admin" },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, visibility: "admin" },
  { title: "Payment Approvals", url: "/admin/finance", icon: DollarSign, visibility: "admin" },
];

function VisibilityTag({ visibility }: { visibility: Visibility }) {
  const label = visibility === "admin" ? "Ad" : visibility === "staff" ? "St" : "Ad+St";
  const cls =
    visibility === "admin"
      ? "bg-primary/15 text-primary"
      : visibility === "staff"
      ? "bg-accent/30 text-accent-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`ml-auto rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, isAdmin } = useAuth();

  const isActive = (path: string) => {
    if (path === "/admin/pos") {
      return location.pathname === "/admin" || location.pathname.startsWith("/admin/pos");
    }
    return location.pathname.startsWith(path);
  };

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => item.visibility !== "admin" || isAdmin);

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = filterItems(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                  <NavLink to={item.url}>
                    <item.icon className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span>{item.title}</span>
                        <VisibilityTag visibility={item.visibility} />
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

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

        {renderGroup("Sales", salesItems)}
        {renderGroup("Catalog", catalogItems)}
        {renderGroup("People", peopleItems)}
        {renderGroup("Operations", operationsItems)}
        {renderGroup("Insights", insightsItems)}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/admin/settings")}>
                <NavLink to="/admin/settings">
                  <Settings className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span>Settings</span>
                      <VisibilityTag visibility="admin" />
                    </>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
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

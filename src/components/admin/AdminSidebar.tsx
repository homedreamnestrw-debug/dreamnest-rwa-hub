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

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const salesItems: NavItem[] = [
  { title: "POS Terminal", url: "/admin/pos", icon: Monitor },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Invoices", url: "/admin/invoices", icon: FileText },
  { title: "Gift Vouchers", url: "/admin/gift-vouchers", icon: Gift },
];

const catalogItems: NavItem[] = [
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Categories", url: "/admin/categories", icon: FolderTree },
  { title: "Stock", url: "/admin/stock", icon: Warehouse },
];

const peopleItems: NavItem[] = [
  { title: "Customers", url: "/admin/customers", icon: Users },
  { title: "Messages", url: "/admin/messages", icon: MessageSquare },
  { title: "Staff", url: "/admin/staff", icon: Users, adminOnly: true },
];

const operationsItems: NavItem[] = [
  { title: "Suppliers", url: "/admin/suppliers", icon: Truck, adminOnly: true },
  { title: "Purchase Orders", url: "/admin/purchase-orders", icon: FileText, adminOnly: true },
  { title: "Expenses", url: "/admin/expenses", icon: DollarSign, adminOnly: true },
];

const insightsItems: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard, adminOnly: true },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, adminOnly: true },
  { title: "Payment Approvals", url: "/admin/finance", icon: DollarSign, adminOnly: true },
];

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
    items.filter((item) => !item.adminOnly || isAdmin);

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
                    {!collapsed && <span>{item.title}</span>}
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
                  {!collapsed && <span>Settings</span>}
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

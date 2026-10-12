import {
  CalendarDays,
  Users,
  BarChart3,
  Puzzle,
  Settings,
  LogOut,
  Eye,
  Crown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useAdminOverview";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Events", url: "/dashboard/events", icon: CalendarDays },
  { title: "Attendees", url: "/dashboard/attendees", icon: Users },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Integrations", url: "/dashboard/integrations", icon: Puzzle },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (isMobile) setOpenMobile(false);
    await signOut();
    navigate("/auth");
  };

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={collapsed ? "p-2 flex items-center justify-center" : "p-4"}>
        <NavLink to="/dashboard/events" className="flex items-center gap-2.5 overflow-hidden" onClick={handleNavClick}>
          <img src="/crack-logo.png" alt="Crack" className="w-7 h-7 object-contain rounded-lg shrink-0" />
          {!collapsed && (
            <img src="/Crack.png" alt="Crack" className="h-6 object-contain" />
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      onClick={handleNavClick}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={profile?.company_slug ? `/company/${profile.company_slug}` : "/dashboard/settings"}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    onClick={handleNavClick}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {!collapsed && <span>View Company</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/dashboard/settings"
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    onClick={handleNavClick}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/admin"
                      className="hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium border border-amber-500/20 rounded-lg mt-2"
                      activeClassName="bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold border-amber-500/40"
                      onClick={handleNavClick}
                    >
                      <Crown className="mr-2 h-4 w-4 text-amber-500" />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span>Admin Portal</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
                            OWNER
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && user && (
          <div className="space-y-3">
            <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
            <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        )}
        {collapsed && (
          <Button variant="ghost" size="icon" className="text-sidebar-foreground/70" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        )}
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/40 text-center mt-2">
            by <span className="font-medium text-sidebar-foreground/60">AJ STUDIOZ</span>
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

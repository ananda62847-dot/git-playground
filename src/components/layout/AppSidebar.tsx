import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import TVKLogo from '@/components/TVKLogo';
import { Button } from '@/components/ui/button';
import { LogOut, LucideIcon } from 'lucide-react';

export interface SidebarItem {
  title: string;
  icon: LucideIcon;
  value: string; // tab value or route
  to?: string;   // route for NavLink mode
}

interface Props {
  brand: string;
  subtitle?: string;
  items: SidebarItem[];
  activeValue?: string;
  onSelect?: (value: string) => void;
  onLogout?: () => void;
}

const AppSidebar: React.FC<Props> = ({ brand, subtitle, items, activeValue, onSelect, onLogout }) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
          <TVKLogo size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm text-primary truncate">{brand}</div>
              {subtitle && <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>}
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = item.to ? pathname === item.to : activeValue === item.value;
                const labelCls = "tamil-safe whitespace-normal leading-tight text-xs break-words";
                if (item.to) {
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton asChild isActive={isActive} className="h-auto min-h-9 py-1.5 items-start">
                        <NavLink to={item.to} className="flex items-start gap-2">
                          <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                          {!collapsed && <span className={labelCls}>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton isActive={isActive} onClick={() => onSelect?.(item.value)} className="h-auto min-h-9 py-1.5 items-start">
                      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                      {!collapsed && <span className={labelCls}>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {onLogout && (
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <Button variant="ghost" size="sm" onClick={onLogout} className="w-full justify-start">
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
};
export default AppSidebar;

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  FileText, 
  LogOut,
  Upload,
  PhoneCall,
  RotateCcw,
  History,
  User,
  FileCheck,
  IndianRupee,
  Video,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  className, 
  isCollapsed = false, 
  onToggle 
}) => {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/monitoring', label: 'Live Monitoring', icon: Video },
    { to: '/users', label: 'Manage Users', icon: Users },
    { to: '/kyc', label: 'KYC & Salary', icon: FileCheck },
    { to: '/salary', label: 'Salary Slips', icon: IndianRupee },
    { to: '/import', label: 'Import Data', icon: Upload },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/sessions', label: 'Session Logs', icon: History },
  ];

  const coAdminLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/monitoring', label: 'Live Monitoring', icon: Video },
    { to: '/users', label: 'Manage Callers', icon: Users },
    { to: '/kyc', label: 'KYC & Salary', icon: FileCheck },
    { to: '/salary', label: 'Salary Slips', icon: IndianRupee },
    { to: '/import', label: 'Import Data', icon: Upload },
    { to: '/reports', label: 'Reports', icon: FileText },
  ];

  const callerLinks = [
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/calling', label: 'Customer Calling', icon: Phone },
    { to: '/recalling', label: 'Re-Calling', icon: RotateCcw },
    { to: '/total-calls', label: 'Total Calling', icon: PhoneCall },
  ];

  const links = role === 'admin' ? adminLinks : role === 'co_admin' ? coAdminLinks : callerLinks;

  const SidebarContentInner = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className={cn(
        "p-4 border-b border-sidebar-border transition-all duration-300",
        isCollapsed && !isMobile ? "px-2" : "p-6"
      )}>
        <h1 className={cn(
          "font-bold font-display text-sidebar-foreground transition-all duration-300",
          isCollapsed && !isMobile ? "text-sm text-center" : "text-xl"
        )}>
          <span className="text-sidebar-primary">Tele</span>
          {(!isCollapsed || isMobile) && "Caller"}
        </h1>
        {(!isCollapsed || isMobile) && (
          <p className="text-xs text-sidebar-foreground/60 mt-1">Management System</p>
        )}
      </div>

      {/* User Info */}
      <div className={cn(
        "border-b border-sidebar-border transition-all duration-300",
        isCollapsed && !isMobile ? "px-2 py-3" : "px-4 py-4"
      )}>
        <div className={cn(
          "flex items-center gap-3",
          isCollapsed && !isMobile && "justify-center"
        )}>
          <div className={cn(
            "rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0",
            isCollapsed && !isMobile ? "w-8 h-8" : "w-10 h-10"
          )}>
            <User className={cn(
              "text-sidebar-primary",
              isCollapsed && !isMobile ? "w-4 h-4" : "w-5 h-5"
            )} />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'Loading...'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {role?.replace('_', ' ') || 'User'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onLinkClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-primary',
                isCollapsed && !isMobile && "justify-center px-2"
              )
            }
            title={isCollapsed && !isMobile ? link.label : undefined}
          >
            <link.icon className="w-5 h-5 flex-shrink-0" />
            {(!isCollapsed || isMobile) && (
              <span className="text-sm font-medium">{link.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className={cn(
        "p-2 border-t border-sidebar-border",
        isCollapsed && !isMobile ? "px-2" : "p-4"
      )}>
        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all duration-200",
            isCollapsed && !isMobile && "justify-center px-2"
          )}
          title={isCollapsed && !isMobile ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || isMobile) && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </>
  );

  // Mobile: Sheet/Drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 gradient-dark text-sidebar-foreground shadow-lg"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-72 gradient-dark border-sidebar-border">
            <div className="h-full flex flex-col">
              <SidebarContentInner onLinkClick={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Collapsible Sidebar
  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen gradient-dark flex flex-col z-50 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 z-50 w-6 h-6 rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-lg hover:bg-sidebar-primary/90"
        onClick={onToggle}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </Button>

      <SidebarContentInner />
    </aside>
  );
};

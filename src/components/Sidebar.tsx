import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  FileText, 
  Settings, 
  LogOut,
  UserPlus,
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
import { useSidebarContext } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { role, profile, signOut } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebarContext();
  const location = useLocation();

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

  const LinkItem = ({ link }: { link: typeof links[0] }) => {
    const content = (
      <NavLink
        to={link.to}
        className={({ isActive }) =>
          cn(
            'sidebar-item',
            isActive && 'sidebar-item-active',
            isCollapsed && 'justify-center px-2'
          )
        }
      >
        <link.icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium">{link.label}</span>}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            {link.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        'fixed left-0 top-0 h-screen gradient-dark flex flex-col z-50 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}>
        {/* Logo & Toggle */}
        <div className={cn(
          'p-4 border-b border-sidebar-border flex items-center',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold font-display text-sidebar-foreground">
                <span className="text-sidebar-primary">Tele</span>Caller
              </h1>
              <p className="text-xs text-sidebar-foreground/60 mt-1">Management System</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* User Info */}
        <div className={cn(
          'px-4 py-4 border-b border-sidebar-border',
          isCollapsed && 'px-2'
        )}>
          <div className={cn(
            'flex items-center gap-3',
            isCollapsed && 'justify-center'
          )}>
            <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-sidebar-primary" />
            </div>
            {!isCollapsed && (
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
            <LinkItem key={link.to} link={link} />
          ))}
        </nav>

        {/* Logout */}
        <div className={cn(
          'p-4 border-t border-sidebar-border',
          isCollapsed && 'p-2'
        )}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={signOut}
                  className="sidebar-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10 justify-center px-2"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={signOut}
              className="sidebar-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};

// Toggle button for mobile/external use
export const SidebarToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { toggleSidebar } = useSidebarContext();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn('h-9 w-9', className)}
    >
      <Menu className="w-5 h-5" />
    </Button>
  );
};

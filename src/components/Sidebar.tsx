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
  Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { role, profile, signOut } = useAuth();
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

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen w-64 gradient-dark flex flex-col z-50',
      className
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold font-display text-sidebar-foreground">
          <span className="text-sidebar-primary">Tele</span>Caller
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Management System</p>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Loading...'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {role?.replace('_', ' ') || 'User'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn('sidebar-item', isActive && 'sidebar-item-active')
            }
          >
            <link.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="sidebar-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { NotificationBar } from '@/components/NotificationBar';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isCollapsed } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={cn(
        'transition-all duration-300',
        isCollapsed ? 'ml-16' : 'ml-64'
      )}>
        {/* Notification Bar */}
        <NotificationBar />
        
        {/* Main Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Plus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Notification {
  id: string;
  message: string;
  created_at: string;
}

export const NotificationBar: React.FC = () => {
  const { role, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll animation
  useEffect(() => {
    if (!scrollRef.current || notifications.length === 0) return;

    const scrollContainer = scrollRef.current;
    let animationId: number;
    let scrollPosition = 0;
    
    const animate = () => {
      scrollPosition += 0.5;
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [notifications]);

  const handleCreateNotification = async () => {
    if (!newMessage.trim() || !user) return;

    setIsCreating(true);

    const { error } = await supabase
      .from('notifications')
      .insert({
        message: newMessage.trim(),
        created_by: user.id,
      });

    if (error) {
      toast.error('Failed to create notification');
    } else {
      toast.success('Notification sent!');
      setNewMessage('');
      setIsDialogOpen(false);
    }

    setIsCreating(false);
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete notification');
    } else {
      toast.success('Notification removed');
    }
  };

  if (notifications.length === 0 && role !== 'admin') return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20">
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex items-center gap-2 text-primary flex-shrink-0">
          <Bell className="w-4 h-4" />
          <span className="text-sm font-medium">Announcements</span>
        </div>

        {/* Scrolling notifications */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-hidden whitespace-nowrap"
        >
          <div className="inline-flex gap-8">
            {notifications.length > 0 ? (
              <>
                {notifications.map((notif) => (
                  <span key={notif.id} className="text-sm text-foreground inline-flex items-center gap-2">
                    📢 {notif.message}
                    {role === 'admin' && (
                      <button
                        onClick={() => handleDeleteNotification(notif.id)}
                        className="text-destructive hover:text-destructive/80 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
                {/* Duplicate for seamless scrolling */}
                {notifications.map((notif) => (
                  <span key={`dup-${notif.id}`} className="text-sm text-foreground inline-flex items-center gap-2">
                    📢 {notif.message}
                  </span>
                ))}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No announcements</span>
            )}
          </div>
        </div>

        {/* Admin: Add notification button */}
        {role === 'admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-shrink-0">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Enter announcement message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  {newMessage.length}/200 characters
                </p>
                <Button 
                  onClick={handleCreateNotification} 
                  disabled={isCreating || !newMessage.trim()}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isCreating ? 'Sending...' : 'Send Announcement'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

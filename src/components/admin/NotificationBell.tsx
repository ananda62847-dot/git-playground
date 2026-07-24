import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, AlertTriangle, FileText, Users, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'grievance' | 'suggestion' | 'volunteer';
  message: string;
  constituency: string;
  created_at: string;
  read: boolean;
  data?: any;
}

interface NotificationBellProps {
  assignedConstituencies: string[];
  isAdmin: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ assignedConstituencies, isAdmin }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Subscribe to new grievances
    const grievanceChannel = supabase
      .channel('grievance-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'grievances',
        },
        (payload) => {
          const newGrievance = payload.new as any;
          
          // Check if this grievance is in assigned constituencies (for moderators) or show all (for admins)
          if (isAdmin || (newGrievance.constituency && assignedConstituencies.includes(newGrievance.constituency))) {
            const notification: Notification = {
              id: `g-${newGrievance.id}`,
              type: 'grievance',
              message: `New grievance from ${newGrievance.name} in ${newGrievance.constituency?.split(' / ')[0] || newGrievance.city}`,
              constituency: newGrievance.constituency || '',
              created_at: newGrievance.created_at,
              read: false,
              data: newGrievance,
            };
            
            setNotifications(prev => [notification, ...prev].slice(0, 20));
            
            // Show toast notification
            toast.info(`New Grievance: ${newGrievance.grievance.substring(0, 50)}...`, {
              description: `From ${newGrievance.name} in ${newGrievance.constituency?.split(' / ')[0] || newGrievance.city}`,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to new suggestions
    const suggestionChannel = supabase
      .channel('suggestion-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'suggestions',
        },
        (payload) => {
          const newSuggestion = payload.new as any;
          
          if (isAdmin || (newSuggestion.constituency && assignedConstituencies.includes(newSuggestion.constituency))) {
            const notification: Notification = {
              id: `s-${newSuggestion.id}`,
              type: 'suggestion',
              message: `New suggestion from ${newSuggestion.name}`,
              constituency: newSuggestion.constituency || '',
              created_at: newSuggestion.created_at,
              read: false,
              data: newSuggestion,
            };
            
            setNotifications(prev => [notification, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    // Subscribe to new volunteers
    const volunteerChannel = supabase
      .channel('volunteer-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'volunteers',
        },
        (payload) => {
          const newVolunteer = payload.new as any;
          
          if (isAdmin || (newVolunteer.constituency && assignedConstituencies.includes(newVolunteer.constituency))) {
            const notification: Notification = {
              id: `v-${newVolunteer.id}`,
              type: 'volunteer',
              message: `New volunteer: ${newVolunteer.name}`,
              constituency: newVolunteer.constituency || '',
              created_at: newVolunteer.created_at,
              read: false,
              data: newVolunteer,
            };
            
            setNotifications(prev => [notification, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(grievanceChannel);
      supabase.removeChannel(suggestionChannel);
      supabase.removeChannel(volunteerChannel);
    };
  }, [assignedConstituencies, isAdmin]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'grievance':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'suggestion':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'volunteer':
        return <Users className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="relative text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-tvk-yellow text-tvk-maroon text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex gap-2">
            {notifications.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                  <Check className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7">
                  <X className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs">New submissions will appear here in real-time</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-tvk-yellow/5' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                      {notification.message}
                    </p>
                    {notification.constituency && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notification.constituency.split(' / ')[0]}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-tvk-maroon flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;

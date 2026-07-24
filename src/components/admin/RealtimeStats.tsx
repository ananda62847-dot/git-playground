import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, Users, Zap, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { fmtISTTime } from '@/lib/datetime';

interface RealtimeStatsProps {
  onNewSubmission?: () => void;
}

interface LiveUpdate {
  id: string;
  type: 'suggestion' | 'grievance' | 'volunteer';
  name: string;
  city: string;
  timestamp: Date;
}

const RealtimeStats: React.FC<RealtimeStatsProps> = ({ onNewSubmission }) => {
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [todayStats, setTodayStats] = useState({
    reported: 0,
    resolved: 0,
    emergency: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchTodayStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const iso = today.toISOString();
      const [reportedRes, resolvedRes, emergencyRes] = await Promise.all([
        supabase.from('problems').select('id', { count: 'exact', head: true }).gte('created_at', iso),
        supabase.from('problems').select('id', { count: 'exact', head: true }).gte('resolved_at', iso),
        supabase.from('problems').select('id', { count: 'exact', head: true }).eq('urgency', 'emergency').gte('created_at', iso),
      ]);
      setTodayStats({
        reported: reportedRes.count || 0,
        resolved: resolvedRes.count || 0,
        emergency: emergencyRes.count || 0,
      });
    };

    fetchTodayStats();

    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'problems' },
        (payload) => {
          const n = payload.new as any;
          addLiveUpdate('grievance', { id: n.id, name: n.reporter_name, city: n.city });
          setTodayStats((prev) => ({
            ...prev,
            reported: prev.reported + 1,
            emergency: prev.emergency + (n.urgency === 'emergency' ? 1 : 0),
          }));
          onNewSubmission?.();
          toast.warning(`New problem · ${n.ticket_no}`, { description: `${n.reporter_name} · ${n.city || ''}` });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'problems' },
        (payload) => {
          const n = payload.new as any, o = payload.old as any;
          if ((n.status === 'completed' || n.status === 'citizen_confirmed') && o.status !== n.status) {
            setTodayStats((prev) => ({ ...prev, resolved: prev.resolved + 1 }));
            toast.success(`Resolved · ${n.ticket_no}`);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewSubmission]);

  const addLiveUpdate = (type: 'suggestion' | 'grievance' | 'volunteer', data: any) => {
    setLiveUpdates((prev) => [
      {
        id: data.id,
        type,
        name: data.name,
        city: data.city?.split(' / ')[0] || 'Unknown',
        timestamp: new Date(),
      },
      ...prev.slice(0, 9), // Keep last 10
    ]);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'grievance':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'volunteer':
        return <Users className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'suggestion':
        return <Badge variant="secondary">Suggestion</Badge>;
      case 'grievance':
        return <Badge variant="destructive">Grievance</Badge>;
      case 'volunteer':
        return <Badge className="bg-green-500">Volunteer</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'Live updates connected' : 'Connecting...'}
        </span>
      </div>

      {/* Today's Stats */}
      <Card className="bg-gradient-to-r from-tvk-maroon/5 to-tvk-yellow/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5" />
            Today's Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-background rounded-lg">
              <FileText className="w-6 h-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{todayStats.reported}</p>
              <p className="text-xs text-muted-foreground">Reported today</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <Users className="w-6 h-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{todayStats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolved today</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{todayStats.emergency}</p>
              <p className="text-xs text-muted-foreground">Emergency today</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-tvk-yellow" />
            Live Feed
            {liveUpdates.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {liveUpdates.length} recent
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveUpdates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Waiting for new submissions...</p>
              <p className="text-xs">Updates will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {liveUpdates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 animate-fade-in"
                >
                  {getTypeIcon(update.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{update.name}</p>
                    <p className="text-xs text-muted-foreground">{update.city}</p>
                  </div>
                  {getTypeBadge(update.type)}
                  <span className="text-xs text-muted-foreground">
                    {fmtISTTime(update.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealtimeStats;

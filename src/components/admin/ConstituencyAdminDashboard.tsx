import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar, { SidebarItem } from '@/components/layout/AppSidebar';
import InternalBottomNav from '@/components/layout/InternalBottomNav';
import {
  AlertTriangle, Users, Users2, Megaphone, Trophy, ShieldCheck, MapPin, Search, Phone, BarChart3, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import ProblemsManagement from './ProblemsManagement';
import CadreManagement from './CadreManagement';
import TeamManagement from './TeamManagement';
import SocialPostsManager from './SocialPostsManager';
import Leaderboards from './Leaderboards';
import AnalyticsDashboard from './AnalyticsDashboard';
import WelfareManagement from './WelfareManagement';
import ConstituencyChoropleth from '@/components/maps/ConstituencyChoropleth';
import EnableNotificationsButton from '@/components/EnableNotificationsButton';
import { fmtIST } from '@/lib/datetime';

interface Props { onLogout: () => void; assignedConstituencies: string[] }

const ITEMS: SidebarItem[] = [
  { title: 'Reports', icon: AlertTriangle, value: 'problems' },
  { title: 'Welfare', icon: Building2, value: 'welfare' },
  { title: 'Analytics', icon: BarChart3, value: 'analytics' },
  { title: 'My Cadres', icon: Users, value: 'cadres' },
  { title: 'Teams', icon: Users2, value: 'teams' },
  { title: 'Leaderboard', icon: Trophy, value: 'leaderboard' },
  { title: 'Heatmap', icon: MapPin, value: 'map' },
  { title: 'Escalations', icon: ShieldCheck, value: 'escalations' },
  { title: 'Public Feed', icon: Megaphone, value: 'feed' },
];

const ConstituencyAdminDashboard: React.FC<Props> = ({ onLogout, assignedConstituencies }) => {
  const [tab, setTab] = useState('problems');
  const [problems, setProblems] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeC, setActiveC] = useState<string>(assignedConstituencies[0] || '');

  const refresh = async () => {
    if (!assignedConstituencies.length) return;
    const { data: probs } = await supabase.from('problems').select('*').in('constituency', assignedConstituencies).order('created_at', { ascending: false }).limit(1000);
    setProblems(probs || []);
    const ids = (probs || []).map((p: any) => p.id);
    if (ids.length) {
      const { data: esc } = await supabase.from('escalations').select('*').in('problem_id', ids).order('created_at', { ascending: false });
      setEscalations(esc || []);
    } else setEscalations([]);
  };
  useEffect(() => { refresh(); }, [assignedConstituencies.join(',')]);

  const stats = useMemo(() => {
    const total = problems.length;
    const resolved = problems.filter(p => ['resolved', 'completed', 'citizen_confirmed'].includes(p.status)).length;
    const open = total - resolved;
    const emergency = problems.filter(p => p.urgency === 'emergency').length;
    return { total, resolved, open, emergency };
  }, [problems]);

  const closeEscalation = async (id: string) => {
    const { error } = await supabase.from('escalations').update({ status: 'closed', resolved_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Escalation closed'); refresh(); }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          brand="Makkal Connect"
          subtitle="Constituency Admin"
          items={ITEMS}
          activeValue={tab}
          onSelect={setTab}
          onLogout={onLogout}
        />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-sm md:text-base font-semibold capitalize truncate">{tab}</div>
              </div>
              <div className="flex items-center gap-2">
                <EnableNotificationsButton ctx={{ role: 'constituency_admin', constituency: assignedConstituencies[0] }} />
                <div className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{assignedConstituencies.length} constituency
                </div>
              </div>
            </div>
          </header>

          <main className="p-3 md:p-4 space-y-3 max-w-full overflow-x-hidden">
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Your assigned constituencies</div>
                <div className="flex flex-wrap gap-1">
                  {assignedConstituencies.map(c => (
                    <Badge key={c} variant={c === activeC ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setActiveC(c)}>{c.split(' / ')[0]}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {[
                { l: 'Total', v: stats.total, c: 'bg-blue-100 text-blue-700' },
                { l: 'Open', v: stats.open, c: 'bg-orange-100 text-orange-700' },
                { l: 'Resolved', v: stats.resolved, c: 'bg-green-100 text-green-700' },
                { l: 'Emergency', v: stats.emergency, c: 'bg-red-100 text-red-700' },
              ].map((k, i) => (
                <Card key={i}><CardContent className="p-3 text-center">
                  <div className={`inline-block px-2 py-1 rounded text-[10px] mb-1 ${k.c}`}>{k.l}</div>
                  <div className="text-2xl font-bold">{k.v}</div>
                </CardContent></Card>
              ))}
            </div>

            {tab === 'problems' && <ProblemsManagement isAdmin={false} allowedConstituencies={assignedConstituencies} />}
            {tab === 'welfare' && <WelfareManagement scope={{ allowedConstituencies: assignedConstituencies }} canEdit />}
            {tab === 'analytics' && <AnalyticsDashboard scope={{ kind: 'constituency', constituencies: assignedConstituencies }} />}
            {tab === 'cadres' && <CadreManagement isAdmin={false} allowedConstituencies={assignedConstituencies} />}
            {tab === 'teams' && <TeamManagement isAdmin={false} allowedConstituencies={assignedConstituencies} />}
            {tab === 'leaderboard' && <Leaderboards constituency={activeC} />}
            {tab === 'map' && <ConstituencyChoropleth allowedConstituencies={assignedConstituencies} allowModeSwitch={false} />}
            {tab === 'feed' && <SocialPostsManager isAdmin={false} allowedConstituencies={assignedConstituencies} />}
            {tab === 'escalations' && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Escalations in your constituencies</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {escalations.length === 0 && <div className="text-xs text-muted-foreground py-6 text-center">No open escalations.</div>}
                  {escalations.map(e => (
                    <div key={e.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{e.reason}</div>
                        <div className="text-[10px] text-muted-foreground">to {e.to_level} · {fmtIST(e.created_at)}</div>
                      </div>
                      <Badge variant={e.status === 'open' ? 'destructive' : 'secondary'}>{e.status}</Badge>
                      {e.status === 'open' && <Button size="sm" variant="outline" onClick={() => closeEscalation(e.id)}>Close</Button>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </main>
          <InternalBottomNav items={ITEMS} activeValue={tab} onSelect={setTab} onLogout={onLogout} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
export default ConstituencyAdminDashboard;

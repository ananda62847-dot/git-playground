import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  LogOut, Users, AlertTriangle, BarChart3, GitCompare, UserPlus, Megaphone,
  Shield, ListChecks, Users2, MapPin, Trophy, CheckCircle2, Building2, Brain, Settings, HeartPulse, StickyNote
} from 'lucide-react';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminInternalNotes from '@/components/admin/AdminInternalNotes';
import FundRequestsManagement from '@/components/admin/FundRequestsManagement';
import LanguageToggle from '@/components/layout/LanguageToggle';
import AIOperationsCenter from '@/components/admin/AIOperationsCenter';
import WelfareManagement from '@/components/admin/WelfareManagement';
import CreateAccountModal from '@/components/admin/CreateAccountModal';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import ComparisonView from '@/components/admin/ComparisonView';
import NotificationBell from '@/components/admin/NotificationBell';
import ProblemsManagement from '@/components/admin/ProblemsManagement';
import CadreManagement from '@/components/admin/CadreManagement';
import TeamManagement from '@/components/admin/TeamManagement';
import CorruptionReports from '@/components/admin/CorruptionReports';
import SocialPostsManager from '@/components/admin/SocialPostsManager';
import CompletedWorksManager from '@/components/admin/CompletedWorksManager';
import Leaderboards from '@/components/admin/Leaderboards';
import ConstituencyChoropleth from '@/components/maps/ConstituencyChoropleth';
import ConstituencyAdminDashboard from '@/components/admin/ConstituencyAdminDashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar, { SidebarItem } from '@/components/layout/AppSidebar';
import InternalBottomNav from '@/components/layout/InternalBottomNav';
import EnableNotificationsButton from '@/components/EnableNotificationsButton';



const ITEMS: SidebarItem[] = [
  { title: 'Problems', icon: AlertTriangle, value: 'problems' },
  { title: 'Welfare', icon: Building2, value: 'welfare' },
  { title: 'Fund Requests', icon: HeartPulse, value: 'fund_requests' },
  { title: 'Cadres', icon: Users, value: 'cadres' },
  { title: 'Teams', icon: Users2, value: 'teams' },
  { title: 'Leaderboard', icon: Trophy, value: 'leaderboard' },
  { title: 'Heatmap', icon: MapPin, value: 'map' },
  { title: 'Analytics', icon: BarChart3, value: 'analytics' },
  { title: 'Compare', icon: GitCompare, value: 'compare' },
  { title: 'Feed', icon: Megaphone, value: 'feed' },
  { title: 'Completed Works', icon: CheckCircle2, value: 'works' },
  { title: 'Corruption', icon: Shield, value: 'corruption' },
  { title: 'AI Operations', icon: Brain, value: 'ai_ops' },
  { title: 'Internal Notes', icon: StickyNote, value: 'notes' },
  { title: 'Settings', icon: Settings, value: 'settings' },
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('problems');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/admin');
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle();
      if (!roleData) { toast.error('No role assigned'); navigate('/admin'); return; }
      let role: 'super_admin' | 'constituency_admin' = 'super_admin';
      let constituency: string | null = null;
      if (roleData.role === 'admin') setIsAdmin(true);
      else {
        const { data: con } = await supabase.from('moderator_constituencies').select('constituency').eq('user_id', session.user.id);
        const list = (con || []).map(c => c.constituency);
        setAllowed(list);
        role = 'constituency_admin';
        constituency = list[0] || null;
      }
      import('@/lib/notifications').then(m => m.syncNotificationToken({ role, constituency }));
      setLoading(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (loading || !isAdmin) return;
    (async () => {
      const { data } = await supabase.from('problems').select('*').order('created_at', { ascending: false }).limit(2000);
      setProblems(data || []);
    })();
  }, [loading, isAdmin]);

  const logout = async () => { await supabase.auth.signOut(); navigate('/admin'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  // Constituency admin gets their own dedicated interface
  if (!isAdmin) return <ConstituencyAdminDashboard onLogout={logout} assignedConstituencies={allowed} />;

  const total = problems.length;
  const open = problems.filter(p => !['completed', 'citizen_confirmed', 'resolved'].includes(p.status)).length;
  const resolved = problems.filter(p => ['completed', 'citizen_confirmed', 'resolved'].includes(p.status)).length;
  const emergency = problems.filter(p => p.urgency === 'emergency').length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          brand="Makkal Connect"
          subtitle="Super Admin"
          items={ITEMS}
          activeValue={tab}
          onSelect={setTab}
          onLogout={logout}
        />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-sm md:text-base font-semibold capitalize truncate">{tab}</div>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <LanguageToggle />
                <EnableNotificationsButton ctx={{ role: 'super_admin' }} />
                <NotificationBell assignedConstituencies={allowed} isAdmin={isAdmin} />
                <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}><UserPlus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Sub-account</span></Button>
              </div>
            </div>
          </header>

          <main className="p-3 md:p-4 space-y-4 max-w-full overflow-x-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {[
                { label: 'Total reports', val: total, icon: ListChecks, color: 'text-blue-600 bg-blue-100' },
                { label: 'Open', val: open, icon: AlertTriangle, color: 'text-orange-600 bg-orange-100' },
                { label: 'Resolved', val: resolved, icon: BarChart3, color: 'text-green-600 bg-green-100' },
                { label: 'Emergency', val: emergency, icon: Shield, color: 'text-red-600 bg-red-100' },
              ].map((k, i) => {
                const Icon = k.icon;
                return (
                  <Card key={i}><CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full ${k.color} flex items-center justify-center`}><Icon className="w-5 h-5" /></div>
                    <div className="min-w-0"><div className="text-xl md:text-2xl font-bold leading-none">{k.val}</div><div className="text-[10px] md:text-xs text-muted-foreground">{k.label}</div></div>
                  </CardContent></Card>
                );
              })}
            </div>

            {tab === 'problems' && <ProblemsManagement isAdmin={isAdmin} allowedConstituencies={allowed} />}
            {tab === 'welfare' && <WelfareManagement canEdit />}
            {tab === 'fund_requests' && <FundRequestsManagement />}
            {tab === 'cadres' && <CadreManagement isAdmin={isAdmin} allowedConstituencies={allowed} />}
            {tab === 'teams' && <TeamManagement isAdmin={isAdmin} allowedConstituencies={allowed} />}
            {tab === 'leaderboard' && <Leaderboards />}
            {tab === 'map' && <ConstituencyChoropleth allowModeSwitch />}
            {tab === 'analytics' && <AnalyticsDashboard scope={{ kind: 'super' }} />}
            {tab === 'compare' && <ComparisonView suggestions={[]} grievances={problems as any} volunteers={[]} />}
            {tab === 'feed' && <SocialPostsManager isAdmin={isAdmin} allowedConstituencies={allowed} />}
            {tab === 'works' && <CompletedWorksManager />}
            {tab === 'corruption' && <CorruptionReports />}
            {tab === 'ai_ops' && <AIOperationsCenter />}
            {tab === 'notes' && <AdminInternalNotes />}
            {tab === 'settings' && <AdminSettings />}
          </main>
          <InternalBottomNav items={ITEMS} activeValue={tab} onSelect={setTab} onLogout={logout} />
        </SidebarInset>
      </div>
      <CreateAccountModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => setShowCreate(false)} />
    </SidebarProvider>
  );
};

export default AdminDashboard;

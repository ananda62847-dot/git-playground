import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListChecks, CalendarDays, AlertTriangle, User as UserIcon, Upload, MapPin, Phone, Users2, Hand, UserCheck, Trophy, Star, Clock, Building2, Brain, Bell, BellRing, BellOff, Plus, Loader2, FilePlus, MoreVertical, LogOut, KeyRound, MessageSquare } from 'lucide-react';
import CadreMyTasks from '@/components/cadre/CadreMyTasks';
import { STATUS_STAGES, DEPARTMENTS } from '@/lib/departments';
import { toast } from 'sonner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar, { SidebarItem } from '@/components/layout/AppSidebar';
import CadreBottomNav from '@/components/layout/CadreBottomNav';
import PasswordChangeForm from '@/components/PasswordChangeForm';
import CadreFileReport from '@/components/cadre/CadreFileReport';
import CadreHistory from '@/components/cadre/CadreHistory';
import LanguageToggle from '@/components/layout/LanguageToggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { requestNotificationPermission } from '@/lib/notifications';
import { fmtIST } from '@/lib/datetime';
import { useT, useLang, depLabel, stageLabel } from '@/lib/i18n/cadreT';

// Lazy-load heavy tabs — they only mount when the tab is opened
const CadreAIInbox = lazy(() => import('@/components/cadre/CadreAIInbox'));
const WelfareManagement = lazy(() => import('@/components/admin/WelfareManagement'));
const CadreWorkspace = lazy(() => import('@/components/cadre/CadreWorkspace'));
const Leaderboards = lazy(() => import('@/components/admin/Leaderboards'));

const useCadreItems = (): SidebarItem[] => {
  const t = useT();
  return [
    { title: t.side_next_actions, icon: ListChecks, value: 'actions' },
    { title: t.tab_ai_inbox, icon: Brain, value: 'ai_inbox' },
    { title: t.side_problems, icon: ListChecks, value: 'problems' },
    { title: t.tab_welfare, icon: Building2, value: 'welfare' },
    { title: t.side_file_on_behalf, icon: FilePlus, value: 'file_report' },
    { title: t.tab_team, icon: Users2, value: 'team' },
    { title: t.tab_postings, icon: CalendarDays, value: 'postings' },
    { title: t.tab_escalations, icon: AlertTriangle, value: 'escalations' },
    { title: t.tab_rank.split(' ')[0], icon: Trophy, value: 'rank' },
    { title: t.tab_profile, icon: UserIcon, value: 'profile' },
  ];
};

// Legacy helper kept for callers — delegates to the new 6-tier system.
import { tierFromPoints } from '@/lib/cadreTiers';
const rankFromPoints = (points = 0) => tierFromPoints(points).id;

const formatIST = (value: string) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
}).format(new Date(value));

const CadreDashboard: React.FC = () => {
  const nav = useNavigate();
  const t = useT();
  const lang = useLang();
  const CADRE_ITEMS = useCadreItems();

  // Session cache: warm the page from previous session data so no shimmer on reload/tab-switch.
  const CACHE_KEY = 'cadre_dash_cache_v1';
  const cached = React.useMemo<any>(() => {
    try {
      const s = typeof window !== 'undefined' ? sessionStorage.getItem(CACHE_KEY) : null;
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }, []);

  const [loading, setLoading] = useState(!cached);
  const initialLoaded = React.useRef(!!cached);
  const [cadre, setCadre] = useState<any>(cached?.cadre || null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [assignments, setAssignments] = useState<any[]>(cached?.assignments || []);
  const [recalled, setRecalled] = useState<any[]>([]);
  const [welfareIds, setWelfareIds] = useState<string[]>(cached?.welfareIds || []);
  const [postings, setPostings] = useState<any[]>(cached?.postings || []);
  const [escalations, setEscalations] = useState<any[]>(cached?.escalations || []);
  const [team, setTeam] = useState<any | null>(cached?.team || null);
  const [teamMates, setTeamMates] = useState<any[]>(cached?.teamMates || []);
  const [open, setOpen] = useState<any>(null);
  const [tab, setTab] = useState('actions');

  const load = async () => {
    if (!initialLoaded.current) setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { nav('/cadre/login'); return; }
    const { data: c, error: cadreError } = await supabase.from('cadres').select('*').eq('user_id', session.user.id).maybeSingle();
    if (cadreError) { toast.error(cadreError.message); setLoading(false); return; }
    if (!c) { toast.error('No cadre profile linked'); await supabase.auth.signOut(); nav('/cadre/login'); return; }
    setCadre(c);

    // PHASE 1 — parallel: team memberships, direct assignments (problem + welfare), postings, escalations, joiners
    const [tmRes, paDirectRes, waDirectRes, postRes, escRes, joinsRes] = await Promise.all([
      supabase.from('team_members').select('team_id').eq('cadre_id', c.id),
      supabase.from('problem_assignments').select('*').eq('active', true).eq('cadre_id', c.id),
      supabase.from('welfare_assignments').select('welfare_id').eq('active', true).eq('cadre_id', c.id),
      supabase.from('team_postings').select('*').eq('cadre_id', c.id).order('starts_at', { ascending: false }),
      supabase.from('escalations').select('*').eq('raised_by_cadre_id', c.id).order('created_at', { ascending: false }),
      supabase.from('problem_assignment_joiners').select('assignment_id').eq('cadre_id', c.id),
    ]);

    setPostings(postRes.data || []);
    setEscalations(escRes.data || []);
    const teamIds = (tmRes.data || []).map((x: any) => x.team_id);
    const joinedSet = new Set((joinsRes.data || []).map((j: any) => j.assignment_id));

    // PHASE 2 — parallel: team-based queries (if applicable) + first team profile
    const teamProblemP = teamIds.length
      ? supabase.from('problem_assignments').select('*').eq('active', true).in('team_id', teamIds)
      : Promise.resolve({ data: [] as any[] });
    const teamWelfareP = teamIds.length
      ? supabase.from('welfare_assignments').select('welfare_id').eq('active', true).in('team_id', teamIds)
      : Promise.resolve({ data: [] as any[] });
    const teamRowP = teamIds.length
      ? supabase.from('teams').select('*').eq('id', teamIds[0]).maybeSingle()
      : Promise.resolve({ data: null as any });
    const teamMembersP = teamIds.length
      ? supabase.from('team_members').select('cadre_id, role_in_team').eq('team_id', teamIds[0])
      : Promise.resolve({ data: [] as any[] });

    const [paTeamRes, waTeamRes, teamRowRes, teamMembersRes] = await Promise.all([
      teamProblemP, teamWelfareP, teamRowP, teamMembersP,
    ]);

    setTeam(teamRowRes.data || null);
    const memberIds = (teamMembersRes.data || []).map((m: any) => m.cadre_id);
    let teamMatesData: any[] = [];
    if (memberIds.length) {
      const { data: mc } = await supabase.from('cadres')
        .select('id,name,phone,level,role_title,profile_photo_url')
        .in('id', memberIds);
      teamMatesData = mc || [];
    }
    setTeamMates(teamMatesData);

    // Combine assignments and fetch problems in ONE batch with reduced projection
    const allPa = [...(paDirectRes.data || []), ...(paTeamRes.data || [])];
    const uniqIds = Array.from(new Set(allPa.map((a: any) => a.problem_id)));
    let problemsById: Record<string, any> = {};
    if (uniqIds.length) {
      const { data: probs } = await supabase.from('problems')
        .select('id,ticket_no,title,status,urgency,department,category,area,constituency,city,address_line,description,latitude,longitude,reporter_name,reporter_phone,reporter_age,created_at,resolved_at,support_count,voice_note_url,voice_transcript,pincode,ai_action_plan,ai_action_plan_at')
        .in('id', uniqIds);
      (probs || []).forEach((p: any) => { problemsById[p.id] = p; });
    }
    const merged = allPa
      .map((a: any) => ({ ...a, problem: problemsById[a.problem_id], joined: joinedSet.has(a.id) }))
      .filter((a: any) => a.problem)
      .sort((a: any, b: any) => new Date(b.problem.created_at).getTime() - new Date(a.problem.created_at).getTime());
    setAssignments(merged);
    const welfareIdList = Array.from(new Set([...(waDirectRes.data || []), ...(waTeamRes.data || [])].map((x: any) => x.welfare_id)));
    setWelfareIds(welfareIdList);

    // Fetch recently reverted assignments (last 30 days) where this cadre used to be the owner/claimer,
    // so they can see the admin's revert notice + reason.
    const sinceIso = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    const { data: recalledRows } = await supabase
      .from('problem_assignments' as any)
      .select('*')
      .not('recalled_at', 'is', null)
      .gte('recalled_at', sinceIso)
      .or(`recalled_from_cadre_id.eq.${c.id},cadre_id.eq.${c.id},claimed_by_cadre_id.eq.${c.id}`)
      .order('recalled_at', { ascending: false })
      .limit(20);
    const recIds = Array.from(new Set((recalledRows || []).map((r: any) => r.problem_id)));
    let recProblems: Record<string, any> = {};
    if (recIds.length) {
      const { data: rp } = await supabase.from('problems')
        .select('id,ticket_no,title,status,urgency,department,area,constituency,created_at')
        .in('id', recIds);
      (rp || []).forEach((p: any) => { recProblems[p.id] = p; });
    }
    setRecalled((recalledRows || [])
      .map((r: any) => ({ ...r, problem: recProblems[r.problem_id] }))
      .filter((r: any) => r.problem));

    // Write session cache so next mount can serve instantly without shimmer.
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        cadre: c,
        assignments: merged,
        welfareIds: welfareIdList,
        postings: postRes.data || [],
        escalations: escRes.data || [],
        team: teamRowRes.data || null,
        teamMates: teamMatesData,
        savedAt: Date.now(),
      }));
    } catch {}


    setLoading(false);
    initialLoaded.current = true;
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!cadre) return;
    import('@/lib/notifications').then(m => m.syncNotificationToken({
      role: 'cadre', constituency: cadre.constituency, department: cadre.department,
    }));
    // Heartbeat: record last_seen_at via SECURITY DEFINER RPC (RLS-safe).
    const ping = () => supabase.rpc('cadre_heartbeat' as any);
    ping();
    const iv = setInterval(ping, 2 * 60 * 1000);
    const onVis = () => { if (document.visibilityState === 'visible') ping(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [cadre]);

  const logout = async () => { try { sessionStorage.removeItem(CACHE_KEY); } catch {} await supabase.auth.signOut(); nav('/cadre/login'); };

  const claim = async (assignmentId: string) => {
    const { error } = await supabase
      .from('problem_assignments' as any)
      .update({ claimed_by_cadre_id: cadre.id, claimed_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .is('claimed_by_cadre_id', null);
    if (error) return toast.error(error.message);
    toast.success('Claimed. You can set ETA from the workspace.'); load();
  };
  const join = async (assignmentId: string) => {
    const { error } = await supabase.from('problem_assignment_joiners').insert({ assignment_id: assignmentId, cadre_id: cadre.id });
    if (error) return toast.error(error.message);
    toast.success('Joined as supporter'); load();
  };

  if (loading) return (
    <div className="min-h-screen bg-background p-4 space-y-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
      <div className="h-14 rounded-2xl bg-muted animate-pulse" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
      </div>
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
    </div>
  );

  const CLOSED = ['resolved','completed','citizen_confirmed','rejected','duplicate'];
  const activeAssignments = assignments.filter(a => !CLOSED.includes(a.problem?.status));
  const topActive = activeAssignments[0];
  const tabTitleMap: Record<string, string> = {
    actions: t.tab_actions, ai_inbox: t.tab_ai_inbox, problems: t.tab_problems,
    welfare: t.tab_welfare, file_report: t.tab_file_report, team: t.tab_team,
    postings: t.tab_postings, escalations: t.tab_escalations, rank: t.tab_rank,
    profile: t.tab_profile, history: t.tab_history,
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          brand={cadre.name}
          subtitle={`${cadre.level} · ${[cadre.area, cadre.constituency].filter(Boolean).join(' · ') || cadre.city}`}
          items={CADRE_ITEMS}
          activeValue={tab}
          onSelect={setTab}
          onLogout={logout}
        />
        <SidebarInset className="min-w-0">
          {/* Mobile-native app bar */}
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between gap-2 px-3 h-14">
              <div className="flex items-center gap-2.5 min-w-0">
                {cadre.profile_photo_url
                  ? <img src={cadre.profile_photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-border" />
                  : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">{cadre.name?.[0]}</div>}
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{cadre.level || 'Cadre'}</div>
                  <div className="text-sm font-bold truncate leading-tight">{tabTitleMap[tab] || tab}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <LanguageToggle />
                <div className="hidden sm:flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20">
                  <Trophy className="w-3 h-3" />
                  <span className="font-bold tabular-nums">{cadre.points || 0}</span>
                  <Star className="w-3 h-3 fill-current ml-0.5" />
                  <span className="font-bold tabular-nums">{cadre.stars || 0}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Menu">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setTab('profile')}>
                      <UserIcon className="w-4 h-4 mr-2" /> <span lang={lang} className="tamil-safe">{t.menu_profile}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav('/cadre/score-history')}>
                      <Trophy className="w-4 h-4 mr-2" /> <span lang={lang} className="tamil-safe">{t.menu_score}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav('/cadre/chat')}>
                      <MessageSquare className="w-4 h-4 mr-2" /> Chat assistant
                    </DropdownMenuItem>
                    {notifPerm !== 'unsupported' && (
                      <DropdownMenuItem
                        onClick={async () => {
                          const r = await requestNotificationPermission({ role: 'cadre', constituency: cadre.constituency, department: cadre.department });
                          const next = r.permission ?? Notification.permission;
                          setNotifPerm(next);
                          if (r.ok) toast.success(t.menu_alerts_on);
                          else toast.error(r.message || 'Not enabled');
                        }}
                        disabled={notifPerm === 'granted'}
                      >
                        {notifPerm === 'granted'
                          ? <><BellRing className="w-4 h-4 mr-2" /><span lang={lang} className="tamil-safe">{t.menu_alerts_on}</span></>
                          : notifPerm === 'denied'
                            ? <><BellOff className="w-4 h-4 mr-2" /><span lang={lang} className="tamil-safe">{t.menu_alerts_blocked}</span></>
                            : <><Bell className="w-4 h-4 mr-2" /><span lang={lang} className="tamil-safe">{t.menu_enable_alerts}</span></>}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> <span lang={lang} className="tamil-safe">{t.menu_logout}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="px-3 py-4 space-y-4 max-w-full overflow-x-hidden pb-24">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card border rounded-2xl p-3 text-center"><div className="text-2xl font-bold text-primary">{assignments.length}</div><div className="text-[10px] text-muted-foreground">{t.stat_assigned}</div></div>
              <div className="bg-card border rounded-2xl p-3 text-center"><div className="text-2xl font-bold text-green-600">{assignments.filter(a => a.problem.status === 'completed' || a.problem.status === 'citizen_confirmed').length}</div><div className="text-[10px] text-muted-foreground">{t.stat_resolved}</div></div>
              <div className="bg-card border rounded-2xl p-3 text-center"><div className="text-2xl font-bold text-orange-600">{escalations.filter(e => e.status === 'open').length}</div><div className="text-[10px] text-muted-foreground">{t.stat_escalated}</div></div>
            </div>


            <Tabs value={tab} onValueChange={setTab}>
              <TabsContent value="actions" className="mt-0 space-y-3">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary mb-0.5">{t.actions_banner_title}</div>
                  <div className="text-[11px] text-muted-foreground">{t.actions_banner_sub}</div>
                </div>
                <button type="button" onClick={() => setTab('rank')}
                  className="w-full flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-xl p-3 text-left active:scale-[0.99]">
                  <Trophy className="w-5 h-5 text-yellow-700" />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-yellow-900">{t.tab_rank}</div>
                    <div className="text-[10px] text-yellow-800">{cadre.points || 0} {t.points_label} · #{cadre.rank || '—'}</div>
                  </div>
                </button>
                <CadreMyTasks
                  problemIds={assignments.map(a => a.problem_id)}
                  welfareIds={welfareIds}
                  onOpenProblem={(pid) => {
                    // Prefer the mobile-friendly detail page for viewing; workspace for editing lives on that page too.
                    nav(`/cadre/report/${pid}`);
                  }}
                />
              </TabsContent>
              <TabsContent value="ai_inbox" className="mt-0">
                <Suspense fallback={<div className="h-40 rounded-xl bg-muted animate-pulse" />}>
                  <CadreAIInbox cadreId={cadre.id} />
                </Suspense>
              </TabsContent>
              <TabsContent value="problems" className="mt-0 space-y-3">
            {(() => {
              const active = activeAssignments;
              const history = assignments.filter(a => CLOSED.includes(a.problem?.status));
              const render = (list: any[], emptyMsg: string, lockAll = false) => (
                <>
                  {list.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">{emptyMsg}</div>}
                  {list.map(a => {
                    const p = a.problem;
                    const stage = STATUS_STAGES.find(s => s.id === p.status);
                    const dep = DEPARTMENTS.find(d => d.id === p.department);
                    const isDirect = a.cadre_id === cadre.id;
                    const isClaimer = a.claimed_by_cadre_id === cadre.id;
                    const isEscalated = !!a.escalated_at;
                    const isClosed = lockAll || CLOSED.includes(p.status);
                    const canEdit = (isDirect || isClaimer) && !isEscalated && !isClosed;
                    const isTeamAssign = !!a.team_id && !isDirect;
                    const unclaimed = isTeamAssign && !a.claimed_by_cadre_id && !isEscalated && !isClosed;
                    return (
                      <div key={a.id} className={`bg-card border rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-transform ${isEscalated ? 'border-amber-500/60' : ''} ${isClosed ? 'opacity-80' : ''}`}>
                        <div className="flex flex-wrap gap-1 mb-1">
                          <span className="font-mono text-[10px] bg-muted px-1.5 rounded">{p.ticket_no}</span>
                          <Badge variant="outline" className="text-[10px]">{depLabel(dep, lang)}</Badge>
                          <Badge variant="outline" className="text-[10px]">{stageLabel(stage, lang)}</Badge>
                          {p.urgency === 'emergency' && <Badge className="bg-red-600 text-white text-[10px]">{t.badge_emergency}</Badge>}
                          {isDirect && !isClosed && <Badge className="bg-blue-600 text-white text-[10px]">{t.badge_direct}</Badge>}
                          {isClaimer && !isClosed && <Badge className="bg-green-600 text-white text-[10px]">{t.badge_claimed}</Badge>}
                          {isTeamAssign && a.claimed_by_cadre_id && !isClaimer && !isClosed && <Badge variant="secondary" className="text-[10px]">{t.badge_team_led}</Badge>}
                          {unclaimed && <Badge className="bg-amber-500 text-white text-[10px]">{t.badge_open_claim}</Badge>}
                          {isEscalated && <Badge className="bg-amber-600 text-white text-[10px]">{t.badge_escalated}</Badge>}
                          {isClosed && <Badge className="bg-slate-500 text-white text-[10px]">{t.badge_closed}</Badge>}
                        </div>
                        <div className="font-semibold text-sm break-words">{p.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.area, p.constituency].filter(Boolean).join(' · ')}</div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {unclaimed && <Button size="sm" variant="default" onClick={() => claim(a.id)}><Hand className="w-3 h-3 mr-1" />{t.btn_claim_lead}</Button>}
                          {a.estimated_completion_at && !isClosed && <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />{t.eta_label} {formatIST(a.estimated_completion_at)}</Badge>}
                          {isTeamAssign && a.claimed_by_cadre_id && !isClaimer && !a.joined && !isEscalated && !isClosed && <Button size="sm" variant="outline" onClick={() => join(a.id)}><UserCheck className="w-3 h-3 mr-1" />{t.btn_join_view}</Button>}
                          {a.joined && !isClaimer && <Badge variant="outline" className="text-[10px]">{t.supporter_note}</Badge>}
                          <Button size="sm" onClick={() => nav(`/cadre/report/${p.id}`)}>{t.btn_view}</Button>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
              return (
                <>
                  {render(active, t.empty_active)}
                  {history.length > 0 && (
                    <details className="pt-3">
                      <summary className="text-xs font-semibold text-muted-foreground cursor-pointer py-2">{t.history_toggle(history.length)}</summary>
                      <div className="space-y-2 mt-2">{render(history, '', true)}</div>
                    </details>
                  )}
                </>
              );
            })()}
          </TabsContent>



          <TabsContent value="welfare" className="mt-3">
            <Suspense fallback={<div className="h-40 rounded-xl bg-muted animate-pulse" />}>
              <WelfareManagement idsFilter={welfareIds} canEdit />
            </Suspense>
          </TabsContent>


          <TabsContent value="team" className="mt-3 space-y-2">
            {!team && <div className="text-sm text-muted-foreground py-6 text-center">{t.empty_team}</div>}
            {team && (
              <>
                <div className="bg-card border rounded-lg p-3">
                  <div className="font-bold">{team.name}</div>
                  <div className="text-[11px] text-muted-foreground">{[team.department, team.constituency, team.city].filter(Boolean).join(' · ')}</div>
                  {team.description && <p className="text-xs mt-1">{team.description}</p>}
                </div>
                <div className="text-xs font-semibold text-muted-foreground">{t.team_members(teamMates.length)}</div>
                <div className="space-y-1">
                  {teamMates.map(m => (
                    <div key={m.id} className="bg-card border rounded-lg p-2 flex items-center gap-2">
                      {m.profile_photo_url
                        ? <img src={m.profile_photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{m.name?.[0]}</div>}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{m.name}{m.id === cadre.id && <span className="text-[10px] text-muted-foreground ml-1">{t.you_marker}</span>}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{m.role_title || m.level}</div>
                      </div>
                      <a href={`tel:${m.phone}`} className="text-xs inline-flex items-center gap-1 text-primary"><Phone className="w-3 h-3" />{m.phone}</a>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="postings" className="mt-3 space-y-2">
            {postings.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">{t.empty_postings}</div>}
            {postings.map(p => (
              <div key={p.id} className="bg-card border rounded-lg p-3">
                <div className="font-semibold text-sm">{p.posting_title}</div>
                <div className="text-[11px] text-muted-foreground">{p.posting_type} · {p.area || '—'}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{fmtIST(p.starts_at)} {p.ends_at ? '→ ' + fmtIST(p.ends_at) : ''}</div>
                {p.notes && <p className="text-xs mt-1">{p.notes}</p>}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="escalations" className="mt-3 space-y-2">
            {escalations.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">{t.empty_escalations}</div>}
            {escalations.map(e => (
              <div key={e.id} className="bg-card border rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="text-xs font-mono">{e.problem_id.slice(0, 8)}</div>
                  <Badge variant={e.status === 'open' ? 'destructive' : 'secondary'} className="text-[10px]">{e.status}</Badge>
                </div>
                <p className="text-sm mt-1">{e.reason}</p>
                <div className="text-[11px] text-muted-foreground mt-1">→ {e.to_level}</div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="profile" className="mt-3 space-y-3">
            <div className="bg-card border rounded-lg p-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {cadre.profile_photo_url
                  ? <img src={cadre.profile_photo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                  : <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{cadre.name?.[0]}</div>}
                <div className="flex-1">
                  <div className="font-bold">{cadre.name}</div>
                  <label className="text-xs text-primary cursor-pointer underline">
                    {t.profile_change_photo}
                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const path = `cadre-photos/${cadre.id}-${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi,'_')}`;
                      const { error } = await supabase.storage.from('problem-media').upload(path, file, { contentType: file.type });
                      if (error) return toast.error(error.message);
                      const url = supabase.storage.from('problem-media').getPublicUrl(path).data.publicUrl;
                      const { error: e2 } = await supabase.from('cadres').update({ profile_photo_url: url }).eq('id', cadre.id);
                      if (e2) return toast.error(e2.message);
                      toast.success('Photo updated'); load();
                    }} />
                  </label>
                </div>
              </div>
              <div><b>{t.profile_email}:</b> {cadre.email}</div>
              <div className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /><b>{t.profile_phone}:</b> {cadre.phone}</div>
              <div><b>{t.profile_level}:</b> {cadre.level}</div>
              <div><b>{t.profile_role}:</b> {cadre.role_title || '—'}</div>
              <div><b>{t.profile_location}:</b> {[cadre.area, cadre.constituency, cadre.city].filter(Boolean).join(' · ')}</div>
              <div><b>{t.profile_status}:</b> {cadre.approved ? <Badge className="bg-green-600">{t.status_approved}</Badge> : <Badge variant="secondary">{t.status_pending}</Badge>}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
                <Clock className="w-3 h-3" />
                <b>Last seen:</b>&nbsp;
                {cadre.last_seen_at ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(cadre.last_seen_at)) : '—'}
              </div>
            </div>
            <PasswordChangeForm />
          </TabsContent>

          <TabsContent value="rank" className="mt-0 space-y-3">
            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 border border-yellow-300 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wider text-yellow-800">{t.your_rank}</div>
              <div className="text-4xl font-black text-yellow-900 mt-1">#{cadre.rank || '—'}</div>
              <div className="flex gap-4 mt-3 text-sm">
                <div><span className="font-bold text-2xl">{cadre.points || 0}</span> <span className="text-xs text-muted-foreground">{t.points_label}</span></div>
                <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /><span className="font-bold">{cadre.stars || 0}</span></div>
                <div><span className="font-bold">{cadre.resolved_count || 0}</span> <span className="text-xs text-muted-foreground">{t.solved_label}</span></div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">{t.scoring_help}</div>
            </div>
            <Suspense fallback={<div className="h-40 rounded-xl bg-muted animate-pulse" />}>
              <Leaderboards constituency={cadre.constituency || undefined} />
            </Suspense>
          </TabsContent>

          <TabsContent value="file_report" className="mt-0">
            <CadreFileReport cadre={cadre} />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <CadreHistory cadre={cadre} />
          </TabsContent>
            </Tabs>
          </main>

          {/* Mobile FAB — opens top active task workspace */}
          {topActive && (tab === 'actions' || tab === 'problems') && (
            <button
              type="button"
              onClick={() => setOpen({ problem: topActive.problem, assignment: topActive, viewOnly: false })}
              className="md:hidden fixed right-4 z-40 bg-primary text-primary-foreground rounded-full w-14 h-14 shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-95 transition"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
              aria-label="Open top active task"
            >
              <Upload className="w-6 h-6" />
            </button>
          )}

          <CadreBottomNav active={tab} onChange={(k) => setTab(k)} />
        </SidebarInset>
      </div>

      {open && (
        <Suspense fallback={null}>
          <CadreWorkspace problem={open.problem} assignment={open.assignment} viewOnly={!!open.viewOnly} cadreId={cadre.id} onClose={() => { setOpen(null); load(); }} />
        </Suspense>
      )}
    </SidebarProvider>
  );
};




export default CadreDashboard;
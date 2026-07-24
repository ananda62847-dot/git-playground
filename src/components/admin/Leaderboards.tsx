import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Medal, Crown } from 'lucide-react';
interface Props { constituency?: string }

const Leaderboards: React.FC<Props> = ({ constituency }) => {
  const [cadres, setCadres] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const c = await supabase.rpc('get_cadre_leaderboard', { _constituency: constituency ?? null, _limit: 50 });
      const t = await supabase.rpc('get_team_leaderboard', { _constituency: constituency ?? null, _limit: 50 });
      setCadres((c.data as any[]) || []);
      setTeams((t.data as any[]) || []);
    })();
  }, [constituency]);

  const rankIcon = (i: number) => {
    if (i === 0) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (i === 1) return <Medal className="w-4 h-4 text-gray-400" />;
    if (i === 2) return <Medal className="w-4 h-4 text-orange-500" />;
    return <span className="w-4 text-xs text-muted-foreground text-center">{i + 1}</span>;
  };

  return (
    <Tabs defaultValue="cadres" className="w-full">
      <TabsList>
        <TabsTrigger value="cadres"><Trophy className="w-3 h-3 mr-1" />Cadres</TabsTrigger>
        <TabsTrigger value="teams"><Trophy className="w-3 h-3 mr-1" />Teams</TabsTrigger>
      </TabsList>

      <TabsContent value="cadres" className="mt-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Cadres {constituency ? `· ${constituency}` : '· All TN'}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cadres.length === 0 && <div className="text-xs text-muted-foreground py-6 text-center">No cadre points yet. Resolve assigned issues to climb the board.</div>}
            {cadres.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="w-6 flex justify-center">{rankIcon(i)}</div>
                <Avatar className="w-9 h-9"><AvatarImage src={c.profile_photo_url} /><AvatarFallback>{c.name?.[0]}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{c.constituency || c.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold flex items-center gap-1">{c.points}<span className="text-[10px] text-muted-foreground">pts</span></div>
                  <div className="text-[10px] flex items-center gap-0.5 text-yellow-600 justify-end"><Star className="w-3 h-3 fill-current" />{c.stars} · {c.resolved_count} solved</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="teams" className="mt-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Teams {constituency ? `· ${constituency}` : '· All TN'}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {teams.length === 0 && <div className="text-xs text-muted-foreground py-6 text-center">No team points yet.</div>}
            {teams.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="w-6 flex justify-center">{rankIcon(i)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t.constituency || t.city} · {t.department || 'general'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{t.points} <span className="text-[10px] text-muted-foreground">pts</span></div>
                  <div className="text-[10px] flex items-center gap-0.5 text-yellow-600 justify-end"><Star className="w-3 h-3 fill-current" />{t.stars} · {t.resolved_count} solved</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
export default Leaderboards;

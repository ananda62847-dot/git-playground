import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, AlertTriangle, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Suggestion {
  id: string;
  constituency: string | null;
  sentiment: string | null;
  categories: string[];
}

interface Grievance {
  id: string;
  constituency: string | null;
  sentiment: string | null;
  categories: string[];
}

interface ConstituencyHeatmapProps {
  suggestions: Suggestion[];
  grievances: Grievance[];
  onConstituencyClick?: (constituency: string) => void;
}

interface ConstituencyStats {
  name: string;
  totalSubmissions: number;
  grievanceCount: number;
  suggestionCount: number;
  angerPercent: number;
  positivePercent: number;
  topCategories: string[];
  heatLevel: 'hot' | 'medium' | 'cool' | 'none';
}

const ConstituencyHeatmap: React.FC<ConstituencyHeatmapProps> = ({
  suggestions,
  grievances,
  onConstituencyClick,
}) => {
  const constituencyStats = useMemo(() => {
    const suggestionsArr = Array.isArray(suggestions) ? suggestions : [];
    const grievancesArr = Array.isArray(grievances) ? grievances : [];
    const statsMap: Record<string, ConstituencyStats> = {};

    // Process suggestions
    suggestionsArr.forEach((s) => {
      if (!s.constituency) return;
      const name = s.constituency;
      if (!statsMap[name]) {
        statsMap[name] = {
          name,
          totalSubmissions: 0,
          grievanceCount: 0,
          suggestionCount: 0,
          angerPercent: 0,
          positivePercent: 0,
          topCategories: [],
          heatLevel: 'none',
        };
      }
      statsMap[name].suggestionCount++;
      statsMap[name].totalSubmissions++;
    });

    // Process grievances
    grievancesArr.forEach((g) => {
      if (!g.constituency) return;
      const name = g.constituency;
      if (!statsMap[name]) {
        statsMap[name] = {
          name,
          totalSubmissions: 0,
          grievanceCount: 0,
          suggestionCount: 0,
          angerPercent: 0,
          positivePercent: 0,
          topCategories: [],
          heatLevel: 'none',
        };
      }
      statsMap[name].grievanceCount++;
      statsMap[name].totalSubmissions++;
    });

    // Calculate sentiment percentages and categories
    Object.keys(statsMap).forEach((name) => {
      const constSuggestions = suggestionsArr.filter((s) => s.constituency === name);
      const constGrievances = grievancesArr.filter((g) => g.constituency === name);
      const allItems = [...constSuggestions, ...constGrievances];

      const angry = allItems.filter((i) => i.sentiment === 'angry' || i.sentiment === 'negative').length;
      const positive = allItems.filter((i) => i.sentiment === 'positive').length;

      statsMap[name].angerPercent = allItems.length > 0 ? Math.round((angry / allItems.length) * 100) : 0;
      statsMap[name].positivePercent = allItems.length > 0 ? Math.round((positive / allItems.length) * 100) : 0;

      // Top categories
      const catCount: Record<string, number> = {};
      allItems.forEach((i) => {
        (i.categories || []).forEach((c) => {
          catCount[c] = (catCount[c] || 0) + 1;
        });
      });
      statsMap[name].topCategories = Object.entries(catCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      // Heat level
      if (statsMap[name].angerPercent >= 60) {
        statsMap[name].heatLevel = 'hot';
      } else if (statsMap[name].angerPercent >= 30) {
        statsMap[name].heatLevel = 'medium';
      } else if (statsMap[name].totalSubmissions > 0) {
        statsMap[name].heatLevel = 'cool';
      }
    });

    return Object.values(statsMap).sort((a, b) => b.totalSubmissions - a.totalSubmissions);
  }, [suggestions, grievances]);

  const getHeatColor = (level: string) => {
    switch (level) {
      case 'hot':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-orange-400 text-white';
      case 'cool':
        return 'bg-green-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getHeatBorder = (level: string) => {
    switch (level) {
      case 'hot':
        return 'border-red-500';
      case 'medium':
        return 'border-orange-400';
      case 'cool':
        return 'border-green-500';
      default:
        return 'border-border';
    }
  };

  // Summary stats
  const totalConstituencies = constituencyStats.length;
  const hotZones = constituencyStats.filter((c) => c.heatLevel === 'hot').length;
  const mediumZones = constituencyStats.filter((c) => c.heatLevel === 'medium').length;
  const coolZones = constituencyStats.filter((c) => c.heatLevel === 'cool').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalConstituencies}</p>
              <p className="text-xs text-muted-foreground">Constituencies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{hotZones}</p>
              <p className="text-xs text-muted-foreground">Hot Zones</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{mediumZones}</p>
              <p className="text-xs text-muted-foreground">Medium Zones</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <ThumbsUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{coolZones}</p>
              <p className="text-xs text-muted-foreground">Cool Zones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Constituency Sentiment Heatmap
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            🔴 High Anger (&gt;60%) | 🟠 Medium (30-60%) | 🟢 Positive/Cool (&lt;30%)
          </p>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {constituencyStats.map((stat) => (
                <Tooltip key={stat.name}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onConstituencyClick?.(stat.name)}
                      className={`p-3 rounded-lg border-2 text-left transition-all hover:scale-105 hover:shadow-lg ${getHeatBorder(stat.heatLevel)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-3 h-3 rounded-full ${getHeatColor(stat.heatLevel)}`}></span>
                        <span className="text-xs font-medium">{stat.totalSubmissions}</span>
                      </div>
                      <p className="font-medium text-sm truncate">{stat.name.split(' / ')[0]}</p>
                      <div className="flex gap-2 mt-1">
                        {stat.angerPercent > 0 && (
                          <span className="text-xs text-red-600 flex items-center gap-0.5">
                            <ThumbsDown className="w-3 h-3" />
                            {stat.angerPercent}%
                          </span>
                        )}
                        {stat.positivePercent > 0 && (
                          <span className="text-xs text-green-600 flex items-center gap-0.5">
                            <ThumbsUp className="w-3 h-3" />
                            {stat.positivePercent}%
                          </span>
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-bold">{stat.name}</p>
                      <div className="text-xs space-y-1">
                        <p>📊 Total: {stat.totalSubmissions}</p>
                        <p>📝 Suggestions: {stat.suggestionCount}</p>
                        <p>⚠️ Grievances: {stat.grievanceCount}</p>
                        <p>😡 Anger: {stat.angerPercent}%</p>
                        <p>😊 Positive: {stat.positivePercent}%</p>
                        {stat.topCategories.length > 0 && (
                          <p>🏷️ Top Issues: {stat.topCategories.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {constituencyStats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No constituency data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Hot Zones Table */}
      {hotZones > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              🔥 Priority Hot Zones - Immediate Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {constituencyStats
                .filter((c) => c.heatLevel === 'hot')
                .slice(0, 5)
                .map((stat) => (
                  <div
                    key={stat.name}
                    className="p-4 flex items-center justify-between hover:bg-red-50 cursor-pointer"
                    onClick={() => onConstituencyClick?.(stat.name)}
                  >
                    <div>
                      <p className="font-bold">{stat.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.topCategories.join(', ') || 'No categories'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 font-bold">{stat.angerPercent}% angry</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.grievanceCount} grievances
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConstituencyHeatmap;

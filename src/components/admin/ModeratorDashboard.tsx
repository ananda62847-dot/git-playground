import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import TVKLogo from '@/components/TVKLogo';
import { toast } from 'sonner';
import { LogOut, Download, Search, Users, FileText, AlertTriangle, MapPin, Eye, TrendingUp, BarChart3, Clock, CheckCircle, AlertCircle, Calendar, Activity, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import DetailModal from './DetailModal';
import GrievanceStatusUpdater, { getStatusBadge } from './GrievanceStatusUpdater';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ModeratorDashboardProps {
  onLogout: () => void;
  assignedConstituencies: string[];
}

interface Submission {
  id: string;
  name: string;
  age: number;
  city: string;
  constituency: string | null;
  occupation: string;
  categories: string[];
  content: string;
  sentiment: string | null;
  sentiment_score: number | null;
  status?: string;
  created_at: string;
  type: 'suggestion' | 'grievance';
}

interface Volunteer {
  id: string;
  name: string;
  phone: string;
  city: string;
  constituency: string | null;
  interests: string[];
  availability: string | null;
  created_at: string;
}

const COLORS = ['#8B0000', '#FFD700', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722'];

const ModeratorDashboard: React.FC<ModeratorDashboardProps> = ({ onLogout, assignedConstituencies }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConstituency, setFilterConstituency] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'suggestion' | 'grievance'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'suggestion' | 'grievance' | 'volunteer'>('suggestion');
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [assignedConstituencies]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [grievancesRes, volunteersRes] = await Promise.all([
        supabase.from('grievances').select('*').order('created_at', { ascending: false }),
        supabase.from('volunteers').select('*').order('created_at', { ascending: false }),
      ]);

      const allSubmissions: Submission[] = [];
      
      if (grievancesRes.data) {
        grievancesRes.data.forEach(g => {
          allSubmissions.push({
            ...g,
            content: g.grievance,
            type: 'grievance' as const,
          });
        });
      }

      setSubmissions(allSubmissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      if (volunteersRes.data) setVolunteers(volunteersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (searchTerm && !s.content.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterConstituency !== 'all' && s.constituency !== filterConstituency) return false;
      if (filterCategory !== 'all' && !s.categories?.includes(filterCategory)) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (filterType !== 'all' && s.type !== filterType) return false;
      return true;
    });
  }, [submissions, searchTerm, filterConstituency, filterCategory, filterStatus, filterType]);

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => {
      if (searchTerm && !v.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterConstituency !== 'all' && v.constituency !== filterConstituency) return false;
      return true;
    });
  }, [volunteers, searchTerm, filterConstituency]);

  // Statistics
  const stats = useMemo(() => {
    const today = new Date();
    const last7Days = subDays(today, 7);
    const last30Days = subDays(today, 30);

    const suggestions = submissions.filter(s => s.type === 'suggestion');
    const grievances = submissions.filter(s => s.type === 'grievance');
    
    const todaySubmissions = submissions.filter(s => 
      new Date(s.created_at) >= startOfDay(today)
    );
    
    const weekSubmissions = submissions.filter(s => 
      new Date(s.created_at) >= last7Days
    );

    const pendingGrievances = grievances.filter(g => g.status === 'pending' || !g.status);
    const resolvedGrievances = grievances.filter(g => g.status === 'resolved');
    const inProgressGrievances = grievances.filter(g => g.status === 'in_progress');

    return {
      totalSubmissions: submissions.length,
      totalSuggestions: suggestions.length,
      totalGrievances: grievances.length,
      totalVolunteers: volunteers.length,
      todayCount: todaySubmissions.length,
      weekCount: weekSubmissions.length,
      pendingCount: pendingGrievances.length,
      resolvedCount: resolvedGrievances.length,
      inProgressCount: inProgressGrievances.length,
      resolutionRate: grievances.length > 0 
        ? Math.round((resolvedGrievances.length / grievances.length) * 100) 
        : 0,
    };
  }, [submissions, volunteers]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const catMap = new Map<string, { suggestions: number; grievances: number }>();
    submissions.forEach(s => {
      s.categories?.forEach(cat => {
        const existing = catMap.get(cat) || { suggestions: 0, grievances: 0 };
        if (s.type === 'suggestion') existing.suggestions++;
        else existing.grievances++;
        catMap.set(cat, existing);
      });
    });
    return Array.from(catMap.entries())
      .map(([name, data]) => ({ name, ...data, total: data.suggestions + data.grievances }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [submissions]);

  // Sentiment breakdown
  const sentimentStats = useMemo(() => {
    const sentiments = ['positive', 'neutral', 'negative', 'angry', 'demanding'];
    return sentiments.map(sentiment => ({
      name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
      value: submissions.filter(s => s.sentiment === sentiment).length,
      color: sentiment === 'positive' ? '#4CAF50' : 
             sentiment === 'neutral' ? '#FFC107' :
             sentiment === 'negative' ? '#FF9800' :
             sentiment === 'angry' ? '#F44336' : '#9C27B0'
    })).filter(s => s.value > 0);
  }, [submissions]);

  // Daily trend (last 7 days)
  const dailyTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      days.push({
        date: format(date, 'MMM dd'),
        suggestions: submissions.filter(s => {
          const created = new Date(s.created_at);
          return s.type === 'suggestion' && created >= dayStart && created <= dayEnd;
        }).length,
        grievances: submissions.filter(s => {
          const created = new Date(s.created_at);
          return s.type === 'grievance' && created >= dayStart && created <= dayEnd;
        }).length,
      });
    }
    return days;
  }, [submissions]);

  // Constituency breakdown
  const constituencyStats = useMemo(() => {
    return assignedConstituencies.map(constituency => ({
      name: constituency.split(' / ')[0],
      fullName: constituency,
      submissions: submissions.filter(s => s.constituency === constituency).length,
      volunteers: volunteers.filter(v => v.constituency === constituency).length,
      pending: submissions.filter(s => s.constituency === constituency && s.type === 'grievance' && (!s.status || s.status === 'pending')).length,
    }));
  }, [submissions, volunteers, assignedConstituencies]);

  const allCategories = useMemo(() => {
    return [...new Set(submissions.flatMap(s => s.categories || []))];
  }, [submissions]);

  const openDetail = (item: any, type: 'suggestion' | 'grievance' | 'volunteer') => {
    setSelectedItem(type === 'volunteer' ? item : { 
      ...item, 
      [type]: item.content,
      sub_categories: item.sub_categories || []
    });
    setDetailType(type);
    setShowDetailModal(true);
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-orange-100 text-orange-800';
      case 'angry': return 'bg-red-100 text-red-800';
      case 'demanding': return 'bg-purple-100 text-purple-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (Array.isArray(value)) return `"${value.join('; ')}"`;
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value ?? '';
        }).join(',')
      )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Export successful!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-tvk-maroon to-tvk-maroon/90 text-primary-foreground p-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TVKLogo size="sm" />
            <div>
              <h1 className="text-xl font-bold">Moderator Dashboard</h1>
              <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
                <MapPin className="w-3 h-3" />
                <span>{assignedConstituencies.length} constituencies assigned</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        {/* Assigned Constituencies Banner */}
        <Card className="mb-6 bg-gradient-to-r from-tvk-maroon/5 to-tvk-yellow/5 border-tvk-maroon/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-tvk-maroon" />
              <span className="font-semibold text-foreground">Your Assigned Constituencies</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {assignedConstituencies.map(c => (
                <Badge key={c} variant="secondary" className="bg-tvk-maroon/10 text-tvk-maroon">
                  {c.split(' / ')[0]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 text-tvk-maroon" />
              <p className="text-2xl font-bold">{stats.todayCount}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.weekCount}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.totalSuggestions}</p>
              <p className="text-xs text-muted-foreground">Suggestions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{stats.totalGrievances}</p>
              <p className="text-xs text-muted-foreground">Grievances</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.totalVolunteers}</p>
              <p className="text-xs text-muted-foreground">Volunteers</p>
            </CardContent>
          </Card>
        </div>

        {/* Resolution Progress */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Grievance Resolution Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${stats.resolutionRate}%` }}
                  />
                </div>
              </div>
              <span className="text-lg font-bold">{stats.resolutionRate}%</span>
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Pending: {stats.pendingCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>In Progress: {stats.inProgressCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Resolved: {stats.resolvedCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search submissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterConstituency} onValueChange={setFilterConstituency}>
                <SelectTrigger className="w-[200px]">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Constituency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Constituencies</SelectItem>
                  {assignedConstituencies.map(c => (
                    <SelectItem key={c} value={c}>{c.split(' / ')[0]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="suggestion">Suggestions</SelectItem>
                  <SelectItem value="grievance">Grievances</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="submissions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="grievances" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Grievances
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Volunteers
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Daily Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    7-Day Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="suggestions" stackId="1" stroke="#8B0000" fill="#8B0000" fillOpacity={0.6} name="Suggestions" />
                      <Area type="monotone" dataKey="grievances" stackId="1" stroke="#FFD700" fill="#FFD700" fillOpacity={0.6} name="Grievances" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Top Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#8B0000" name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sentiment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Sentiment Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={sentimentStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sentimentStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Constituency Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Constituency Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {constituencyStats.map(c => (
                      <div key={c.fullName} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.submissions} submissions • {c.volunteers} volunteers</p>
                        </div>
                        {c.pending > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {c.pending} pending
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Submissions ({filteredSubmissions.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredSubmissions, 'submissions')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Constituency</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead>Sentiment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.slice(0, 50).map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant={item.type === 'suggestion' ? 'secondary' : 'destructive'}>
                              {item.type === 'suggestion' ? 'Suggestion' : 'Grievance'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-sm">{item.constituency?.split(' / ')[0] || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.categories?.slice(0, 2).map(cat => (
                                <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                              ))}
                              {(item.categories?.length || 0) > 2 && (
                                <Badge variant="outline" className="text-xs">+{item.categories!.length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSentimentColor(item.sentiment)}>
                              {item.sentiment || 'neutral'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(item.created_at), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetail(item, item.type)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grievances Tab */}
          <TabsContent value="grievances">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Grievances Management</CardTitle>
                  <CardDescription>Update status and track resolution</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredSubmissions.filter(s => s.type === 'grievance'), 'grievances')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Constituency</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Sentiment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions
                        .filter(s => s.type === 'grievance')
                        .slice(0, 50)
                        .map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-sm">{item.constituency?.split(' / ')[0] || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">{item.content}</TableCell>
                            <TableCell>
                              <Badge className={getSentimentColor(item.sentiment)}>
                                {item.sentiment || 'neutral'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <GrievanceStatusUpdater
                                grievanceId={item.id}
                                currentStatus={item.status || 'pending'}
                                onUpdate={() => {
                                  fetchData();
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(item.created_at), 'MMM dd')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetail(item, 'grievance')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Volunteers Tab */}
          <TabsContent value="volunteers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Volunteers ({filteredVolunteers.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredVolunteers, 'volunteers')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Constituency</TableHead>
                        <TableHead>Interests</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVolunteers.slice(0, 50).map(volunteer => (
                        <TableRow key={volunteer.id}>
                          <TableCell className="font-medium">{volunteer.name}</TableCell>
                          <TableCell>{volunteer.phone}</TableCell>
                          <TableCell className="text-sm">{volunteer.constituency?.split(' / ')[0] || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {volunteer.interests?.slice(0, 2).map(interest => (
                                <Badge key={interest} variant="outline" className="text-xs">{interest}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{volunteer.availability || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(volunteer.created_at), 'MMM dd')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetail(volunteer, 'volunteer')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        data={selectedItem}
        type={detailType}
      />
    </div>
  );
};

export default ModeratorDashboard;

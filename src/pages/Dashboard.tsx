import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { KPICard } from '@/components/KPICard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Phone, ThumbsUp, ThumbsDown, Clock, Users, TrendingUp, PhoneCall, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subDays, startOfDay, startOfWeek, endOfWeek, parseISO, isToday } from 'date-fns';
import { toast } from 'sonner';

interface DashboardData {
  totalCalls: number;
  interested: number;
  notInterested: number;
  pending: number;
  activeCallers: number;
  callsToday: number;
  conversionRate: number;
  weeklyData: { name: string; calls: number; interested: number }[];
  trendData: { date: string; calls: number }[];
}

const Dashboard = () => {
  const { role, profile } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalCalls: 0,
    interested: 0,
    notInterested: 0,
    pending: 0,
    activeCallers: 0,
    callsToday: 0,
    conversionRate: 0,
    weeklyData: [],
    trendData: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard data refreshed!');
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch all customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customer_data')
        .select('*');

      if (customerError) throw customerError;

      const allCalls = customerData || [];

      // Calculate KPIs
      const totalCalls = allCalls.length;
      const interested = allCalls.filter(c => c.call_status === 'interested').length;
      const notInterested = allCalls.filter(c => c.call_status === 'not_interested').length;
      const pending = allCalls.filter(c => c.call_status === 'pending').length;
      
      // Calls today
      const today = new Date();
      const callsToday = allCalls.filter(c => {
        if (!c.last_called_at) return false;
        return isToday(parseISO(c.last_called_at));
      }).length;

      // Conversion rate (interested / total calls with outcome)
      const callsWithOutcome = interested + notInterested;
      const conversionRate = callsWithOutcome > 0 ? (interested / callsWithOutcome) * 100 : 0;

      // Fetch active callers (users with customer_caller role who logged in today)
      const { data: sessionData, error: sessionError } = await supabase
        .from('session_logs')
        .select('user_id, login_at')
        .gte('login_at', startOfDay(today).toISOString());

      const uniqueActiveCallers = new Set(sessionData?.map(s => s.user_id) || []);
      const activeCallers = uniqueActiveCallers.size;

      // Weekly data (last 7 days)
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyData = daysOfWeek.map((name, index) => {
        const dayDate = subDays(today, (today.getDay() - index + 7) % 7);
        const dayCalls = allCalls.filter(c => {
          if (!c.last_called_at) return false;
          const callDate = parseISO(c.last_called_at);
          return format(callDate, 'yyyy-MM-dd') === format(dayDate, 'yyyy-MM-dd');
        });
        return {
          name,
          calls: dayCalls.length,
          interested: dayCalls.filter(c => c.call_status === 'interested').length,
        };
      });

      // Trend data (last 4 weeks)
      const trendData = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subDays(today, i * 7));
        const weekEnd = endOfWeek(subDays(today, i * 7));
        const weekCalls = allCalls.filter(c => {
          if (!c.created_at) return false;
          const callDate = parseISO(c.created_at);
          return callDate >= weekStart && callDate <= weekEnd;
        }).length;
        trendData.push({
          date: `Week ${4 - i}`,
          calls: weekCalls,
        });
      }

      setData({
        totalCalls,
        interested,
        notInterested,
        pending,
        activeCallers,
        callsToday,
        conversionRate,
        weeklyData,
        trendData,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Interested', value: data.interested, color: 'hsl(var(--success))' },
    { name: 'Not Interested', value: data.notInterested, color: 'hsl(var(--destructive))' },
    { name: 'Pending', value: data.pending, color: 'hsl(var(--warning))' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your calls today.
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Calls"
            value={data.totalCalls.toLocaleString()}
            icon={Phone}
            variant="primary"
          />
          <KPICard
            title="Interested"
            value={data.interested.toLocaleString()}
            icon={ThumbsUp}
            variant="success"
          />
          <KPICard
            title="Not Interested"
            value={data.notInterested.toLocaleString()}
            icon={ThumbsDown}
            variant="destructive"
          />
          <KPICard
            title="Pending"
            value={data.pending.toLocaleString()}
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Weekly Call Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total Calls" />
                  <Bar dataKey="interested" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Interested" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Call Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  name="Total Calls"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Admin Only - Quick Stats */}
        {role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">{data.activeCallers}</p>
                    <p className="text-sm text-muted-foreground">Active Callers Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">{data.conversionRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <PhoneCall className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">{data.callsToday}</p>
                    <p className="text-sm text-muted-foreground">Calls Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </DashboardLayout>
  );
};

export default Dashboard;

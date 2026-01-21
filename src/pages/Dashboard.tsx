import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { KPICard } from '@/components/KPICard';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, PhoneCall, PhoneOff, ThumbsUp, ThumbsDown, Clock, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const barData = [
  { name: 'Mon', calls: 45, interested: 12 },
  { name: 'Tue', calls: 52, interested: 18 },
  { name: 'Wed', calls: 38, interested: 10 },
  { name: 'Thu', calls: 65, interested: 22 },
  { name: 'Fri', calls: 48, interested: 15 },
  { name: 'Sat', calls: 30, interested: 8 },
  { name: 'Sun', calls: 20, interested: 5 },
];

const pieData = [
  { name: 'Interested', value: 35, color: 'hsl(var(--success))' },
  { name: 'Not Interested', value: 25, color: 'hsl(var(--destructive))' },
  { name: 'Pending', value: 40, color: 'hsl(var(--warning))' },
];

const trendData = [
  { date: 'Week 1', calls: 180 },
  { date: 'Week 2', calls: 220 },
  { date: 'Week 3', calls: 195 },
  { date: 'Week 4', calls: 280 },
];

const Dashboard = () => {
  const { role, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your calls today.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Calls"
            value="1,247"
            icon={Phone}
            trend={{ value: 12, isPositive: true }}
            variant="primary"
          />
          <KPICard
            title="Interested"
            value="342"
            icon={ThumbsUp}
            trend={{ value: 8, isPositive: true }}
            variant="success"
          />
          <KPICard
            title="Not Interested"
            value="285"
            icon={ThumbsDown}
            trend={{ value: 3, isPositive: false }}
            variant="destructive"
          />
          <KPICard
            title="Pending"
            value="620"
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
                <BarChart data={barData}>
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
                  <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="interested" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
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
                    <span className="text-sm text-muted-foreground">{item.name}</span>
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
              <LineChart data={trendData}>
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
                    <p className="text-2xl font-bold font-display">24</p>
                    <p className="text-sm text-muted-foreground">Active Callers</p>
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
                    <p className="text-2xl font-bold font-display">27.4%</p>
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
                    <p className="text-2xl font-bold font-display">52</p>
                    <p className="text-sm text-muted-foreground">Calls Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

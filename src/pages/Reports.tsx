import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { KPICard } from '@/components/KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Download, Filter, RotateCcw, Phone, ThumbsUp, ThumbsDown, Clock, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type CallStatus = 
  | 'pending'
  | 'call_not_received'
  | 'call_disconnected'
  | 'invalid_number'
  | 'no_network'
  | 'call_connected'
  | 'interested'
  | 'not_interested';

interface CallerOption {
  user_id: string;
  full_name: string;
  employee_id: string;
}

interface CustomerData {
  id: string;
  customer_name: string;
  customer_phone: string;
  call_status: CallStatus;
  remark: string | null;
  last_called_at: string | null;
  assigned_to: string;
}

const callStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'call_not_received', label: 'Call Not Received' },
  { value: 'call_disconnected', label: 'Call Disconnected' },
  { value: 'invalid_number', label: 'Invalid Number' },
  { value: 'no_network', label: 'No Network' },
  { value: 'call_connected', label: 'Call Connected' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
];

const Reports = () => {
  const { role } = useAuth();
  const [callers, setCallers] = useState<CallerOption[]>([]);
  const [data, setData] = useState<CustomerData[]>([]);
  const [filteredData, setFilteredData] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCaller, setSelectedCaller] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchCallers();
    fetchData();
  }, []);

  const fetchCallers = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'customer_caller');

    if (!roles || roles.length === 0) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, employee_id')
      .in('user_id', roles.map(r => r.user_id));

    setCallers(profiles || []);
  };

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('customer_data')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch data');
    } else {
      setData(data || []);
      setFilteredData(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    let filtered = [...data];

    if (selectedCaller !== 'all') {
      filtered = filtered.filter(c => c.assigned_to === selectedCaller);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.call_status === statusFilter);
    }

    if (startDate) {
      filtered = filtered.filter(c => 
        c.last_called_at && new Date(c.last_called_at) >= new Date(startDate)
      );
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(c => 
        c.last_called_at && new Date(c.last_called_at) <= endDateTime
      );
    }

    setFilteredData(filtered);
  }, [selectedCaller, statusFilter, startDate, endDate, data]);

  // Calculate KPIs
  const totalCalls = filteredData.length;
  const interested = filteredData.filter(d => d.call_status === 'interested').length;
  const notInterested = filteredData.filter(d => d.call_status === 'not_interested').length;
  const pending = filteredData.filter(d => d.call_status === 'pending').length;

  // Chart data
  const statusCounts = callStatusOptions.map(opt => ({
    name: opt.label,
    value: filteredData.filter(d => d.call_status === opt.value).length,
  })).filter(d => d.value > 0);

  const pieData = [
    { name: 'Interested', value: interested, color: 'hsl(var(--success))' },
    { name: 'Not Interested', value: notInterested, color: 'hsl(var(--destructive))' },
    { name: 'Pending', value: pending, color: 'hsl(var(--warning))' },
    { name: 'Other', value: totalCalls - interested - notInterested - pending, color: 'hsl(var(--muted))' },
  ].filter(d => d.value > 0);

  const downloadCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No data to download');
      return;
    }

    const headers = ['Name', 'Phone', 'Status', 'Remark', 'Last Called'];
    const rows = filteredData.map(c => [
      c.customer_name,
      c.customer_phone,
      c.call_status.replace('_', ' '),
      c.remark || '',
      c.last_called_at ? format(new Date(c.last_called_at), 'yyyy-MM-dd HH:mm') : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Report downloaded!');
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">Analyze call performance and metrics</p>
          </div>
          <Button onClick={downloadCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Download Report
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard title="Total Calls" value={totalCalls} icon={Phone} variant="primary" />
          <KPICard title="Interested" value={interested} icon={ThumbsUp} variant="success" />
          <KPICard title="Not Interested" value={notInterested} icon={ThumbsDown} variant="destructive" />
          <KPICard title="Pending" value={pending} icon={Clock} variant="warning" />
        </div>

        {/* Filters */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label>Caller</Label>
                <Select value={selectedCaller} onValueChange={setSelectedCaller}>
                  <SelectTrigger>
                    <SelectValue placeholder="All callers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Callers</SelectItem>
                    {callers.map((caller) => (
                      <SelectItem key={caller.user_id} value={caller.user_id}>
                        {caller.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {callStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1 min-w-[150px]">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2 flex-1 min-w-[150px]">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => {
                  setSelectedCaller('all');
                  setStatusFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Outcome Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Detailed Data ({filteredData.length} records)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-16 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No data found</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remark</TableHead>
                      <TableHead>Last Called</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 50).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.customer_name}</TableCell>
                        <TableCell>{row.customer_phone}</TableCell>
                        <TableCell><StatusBadge status={row.call_status} /></TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.remark || '-'}</TableCell>
                        <TableCell>{row.last_called_at ? format(new Date(row.last_called_at), 'MMM dd, HH:mm') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </DashboardLayout>
  );
};

export default Reports;

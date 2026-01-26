import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Download, Filter, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

type CallStatus = 
  | 'pending'
  | 'call_not_received'
  | 'call_disconnected'
  | 'invalid_number'
  | 'no_network'
  | 'call_connected'
  | 'interested'
  | 'not_interested';

interface CustomerData {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  course: string | null;
  fee: number | null;
  call_status: CallStatus;
  remark: string | null;
  last_called_at: string | null;
  created_at: string;
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

const TotalCalls = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('customer_data')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch data');
    } else {
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  useEffect(() => {
    let filtered = [...customers];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.call_status === statusFilter);
    }

    if (startDate) {
      filtered = filtered.filter(c => 
        new Date(c.created_at) >= new Date(startDate)
      );
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(c => 
        new Date(c.created_at) <= endDateTime
      );
    }

    setFilteredCustomers(filtered);
  }, [statusFilter, startDate, endDate, customers]);

  const downloadCSV = () => {
    if (filteredCustomers.length === 0) {
      toast.error('No data to download');
      return;
    }

    const headers = ['Name', 'Phone', 'Email', 'Course', 'Fee', 'Status', 'Remark', 'Last Called', 'Created At'];
    const rows = filteredCustomers.map(c => [
      c.customer_name,
      c.customer_phone,
      c.customer_email || '',
      c.course || '',
      c.fee?.toString() || '',
      c.call_status.replace('_', ' '),
      c.remark || '',
      c.last_called_at ? format(new Date(c.last_called_at), 'yyyy-MM-dd HH:mm') : '',
      format(new Date(c.created_at), 'yyyy-MM-dd HH:mm'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `calls_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Report downloaded successfully!');
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Total Calls</h1>
            <p className="text-muted-foreground mt-1">View all your calling history</p>
          </div>
          <Button onClick={downloadCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Download Report
          </Button>
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
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex-1 min-w-[150px]">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredCustomers.length} of {customers.length} records
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-16 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No call records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remark</TableHead>
                      <TableHead>Last Called</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                        <TableCell>{customer.customer_phone}</TableCell>
                        <TableCell className="text-sm">{customer.customer_email || '-'}</TableCell>
                        <TableCell>{customer.course || '-'}</TableCell>
                        <TableCell>{customer.fee ? `₹${customer.fee.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>
                          <StatusBadge status={customer.call_status} />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={customer.remark || ''}>
                          {customer.remark || '-'}
                        </TableCell>
                        <TableCell>
                          {customer.last_called_at 
                            ? format(new Date(customer.last_called_at), 'MMM dd, HH:mm')
                            : '-'}
                        </TableCell>
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

export default TotalCalls;

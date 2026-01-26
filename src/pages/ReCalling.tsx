import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Filter, RotateCcw, Send } from 'lucide-react';
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
}

const callStatusOptions = [
  { value: 'call_not_received', label: 'Call Not Received' },
  { value: 'call_disconnected', label: 'Call Disconnected' },
  { value: 'invalid_number', label: 'Invalid Number' },
  { value: 'no_network', label: 'No Network' },
  { value: 'call_connected', label: 'Call Connected' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
];

const ReCalling = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Update dialog state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [newStatus, setNewStatus] = useState<CallStatus | ''>('');
  const [newRemark, setNewRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('customer_data')
      .select('*')
      .eq('assigned_to', user.id)
      .not('call_status', 'eq', 'interested')
      .not('call_status', 'eq', 'pending')
      .order('last_called_at', { ascending: false });

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

    if (dateFilter) {
      filtered = filtered.filter(c => 
        c.last_called_at && c.last_called_at.startsWith(dateFilter)
      );
    }

    setFilteredCustomers(filtered);
  }, [statusFilter, dateFilter, customers]);

  const handleUpdate = async () => {
    if (!selectedCustomer || !newStatus) {
      toast.error('Please select a call status');
      return;
    }

    if (newStatus !== 'interested' && !newRemark.trim()) {
      toast.error('Please enter a remark');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('customer_data')
      .update({
        call_status: newStatus,
        remark: newRemark.trim() || null,
        last_called_at: new Date().toISOString(),
      })
      .eq('id', selectedCustomer.id);

    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success('Updated successfully!');
      setSelectedCustomer(null);
      setNewStatus('');
      setNewRemark('');
      fetchCustomers();
    }

    setIsSubmitting(false);
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">Re-Calling</h1>
          <p className="text-muted-foreground mt-1">Follow up on previous calls</p>
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
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
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
              <div className="space-y-2 flex-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setDateFilter('');
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-16 text-center">
                <RotateCcw className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No calls to follow up on</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Called</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>{customer.customer_phone}</TableCell>
                      <TableCell>{customer.course || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={customer.call_status} />
                      </TableCell>
                      <TableCell>
                        {customer.last_called_at 
                          ? format(new Date(customer.last_called_at), 'MMM dd, yyyy HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setNewStatus('');
                                setNewRemark('');
                              }}
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              Update
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-display">
                                Update Call - {customer.customer_name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label>New Call Status *</Label>
                                <Select
                                  value={newStatus}
                                  onValueChange={(value: CallStatus) => setNewStatus(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {callStatusOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>
                                  Remark {newStatus !== 'interested' && <span className="text-destructive">*</span>}
                                </Label>
                                <Textarea
                                  placeholder="Enter remarks..."
                                  value={newRemark}
                                  onChange={(e) => setNewRemark(e.target.value)}
                                  rows={3}
                                />
                              </div>
                              <Button
                                onClick={handleUpdate}
                                disabled={isSubmitting || !newStatus}
                                className="w-full"
                              >
                                <Send className="w-4 h-4 mr-2" />
                                {isSubmitting ? 'Updating...' : 'Update'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </DashboardLayout>
  );
};

export default ReCalling;

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { FaceMonitor } from '@/components/FaceMonitor';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Mail, BookOpen, DollarSign, ChevronLeft, ChevronRight, Send } from 'lucide-react';

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

const CustomerCalling = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<CallStatus | ''>('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('customer_data')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('call_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to fetch customer data');
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  const currentCustomer = customers[currentIndex];

  const handleSubmit = async () => {
    if (!currentCustomer || !selectedStatus) {
      toast.error('Please select a call status');
      return;
    }

    // Remark is required for all statuses except 'interested'
    if (selectedStatus !== 'interested' && !remark.trim()) {
      toast.error('Please enter a remark');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('customer_data')
      .update({
        call_status: selectedStatus,
        remark: remark.trim() || null,
        last_called_at: new Date().toISOString(),
      })
      .eq('id', currentCustomer.id);

    if (error) {
      toast.error('Failed to update call status');
    } else {
      toast.success('Call status updated successfully!');
      setSelectedStatus('');
      setRemark('');
      
      // Remove from list and move to next
      const newCustomers = customers.filter((_, i) => i !== currentIndex);
      setCustomers(newCustomers);
      if (currentIndex >= newCustomers.length) {
        setCurrentIndex(Math.max(0, newCustomers.length - 1));
      }
    }

    setIsSubmitting(false);
  };

  const goNext = () => {
    if (currentIndex < customers.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedStatus('');
      setRemark('');
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedStatus('');
      setRemark('');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Customer Calling</h1>
            <p className="text-muted-foreground mt-1">
              {customers.length > 0 
                ? `${currentIndex + 1} of ${customers.length} pending calls`
                : 'No pending calls'}
            </p>
          </div>
          {/* Face Monitor - Top Right */}
          <div className="w-72">
            <FaceMonitor />
          </div>
        </div>

        {customers.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center">
              <Phone className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold font-display mb-2">No Pending Calls</h3>
              <p className="text-muted-foreground">
                All assigned customers have been called. Check back later for new assignments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Details */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center justify-between">
                  Customer Details
                  <StatusBadge status={currentCustomer.call_status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">Name</Label>
                    <p className="font-medium">{currentCustomer.customer_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </Label>
                    <p className="font-medium">{currentCustomer.customer_phone}</p>
                  </div>
                  {currentCustomer.customer_email && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </Label>
                      <p className="font-medium text-sm">{currentCustomer.customer_email}</p>
                    </div>
                  )}
                  {currentCustomer.course && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Course
                      </Label>
                      <p className="font-medium">{currentCustomer.course}</p>
                    </div>
                  )}
                  {currentCustomer.fee && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Fee
                      </Label>
                      <p className="font-medium">₹{currentCustomer.fee.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={goNext}
                    disabled={currentIndex === customers.length - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Call Form */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Update Call Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Call Status *</Label>
                  <Select 
                    value={selectedStatus} 
                    onValueChange={(value: CallStatus) => setSelectedStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select call status" />
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
                    Remark {selectedStatus !== 'interested' && <span className="text-destructive">*</span>}
                  </Label>
                  <Textarea
                    placeholder="Enter your remarks about the call..."
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    rows={4}
                  />
                  {selectedStatus === 'interested' && (
                    <p className="text-xs text-muted-foreground">Remark is optional for interested customers</p>
                  )}
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !selectedStatus}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
    </DashboardLayout>
  );
};

export default CustomerCalling;

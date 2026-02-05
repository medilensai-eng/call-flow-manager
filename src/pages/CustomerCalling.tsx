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
import { PhoneConnectionQR } from '@/components/PhoneConnectionQR';
import { PhoneDialer } from '@/components/PhoneDialer';
import { usePhoneConnection } from '@/hooks/usePhoneConnection';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Mail, BookOpen, DollarSign, ChevronLeft, ChevronRight, Send, PhoneCall, PhoneIncoming } from 'lucide-react';

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
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{callerName: string; callerPhone: string} | null>(null);
  const { connection, isConnected: isPhoneConnected } = usePhoneConnection();

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

  // Listen for incoming calls from phone
  useEffect(() => {
    if (!connection?.id) return;

    const channel = supabase.channel(`phone-call:${connection.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        console.log('Incoming call notification:', payload);
        setIncomingCall({
          callerName: payload.callerName || 'Unknown',
          callerPhone: payload.callerPhone || 'Unknown',
        });
        setIsDialerOpen(true);
        toast.info(`Incoming call from ${payload.callerName || 'Unknown'}`, {
          duration: 5000,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connection?.id]);

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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-display text-foreground">Customer Calling</h1>
            <p className="text-muted-foreground mt-1">
              {customers.length > 0 
                ? `${currentIndex + 1} of ${customers.length} pending calls`
                : 'No pending calls'}
            </p>
          </div>
          
          {/* Face Monitor */}
          <div className="w-full sm:w-72 lg:w-auto">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Phone Connection QR */}
            <div className="lg:col-span-1">
              <PhoneConnectionQR />
              
              {/* Incoming Call Banner */}
              {incomingCall && (
                <Card className="mt-4 shadow-card border-blue-500/50 bg-blue-500/5">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                        <PhoneIncoming className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{incomingCall.callerName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{incomingCall.callerPhone}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setIncomingCall(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {/* Customer Details & Call Form */}
            <div className="lg:col-span-2 space-y-6">
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{currentCustomer.customer_phone}</p>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-3 bg-green-500 hover:bg-green-600"
                        onClick={() => setIsDialerOpen(true)}
                      >
                        <PhoneCall className="w-3 h-3 mr-1" />
                        Call Now
                      </Button>
                    </div>
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
          </div>
        )}

        {/* Dialer Popup */}
        {currentCustomer && (
          <PhoneDialer
            isOpen={isDialerOpen}
            onClose={() => setIsDialerOpen(false)}
            phoneNumber={currentCustomer.customer_phone}
            customerName={currentCustomer.customer_name}
            customerId={currentCustomer.id}
            connectionId={connection?.id || null}
            isPhoneConnected={isPhoneConnected}
          />
        )}
    </DashboardLayout>
  );
};

export default CustomerCalling;

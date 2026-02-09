import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { FaceMonitor } from '@/components/FaceMonitor';
import { PhoneDialer } from '@/components/PhoneDialer';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, Mail, BookOpen, DollarSign, ChevronLeft, ChevronRight, 
  Send, PhoneCall, User, Hash, PhoneOff 
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { value: 'call_not_received', label: 'Call Not Received', icon: PhoneOff },
  { value: 'call_disconnected', label: 'Call Disconnected', icon: PhoneOff },
  { value: 'invalid_number', label: 'Invalid Number', icon: Hash },
  { value: 'no_network', label: 'No Network', icon: PhoneOff },
  { value: 'call_connected', label: 'Call Connected', icon: Phone },
  { value: 'interested', label: 'Interested', icon: Phone },
  { value: 'not_interested', label: 'Not Interested', icon: PhoneOff },
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
        
        {/* Progress indicator */}
        {customers.length > 0 && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm px-3 py-1.5 border-primary/30 text-primary">
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              {customers.length} Pending
            </Badge>
          </div>
        )}
        
        <div className="w-full sm:w-72 lg:w-auto">
          <FaceMonitor />
        </div>
      </div>

      {customers.length === 0 ? (
        <Card className="shadow-card animate-fade-in">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Phone className="w-10 h-10 text-primary/50" />
            </div>
            <h3 className="text-xl font-semibold font-display mb-2">No Pending Calls</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              All assigned customers have been called. Check back later for new assignments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in">
          {/* Customer Card - Takes 3 cols */}
          <div className="lg:col-span-3 space-y-5">
            <Card className="shadow-card overflow-hidden">
              {/* Customer Header with gradient */}
              <div className="gradient-primary p-5 text-primary-foreground">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold font-display truncate">
                      {currentCustomer.customer_name}
                    </h2>
                    <p className="text-sm opacity-90 font-mono">
                      {currentCustomer.customer_phone}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="rounded-full h-12 w-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 shadow-lg"
                    onClick={() => setIsDialerOpen(true)}
                  >
                    <PhoneCall className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {currentCustomer.customer_email && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                        <p className="text-sm font-medium truncate">{currentCustomer.customer_email}</p>
                      </div>
                    </div>
                  )}
                  {currentCustomer.course && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Course</p>
                        <p className="text-sm font-medium truncate">{currentCustomer.course}</p>
                      </div>
                    </div>
                  )}
                  {currentCustomer.fee != null && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-success" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Fee</p>
                        <p className="text-sm font-medium">₹{currentCustomer.fee.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-4 h-4 text-warning" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                      <StatusBadge status={currentCustomer.call_status} />
                    </div>
                  </div>
                </div>

                {/* Big Call Now Button */}
                <Button
                  size="lg"
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold text-base shadow-md"
                  onClick={() => setIsDialerOpen(true)}
                >
                  <PhoneCall className="w-5 h-5 mr-2" />
                  Call Now
                </Button>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  {/* Page dots */}
                  <div className="flex items-center gap-1.5">
                    {customers.length <= 7 ? (
                      customers.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setCurrentIndex(i); setSelectedStatus(''); setRemark(''); }}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            i === currentIndex 
                              ? "w-6 bg-primary" 
                              : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                          )}
                        />
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">
                        {currentIndex + 1} / {customers.length}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goNext}
                    disabled={currentIndex === customers.length - 1}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Update Status Form - Takes 2 cols */}
          <div className="lg:col-span-2">
            <Card className="shadow-card sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Update Call Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Call Status <span className="text-destructive">*</span></Label>
                  <Select 
                    value={selectedStatus} 
                    onValueChange={(value: CallStatus) => setSelectedStatus(value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select call status" />
                    </SelectTrigger>
                    <SelectContent>
                      {callStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <option.icon className="w-3.5 h-3.5 text-muted-foreground" />
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Remark {selectedStatus !== 'interested' && <span className="text-destructive">*</span>}
                  </Label>
                  <Textarea
                    placeholder="Enter your remarks about the call..."
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  {selectedStatus === 'interested' && (
                    <p className="text-xs text-muted-foreground italic">Optional for interested customers</p>
                  )}
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !selectedStatus}
                  className="w-full h-11 font-semibold"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit & Next'}
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
        />
      )}
    </DashboardLayout>
  );
};

export default CustomerCalling;

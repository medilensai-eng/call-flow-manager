import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Calendar, IndianRupee, Phone, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import aspectVisionLogo from '@/assets/aspect-vision-logo.png';

type AppRole = 'admin' | 'co_admin' | 'customer_caller';

interface UserProfile {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  bank_account_number: string | null;
  role: AppRole;
}

interface SalarySetting {
  call_type: string;
  rate_per_call: number;
}

interface CallBreakdown {
  call_type: string;
  count: number;
  rate: number;
  amount: number;
}

interface SalaryData {
  user: UserProfile;
  periodStart: Date;
  periodEnd: Date;
  periodType: 'weekly' | 'monthly';
  callBreakdown: CallBreakdown[];
  totalCalls: number;
  totalAmount: number;
}

const SalarySlip = () => {
  const { user, role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(0);
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  const CALL_STATUS_MAP: Record<string, string> = {
    'all_calls': 'All Calls',
    'call_connected': 'Call Connected',
    'interested': 'Interested',
    'not_interested': 'Not Interested',
    'call_not_received': 'Call Not Received',
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || 'customer_caller',
        };
      }).filter(u => u.role === 'customer_caller') || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const getPeriodDates = (period: number, type: 'weekly' | 'monthly') => {
    const now = new Date();
    if (type === 'weekly') {
      const start = startOfWeek(subWeeks(now, period), { weekStartsOn: 1 });
      const end = endOfWeek(subWeeks(now, period), { weekStartsOn: 1 });
      return { start, end };
    } else {
      const start = startOfMonth(subMonths(now, period));
      const end = endOfMonth(subMonths(now, period));
      return { start, end };
    }
  };

  const getPeriodOptions = (type: 'weekly' | 'monthly') => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < (type === 'weekly' ? 8 : 6); i++) {
      const { start, end } = getPeriodDates(i, type);
      options.push({
        value: i,
        label: type === 'weekly' 
          ? `Week ${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`
          : format(start, 'MMMM yyyy'),
      });
    }
    return options;
  };

  const generateSalaryData = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    setLoading(true);
    try {
      const selectedUser = users.find(u => u.user_id === selectedUserId);
      if (!selectedUser) throw new Error('User not found');

      const { start, end } = getPeriodDates(selectedPeriod, periodType);

      // Fetch salary settings
      const { data: salarySettings, error: settingsError } = await supabase
        .from('salary_settings')
        .select('call_type, rate_per_call')
        .eq('user_id', selectedUserId);

      if (settingsError) throw settingsError;

      // Fetch calls made by this user in the period
      const { data: calls, error: callsError } = await supabase
        .from('customer_data')
        .select('call_status, last_called_at')
        .eq('assigned_to', selectedUserId)
        .gte('last_called_at', start.toISOString())
        .lte('last_called_at', end.toISOString());

      if (callsError) throw callsError;

      // Calculate breakdown
      const breakdown: CallBreakdown[] = [];
      let totalCalls = 0;
      let totalAmount = 0;

      // Count calls by status
      const callCounts: Record<string, number> = {};
      calls?.forEach(call => {
        if (call.call_status && call.call_status !== 'pending') {
          callCounts[call.call_status] = (callCounts[call.call_status] || 0) + 1;
          totalCalls++;
        }
      });

      // Apply rates
      salarySettings?.forEach(setting => {
        let count = 0;
        
        if (setting.call_type === 'all_calls') {
          count = totalCalls;
        } else {
          count = callCounts[setting.call_type] || 0;
        }

        if (count > 0 && setting.rate_per_call > 0) {
          const amount = count * setting.rate_per_call;
          breakdown.push({
            call_type: setting.call_type,
            count,
            rate: setting.rate_per_call,
            amount,
          });
          
          // Only add to total if not 'all_calls' to avoid double counting
          if (setting.call_type !== 'all_calls') {
            totalAmount += amount;
          } else {
            // For all_calls, use this as the total
            totalAmount = amount;
          }
        }
      });

      // If no specific rates, just use all_calls rate
      if (breakdown.length === 1 && breakdown[0].call_type === 'all_calls') {
        totalAmount = breakdown[0].amount;
      }

      setSalaryData({
        user: selectedUser,
        periodStart: start,
        periodEnd: end,
        periodType,
        callBreakdown: breakdown,
        totalCalls,
        totalAmount,
      });

    } catch (error) {
      console.error('Error generating salary:', error);
      toast.error('Failed to generate salary data');
    }
    setLoading(false);
  };

  const downloadPDF = async () => {
    if (!salaryData) return;

    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Add logo
      try {
        const img = new Image();
        img.src = aspectVisionLogo;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        doc.addImage(img, 'PNG', 15, 10, 40, 20);
      } catch (e) {
        console.log('Could not load logo');
      }

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('SALARY SLIP', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Aspect Vision EduTech PVT. LTD.', pageWidth / 2, 28, { align: 'center' });

      // Period
      doc.setFontSize(12);
      doc.text(`Period: ${format(salaryData.periodStart, 'dd MMM yyyy')} - ${format(salaryData.periodEnd, 'dd MMM yyyy')}`, pageWidth / 2, 40, { align: 'center' });

      // Employee details
      doc.setFontSize(11);
      const startY = 55;
      doc.text(`Employee Name: ${salaryData.user.full_name}`, 15, startY);
      doc.text(`Employee ID: ${salaryData.user.employee_id}`, 15, startY + 7);
      doc.text(`Email: ${salaryData.user.email}`, 15, startY + 14);
      if (salaryData.user.bank_account_number) {
        doc.text(`Bank A/C: ${salaryData.user.bank_account_number}`, 15, startY + 21);
      }

      // Call breakdown table
      const tableData = salaryData.callBreakdown.map(item => [
        CALL_STATUS_MAP[item.call_type] || item.call_type,
        item.count.toString(),
        `₹${item.rate.toFixed(2)}`,
        `₹${item.amount.toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: startY + 35,
        head: [['Call Type', 'Count', 'Rate/Call', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        foot: [['', 'Total', '', `₹${salaryData.totalAmount.toFixed(2)}`]],
        footStyles: { fillColor: [46, 204, 113], fontStyle: 'bold' },
      });

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 15, finalY);
      doc.text('This is a computer-generated document.', pageWidth / 2, finalY + 10, { align: 'center' });

      // Download
      const fileName = `Salary_Slip_${salaryData.user.employee_id}_${format(salaryData.periodStart, 'MMMyyyy')}.pdf`;
      doc.save(fileName);
      toast.success('Salary slip downloaded!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
    setGenerating(false);
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              Salary Slip Generator
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate salary slips for customer callers
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-display">Generate Salary Slip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Employee</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name} ({u.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Period Type</label>
                <Select value={periodType} onValueChange={(v: 'weekly' | 'monthly') => {
                  setPeriodType(v);
                  setSelectedPeriod(0);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Period</label>
                <Select 
                  value={selectedPeriod.toString()} 
                  onValueChange={(v) => setSelectedPeriod(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getPeriodOptions(periodType).map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={generateSalaryData} disabled={loading} className="w-full">
                  {loading ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Slip Preview */}
        {salaryData && (
          <Card className="shadow-card" ref={slipRef}>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img 
                    src={aspectVisionLogo} 
                    alt="Aspect Vision" 
                    className="h-12 w-auto object-contain"
                  />
                  <div>
                    <CardTitle className="text-xl font-display">Salary Slip</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Aspect Vision EduTech PVT. LTD.
                    </p>
                  </div>
                </div>
                <Button onClick={downloadPDF} disabled={generating}>
                  <Download className="w-4 h-4 mr-2" />
                  {generating ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Period */}
              <div className="flex items-center gap-2 mb-6 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Period: {format(salaryData.periodStart, 'dd MMM yyyy')} - {format(salaryData.periodEnd, 'dd MMM yyyy')}
                </span>
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded capitalize">
                  {salaryData.periodType}
                </span>
              </div>

              {/* Employee Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Employee Name</p>
                  <p className="font-medium">{salaryData.user.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employee ID</p>
                  <p className="font-medium font-mono">{salaryData.user.employee_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{salaryData.user.email}</p>
                </div>
                {salaryData.user.bank_account_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Bank A/C</p>
                    <p className="font-medium font-mono">{salaryData.user.bank_account_number}</p>
                  </div>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold font-display">{salaryData.totalCalls}</p>
                        <p className="text-xs text-muted-foreground">Total Calls</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <IndianRupee className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold font-display text-success">
                          ₹{salaryData.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Earnings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <FileText className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold font-display">{salaryData.callBreakdown.length}</p>
                        <p className="text-xs text-muted-foreground">Rate Types Applied</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown Table */}
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Call Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Rate/Call</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryData.callBreakdown.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {CALL_STATUS_MAP[item.call_type] || item.call_type}
                      </TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{item.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-success/10 font-bold">
                    <TableCell colSpan={3} className="text-right">Total Earnings</TableCell>
                    <TableCell className="text-right text-success">
                      ₹{salaryData.totalAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
                <p>This is a computer-generated salary slip.</p>
                <p>Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
              </div>
            </CardContent>
          </Card>
        )}
    </DashboardLayout>
  );
};

export default SalarySlip;

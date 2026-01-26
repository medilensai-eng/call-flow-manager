import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, Check, AlertCircle, Users } from 'lucide-react';

interface CallerOption {
  user_id: string;
  full_name: string;
  employee_id: string;
}

interface ParsedRow {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  course?: string;
  qualification?: string;
}

const ImportData = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [callers, setCallers] = useState<CallerOption[]>([]);
  const [selectedCaller, setSelectedCaller] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchCallers();
  }, []);

  const fetchCallers = async () => {
    // Get all customer callers
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'customer_caller');

    if (rolesError) {
      toast.error('Failed to fetch callers');
      return;
    }

    if (!roles || roles.length === 0) {
      setCallers([]);
      return;
    }

    const userIds = roles.map(r => r.user_id);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, employee_id')
      .in('user_id', userIds);

    if (profilesError) {
      toast.error('Failed to fetch caller profiles');
      return;
    }

    setCallers(profiles || []);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('CSV file must have a header row and at least one data row');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find column indices
    const nameIdx = headers.findIndex(h => h.includes('name'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const courseIdx = headers.findIndex(h => h.includes('course'));
    const qualificationIdx = headers.findIndex(h => h.includes('qualification') || h.includes('degree') || h.includes('education'));

    if (nameIdx === -1 || phoneIdx === -1) {
      toast.error('CSV must contain "name" and "phone" columns');
      return;
    }

    const parsed: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values[nameIdx] && values[phoneIdx]) {
        parsed.push({
          customer_name: values[nameIdx],
          customer_phone: values[phoneIdx],
          customer_email: emailIdx !== -1 ? values[emailIdx] : undefined,
          course: courseIdx !== -1 ? values[courseIdx] : undefined,
          qualification: qualificationIdx !== -1 ? values[qualificationIdx] : undefined,
        });
      }
    }

    if (parsed.length === 0) {
      toast.error('No valid data found in CSV');
      return;
    }

    setParsedData(parsed);
    toast.success(`Parsed ${parsed.length} records`);
  };

  const handleImport = async () => {
    if (!selectedCaller) {
      toast.error('Please select a caller to assign data to');
      return;
    }

    if (parsedData.length === 0) {
      toast.error('No data to import');
      return;
    }

    setIsImporting(true);

    const records = parsedData.map(row => ({
      assigned_to: selectedCaller,
      assigned_by: user?.id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      customer_email: row.customer_email || null,
      course: row.course || null,
      qualification: row.qualification || null,
      call_status: 'pending' as const,
    }));

    const { error } = await supabase
      .from('customer_data')
      .insert(records);

    if (error) {
      toast.error('Failed to import data');
      console.error(error);
    } else {
      toast.success(`Successfully imported ${records.length} records!`);
      setParsedData([]);
      setSelectedCaller('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }

    setIsImporting(false);
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">Import Data</h1>
          <p className="text-muted-foreground mt-1">Upload CSV/Excel data and assign to callers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload File
              </CardTitle>
            <CardDescription>
                Upload a CSV file with columns: name, email, phone, course, qualification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV files only (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {parsedData.length > 0 && (
                <div className="flex items-center gap-2 text-success">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">{parsedData.length} records ready to import</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assign Section */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assign to Caller
              </CardTitle>
              <CardDescription>
                Select a customer caller to assign the imported data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Customer Caller *</Label>
                <Select value={selectedCaller} onValueChange={setSelectedCaller}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a caller" />
                  </SelectTrigger>
                  <SelectContent>
                    {callers.length === 0 ? (
                      <SelectItem value="none" disabled>No callers available</SelectItem>
                    ) : (
                      callers.map((caller) => (
                        <SelectItem key={caller.user_id} value={caller.user_id}>
                          {caller.full_name} ({caller.employee_id})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleImport}
                disabled={isImporting || parsedData.length === 0 || !selectedCaller}
                className="w-full"
              >
                {isImporting ? 'Importing...' : `Import ${parsedData.length} Records`}
              </Button>

              {callers.length === 0 && (
                <div className="flex items-start gap-2 text-warning text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>No customer callers found. Create callers first in the Users page.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Table */}
        {parsedData.length > 0 && (
          <Card className="shadow-card mt-6">
            <CardHeader>
              <CardTitle className="font-display">Data Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Qualification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 20).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{row.customer_name}</TableCell>
                        <TableCell>{row.customer_email || '-'}</TableCell>
                        <TableCell>{row.customer_phone}</TableCell>
                        <TableCell>{row.course || '-'}</TableCell>
                        <TableCell>{row.qualification || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 20 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Showing 20 of {parsedData.length} records
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </DashboardLayout>
  );
};

export default ImportData;

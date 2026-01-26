import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Users, Edit, FileCheck, Upload, User, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import aspectVisionLogo from '@/assets/aspect-vision-logo.png';

type AppRole = 'admin' | 'co_admin' | 'customer_caller';

interface UserProfile {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  aadhaar_number: string | null;
  pan_number: string | null;
  bank_account_number: string | null;
  address: string | null;
  photo_url: string | null;
  created_at: string;
  role: AppRole;
}

interface SalarySetting {
  id: string;
  call_type: string;
  rate_per_call: number;
}

const UserKYC = () => {
  const { user, role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isKYCDialogOpen, setIsKYCDialogOpen] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [salarySettings, setSalarySettings] = useState<SalarySetting[]>([]);

  // KYC form state
  const [kycForm, setKycForm] = useState({
    phone: '',
    aadhaar_number: '',
    pan_number: '',
    bank_account_number: '',
    address: '',
  });

  // Salary form state
  const [salaryForm, setSalaryForm] = useState({
    all_calls: '',
    call_connected: '',
    interested: '',
    not_interested: '',
    call_not_received: '',
  });

  const CALL_TYPES = [
    { key: 'all_calls', label: 'All Calls' },
    { key: 'call_connected', label: 'Call Connected' },
    { key: 'interested', label: 'Interested' },
    { key: 'not_interested', label: 'Not Interested' },
    { key: 'call_not_received', label: 'Call Not Received' },
  ];

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

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
      }) || [];

      // Only show customer callers for KYC management
      setUsers(usersWithRoles.filter(u => u.role === 'customer_caller'));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUserRole]);

  const openKYCDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setKycForm({
      phone: userProfile.phone || '',
      aadhaar_number: userProfile.aadhaar_number || '',
      pan_number: userProfile.pan_number || '',
      bank_account_number: userProfile.bank_account_number || '',
      address: userProfile.address || '',
    });
    setPhotoFile(null);
    setIsKYCDialogOpen(true);
  };

  const openSalaryDialog = async (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    
    // Fetch existing salary settings
    const { data, error } = await supabase
      .from('salary_settings')
      .select('*')
      .eq('user_id', userProfile.user_id);

    if (error) {
      console.error('Error fetching salary settings:', error);
    }

    const settings = data || [];
    setSalarySettings(settings);

    // Populate form with existing values
    const formValues: Record<string, string> = {
      all_calls: '',
      call_connected: '',
      interested: '',
      not_interested: '',
      call_not_received: '',
    };

    settings.forEach(s => {
      if (formValues.hasOwnProperty(s.call_type)) {
        formValues[s.call_type] = s.rate_per_call.toString();
      }
    });

    setSalaryForm(formValues as typeof salaryForm);
    setIsSalaryDialogOpen(true);
  };

  const handlePhotoUpload = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null;

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, photoFile, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleKYCSubmit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      let photoUrl = selectedUser.photo_url;

      if (photoFile) {
        photoUrl = await handlePhotoUpload(selectedUser.user_id);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          phone: kycForm.phone || null,
          aadhaar_number: kycForm.aadhaar_number || null,
          pan_number: kycForm.pan_number || null,
          bank_account_number: kycForm.bank_account_number || null,
          address: kycForm.address || null,
          photo_url: photoUrl,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('KYC details updated successfully!');
      setIsKYCDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating KYC:', error);
      toast.error('Failed to update KYC details');
    }
    setIsSubmitting(false);
  };

  const handleSalarySubmit = async () => {
    if (!selectedUser || !user) return;

    setIsSubmitting(true);
    try {
      for (const callType of CALL_TYPES) {
        const rate = parseFloat(salaryForm[callType.key as keyof typeof salaryForm]) || 0;

        if (rate > 0) {
          const { error } = await supabase
            .from('salary_settings')
            .upsert({
              user_id: selectedUser.user_id,
              call_type: callType.key,
              rate_per_call: rate,
              created_by: user.id,
            }, {
              onConflict: 'user_id,call_type',
            });

          if (error) throw error;
        }
      }

      toast.success('Salary settings updated successfully!');
      setIsSalaryDialogOpen(false);
    } catch (error) {
      console.error('Error updating salary settings:', error);
      toast.error('Failed to update salary settings');
    }
    setIsSubmitting(false);
  };

  const getKYCStatus = (profile: UserProfile) => {
    const hasBasicInfo = profile.phone && profile.aadhaar_number;
    const hasBankInfo = profile.bank_account_number;
    const hasPhoto = profile.photo_url;

    if (hasBasicInfo && hasBankInfo && hasPhoto) {
      return { status: 'Complete', color: 'bg-success/10 text-success border-success/20' };
    } else if (hasBasicInfo) {
      return { status: 'Partial', color: 'bg-warning/10 text-warning border-warning/20' };
    }
    return { status: 'Pending', color: 'bg-muted text-muted-foreground border-muted' };
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              KYC & Salary Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage caller KYC details and salary settings
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Callers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <FileCheck className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">
                    {users.filter(u => getKYCStatus(u).status === 'Complete').length}
                  </p>
                  <p className="text-sm text-muted-foreground">KYC Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <FileCheck className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">
                    {users.filter(u => getKYCStatus(u).status === 'Pending').length}
                  </p>
                  <p className="text-sm text-muted-foreground">KYC Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No callers found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Photo</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userProfile) => {
                    const kycStatus = getKYCStatus(userProfile);
                    return (
                      <TableRow key={userProfile.id}>
                        <TableCell>
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {userProfile.photo_url ? (
                              <img 
                                src={userProfile.photo_url} 
                                alt={userProfile.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{userProfile.employee_id}</TableCell>
                        <TableCell className="font-medium">{userProfile.full_name}</TableCell>
                        <TableCell>{userProfile.email}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${kycStatus.color}`}>
                            {kycStatus.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openKYCDialog(userProfile)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              KYC
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openSalaryDialog(userProfile)}
                            >
                              <IndianRupee className="w-4 h-4 mr-1" />
                              Salary
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* KYC Dialog */}
      <Dialog open={isKYCDialogOpen} onOpenChange={setIsKYCDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              KYC Details - {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Passport Size Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                  {photoFile ? (
                    <img 
                      src={URL.createObjectURL(photoFile)} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : selectedUser?.photo_url ? (
                    <img 
                      src={selectedUser.photo_url} 
                      alt={selectedUser.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload passport size photo (JPG, PNG)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="Enter phone number"
                  value={kycForm.phone}
                  onChange={(e) => setKycForm({ ...kycForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input
                  placeholder="Enter Aadhaar number"
                  value={kycForm.aadhaar_number}
                  onChange={(e) => setKycForm({ ...kycForm, aadhaar_number: e.target.value })}
                  maxLength={12}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAN Number</Label>
                <Input
                  placeholder="Enter PAN number"
                  value={kycForm.pan_number}
                  onChange={(e) => setKycForm({ ...kycForm, pan_number: e.target.value.toUpperCase() })}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Bank Account Number</Label>
                <Input
                  placeholder="Enter bank account number"
                  value={kycForm.bank_account_number}
                  onChange={(e) => setKycForm({ ...kycForm, bank_account_number: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                placeholder="Enter full address"
                value={kycForm.address}
                onChange={(e) => setKycForm({ ...kycForm, address: e.target.value })}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleKYCSubmit} 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Saving...' : 'Save KYC Details'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Salary Settings Dialog */}
      <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <IndianRupee className="w-5 h-5" />
              Salary Settings - {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Set rate per call for different call types. Leave empty or 0 to exclude from calculation.
            </p>
            
            {CALL_TYPES.map((callType) => (
              <div key={callType.key} className="flex items-center gap-4">
                <Label className="w-40 text-sm">{callType.label}</Label>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={salaryForm[callType.key as keyof typeof salaryForm]}
                    onChange={(e) => setSalaryForm({ 
                      ...salaryForm, 
                      [callType.key]: e.target.value 
                    })}
                    className="pl-8"
                  />
                </div>
              </div>
            ))}

            <Button 
              onClick={handleSalarySubmit} 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Saving...' : 'Save Salary Settings'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserKYC;

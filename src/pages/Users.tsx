import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Users as UsersIcon, Edit, Trash2, Eye, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

type AppRole = 'admin' | 'co_admin' | 'customer_caller';

interface UserWithRole {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  role: AppRole;
}

const Users = () => {
  const { role: currentUserRole, signUp } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserWithRole | null>(null);

  // Form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('customer_caller');

  const fetchUsers = async () => {
    try {
      // Fetch profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || 'customer_caller',
        };
      }) || [];

      // Filter based on current user role
      if (currentUserRole === 'co_admin') {
        setUsers(usersWithRoles.filter(u => u.role === 'customer_caller'));
      } else {
        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUserRole]);

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);

    const { error } = await signUp(newUserEmail, newUserPassword, newUserName, newUserRole);

    if (error) {
      toast.error(error.message || 'Failed to create user');
    } else {
      toast.success('User created successfully!');
      setIsDialogOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('customer_caller');
      fetchUsers();
    }

    setIsCreating(false);
  };

  const handleResetUserData = async (user: UserWithRole) => {
    if (currentUserRole !== 'admin') {
      toast.error('Only admins can reset user data');
      return;
    }

    setIsResetting(true);

    try {
      // Delete customer_data assigned to this user
      const { error: customerDataError } = await supabase
        .from('customer_data')
        .delete()
        .eq('assigned_to', user.user_id);

      if (customerDataError) throw customerDataError;

      // Delete face_alerts for this user
      const { error: faceAlertsError } = await supabase
        .from('face_alerts')
        .delete()
        .eq('user_id', user.user_id);

      if (faceAlertsError) throw faceAlertsError;

      // Delete caller_streams for this user
      const { error: callerStreamsError } = await supabase
        .from('caller_streams')
        .delete()
        .eq('user_id', user.user_id);

      if (callerStreamsError) throw callerStreamsError;

      // Delete session_logs for this user
      const { error: sessionLogsError } = await supabase
        .from('session_logs')
        .delete()
        .eq('user_id', user.user_id);

      if (sessionLogsError) throw sessionLogsError;

      // Note: We keep profiles, user_roles, salary_records, and salary_settings

      toast.success(`All data reset for ${user.full_name}`, {
        description: 'Profile, account, and salary records preserved',
      });
      
      setSelectedUserForReset(null);
    } catch (error: any) {
      console.error('Error resetting user data:', error);
      toast.error('Failed to reset user data');
    } finally {
      setIsResetting(false);
    }
  };

  const getRoleBadgeClass = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'co_admin':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              {currentUserRole === 'admin' ? 'Manage Users' : 'Manage Callers'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentUserRole === 'admin' 
                ? 'Create and manage all users'
                : 'Create and manage customer callers'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Enter full name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="Enter email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    placeholder="Create password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select 
                    value={newUserRole} 
                    onValueChange={(value: AppRole) => setNewUserRole(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentUserRole === 'admin' && (
                        <>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="co_admin">Co-Admin</SelectItem>
                        </>
                      )}
                      <SelectItem value="customer_caller">Customer Caller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateUser} 
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <UsersIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <UsersIcon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">
                    {users.filter(u => u.role === 'co_admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Co-Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <UsersIcon className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">
                    {users.filter(u => u.role === 'customer_caller').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Customer Callers</p>
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
                <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    {currentUserRole === 'admin' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">{user.employee_id}</TableCell>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getRoleBadgeClass(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      {currentUserRole === 'admin' && (
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => setSelectedUserForReset(user)}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Reset Data
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                                  Reset User Data
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-3">
                                  <p>
                                    This will delete all data for <strong>{user.full_name}</strong> except:
                                  </p>
                                  <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>User account & login credentials</li>
                                    <li>Profile details (KYC, bank info, photo)</li>
                                    <li>Salary records & settings</li>
                                  </ul>
                                  <p className="text-destructive font-medium">
                                    The following will be permanently deleted:
                                  </p>
                                  <ul className="list-disc list-inside text-sm space-y-1 text-destructive">
                                    <li>Customer data assigned to this user</li>
                                    <li>Face detection alerts</li>
                                    <li>Session logs</li>
                                    <li>Caller stream data</li>
                                  </ul>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleResetUserData(user)}
                                  disabled={isResetting}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  {isResetting ? 'Resetting...' : 'Reset Data'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
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

export default Users;

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Clock, History } from 'lucide-react';
import { format } from 'date-fns';

interface SessionLog {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
  duration_minutes: number | null;
  profile?: {
    full_name: string;
    employee_id: string;
  };
}

const SessionLogs = () => {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data: sessionData, error } = await supabase
      .from('session_logs')
      .select('*')
      .order('login_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error('Failed to fetch session logs');
      setLoading(false);
      return;
    }

    if (!sessionData || sessionData.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for all users
    const userIds = [...new Set(sessionData.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, employee_id')
      .in('user_id', userIds);

    const sessionsWithProfiles = sessionData.map(session => ({
      ...session,
      profile: profiles?.find(p => p.user_id === session.user_id),
    }));

    setSessions(sessionsWithProfiles);
    setLoading(false);
  };

  const filteredSessions = dateFilter
    ? sessions.filter(s => s.login_at.startsWith(dateFilter))
    : sessions;

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return 'Active';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">Session Logs</h1>
          <p className="text-muted-foreground mt-1">Track user login and logout activity</p>
        </div>

        {/* Filter */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="space-y-2 max-w-[200px]">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
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
            ) : filteredSessions.length === 0 ? (
              <div className="py-16 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No session logs found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>Logout Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-mono text-sm">
                        {session.profile?.employee_id || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {session.profile?.full_name || 'Unknown User'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(session.login_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {session.logout_at 
                          ? format(new Date(session.logout_at), 'MMM dd, yyyy HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>{formatDuration(session.duration_minutes)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          session.logout_at 
                            ? 'bg-muted text-muted-foreground border-muted'
                            : 'bg-success/10 text-success border-success/20'
                        }`}>
                          {session.logout_at ? 'Logged Out' : 'Active'}
                        </span>
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

export default SessionLogs;

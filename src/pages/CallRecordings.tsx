import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mic, 
  Play, 
  Pause, 
  Download, 
  Filter, 
  RotateCcw,
  PhoneIncoming,
  PhoneOutgoing,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface CallRecording {
  id: string;
  user_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  call_type: string;
  call_status: string;
  duration_seconds: number;
  recording_url: string | null;
  started_at: string;
  ended_at: string | null;
}

const CallRecordings = () => {
  const { user, role } = useAuth();
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const isAdmin = role === 'admin' || role === 'co_admin';

  const fetchRecordings = async () => {
    if (!user) return;

    setLoading(true);

    let query = supabase
      .from('call_recordings')
      .select('*')
      .order('started_at', { ascending: false });

    // Non-admins can only see their own recordings
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to fetch recordings');
    } else {
      setRecordings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecordings();
  }, [user]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = (recording: CallRecording) => {
    if (!recording.recording_url) {
      toast.error('No recording available');
      return;
    }

    if (playingId === recording.id) {
      // Pause
      audioElement?.pause();
      setPlayingId(null);
    } else {
      // Stop current audio if playing
      if (audioElement) {
        audioElement.pause();
      }

      // Play new audio
      const audio = new Audio(recording.recording_url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      setAudioElement(audio);
      setPlayingId(recording.id);
    }
  };

  const handleDownload = async (recording: CallRecording) => {
    if (!recording.recording_url) {
      toast.error('No recording available');
      return;
    }

    try {
      const response = await fetch(recording.recording_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-${recording.customer_phone}-${format(new Date(recording.started_at), 'yyyy-MM-dd-HHmm')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download recording');
    }
  };

  const filteredRecordings = recordings.filter(r => {
    if (typeFilter !== 'all' && r.call_type !== typeFilter) return false;
    if (dateFilter && !r.started_at.startsWith(dateFilter)) return false;
    return true;
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Call Recordings</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'View all call recordings' : 'View your call recordings'}
        </p>
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
              <Label>Call Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
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
                  setTypeFilter('all');
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

      {/* Recordings Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRecordings.length === 0 ? (
            <div className="py-16 text-center">
              <Mic className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No recordings found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecordings.map((recording) => (
                  <TableRow key={recording.id}>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {recording.call_type === 'outgoing' ? (
                          <>
                            <PhoneOutgoing className="w-3 h-3" />
                            Outgoing
                          </>
                        ) : (
                          <>
                            <PhoneIncoming className="w-3 h-3" />
                            Incoming
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {recording.customer_name || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {recording.customer_phone || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.duration_seconds)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(recording.started_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={recording.call_status === 'completed' ? 'default' : 'secondary'}
                      >
                        {recording.call_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePlay(recording)}
                          disabled={!recording.recording_url}
                        >
                          {playingId === recording.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(recording)}
                          disabled={!recording.recording_url}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
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

export default CallRecordings;

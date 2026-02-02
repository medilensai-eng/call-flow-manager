import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTCViewer } from '@/hooks/useWebRTCViewer';
import { toast } from 'sonner';
import { 
  Video, 
  VideoOff, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Bell,
  BellOff,
  Maximize2,
  X,
  Wifi,
  WifiOff,
  Play
} from 'lucide-react';

interface CallerStream {
  id: string;
  user_id: string;
  is_streaming: boolean;
  face_detected: boolean;
  last_seen_at: string;
  stream_started_at: string | null;
  profile?: {
    full_name: string;
    employee_id: string;
    photo_url: string | null;
  };
}

interface FaceAlert {
  id: string;
  user_id: string;
  alert_type: string;
  started_at: string;
  is_active: boolean;
  profile?: {
    full_name: string;
    employee_id: string;
  };
}

// Live Video Component for each caller
const LiveVideoTile: React.FC<{ 
  caller: CallerStream; 
  onExpand: () => void;
  isExpanded?: boolean;
}> = ({ caller, onExpand, isExpanded = false }) => {
  const { videoRef, isConnected, isConnecting, connect, disconnect } = useWebRTCViewer(caller.user_id);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    // Auto-connect when caller is streaming
    if (caller.is_streaming && !isConnected && !isConnecting) {
      connect();
      setShowVideo(true);
    }
  }, [caller.is_streaming, isConnected, isConnecting, connect]);

  useEffect(() => {
    // Disconnect when caller stops streaming
    if (!caller.is_streaming && isConnected) {
      disconnect();
      setShowVideo(false);
    }
  }, [caller.is_streaming, isConnected, disconnect]);

  const handleConnect = () => {
    connect();
    setShowVideo(true);
  };

  return (
    <div
      onClick={onExpand}
      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] ${
        !caller.face_detected 
          ? 'border-destructive ring-2 ring-destructive animate-pulse' 
          : 'border-border hover:border-primary'
      } ${isExpanded ? 'col-span-2 row-span-2' : ''}`}
    >
      {/* Video Feed */}
      <div className={`${isExpanded ? 'aspect-video' : 'aspect-video'} bg-muted flex items-center justify-center relative`}>
        {showVideo && isConnected ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : caller.is_streaming ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground">Connecting...</p>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => { e.stopPropagation(); handleConnect(); }}
                >
                  <Play className="w-4 h-4 mr-1" />
                  View Live
                </Button>
              </>
            )}
          </div>
        ) : caller.profile?.photo_url ? (
          <img 
            src={caller.profile.photo_url} 
            alt={caller.profile.full_name}
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Video className="w-8 h-8 text-primary" />
          </div>
        )}
        
        {/* Connection Status */}
        <div className="absolute top-2 left-2">
          {isConnected ? (
            <Badge variant="default" className="text-xs bg-green-500">
              <Wifi className="w-3 h-3 mr-1" />
              Live
            </Badge>
          ) : caller.is_streaming ? (
            <Badge variant="secondary" className="text-xs">
              <WifiOff className="w-3 h-3 mr-1" />
              Available
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Offline
            </Badge>
          )}
        </div>
        
        {/* Face Detection Overlay */}
        {!caller.face_detected && caller.is_streaming && (
          <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center">
            <div className="bg-destructive text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              No Face
            </div>
          </div>
        )}
        
        {/* Expand Button */}
        <div className="absolute top-2 right-2">
          <Maximize2 className="w-4 h-4 text-white drop-shadow-lg opacity-70 hover:opacity-100" />
        </div>
      </div>
      
      {/* Caller Info */}
      <div className="p-2 bg-card">
        <div className="flex items-center justify-between">
          <div className="truncate">
            <p className="font-medium text-sm truncate">
              {caller.profile?.full_name || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground">
              {caller.profile?.employee_id || 'N/A'}
            </p>
          </div>
          {caller.face_detected ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

// Full View Dialog Component
const FullViewDialog: React.FC<{
  caller: CallerStream | null;
  onClose: () => void;
}> = ({ caller, onClose }) => {
  const { videoRef, isConnected, isConnecting, connect, disconnect } = useWebRTCViewer(caller?.user_id || null);

  useEffect(() => {
    if (caller?.is_streaming && !isConnected && !isConnecting) {
      connect();
    }
  }, [caller, isConnected, isConnecting, connect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  if (!caller) return null;

  return (
    <Dialog open={!!caller} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {caller.profile?.full_name || 'Unknown'} - Live View
            {isConnected && (
              <Badge variant="default" className="ml-2 bg-green-500">
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {isConnected ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />
            ) : isConnecting ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Connecting to live feed...</p>
              </div>
            ) : caller.is_streaming ? (
              <div className="text-center">
                <Button onClick={connect}>
                  <Play className="w-4 h-4 mr-2" />
                  Connect to Live Feed
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <VideoOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Caller is offline</p>
              </div>
            )}
          </div>
          
          {!caller.face_detected && caller.is_streaming && (
            <div className="absolute inset-0 bg-destructive/30 rounded-lg flex items-center justify-center pointer-events-none">
              <div className="bg-destructive text-white px-6 py-3 rounded-lg text-lg font-medium flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Face Not Detected!
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{caller.profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">
              Employee ID: {caller.profile?.employee_id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={caller.face_detected ? "default" : "destructive"}>
              {caller.face_detected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Face Detected
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Face Not Detected
                </>
              )}
            </Badge>
            {isConnected && (
              <Button variant="outline" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const LiveMonitoring = () => {
  const { role } = useAuth();
  const [callerStreams, setCallerStreams] = useState<CallerStream[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<FaceAlert[]>([]);
  const [selectedCaller, setSelectedCaller] = useState<CallerStream | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch caller streams with profiles
  const fetchCallerStreams = async () => {
    try {
      const { data: streams, error } = await supabase
        .from('caller_streams')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (streams && streams.length > 0) {
        const userIds = streams.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, employee_id, photo_url')
          .in('user_id', userIds);

        const streamsWithProfiles = streams.map(stream => ({
          ...stream,
          profile: profiles?.find(p => p.user_id === stream.user_id)
        }));

        setCallerStreams(streamsWithProfiles);
      } else {
        setCallerStreams([]);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch active alerts
  const fetchActiveAlerts = async () => {
    try {
      const { data: alerts, error } = await supabase
        .from('face_alerts')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false });

      if (error) throw error;

      if (alerts && alerts.length > 0) {
        const userIds = alerts.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, employee_id')
          .in('user_id', userIds);

        const alertsWithProfiles = alerts.map(alert => ({
          ...alert,
          profile: profiles?.find(p => p.user_id === alert.user_id)
        }));

        setActiveAlerts(alertsWithProfiles);
      } else {
        setActiveAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  // Play alert sound
  const playAlertSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCallerStreams();
    fetchActiveAlerts();
  }, []);

  // Realtime subscription for streams
  useEffect(() => {
    const streamsChannel = supabase
      .channel('caller_streams_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'caller_streams' },
        () => {
          fetchCallerStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(streamsChannel);
    };
  }, []);

  // Realtime subscription for alerts
  useEffect(() => {
    const alertsChannel = supabase
      .channel('face_alerts_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'face_alerts' },
        () => {
          fetchActiveAlerts();
          playAlertSound();
          toast.error('⚠️ Face Not Detected!', {
            description: 'A caller has left their seat',
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'face_alerts' },
        () => {
          fetchActiveAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
    };
  }, [soundEnabled]);

  const streamingCallers = callerStreams.filter(c => c.is_streaming);
  const offlineCallers = callerStreams.filter(c => !c.is_streaming);

  if (role !== 'admin' && role !== 'co_admin') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Alert Sound */}
      <audio ref={audioRef} preload="auto">
        <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
      </audio>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Live Monitoring</h1>
            <p className="text-muted-foreground mt-1">Real-time caller video & face monitoring dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Sound On
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 mr-2" />
                  Sound Off
                </>
              )}
            </Button>
            {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Callers</p>
                  <p className="text-2xl font-bold">{callerStreams.length}</p>
                </div>
                <Users className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-green-600">{streamingCallers.length}</p>
                </div>
                <Video className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-muted-foreground">{offlineCallers.length}</p>
                </div>
                <VideoOff className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className={activeAlerts.length > 0 ? 'ring-2 ring-destructive' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                  <p className="text-2xl font-bold text-destructive">{activeAlerts.length}</p>
                </div>
                <AlertTriangle className={`w-8 h-8 text-destructive ${activeAlerts.length > 0 ? 'animate-pulse' : 'opacity-50'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts Banner */}
        {activeAlerts.length > 0 && (
          <Card className="mb-8 border-destructive bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Active Face Detection Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {activeAlerts.map(alert => (
                  <Badge 
                    key={alert.id} 
                    variant="destructive" 
                    className="py-2 px-3 animate-pulse"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {alert.profile?.full_name || 'Unknown'} ({alert.profile?.employee_id || 'N/A'})
                    <span className="ml-2 text-xs opacity-75">
                      {new Date(alert.started_at).toLocaleTimeString()}
                    </span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Caller Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Live Caller Feeds
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading caller feeds...
              </div>
            ) : streamingCallers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <VideoOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No callers are currently streaming</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {streamingCallers.map(caller => (
                  <LiveVideoTile
                    key={caller.id}
                    caller={caller}
                    onExpand={() => setSelectedCaller(caller)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Callers */}
        {offlineCallers.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <VideoOff className="w-5 h-5" />
                Offline Callers ({offlineCallers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {offlineCallers.map(caller => (
                  <Badge key={caller.id} variant="secondary">
                    {caller.profile?.full_name || 'Unknown'} ({caller.profile?.employee_id || 'N/A'})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full View Dialog */}
        <FullViewDialog 
          caller={selectedCaller} 
          onClose={() => setSelectedCaller(null)} 
        />
    </DashboardLayout>
  );
};

export default LiveMonitoring;

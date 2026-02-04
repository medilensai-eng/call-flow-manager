import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Smartphone, 
  Link2, 
  Link2Off, 
  Phone, 
  PhoneOff,
  Mic,
  MicOff,
  Loader2,
  CheckCircle2,
  XCircle,
  PhoneIncoming,
  PhoneOutgoing,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'in_call';

interface CallInfo {
  type: 'incoming' | 'outgoing';
  customerName: string;
  customerPhone: string;
  customerId?: string;
}

const PhoneConnect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [manualCode, setManualCode] = useState('');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connect using code
  const connect = async (connectionCode: string) => {
    setConnectionStatus('connecting');

    try {
      // Find the connection record
      const { data, error } = await supabase
        .from('phone_connections')
        .select('*')
        .eq('connection_code', connectionCode.toUpperCase())
        .single();

      if (error || !data) {
        toast.error('Invalid connection code');
        setConnectionStatus('disconnected');
        return;
      }

      // Update connection status
      const deviceInfo = {
        device: navigator.userAgent.includes('iPhone') ? 'iPhone' : 
                navigator.userAgent.includes('Android') ? 'Android' : 'Mobile',
        userAgent: navigator.userAgent,
        connectedAt: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('phone_connections')
        .update({
          is_connected: true,
          phone_info: deviceInfo,
          connected_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (updateError) {
        toast.error('Failed to connect');
        setConnectionStatus('disconnected');
        return;
      }

      setConnectionId(data.id);
      setConnectionStatus('connected');
      toast.success('Connected to PC!');

      // Subscribe to call events
      subscribeToEvents(data.id, data.user_id);

      // Request microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
      } catch (err) {
        console.error('Microphone access denied:', err);
        toast.error('Microphone access required for calls');
      }

    } catch (err) {
      console.error('Connection error:', err);
      toast.error('Connection failed');
      setConnectionStatus('disconnected');
    }
  };

  // Subscribe to realtime events from PC
  const subscribeToEvents = (connId: string, userId: string) => {
    const channel = supabase.channel(`phone-call:${connId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'start-call' }, ({ payload }) => {
        console.log('Received call request:', payload);
        setCallInfo({
          type: payload.type || 'outgoing',
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerId: payload.customerId,
        });
        setConnectionStatus('in_call');
        setCallDuration(0);
        
        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      })
      .on('broadcast', { event: 'end-call' }, () => {
        console.log('Call ended by PC');
        endCall();
      })
      .on('broadcast', { event: 'pc-disconnect' }, () => {
        console.log('PC disconnected');
        disconnect();
      })
      .subscribe();

    channelRef.current = channel;
  };

  // End current call
  const endCall = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Notify PC that call ended
    channelRef.current?.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: {
        duration: callDuration,
        callInfo,
      },
    });

    setCallInfo(null);
    setCallDuration(0);
    setConnectionStatus('connected');
  };

  // Disconnect from PC
  const disconnect = async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (connectionId) {
      await supabase
        .from('phone_connections')
        .update({
          is_connected: false,
          phone_info: {},
          connected_at: null,
        })
        .eq('id', connectionId);
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    setConnectionStatus('disconnected');
    setConnectionId(null);
    setCallInfo(null);
    toast.info('Disconnected from PC');
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-connect if code is in URL
  useEffect(() => {
    if (code) {
      connect(code);
    }
  }, [code]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Keep-alive ping
  useEffect(() => {
    if (connectionStatus === 'connected' || connectionStatus === 'in_call') {
      const interval = setInterval(async () => {
        if (connectionId) {
          await supabase
            .from('phone_connections')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', connectionId);
        }
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [connectionStatus, connectionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">
            Phone Connection
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {connectionStatus === 'disconnected' && (
            <>
              <p className="text-center text-muted-foreground">
                Enter the connection code from your PC or scan the QR code
              </p>
              
              <div className="space-y-3">
                <Label>Connection Code</Label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => connect(manualCode)}
                disabled={manualCode.length < 6}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Connect to PC
              </Button>
            </>
          )}

          {connectionStatus === 'connecting' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Connecting to PC...</p>
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="space-y-4">
              <div className="text-center py-6 bg-green-500/10 rounded-lg border border-green-500/30">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold text-green-600 text-lg">Connected to PC</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Waiting for call requests...
                </p>
              </div>

              <Badge variant="outline" className="w-full justify-center py-3">
                <Volume2 className="w-4 h-4 mr-2" />
                Microphone Ready
              </Badge>

              <Button 
                variant="destructive" 
                className="w-full"
                onClick={disconnect}
              >
                <Link2Off className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          )}

          {connectionStatus === 'in_call' && callInfo && (
            <div className="space-y-4">
              {/* Call Header */}
              <div className={cn(
                "text-center py-6 rounded-lg border",
                callInfo.type === 'outgoing' 
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-green-500/10 border-green-500/30"
              )}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-background flex items-center justify-center">
                  {callInfo.type === 'outgoing' ? (
                    <PhoneOutgoing className="w-8 h-8 text-blue-500" />
                  ) : (
                    <PhoneIncoming className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <Badge className="mb-2">
                  {callInfo.type === 'outgoing' ? 'Outgoing Call' : 'Incoming Call'}
                </Badge>
                <h3 className="font-semibold text-lg">{callInfo.customerName}</h3>
                <p className="text-muted-foreground font-mono">{callInfo.customerPhone}</p>
                <p className="text-2xl font-bold mt-3 font-mono">
                  {formatDuration(callDuration)}
                </p>
              </div>

              {/* Call Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "rounded-full h-14 w-14",
                    isMuted && "bg-destructive/10 text-destructive border-destructive"
                  )}
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (localStreamRef.current) {
                      localStreamRef.current.getAudioTracks().forEach(track => {
                        track.enabled = isMuted;
                      });
                    }
                  }}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  className="rounded-full h-16 w-16"
                  onClick={endCall}
                >
                  <PhoneOff className="w-7 h-7" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "rounded-full h-14 w-14",
                    isSpeakerOn && "bg-primary/10 text-primary border-primary"
                  )}
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                >
                  <Volume2 className="w-6 h-6" />
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Use your phone's dialer to make the actual call. Audio is being recorded.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PhoneConnect;

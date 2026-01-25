import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const useWebRTCViewer = (streamerId: string | null) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const viewerIdRef = useRef<string>(Math.random().toString(36).substring(7));

  // Connect to streamer
  const connect = useCallback(async () => {
    if (!streamerId) return;

    setIsConnecting(true);
    const viewerId = viewerIdRef.current;

    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log('Received remote track');
        const [stream] = event.streams;
        setRemoteStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsConnected(true);
        setIsConnecting(false);
      };

      // Handle ICE candidates
      const pendingCandidates: RTCIceCandidateInit[] = [];
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              streamerId,
              viewerId,
              candidate: event.candidate,
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Viewer connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsConnected(false);
          setIsConnecting(false);
        }
      };

      // Join signaling channel
      const channel = supabase.channel(`webrtc:${streamerId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.viewerId === viewerId && pcRef.current) {
            console.log('Received answer from streamer');
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            
            // Add any pending ICE candidates
            for (const candidate of pendingCandidates) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.viewerId === viewerId && payload.streamerId === streamerId) {
            if (pcRef.current?.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              pendingCandidates.push(payload.candidate);
            }
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Add transceiver for receiving video
            pc.addTransceiver('video', { direction: 'recvonly' });

            // Create and send offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channel.send({
              type: 'broadcast',
              event: 'offer',
              payload: {
                streamerId,
                viewerId,
                offer: pc.localDescription,
              },
            });

            console.log('Sent offer to streamer:', streamerId);
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error connecting to stream:', error);
      setIsConnecting(false);
    }
  }, [streamerId]);

  // Disconnect from streamer
  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setRemoteStream(null);
    setIsConnected(false);
    setIsConnecting(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup on unmount or streamer change
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    videoRef,
    remoteStream,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  };
};

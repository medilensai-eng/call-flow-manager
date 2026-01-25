import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface PeerConnection {
  viewerId: string;
  pc: RTCPeerConnection;
}

export const useWebRTCStreamer = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const peerConnectionsRef = useRef<PeerConnection[]>([]);
  const channelRef = useRef<any>(null);

  // Handle incoming viewer connection request
  const handleViewerOffer = useCallback(async (viewerId: string, offer: RTCSessionDescriptionInit) => {
    if (!localStream || !user) return;

    console.log('Received offer from viewer:', viewerId);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Add local tracks to peer connection
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            streamerId: user.id,
            viewerId,
            candidate: event.candidate,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Remove this peer connection
        peerConnectionsRef.current = peerConnectionsRef.current.filter(p => p.viewerId !== viewerId);
      }
    };

    // Set remote description and create answer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Store peer connection
    peerConnectionsRef.current.push({ viewerId, pc });

    // Send answer back to viewer
    channelRef.current?.send({
      type: 'broadcast',
      event: 'answer',
      payload: {
        streamerId: user.id,
        viewerId,
        answer: pc.localDescription,
      },
    });

    console.log('Sent answer to viewer:', viewerId);
  }, [localStream, user]);

  // Handle ICE candidate from viewer
  const handleViewerIceCandidate = useCallback(async (viewerId: string, candidate: RTCIceCandidateInit) => {
    const peerConnection = peerConnectionsRef.current.find(p => p.viewerId === viewerId);
    if (peerConnection) {
      await peerConnection.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  // Start streaming
  const startStreaming = useCallback(async () => {
    if (!user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });

      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Join signaling channel
      const channel = supabase.channel(`webrtc:${user.id}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'offer' }, ({ payload }) => {
          if (payload.streamerId === user.id) {
            handleViewerOffer(payload.viewerId, payload.offer);
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
          if (payload.streamerId === user.id && payload.viewerId) {
            handleViewerIceCandidate(payload.viewerId, payload.candidate);
          }
        })
        .subscribe();

      channelRef.current = channel;
      setIsStreaming(true);

      console.log('WebRTC streaming started for user:', user.id);
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  }, [user, handleViewerOffer, handleViewerIceCandidate]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    // Close all peer connections
    peerConnectionsRef.current.forEach(({ pc }) => pc.close());
    peerConnectionsRef.current = [];

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Leave signaling channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsStreaming(false);
    console.log('WebRTC streaming stopped');
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  return {
    videoRef,
    localStream,
    isStreaming,
    startStreaming,
    stopStreaming,
  };
};

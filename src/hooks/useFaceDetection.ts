import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const FACE_DETECTION_INTERVAL = 1000; // Check every 1 second
const NO_FACE_THRESHOLD = 10000; // 10 seconds

export const useFaceDetection = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const lastFaceSeenRef = useRef<number>(Date.now());
  const alertCreatedRef = useRef<boolean>(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        console.log('Face detection models loaded');
      } catch (error) {
        console.error('Error loading face detection models:', error);
      }
    };
    loadModels();
  }, []);

  // Update stream status in database
  const updateStreamStatus = useCallback(async (streaming: boolean, faceDetected: boolean) => {
    if (!user) return;
    
    try {
      const { data: existing } = await supabase
        .from('caller_streams')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase
          .from('caller_streams')
          .update({
            is_streaming: streaming,
            face_detected: faceDetected,
            last_seen_at: new Date().toISOString(),
            stream_started_at: streaming ? new Date().toISOString() : null,
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('caller_streams')
          .insert({
            user_id: user.id,
            is_streaming: streaming,
            face_detected: faceDetected,
            stream_started_at: streaming ? new Date().toISOString() : null,
          });
      }
    } catch (error) {
      console.error('Error updating stream status:', error);
    }
  }, [user]);

  // Create face alert
  const createFaceAlert = useCallback(async () => {
    if (!user || alertCreatedRef.current) return;
    
    alertCreatedRef.current = true;
    
    try {
      await supabase
        .from('face_alerts')
        .insert({
          user_id: user.id,
          alert_type: 'face_not_detected',
          is_active: true,
        });
      
      await updateStreamStatus(true, false);
      console.log('Face alert created');
    } catch (error) {
      console.error('Error creating face alert:', error);
    }
  }, [user, updateStreamStatus]);

  // Resolve face alert
  const resolveFaceAlert = useCallback(async () => {
    if (!user || !alertCreatedRef.current) return;
    
    alertCreatedRef.current = false;
    
    try {
      await supabase
        .from('face_alerts')
        .update({
          is_active: false,
          resolved_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      await updateStreamStatus(true, true);
      console.log('Face alert resolved');
    } catch (error) {
      console.error('Error resolving face alert:', error);
    }
  }, [user, updateStreamStatus]);

  // Face detection loop
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isModelLoaded) return;

    try {
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      );

      const hasFace = detections.length > 0;
      
      if (hasFace) {
        lastFaceSeenRef.current = Date.now();
        setFaceDetected(true);
        
        if (alertCreatedRef.current) {
          await resolveFaceAlert();
        }
      } else {
        const timeSinceLastFace = Date.now() - lastFaceSeenRef.current;
        
        if (timeSinceLastFace >= NO_FACE_THRESHOLD) {
          setFaceDetected(false);
          
          if (!alertCreatedRef.current) {
            await createFaceAlert();
          }
        }
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, [isModelLoaded, createFaceAlert, resolveFaceAlert]);

  // Start video stream
  const startStream = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setIsStreaming(true);
      lastFaceSeenRef.current = Date.now();
      alertCreatedRef.current = false;
      
      await updateStreamStatus(true, true);
      
      // Start detection loop
      detectionIntervalRef.current = setInterval(detectFace, FACE_DETECTION_INTERVAL);
      
      console.log('Video stream started');
    } catch (error) {
      console.error('Error starting video stream:', error);
    }
  }, [detectFace, updateStreamStatus]);

  // Stop video stream
  const stopStream = useCallback(async () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setFaceDetected(true);
    
    await updateStreamStatus(false, true);
    
    console.log('Video stream stopped');
  }, [stream, updateStreamStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    canvasRef,
    isModelLoaded,
    isStreaming,
    faceDetected,
    startStream,
    stopStream,
  };
};

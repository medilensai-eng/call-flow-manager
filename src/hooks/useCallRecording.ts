import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CallRecordingOptions {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  callType: 'incoming' | 'outgoing';
}

export const useCallRecording = () => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording from a MediaStream
  const startRecording = useCallback(async (
    stream: MediaStream,
    options: CallRecordingOptions
  ) => {
    if (!user) return null;

    try {
      // Create call recording record in database
      const { data: record, error } = await supabase
        .from('call_recordings')
        .insert({
          user_id: user.id,
          customer_id: options.customerId || null,
          customer_name: options.customerName,
          customer_phone: options.customerPhone,
          call_type: options.callType,
          call_status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create recording record:', error);
        return null;
      }

      setRecordingId(record.id);
      chunksRef.current = [];
      startTimeRef.current = new Date();

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Capture in 1-second chunks
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      return record.id;
    } catch (error) {
      console.error('Error starting recording:', error);
      return null;
    }
  }, [user]);

  // Stop recording and save
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !recordingId || !user) return;

    return new Promise<string | null>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        // Clear duration timer
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const fileName = `${user.id}/${recordingId}.webm`;

        try {
          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('call-recordings')
            .upload(fileName, blob);

          if (uploadError) {
            console.error('Failed to upload recording:', uploadError);
          }

          // Get public URL
          const { data: urlData } = supabase
            .storage
            .from('call-recordings')
            .getPublicUrl(fileName);

          const endTime = new Date();
          const durationSeconds = startTimeRef.current
            ? Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000)
            : 0;

          // Update recording record
          await supabase
            .from('call_recordings')
            .update({
              call_status: 'completed',
              duration_seconds: durationSeconds,
              recording_url: urlData?.publicUrl || null,
              recording_size_bytes: blob.size,
              ended_at: endTime.toISOString(),
            })
            .eq('id', recordingId);

          setIsRecording(false);
          setRecordingId(null);
          setDuration(0);
          chunksRef.current = [];
          mediaRecorderRef.current = null;

          resolve(recordingId);
        } catch (error) {
          console.error('Error saving recording:', error);
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [recordingId, user]);

  // Cancel recording without saving
  const cancelRecording = useCallback(async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (recordingId) {
      await supabase
        .from('call_recordings')
        .update({ call_status: 'cancelled' })
        .eq('id', recordingId);
    }

    setIsRecording(false);
    setRecordingId(null);
    setDuration(0);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }, [recordingId]);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};

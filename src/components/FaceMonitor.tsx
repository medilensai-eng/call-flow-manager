import React, { useEffect } from 'react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useWebRTCStreamer } from '@/hooks/useWebRTCStreamer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, AlertTriangle, CheckCircle2, Wifi } from 'lucide-react';

export const FaceMonitor: React.FC = () => {
  const {
    videoRef: faceVideoRef,
    isModelLoaded,
    isStreaming: isFaceStreaming,
    faceDetected,
    startStream: startFaceStream,
    stopStream: stopFaceStream,
  } = useFaceDetection();

  const {
    videoRef: webrtcVideoRef,
    isStreaming: isWebRTCStreaming,
    startStreaming: startWebRTC,
    stopStreaming: stopWebRTC,
  } = useWebRTCStreamer();

  // Sync video refs - use the same video element for both face detection and WebRTC
  const videoRef = faceVideoRef;

  const handleStartStream = async () => {
    await startFaceStream();
    await startWebRTC();
  };

  const handleStopStream = async () => {
    await stopFaceStream();
    stopWebRTC();
  };

  // Sync WebRTC video with face detection video
  useEffect(() => {
    if (webrtcVideoRef.current && faceVideoRef.current && faceVideoRef.current.srcObject) {
      // Share the same stream for WebRTC
    }
  }, [isFaceStreaming]);

  return (
    <Card className={`shadow-card transition-all duration-300 ${!faceDetected && isFaceStreaming ? 'ring-2 ring-destructive animate-pulse' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Video className="w-4 h-4" />
            Face Monitoring
          </CardTitle>
          <div className="flex items-center gap-2">
            {isWebRTCStreaming && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            )}
            {isFaceStreaming && (
              <Badge variant={faceDetected ? "default" : "destructive"} className="text-xs">
                {faceDetected ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Face Not Detected
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full aspect-video rounded-lg bg-muted object-cover ${!isFaceStreaming ? 'hidden' : ''}`}
          />
          
          {!isFaceStreaming && (
            <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <VideoOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Camera Off</p>
              </div>
            </div>
          )}

          {!faceDetected && isFaceStreaming && (
            <div className="absolute inset-0 bg-destructive/20 rounded-lg flex items-center justify-center">
              <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Please return to your seat!</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {!isFaceStreaming ? (
            <Button 
              onClick={handleStartStream} 
              disabled={!isModelLoaded}
              className="w-full"
            >
              <Video className="w-4 h-4 mr-2" />
              {isModelLoaded ? 'Start Camera' : 'Loading...'}
            </Button>
          ) : (
            <Button 
              onClick={handleStopStream} 
              variant="destructive"
              className="w-full"
            >
              <VideoOff className="w-4 h-4 mr-2" />
              Stop Camera
            </Button>
          )}
        </div>

        {!faceDetected && isFaceStreaming && (
          <p className="text-xs text-destructive mt-2 text-center">
            ⚠️ Alert sent to Admin/Co-Admin
          </p>
        )}
      </CardContent>
    </Card>
  );
};

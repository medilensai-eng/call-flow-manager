import React from 'react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const FaceMonitor: React.FC = () => {
  const {
    videoRef,
    isModelLoaded,
    isStreaming,
    faceDetected,
    startStream,
    stopStream,
  } = useFaceDetection();

  return (
    <Card className={`shadow-card transition-all duration-300 ${!faceDetected && isStreaming ? 'ring-2 ring-destructive animate-pulse' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Video className="w-4 h-4" />
            Face Monitoring
          </CardTitle>
          {isStreaming && (
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
      </CardHeader>
      <CardContent>
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full aspect-video rounded-lg bg-muted object-cover ${!isStreaming ? 'hidden' : ''}`}
          />
          
          {!isStreaming && (
            <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <VideoOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Camera Off</p>
              </div>
            </div>
          )}

          {!faceDetected && isStreaming && (
            <div className="absolute inset-0 bg-destructive/20 rounded-lg flex items-center justify-center">
              <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Please return to your seat!</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {!isStreaming ? (
            <Button 
              onClick={startStream} 
              disabled={!isModelLoaded}
              className="w-full"
            >
              <Video className="w-4 h-4 mr-2" />
              {isModelLoaded ? 'Start Camera' : 'Loading...'}
            </Button>
          ) : (
            <Button 
              onClick={stopStream} 
              variant="destructive"
              className="w-full"
            >
              <VideoOff className="w-4 h-4 mr-2" />
              Stop Camera
            </Button>
          )}
        </div>

        {!faceDetected && isStreaming && (
          <p className="text-xs text-destructive mt-2 text-center">
            ⚠️ Alert sent to Admin/Co-Admin
          </p>
        )}
      </CardContent>
    </Card>
  );
};

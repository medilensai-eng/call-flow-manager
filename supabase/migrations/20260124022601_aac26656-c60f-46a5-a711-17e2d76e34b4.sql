-- Create face_alerts table to track face detection alerts
CREATE TABLE public.face_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'face_not_detected',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.face_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all alerts
CREATE POLICY "Admins can manage all face alerts"
  ON public.face_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Co-admins can manage all alerts
CREATE POLICY "Co-admins can manage face alerts"
  ON public.face_alerts FOR ALL
  USING (has_role(auth.uid(), 'co_admin'::app_role));

-- Users can insert/update their own alerts
CREATE POLICY "Users can insert own alerts"
  ON public.face_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.face_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Create caller_streams table to track active video streams
CREATE TABLE public.caller_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_streaming BOOLEAN NOT NULL DEFAULT false,
  face_detected BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stream_started_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caller_streams ENABLE ROW LEVEL SECURITY;

-- Admins can view all streams
CREATE POLICY "Admins can view all streams"
  ON public.caller_streams FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Co-admins can view all streams
CREATE POLICY "Co-admins can view all streams"
  ON public.caller_streams FOR SELECT
  USING (has_role(auth.uid(), 'co_admin'::app_role));

-- Users can manage their own stream status
CREATE POLICY "Users can manage own stream"
  ON public.caller_streams FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.face_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.caller_streams;

-- Create trigger to update updated_at
CREATE TRIGGER update_caller_streams_updated_at
  BEFORE UPDATE ON public.caller_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
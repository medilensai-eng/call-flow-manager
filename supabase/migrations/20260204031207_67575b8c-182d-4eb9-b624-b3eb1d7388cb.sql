-- Create table for phone connections via QR
CREATE TABLE public.phone_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_code VARCHAR(8) NOT NULL UNIQUE,
  is_connected BOOLEAN DEFAULT false,
  phone_info JSONB DEFAULT '{}',
  connected_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_connections ENABLE ROW LEVEL SECURITY;

-- Policies for phone_connections
CREATE POLICY "Users can view their own phone connections"
ON public.phone_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own phone connections"
ON public.phone_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone connections"
ON public.phone_connections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone connections"
ON public.phone_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Create table for call recordings
CREATE TABLE public.call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customer_data(id),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('incoming', 'outgoing')),
  call_status VARCHAR(50) DEFAULT 'pending',
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  recording_size_bytes BIGINT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- Policies for call_recordings
CREATE POLICY "Users can view their own call recordings"
ON public.call_recordings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call recordings"
ON public.call_recordings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call recordings"
ON public.call_recordings
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all call recordings
CREATE POLICY "Admins can view all call recordings"
ON public.call_recordings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'co_admin')
  )
);

-- Enable realtime for phone_connections
ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_connections;

-- Create storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('call-recordings', 'call-recordings', false);

-- Storage policies for call recordings
CREATE POLICY "Users can upload their own recordings"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'call-recordings' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'co_admin')
  )
);
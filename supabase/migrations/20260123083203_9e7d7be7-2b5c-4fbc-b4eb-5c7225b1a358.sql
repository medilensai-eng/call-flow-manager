-- Add new columns to profiles table for KYC
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pan_number text,
ADD COLUMN IF NOT EXISTS photo_url text;

-- Create salary_settings table for rate per call (different rates for different call types)
CREATE TABLE public.salary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  call_type text NOT NULL, -- 'all_calls', 'call_connected', 'interested', 'not_interested', etc.
  rate_per_call numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(user_id, call_type)
);

-- Enable RLS
ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for salary_settings
CREATE POLICY "Admins can manage all salary settings"
ON public.salary_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Co-admins can manage salary settings"
ON public.salary_settings
FOR ALL
USING (has_role(auth.uid(), 'co_admin'::app_role));

CREATE POLICY "Users can view own salary settings"
ON public.salary_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Create salary_records table for tracking generated salaries
CREATE TABLE public.salary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  total_calls integer NOT NULL DEFAULT 0,
  call_breakdown jsonb NOT NULL DEFAULT '{}',
  total_amount numeric NOT NULL DEFAULT 0,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  generated_by uuid,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'paid')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for salary_records
CREATE POLICY "Admins can manage all salary records"
ON public.salary_records
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Co-admins can manage salary records"
ON public.salary_records
FOR ALL
USING (has_role(auth.uid(), 'co_admin'::app_role));

CREATE POLICY "Users can view own salary records"
ON public.salary_records
FOR SELECT
USING (auth.uid() = user_id);

-- Update trigger for salary_settings
CREATE TRIGGER update_salary_settings_updated_at
BEFORE UPDATE ON public.salary_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

-- Storage policies for profile photos
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Admins can upload profile photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Co-admins can upload profile photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos' AND has_role(auth.uid(), 'co_admin'::app_role));

CREATE POLICY "Admins can update profile photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Co-admins can update profile photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-photos' AND has_role(auth.uid(), 'co_admin'::app_role));

CREATE POLICY "Admins can delete profile photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Co-admins can delete profile photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-photos' AND has_role(auth.uid(), 'co_admin'::app_role));
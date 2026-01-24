-- Add bank_name and ifsc_code columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN bank_name TEXT,
ADD COLUMN ifsc_code TEXT;
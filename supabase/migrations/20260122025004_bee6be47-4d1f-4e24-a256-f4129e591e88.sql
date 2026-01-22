-- Add qualification column to customer_data table
ALTER TABLE public.customer_data 
ADD COLUMN IF NOT EXISTS qualification text;
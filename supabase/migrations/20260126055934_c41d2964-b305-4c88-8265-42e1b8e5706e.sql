-- Allow admins to delete session logs (needed for reset data functionality)
CREATE POLICY "Admins can delete session logs"
ON public.session_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow co-admins to delete session logs they need to manage
CREATE POLICY "Co-admins can delete session logs"
ON public.session_logs
FOR DELETE
USING (has_role(auth.uid(), 'co_admin'::app_role));
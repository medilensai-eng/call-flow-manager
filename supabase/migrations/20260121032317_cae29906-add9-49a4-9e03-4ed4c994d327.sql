-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'co_admin', 'customer_caller');

-- Create call status enum
CREATE TYPE public.call_status AS ENUM (
  'pending',
  'call_not_received',
  'call_disconnected',
  'invalid_number',
  'no_network',
  'call_connected',
  'interested',
  'not_interested'
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  aadhaar_number TEXT,
  bank_account_number TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'customer_caller',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Customer data table (data assigned to callers)
CREATE TABLE public.customer_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  course TEXT,
  fee DECIMAL(10,2),
  call_status call_status DEFAULT 'pending' NOT NULL,
  remark TEXT,
  last_called_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Session tracking table
CREATE TABLE public.session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  logout_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  ip_address TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Generate employee ID function
CREATE OR REPLACE FUNCTION public.generate_employee_id(role_type app_role)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
  new_id TEXT;
BEGIN
  CASE role_type
    WHEN 'admin' THEN prefix := 'ADM';
    WHEN 'co_admin' THEN prefix := 'COA';
    WHEN 'customer_caller' THEN prefix := 'CAL';
  END CASE;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM 4) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.profiles
  WHERE employee_id LIKE prefix || '%';
  
  new_id := prefix || LPAD(seq_num::TEXT, 5, '0');
  RETURN new_id;
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_data_updated_at
  BEFORE UPDATE ON public.customer_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Co-admins can view caller profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'co_admin') AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = profiles.user_id
      AND ur.role = 'customer_caller'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Co-admins can create caller profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'co_admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Co-admins can view caller roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'co_admin') AND role = 'customer_caller');

CREATE POLICY "Co-admins can create caller roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'co_admin') AND role = 'customer_caller');

-- RLS Policies for customer_data
CREATE POLICY "Callers can view assigned data"
  ON public.customer_data FOR SELECT
  USING (auth.uid() = assigned_to);

CREATE POLICY "Callers can update assigned data"
  ON public.customer_data FOR UPDATE
  USING (auth.uid() = assigned_to);

CREATE POLICY "Admins can manage all customer data"
  ON public.customer_data FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Co-admins can manage customer data"
  ON public.customer_data FOR ALL
  USING (public.has_role(auth.uid(), 'co_admin'));

-- RLS Policies for session_logs
CREATE POLICY "Users can view own sessions"
  ON public.session_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.session_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.session_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.session_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
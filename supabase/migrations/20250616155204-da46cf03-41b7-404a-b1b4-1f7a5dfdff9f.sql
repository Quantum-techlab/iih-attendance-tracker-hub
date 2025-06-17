-- =====================
-- Supabase SQL Schema for Intern Management System
-- =====================

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  intern_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'intern' CHECK (role IN ('intern', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ATTENDANCE RECORDS TABLE
CREATE TABLE public.attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sign_in_time TIMESTAMP WITH TIME ZONE,
  sign_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sign_in_time::DATE)
);

-- 3. PENDING SIGN-INS TABLE
CREATE TABLE public.pending_sign_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sign_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sign_in_time::DATE)
);

-- 4. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_sign_ins ENABLE ROW LEVEL SECURITY;

-- 5. SECURITY DEFINER FUNCTION TO GET USER ROLE
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 6. RLS POLICIES FOR PROFILES
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

-- 7. RLS POLICIES FOR ATTENDANCE RECORDS
CREATE POLICY "Users can view their own attendance" ON public.attendance_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all attendance records" ON public.attendance_records
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert attendance records" ON public.attendance_records
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all attendance records" ON public.attendance_records
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

-- 8. RLS POLICIES FOR PENDING SIGN-INS
CREATE POLICY "Interns can insert their own pending sign-ins" ON public.pending_sign_ins
  FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Interns can view their own pending sign-ins" ON public.pending_sign_ins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all pending sign-ins" ON public.pending_sign_ins
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all pending sign-ins" ON public.pending_sign_ins
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete pending sign-ins" ON public.pending_sign_ins
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- 9. TRIGGERS FOR AUTOMATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, intern_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'intern_id', 'TEMP_' || NEW.id::TEXT),
    'intern'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pending_sign_ins_updated_at
  BEFORE UPDATE ON public.pending_sign_ins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. VIEW FOR MISSED DAYS
CREATE VIEW public.missed_days AS
WITH working_days AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  )::DATE AS date
  WHERE EXTRACT(DOW FROM generate_series) IN (1, 2, 3, 4, 5)
),
interns AS (
  SELECT id FROM public.profiles WHERE role = 'intern'
)
SELECT 
  i.id AS user_id,
  w.date AS missed_date
FROM interns i
CROSS JOIN working_days w
LEFT JOIN public.attendance_records ar
  ON ar.user_id = i.id AND ar.sign_in_time::DATE = w.date
WHERE ar.id IS NULL
  AND w.date < CURRENT_DATE;

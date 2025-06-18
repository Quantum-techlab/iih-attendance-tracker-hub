/*
  # Create pending sign-ins table for approval workflow

  1. New Tables
    - `pending_sign_ins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `sign_in_time` (timestamptz)
      - `sign_out_time` (timestamptz, nullable)
      - `status` (text, default 'pending')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `pending_sign_ins` table
    - Add policies for interns to insert/view their own requests
    - Add policies for admins to view/update all requests

  3. Changes
    - Update attendance_records table structure
    - Add updated_at trigger for pending_sign_ins
*/

-- Create pending_sign_ins table
CREATE TABLE IF NOT EXISTS public.pending_sign_ins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sign_in_time timestamptz NOT NULL,
  sign_out_time timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update attendance_records table to remove date column and use timestamptz
DO $$
BEGIN
  -- Drop the old unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_records_user_id_date_key' 
    AND table_name = 'attendance_records'
  ) THEN
    ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_user_id_date_key;
  END IF;

  -- Remove date column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'date'
  ) THEN
    ALTER TABLE public.attendance_records DROP COLUMN date;
  END IF;

  -- Remove status column if it exists (not needed in final approved records)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.attendance_records DROP COLUMN status;
  END IF;

  -- Ensure sign_in_time is not null and is timestamptz
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'sign_in_time'
  ) THEN
    ALTER TABLE public.attendance_records ALTER COLUMN sign_in_time SET NOT NULL;
  END IF;
END $$;

-- Enable RLS on pending_sign_ins
ALTER TABLE public.pending_sign_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_sign_ins
CREATE POLICY "Interns can insert their own pending sign-ins" ON public.pending_sign_ins
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Interns can view their own pending sign-ins" ON public.pending_sign_ins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all pending sign-ins" ON public.pending_sign_ins
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all pending sign-ins" ON public.pending_sign_ins
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete pending sign-ins" ON public.pending_sign_ins
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- Update RLS policies for attendance_records to allow admin inserts
DROP POLICY IF EXISTS "Admins can insert attendance records" ON public.attendance_records;
CREATE POLICY "Admins can insert attendance records" ON public.attendance_records
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

-- Add updated_at trigger for pending_sign_ins
CREATE TRIGGER update_pending_sign_ins_updated_at
  BEFORE UPDATE ON public.pending_sign_ins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update the user creation trigger to handle role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, intern_id, role, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'intern_id',
    COALESCE(NEW.raw_user_meta_data->>'role', 'intern'),
    NEW.raw_user_meta_data->>'phone_number'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  signInTime: string | null;
  signOutTime: string | null;
  status: 'present' | 'absent' | 'partial';
}

interface AttendanceContextType {
  records: AttendanceRecord[];
  signIn: (userId: string) => Promise<boolean>;
  signOut: (userId: string) => Promise<boolean>;
  getTodayRecord: (userId: string) => AttendanceRecord | null;
  getUserRecords: (userId: string) => AttendanceRecord[];
  getMissedDays: (userId: string) => string[];
  getAllRecords: () => AttendanceRecord[];
  refreshRecords: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | null>(null);

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const { user } = useAuth();

  const isWeekday = (date: Date) => {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Lagos'
    });
  };

  const refreshRecords = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching attendance records:', error);
      return;
    }

    const formattedRecords: AttendanceRecord[] = data.map(record => ({
      id: record.id,
      userId: record.user_id,
      date: record.date,
      signInTime: record.sign_in_time,
      signOutTime: record.sign_out_time,
      status: record.status as 'present' | 'absent' | 'partial'
    }));

    setRecords(formattedRecords);
  };

  useEffect(() => {
    if (user) {
      refreshRecords();
    }
  }, [user]);

  const signIn = async (userId: string): Promise<boolean> => {
    const today = new Date();
    if (!isWeekday(today)) return false;

    const todayStr = formatDate(today);
    const timeStr = formatTime(today);
    
    const existingRecord = records.find(r => r.userId === userId && r.date === todayStr);

    if (existingRecord && existingRecord.signInTime) {
      return false; // Already signed in today
    }

    try {
      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('attendance_records')
          .update({
            sign_in_time: timeStr,
            status: 'partial'
          })
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('attendance_records')
          .insert({
            user_id: userId,
            date: todayStr,
            sign_in_time: timeStr,
            status: 'partial'
          });

        if (error) throw error;
      }

      await refreshRecords();
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
      return false;
    }
  };

  const signOut = async (userId: string): Promise<boolean> => {
    const today = new Date();
    if (!isWeekday(today)) return false;

    const todayStr = formatDate(today);
    const timeStr = formatTime(today);
    
    const existingRecord = records.find(r => r.userId === userId && r.date === todayStr);

    if (!existingRecord || !existingRecord.signInTime || existingRecord.signOutTime) {
      return false; // Must sign in first or already signed out
    }

    try {
      const { error } = await supabase
        .from('attendance_records')
        .update({
          sign_out_time: timeStr,
          status: 'present'
        })
        .eq('id', existingRecord.id);

      if (error) throw error;

      await refreshRecords();
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  };

  const getTodayRecord = (userId: string): AttendanceRecord | null => {
    const todayStr = formatDate(new Date());
    return records.find(r => r.userId === userId && r.date === todayStr) || null;
  };

  const getUserRecords = (userId: string): AttendanceRecord[] => {
    return records
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getMissedDays = (userId: string): string[] => {
    const userRecords = getUserRecords(userId);
    const missedDays: string[] = [];
    
    // Check last 30 weekdays for missed attendance
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      if (isWeekday(checkDate)) {
        const dateStr = formatDate(checkDate);
        const record = userRecords.find(r => r.date === dateStr);
        
        if (!record || !record.signInTime) {
          missedDays.push(dateStr);
        }
      }
    }
    
    return missedDays;
  };

  const getAllRecords = (): AttendanceRecord[] => {
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <AttendanceContext.Provider value={{
      records,
      signIn,
      signOut,
      getTodayRecord,
      getUserRecords,
      getMissedDays,
      getAllRecords,
      refreshRecords
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};

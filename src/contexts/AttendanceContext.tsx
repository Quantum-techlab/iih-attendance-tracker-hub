
import React, { createContext, useContext, useState, useEffect } from 'react';

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
  signIn: (userId: string) => boolean;
  signOut: (userId: string) => boolean;
  getTodayRecord: (userId: string) => AttendanceRecord | null;
  getUserRecords: (userId: string) => AttendanceRecord[];
  getMissedDays: (userId: string) => string[];
  getAllRecords: () => AttendanceRecord[];
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
      hour12: true,
      timeZone: 'Africa/Lagos'
    });
  };

  useEffect(() => {
    const storedRecords = localStorage.getItem('attendanceRecords');
    if (storedRecords) {
      setRecords(JSON.parse(storedRecords));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('attendanceRecords', JSON.stringify(records));
  }, [records]);

  const signIn = (userId: string): boolean => {
    const today = new Date();
    if (!isWeekday(today)) return false;

    const todayStr = formatDate(today);
    const existingRecord = records.find(r => r.userId === userId && r.date === todayStr);

    if (existingRecord && existingRecord.signInTime) {
      return false; // Already signed in today
    }

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      userId,
      date: todayStr,
      signInTime: formatTime(today),
      signOutTime: null,
      status: 'partial'
    };

    if (existingRecord) {
      setRecords(prev => prev.map(r => 
        r.id === existingRecord.id 
          ? { ...r, signInTime: newRecord.signInTime, status: 'partial' }
          : r
      ));
    } else {
      setRecords(prev => [...prev, newRecord]);
    }

    return true;
  };

  const signOut = (userId: string): boolean => {
    const today = new Date();
    if (!isWeekday(today)) return false;

    const todayStr = formatDate(today);
    const existingRecord = records.find(r => r.userId === userId && r.date === todayStr);

    if (!existingRecord || !existingRecord.signInTime) {
      return false; // Must sign in first
    }

    if (existingRecord.signOutTime) {
      return false; // Already signed out
    }

    setRecords(prev => prev.map(r => 
      r.id === existingRecord.id 
        ? { ...r, signOutTime: formatTime(today), status: 'present' }
        : r
    ));

    return true;
  };

  const getTodayRecord = (userId: string): AttendanceRecord | null => {
    const todayStr = formatDate(new Date());
    return records.find(r => r.userId === userId && r.date === todayStr) || null;
  };

  const getUserRecords = (userId: string): AttendanceRecord[] => {
    return records.filter(r => r.userId === userId).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
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
      getAllRecords
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};

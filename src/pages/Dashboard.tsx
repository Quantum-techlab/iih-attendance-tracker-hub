
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, AlertTriangle, CheckCircle, User, Phone, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todayRecord, setTodayRecord] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [userRecords, setUserRecords] = useState([]);
  const [missedDays, setMissedDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const isWeekday = today.getDay() >= 1 && today.getDay() <= 5;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      console.log('Fetching data for user:', user.id);

      try {
        // Get today's date in YYYY-MM-DD format
        const todayDate = today.toISOString().split('T')[0];
        
        // Fetch today's attendance record
        const { data: recordData, error: recordError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', todayDate)
          .maybeSingle();
        
        if (recordError) {
          console.error('Error fetching today record:', recordError);
          toast({ title: "Error", description: recordError.message, variant: "destructive" });
        } else {
          console.log('Today record:', recordData);
          setTodayRecord(recordData);
        }

        // Fetch recent attendance records (last 10)
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(10);
        
        if (recordsError) {
          console.error('Error fetching records:', recordsError);
          toast({ title: "Error", description: recordsError.message, variant: "destructive" });
        } else {
          console.log('User records:', recordsData);
          setUserRecords(recordsData || []);
        }

        // Calculate missed days (last 30 weekdays without attendance)
        const missedDaysData = [];
        for (let i = 1; i <= 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          
          if (checkDate.getDay() >= 1 && checkDate.getDay() <= 5) { // Weekday
            const checkDateStr = checkDate.toISOString().split('T')[0];
            const hasRecord = recordsData?.find(r => r.date === checkDateStr && r.sign_in_time);
            
            if (!hasRecord) {
              missedDaysData.push(checkDateStr);
            }
          }
        }
        setMissedDays(missedDaysData);

      } catch (error) {
        console.error('Error in fetchData:', error);
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      }

      setLoading(false);
    };

    fetchData();
  }, [user, toast]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSignIn = async () => {
    if (todayRecord) {
      toast({
        title: "Already signed in",
        description: "You have already signed in today.",
        variant: "destructive",
      });
      return;
    }

    const todayDate = today.toISOString().split('T')[0];
    const currentTime = today.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

    console.log('Attempting sign in for date:', todayDate, 'time:', currentTime);

    const { data, error } = await supabase.from('attendance_records').insert({
      user_id: user.id,
      date: todayDate,
      sign_in_time: currentTime,
      status: 'partial'
    }).select().single();

    if (error) {
      console.error('Sign-in error:', error);
      toast({
        title: "Sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log('Sign-in successful:', data);
      setTodayRecord(data);
      toast({
        title: "Signed in successfully!",
        description: "Welcome to work today!",
      });
    }
  };

  const handleSignOut = async () => {
    if (!todayRecord || !todayRecord.sign_in_time || todayRecord.sign_out_time) {
      toast({
        title: "Sign-out failed",
        description: "You must sign in first, or you've already signed out.",
        variant: "destructive",
      });
      return;
    }

    const currentTime = today.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

    console.log('Attempting sign out at time:', currentTime);

    const { data, error } = await supabase
      .from('attendance_records')
      .update({ 
        sign_out_time: currentTime,
        status: 'present'
      })
      .eq('id', todayRecord.id)
      .select()
      .single();

    if (error) {
      console.error('Sign-out error:', error);
      toast({
        title: "Sign-out failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log('Sign-out successful:', data);
      setTodayRecord(data);
      toast({
        title: "Signed out successfully!",
        description: "Have a great rest of your day!",
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr;
  };

  const getStatusBadge = (record) => {
    if (record.sign_in_time && record.sign_out_time) {
      return <Badge className="bg-green-100 text-green-800">Present</Badge>;
    } else if (record.sign_in_time) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-2">Track your attendance and manage your internship progress</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your data...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profile Information</CardTitle>
                  <User className="h-4 w-4 ml-auto text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone_number && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{user.phone_number}</span>
                      </div>
                    )}
                    {user.intern_id && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{user.intern_id}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
                  <Clock className="h-4 w-4 ml-auto text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {todayRecord ? (
                      <>
                        {todayRecord.sign_in_time && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Signed in at {formatTime(todayRecord.sign_in_time)}</span>
                          </div>
                        )}
                        {todayRecord.sign_out_time && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Signed out at {formatTime(todayRecord.sign_out_time)}</span>
                          </div>
                        )}
                        {getStatusBadge(todayRecord)}
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {isWeekday ? 'Not signed in today' : 'Weekend - No attendance required'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Missed Days</CardTitle>
                  <AlertTriangle className="h-4 w-4 ml-auto text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{missedDays.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {missedDays.length === 0 ? 'Perfect attendance!' : 'Days missed this period'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {isWeekday && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Today's Attendance</CardTitle>
                  <CardDescription>
                    Sign in when you arrive and sign out when you leave
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button
                      onClick={handleSignIn}
                      disabled={!!todayRecord}
                      className="flex-1"
                    >
                      {todayRecord ? 'Signed In' : 'Sign In'}
                    </Button>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      disabled={!todayRecord || !!todayRecord?.sign_out_time}
                      className="flex-1"
                    >
                      {todayRecord?.sign_out_time ? 'Signed Out' : 'Sign Out'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {missedDays.length > 0 && (
              <Alert className="mb-8 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  You have {missedDays.length} missed day{missedDays.length > 1 ? 's' : ''}.{' '}
                  {missedDays.length >= 3 && 'Please ensure regular attendance to maintain good standing.'}
                  <div className="mt-2 text-sm">
                    Missed dates: {missedDays.slice(0, 5).map(date => formatDate(date)).join(', ')}
                    {missedDays.length > 5 && ` and ${missedDays.length - 5} more...`}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance History</CardTitle>
                <CardDescription>Your last 10 attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {userRecords.length > 0 ? (
                  <div className="space-y-4">
                    {userRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{formatDate(record.date)}</div>
                          <div className="text-sm text-gray-600">
                            {record.sign_in_time && `In: ${formatTime(record.sign_in_time)}`}
                            {record.sign_in_time && record.sign_out_time && ' • '}
                            {record.sign_out_time && `Out: ${formatTime(record.sign_out_time)}`}
                            {!record.sign_in_time && 'No sign-in recorded'}
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(record)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No attendance records yet</p>
                    <p className="text-sm">Start by signing in today!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

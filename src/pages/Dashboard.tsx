import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, AlertTriangle, CheckCircle, User, Phone, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

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

      // Fetch today's attendance record
      const todayDate = today.toLocaleDateString('en-US', { timeZone: 'Africa/Lagos' });
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      const { data: recordData, error: recordError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('sign_in_time', todayStart)
        .lte('sign_in_time', todayEnd)
        .single();
      if (recordError && recordError.code !== 'PGRST116') { // Ignore "no rows" error
        toast({ title: "Error", description: recordError.message, variant: "destructive" });
      }
      setTodayRecord(recordData);

      // Fetch today's pending sign-in request
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_sign_ins')
        .select('*')
        .eq('user_id', user.id)
        .gte('sign_in_time', todayStart)
        .lte('sign_in_time', todayEnd)
        .single();
      if (pendingError && pendingError.code !== 'PGRST116') {
        toast({ title: "Error", description: pendingError.message, variant: "destructive" });
      }
      setPendingRequest(pendingData);

      // Fetch recent attendance records (last 10)
      const { data: recordsData, error: recordsError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .order('sign_in_time', { ascending: false })
        .limit(10);
      if (recordsError) {
        toast({ title: "Error", description: recordsError.message, variant: "destructive" });
      }
      setUserRecords(recordsData || []);

      // Fetch missed days
      const { data: missedDaysData, error: missedDaysError } = await supabase
        .from('missed_days')
        .select('missed_date')
        .eq('user_id', user.id);
      if (missedDaysError) {
        toast({ title: "Error", description: missedDaysError.message, variant: "destructive" });
      }
      setMissedDays(missedDaysData?.map(d => d.missed_date) || []);

      setLoading(false);
    };

    fetchData();

    // Subscribe to pending_sign_ins changes for real-time updates
    const subscription = supabase
      .channel('pending_sign_ins_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_sign_ins', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setPendingRequest(payload.new);
          if (payload.new.status === 'approved') {
            setTodayRecord({ user_id: user.id, sign_in_time: payload.new.sign_in_time });
            setPendingRequest(null);
          } else if (payload.new.status === 'rejected') {
            setPendingRequest(null);
          }
        } else if (payload.eventType === 'DELETE') {
          setPendingRequest(null);
        }
      })
      .subscribe();

    // Subscribe to attendance_records for sign-out updates
    const recordSubscription = supabase
      .channel('attendance_records_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'attendance_records', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (new Date(payload.new.sign_in_time).toLocaleDateString('en-US', { timeZone: 'Africa/Lagos' }) === todayDate) {
          setTodayRecord(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(recordSubscription);
    };
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
    if (pendingRequest || todayRecord) {
      toast({
        title: "Sign-in failed",
        description: "You have already submitted a sign-in request or signed in today.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from('pending_sign_ins').insert({
      user_id: user.id,
      sign_in_time: new Date().toISOString(),
    });

    if (error) {
      toast({
        title: "Sign-in request failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sign-in request submitted!",
        description: "Awaiting admin approval.",
      });
    }
  };

  const handleSignOut = async () => {
    if (!todayRecord || todayRecord.sign_out_time) {
      toast({
        title: "Sign-out failed",
        description: "You must sign in and have admin approval first, or you’ve already signed out.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('attendance_records')
      .update({ sign_out_time: new Date().toISOString() })
      .eq('id', todayRecord.id);

    if (error) {
      toast({
        title: "Sign-out failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTodayRecord({ ...todayRecord, sign_out_time: new Date().toISOString() });
      toast({
        title: "Signed out successfully!",
        description: "Have a great rest of your day!",
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      timeZone: 'Africa/Lagos',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      timeZone: 'Africa/Lagos',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                    {pendingRequest ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
                        <span className="text-sm">
                          Sign-in request at {formatTime(pendingRequest.sign_in_time)} ({pendingRequest.status})
                        </span>
                      </div>
                    ) : todayRecord ? (
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
                    Request sign-in when you arrive and sign out when you leave
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button
                      onClick={handleSignIn}
                      disabled={!!pendingRequest || !!todayRecord}
                      className="flex-1"
                    >
                      {pendingRequest ? `Request ${pendingRequest.status.charAt(0).toUpperCase() + pendingRequest.status.slice(1)}` : todayRecord ? 'Signed In' : 'Request Sign-In'}
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
                          <div className="font-medium">{formatDate(record.sign_in_time)}</div>
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
                    <p className="text-sm">Start by requesting a sign-in today!</p>
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

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, AlertTriangle, CheckCircle, User, Phone, Mail, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingSignIns, setPendingSignIns] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const isWeekday = today.getDay() >= 1 && today.getDay() <= 5;
  const todayDate = today.toISOString().split('T')[0];

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      console.log('Fetching data for user:', user.id);

      try {
        // Fetch pending sign-ins for today
        const { data: pendingData, error: pendingError } = await supabase
          .from('pending_sign_ins')
          .select('*')
          .eq('user_id', user.id)
          .eq('sign_in_time::date', todayDate);
        
        if (pendingError) {
          console.error('Error fetching pending sign-ins:', pendingError);
          toast({ title: "Error", description: pendingError.message, variant: "destructive" });
        } else {
          console.log('Pending sign-ins:', pendingData);
          setPendingSignIns(pendingData || []);
        }

        // Fetch approved attendance records (last 10)
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('user_id', user.id)
          .order('sign_in_time', { ascending: false })
          .limit(10);
        
        if (recordsError) {
          console.error('Error fetching records:', recordsError);
          toast({ title: "Error", description: recordsError.message, variant: "destructive" });
        } else {
          console.log('Attendance records:', recordsData);
          setAttendanceRecords(recordsData || []);
        }

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

  const handleSignInRequest = async () => {
    const todayPending = pendingSignIns.find(p => 
      new Date(p.sign_in_time).toDateString() === today.toDateString() && !p.sign_out_time
    );

    if (todayPending) {
      toast({
        title: "Sign-in request already submitted",
        description: "You have already submitted a sign-in request for today.",
        variant: "destructive",
      });
      return;
    }

    const currentTime = new Date().toISOString();

    console.log('Submitting sign-in request for time:', currentTime);

    const { data, error } = await supabase.from('pending_sign_ins').insert({
      user_id: user.id,
      sign_in_time: currentTime,
      status: 'pending'
    }).select().single();

    if (error) {
      console.error('Sign-in request error:', error);
      toast({
        title: "Sign-in request failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log('Sign-in request successful:', data);
      setPendingSignIns([...pendingSignIns, data]);
      toast({
        title: "Sign-in request submitted!",
        description: "Your sign-in request is pending admin approval.",
      });
    }
  };

  const handleSignOutRequest = async () => {
    const todayPending = pendingSignIns.find(p => 
      new Date(p.sign_in_time).toDateString() === today.toDateString() && 
      p.sign_in_time && !p.sign_out_time
    );

    if (!todayPending) {
      toast({
        title: "Sign-out request failed",
        description: "You must submit a sign-in request first.",
        variant: "destructive",
      });
      return;
    }

    const currentTime = new Date().toISOString();

    console.log('Submitting sign-out request for time:', currentTime);

    const { data, error } = await supabase
      .from('pending_sign_ins')
      .update({ 
        sign_out_time: currentTime
      })
      .eq('id', todayPending.id)
      .select()
      .single();

    if (error) {
      console.error('Sign-out request error:', error);
      toast({
        title: "Sign-out request failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log('Sign-out request successful:', data);
      setPendingSignIns(pendingSignIns.map(p => p.id === data.id ? data : p));
      toast({
        title: "Sign-out request submitted!",
        description: "Your sign-out request is pending admin approval.",
      });
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    return new Date(dateTimeStr).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const todayPending = pendingSignIns.find(p => 
    new Date(p.sign_in_time).toDateString() === today.toDateString()
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-2">Submit attendance requests and track your progress</p>
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
                    {todayPending ? (
                      <>
                        {todayPending.sign_in_time && (
                          <div className="flex items-center space-x-2">
                            <Send className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Sign-in requested</span>
                          </div>
                        )}
                        {todayPending.sign_out_time && (
                          <div className="flex items-center space-x-2">
                            <Send className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Sign-out requested</span>
                          </div>
                        )}
                        {getStatusBadge(todayPending.status)}
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {isWeekday ? 'No requests submitted today' : 'Weekend - No attendance required'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Records</CardTitle>
                  <CheckCircle className="h-4 w-4 ml-auto text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{attendanceRecords.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total approved attendance records
                  </p>
                </CardContent>
              </Card>
            </div>

            {isWeekday && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Today's Attendance Requests</CardTitle>
                  <CardDescription>
                    Submit sign-in and sign-out requests for admin approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button
                      onClick={handleSignInRequest}
                      disabled={!!todayPending}
                      className="flex-1"
                    >
                      {todayPending ? 'Sign-In Requested' : 'Request Sign-In'}
                    </Button>
                    <Button
                      onClick={handleSignOutRequest}
                      variant="outline"
                      disabled={!todayPending || !!todayPending?.sign_out_time}
                      className="flex-1"
                    >
                      {todayPending?.sign_out_time ? 'Sign-Out Requested' : 'Request Sign-Out'}
                    </Button>
                  </div>
                  {todayPending && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Today's Request Status</p>
                          <p className="text-xs text-gray-600">
                            Submitted: {formatDateTime(todayPending.sign_in_time)}
                            {todayPending.sign_out_time && ` - ${formatDateTime(todayPending.sign_out_time)}`}
                          </p>
                        </div>
                        {getStatusBadge(todayPending.status)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Approved Attendance History</CardTitle>
                <CardDescription>Your approved attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceRecords.length > 0 ? (
                  <div className="space-y-4">
                    {attendanceRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{formatDateTime(record.sign_in_time)}</div>
                          <div className="text-sm text-gray-600">
                            {record.sign_in_time && `In: ${formatDateTime(record.sign_in_time)}`}
                            {record.sign_in_time && record.sign_out_time && ' • '}
                            {record.sign_out_time && `Out: ${formatDateTime(record.sign_out_time)}`}
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Approved</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No approved attendance records yet</p>
                    <p className="text-sm">Submit your first attendance request!</p>
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
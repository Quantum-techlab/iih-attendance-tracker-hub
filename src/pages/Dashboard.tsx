
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/contexts/AttendanceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, AlertTriangle, CheckCircle, User, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { signIn, signOut, getTodayRecord, getUserRecords, getMissedDays } = useAttendance();
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const todayRecord = getTodayRecord(user.id);
  const userRecords = getUserRecords(user.id).slice(0, 10); // Last 10 records
  const missedDays = getMissedDays(user.id);
  const today = new Date();
  const isWeekday = today.getDay() >= 1 && today.getDay() <= 5;

  const handleSignIn = async () => {
    const success = await signIn(user.id);
    if (success) {
      toast({
        title: "Signed in successfully!",
        description: `Welcome to work, ${user.name}!`,
      });
    } else {
      toast({
        title: "Sign-in failed",
        description: "You may have already signed in today or it's not a weekday.",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    const success = await signOut(user.id);
    if (success) {
      toast({
        title: "Signed out successfully!",
        description: "Have a great rest of your day!",
      });
    } else {
      toast({
        title: "Sign-out failed",
        description: "You must sign in first or you may have already signed out.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (record: any) => {
    if (record.status === 'present') {
      return <Badge className="bg-green-100 text-green-800">Present</Badge>;
    } else if (record.status === 'partial') {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-2">Track your attendance and manage your internship progress</p>
        </div>

        {/* Profile Overview */}
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
                    {todayRecord.signInTime && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Signed in at {todayRecord.signInTime}</span>
                      </div>
                    )}
                    {todayRecord.signOutTime && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Signed out at {todayRecord.signOutTime}</span>
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

        {/* Attendance Actions */}
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
                  disabled={todayRecord?.signInTime !== null}
                  className="flex-1"
                >
                  {todayRecord?.signInTime ? 'Already Signed In' : 'Sign In'}
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  disabled={!todayRecord?.signInTime || todayRecord?.signOutTime !== null}
                  className="flex-1"
                >
                  {todayRecord?.signOutTime ? 'Already Signed Out' : 'Sign Out'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missed Days Alert */}
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

        {/* Recent Attendance History */}
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
                        {record.signInTime && `In: ${record.signInTime}`}
                        {record.signInTime && record.signOutTime && ' • '}
                        {record.signOutTime && `Out: ${record.signOutTime}`}
                        {!record.signInTime && 'No sign-in recorded'}
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
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Calendar, AlertTriangle, Download, Search, Edit, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [pendingSignIns, setPendingSignIns] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [editIntern, setEditIntern] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', intern_id: '' });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (usersError) toast({ title: "Error", description: usersError.message, variant: "destructive" });
      setUsers(usersData || []);

      // Fetch pending sign-ins
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_sign_ins')
        .select(`
          *,
          profiles (name, intern_id, email)
        `)
        .order('created_at', { ascending: false });
      if (pendingError) toast({ title: "Error", description: pendingError.message, variant: "destructive" });
      setPendingSignIns(pendingData || []);

      // Fetch attendance records
      const { data: recordsData, error: recordsError } = await supabase
        .from('attendance_records')
        .select(`
          *,
          profiles (name, intern_id, email)
        `)
        .order('sign_in_time', { ascending: false });
      if (recordsError) toast({ title: "Error", description: recordsError.message, variant: "destructive" });
      setAttendanceRecords(recordsData || []);
    };
    fetchData();
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You need admin privileges to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const interns = users.filter(u => u.role === 'intern');
  const admins = users.filter(u => u.role === 'admin');
  const totalUsers = users.length;
  const pendingRequests = pendingSignIns.filter(p => p.status === 'pending').length;
  const approvedToday = attendanceRecords.filter(r => 
    new Date(r.sign_in_time).toDateString() === new Date().toDateString()
  ).length;

  const handleApproveRequest = async (request) => {
    try {
      // Update pending request status
      const { error: updateError } = await supabase
        .from('pending_sign_ins')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Create attendance record
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          user_id: request.user_id,
          sign_in_time: request.sign_in_time,
          sign_out_time: request.sign_out_time
        });

      if (insertError) throw insertError;

      // Update local state
      setPendingSignIns(pendingSignIns.map(p => 
        p.id === request.id ? { ...p, status: 'approved' } : p
      ));

      // Refresh attendance records
      const { data: recordsData } = await supabase
        .from('attendance_records')
        .select(`
          *,
          profiles (name, intern_id, email)
        `)
        .order('sign_in_time', { ascending: false });
      setAttendanceRecords(recordsData || []);

      toast({
        title: "Request approved",
        description: "Attendance request has been approved and recorded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      const { error } = await supabase
        .from('pending_sign_ins')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;

      setPendingSignIns(pendingSignIns.map(p => 
        p.id === request.id ? { ...p, status: 'rejected' } : p
      ));

      toast({
        title: "Request rejected",
        description: "Attendance request has been rejected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditIntern = async () => {
    if (!editIntern) return;
    const { error } = await supabase.from('profiles').update({
      name: editForm.name,
      intern_id: editForm.intern_id,
    }).eq('id', editIntern.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setUsers(users.map(u => u.id === editIntern.id ? { ...u, name: editForm.name, intern_id: editForm.intern_id } : u));
      setEditIntern(null);
      toast({ title: "Success", description: "User updated successfully" });
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

  const exportData = async () => {
    const csvData = attendanceRecords.map(record => ({
      Name: record.profiles?.name || 'Unknown',
      InternID: record.profiles?.intern_id || 'Unknown',
      SignInTime: formatDateTime(record.sign_in_time),
      SignOutTime: formatDateTime(record.sign_out_time),
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Attendance report has been downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage attendance requests and user accounts</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">{interns.length} interns, {admins.length} admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
              <Calendar className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedToday}</div>
              <p className="text-xs text-muted-foreground">Attendance records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <CheckCircle className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceRecords.length}</div>
              <p className="text-xs text-muted-foreground">All time approved</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
            <TabsTrigger value="records">Attendance Records</TabsTrigger>
            <TabsTrigger value="users">Manage Users</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Attendance Requests</CardTitle>
                <CardDescription>Review and approve or reject attendance requests from interns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingSignIns.filter(p => p.status === 'pending').length > 0 ? (
                    pendingSignIns.filter(p => p.status === 'pending').map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{request.profiles?.name || 'Unknown User'}</div>
                          <div className="text-sm text-gray-600">
                            ID: {request.profiles?.intern_id || 'Unknown'} • 
                            Sign-in: {formatDateTime(request.sign_in_time)}
                            {request.sign_out_time && ` • Sign-out: ${formatDateTime(request.sign_out_time)}`}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(request.status)}
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectRequest(request)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No pending requests</p>
                      <p className="text-sm">All requests have been processed</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Approved Attendance Records</CardTitle>
                    <CardDescription>All approved attendance records</CardDescription>
                  </div>
                  <Button onClick={exportData} className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{record.profiles?.name || 'Unknown User'}</div>
                          <div className="text-sm text-gray-600">
                            ID: {record.profiles?.intern_id || 'Unknown'} • 
                            In: {formatDateTime(record.sign_in_time)}
                            {record.sign_out_time && ` • Out: ${formatDateTime(record.sign_out_time)}`}
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Approved</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No attendance records found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((userItem) => (
                    <div key={userItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{userItem.name}</div>
                        <div className="text-sm text-gray-600">
                          {userItem.email} • Role: {userItem.role}
                          {userItem.intern_id && ` • ID: ${userItem.intern_id}`}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={userItem.role === 'admin' ? 'default' : 'secondary'}>
                          {userItem.role}
                        </Badge>
                        {userItem.role === 'intern' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditIntern(userItem);
                                setEditForm({
                                  name: userItem.name,
                                  intern_id: userItem.intern_id || '',
                                });
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Intern</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="name">Name</Label>
                                  <Input
                                    id="name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="intern_id">Intern ID</Label>
                                  <Input
                                    id="intern_id"
                                    value={editForm.intern_id}
                                    onChange={(e) => setEditForm({ ...editForm, intern_id: e.target.value })}
                                  />
                                </div>
                                <Button onClick={handleEditIntern}>Save</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

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
import { Users, Calendar, AlertTriangle, Download, Search, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [editIntern, setEditIntern] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', intern_id: '', sign_in_time: '', sign_out_time: '' });

  useEffect(() => {
    const fetchData = async () => {
      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*').eq('role', 'intern');
      if (usersError) toast({ title: "Error", description: usersError.message, variant: "destructive" });
      setUsers(usersData || []);

      const { data: recordsData, error: recordsError } = await supabase.from('attendance_records').select('*');
      if (recordsError) toast({ title: "Error", description: recordsError.message, variant: "destructive" });
      setRecords(recordsData || []);
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

  const interns = users;
  const totalInterns = interns.length;
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'Africa/Lagos' });
  const todayRecords = records.filter(r => r.sign_in_time && new Date(r.sign_in_time).toLocaleDateString('en-US', { timeZone: 'Africa/Lagos' }) === today);
  const presentToday = todayRecords.length;
  const absentToday = totalInterns - presentToday;

  const getStatus = (record) => {
    if (record.sign_in_time && record.sign_out_time) return 'present';
    if (record.sign_in_time) return 'partial';
    return 'absent';
  };

  const getStatusBadge = (record) => {
    const status = getStatus(record);
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      timeZone: 'Africa/Lagos',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  const filteredRecords = records.filter(record => {
    const recordUser = users.find(u => u.id === record.user_id);
    const matchesSearch = !searchTerm || 
      (recordUser && (recordUser.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                recordUser.intern_id.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesStatus = statusFilter === 'all' || getStatus(record) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportData = async () => {
    const csvData = filteredRecords.map(record => {
      const recordUser = users.find(u => u.id === record.user_id);
      return {
        Name: recordUser?.name || 'Unknown',
        InternID: recordUser?.intern_id || 'Unknown',
        Date: formatDate(record.sign_in_time),
        SignInTime: formatTime(record.sign_in_time),
        SignOutTime: formatTime(record.sign_out_time),
        Status: getStatus(record),
      };
    });

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${today}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Attendance report has been downloaded.",
    });
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
      toast({ title: "Success", description: "Intern updated successfully" });
    }
  };

  const handleEditRecord = async () => {
    if (!editRecord) return;
    const updates = {
      sign_in_time: editForm.sign_in_time || null,
      sign_out_time: editForm.sign_out_time || null,
    };
    const { error } = await supabase.from('attendance_records').update(updates).eq('id', editRecord.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRecords(records.map(r => r.id === editRecord.id ? { ...r, ...updates } : r));
      setEditRecord(null);
      toast({ title: "Success", description: "Attendance updated successfully" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage intern attendance records</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interns</CardTitle>
              <Users className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInterns}</div>
              <p className="text-xs text-muted-foreground">Active intern accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <Calendar className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{presentToday}</div>
              <p className="text-xs text-muted-foreground">Signed in today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
              <AlertTriangle className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{absentToday}</div>
              <p className="text-xs text-muted-foreground">Not signed in</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
            <TabsTrigger value="interns">Manage Interns</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription>View and filter all intern attendance records</CardDescription>
                  </div>
                  <Button onClick={exportData} className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="search">Search by name or intern ID</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search interns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status-filter">Filter by status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => {
                      const recordUser = users.find(u => u.id === record.user_id);
                      return (
                        <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{recordUser?.name || 'Unknown User'}</div>
                            <div className="text-sm text-gray-600">
                              ID: {recordUser?.intern_id || 'Unknown'} • {formatDate(record.sign_in_time)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600">
                              {record.sign_in_time && `In: ${formatTime(record.sign_in_time)}`}
                              {record.sign_in_time && record.sign_out_time && ' • '}
                              {record.sign_out_time && `Out: ${formatTime(record.sign_out_time)}`}
                              {!record.sign_in_time && 'No sign-in'}
                            </div>
                            {getStatusBadge(record)}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setEditRecord(record);
                                  setEditForm({
                                    sign_in_time: record.sign_in_time ? new Date(record.sign_in_time).toISOString().slice(0, 16) : '',
                                    sign_out_time: record.sign_out_time ? new Date(record.sign_out_time).toISOString().slice(0, 16) : '',
                                    name: '',
                                    intern_id: '',
                                  });
                                }}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Attendance Record</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="sign_in_time">Sign-In Time</Label>
                                    <Input
                                      id="sign_in_time"
                                      type="datetime-local"
                                      value={editForm.sign_in_time}
                                      onChange={(e) => setEditForm({ ...editForm, sign_in_time: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="sign_out_time">Sign-Out Time</Label>
                                    <Input
                                      id="sign_out_time"
                                      type="datetime-local"
                                      value={editForm.sign_out_time}
                                      onChange={(e) => setEditForm({ ...editForm, sign_out_time: e.target.value })}
                                    />
                                  </div>
                                  <Button onClick={handleEditRecord}>Save</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No attendance records found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Intern Management</CardTitle>
                <CardDescription>View and manage intern accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interns.map((intern) => {
                    const internRecords = records.filter(r => r.user_id === intern.id);
                    const attendanceRate = internRecords.length > 0 ? Math.round((internRecords.filter(r => r.sign_in_time).length / internRecords.length) * 100) : 0;

                    return (
                      <div key={intern.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{intern.name}</div>
                          <div className="text-sm text-gray-600">
                            {intern.email} • ID: {intern.intern_id}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{attendanceRate}% attendance</div>
                            <div className="text-xs text-gray-500">
                              {internRecords.length} total record{internRecords.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditIntern(intern);
                                setEditForm({
                                  name: intern.name,
                                  intern_id: intern.intern_id,
                                  sign_in_time: '',
                                  sign_out_time: '',
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

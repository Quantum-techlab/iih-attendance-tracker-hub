
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/contexts/AttendanceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, AlertTriangle, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { getAllRecords } = useAttendance();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const allRecords = getAllRecords();
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const interns = users.filter((u: any) => u.role === 'intern');

  // Calculate statistics
  const totalInterns = interns.length;
  const todayRecords = allRecords.filter(r => r.date === new Date().toISOString().split('T')[0]);
  const presentToday = todayRecords.filter(r => r.signInTime).length;
  const absentToday = totalInterns - presentToday;

  // Filter records based on search and status
  const filteredRecords = allRecords.filter(record => {
    const user = users.find((u: any) => u.id === record.userId);
    const matchesSearch = !searchTerm || 
      (user && (user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                user.internId.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportData = () => {
    const csvData = filteredRecords.map(record => {
      const user = users.find((u: any) => u.id === record.userId);
      return {
        Name: user?.name || 'Unknown',
        InternID: user?.internId || 'Unknown',
        Date: record.date,
        SignInTime: record.signInTime || 'N/A',
        SignOutTime: record.signOutTime || 'N/A',
        Status: record.status
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
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: "Export successful",
      description: "Attendance report has been downloaded.",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage intern attendance and view comprehensive reports</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Calendar className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalInterns > 0 ? Math.round((presentToday / totalInterns) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Today's rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
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
                {/* Filters */}
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

                {/* Records Table */}
                <div className="space-y-4">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => {
                      const recordUser = users.find((u: any) => u.id === record.userId);
                      return (
                        <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{recordUser?.name || 'Unknown User'}</div>
                            <div className="text-sm text-gray-600">
                              ID: {recordUser?.internId || 'Unknown'} • {formatDate(record.date)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600">
                              {record.signInTime && `In: ${record.signInTime}`}
                              {record.signInTime && record.signOutTime && ' • '}
                              {record.signOutTime && `Out: ${record.signOutTime}`}
                              {!record.signInTime && 'No sign-in'}
                            </div>
                            {getStatusBadge(record.status)}
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
                  {interns.map((intern: any) => {
                    const internRecords = allRecords.filter(r => r.userId === intern.id);
                    const missedDays = internRecords.filter(r => !r.signInTime).length;
                    const totalDays = internRecords.length;
                    const attendanceRate = totalDays > 0 ? Math.round(((totalDays - missedDays) / totalDays) * 100) : 0;

                    return (
                      <div key={intern.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{intern.name}</div>
                          <div className="text-sm text-gray-600">
                            {intern.email} • ID: {intern.internId}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{attendanceRate}% attendance</div>
                            <div className="text-xs text-gray-500">
                              {missedDays} missed day{missedDays !== 1 ? 's' : ''}
                            </div>
                          </div>
                          {missedDays >= 3 && (
                            <Badge className="bg-red-100 text-red-800">High Absences</Badge>
                          )}
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

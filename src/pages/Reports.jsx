import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, FileText, Users, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [user, setUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [selectedSession, setSelectedSession] = useState('2024/2025');
  const [selectedSection, setSelectedSection] = useState('All');
  
  // Data states
  const [performanceData, setPerformanceData] = useState([]);
  const [feeData, setFeeData] = useState([]);
  const [assignmentData, setAssignmentData] = useState([]);
  const [overallStats, setOverallStats] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user && staffRole) {
      loadReportData();
    }
  }, [selectedTerm, selectedSession, selectedSection, user, staffRole]);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    const roles = await base44.entities.StaffRole.filter({ user_email: userData.email });
    if (roles[0]) {
      setStaffRole(roles[0]);
    }

    const settings = await base44.entities.SchoolSettings.list();
    if (settings[0]) {
      setSelectedTerm(settings[0].current_term);
      setSelectedSession(settings[0].current_session);
    }

    setLoading(false);
  };

  const loadReportData = async () => {
    // Load all necessary data
    const [students, results, payments, assignments, submissions] = await Promise.all([
      base44.entities.Student.filter({ status: 'Active' }),
      base44.entities.Result.filter({ term: selectedTerm, session: selectedSession }),
      base44.entities.FeePayment.filter({ term: selectedTerm, session: selectedSession }),
      base44.entities.Assignment.list(),
      base44.entities.AssignmentSubmission.list()
    ]);

    // Filter by section if needed
    const filteredStudents = selectedSection !== 'All' 
      ? students.filter(s => s.section === selectedSection)
      : students;

    // Calculate performance data by class
    calculatePerformanceData(results, filteredStudents);
    
    // Calculate fee payment trends
    calculateFeeData(payments);
    
    // Calculate assignment completion
    calculateAssignmentData(assignments, submissions);
    
    // Calculate overall stats
    calculateOverallStats(filteredStudents, results, payments);
  };

  const calculatePerformanceData = (results, students) => {
    const classSummary = {};
    
    results.forEach(result => {
      const className = result.class;
      if (!classSummary[className]) {
        classSummary[className] = { total: 0, count: 0, passing: 0 };
      }
      classSummary[className].total += result.total || 0;
      classSummary[className].count += 1;
      if ((result.total || 0) >= 40) classSummary[className].passing += 1;
    });

    const performanceArray = Object.entries(classSummary).map(([className, data]) => ({
      class: className,
      average: data.count > 0 ? (data.total / data.count).toFixed(1) : 0,
      passRate: data.count > 0 ? ((data.passing / data.count) * 100).toFixed(1) : 0,
      students: data.count
    }));

    setPerformanceData(performanceArray);
  };

  const calculateFeeData = (payments) => {
    const statusSummary = {
      Approved: 0,
      Pending: 0,
      Rejected: 0
    };
    
    const totalAmount = { Approved: 0, Pending: 0, Rejected: 0 };
    
    payments.forEach(payment => {
      statusSummary[payment.status] = (statusSummary[payment.status] || 0) + 1;
      totalAmount[payment.status] = (totalAmount[payment.status] || 0) + (payment.amount || 0);
    });

    const feeArray = Object.entries(statusSummary).map(([status, count]) => ({
      status,
      count,
      amount: totalAmount[status]
    }));

    setFeeData(feeArray);
  };

  const calculateAssignmentData = (assignments, submissions) => {
    const assignmentStats = assignments.map(assignment => {
      const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
      const gradedSubmissions = assignmentSubmissions.filter(s => s.status === 'Graded');
      
      return {
        title: assignment.title,
        total: assignmentSubmissions.length,
        graded: gradedSubmissions.length,
        pending: assignmentSubmissions.length - gradedSubmissions.length,
        completionRate: assignmentSubmissions.length > 0 
          ? ((gradedSubmissions.length / assignmentSubmissions.length) * 100).toFixed(1)
          : 0
      };
    });

    setAssignmentData(assignmentStats.slice(0, 10)); // Top 10
  };

  const calculateOverallStats = (students, results, payments) => {
    const totalStudents = students.length;
    const totalResults = results.length;
    const avgScore = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.total || 0), 0) / results.length 
      : 0;
    
    const approvedPayments = payments.filter(p => p.status === 'Approved');
    const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const collectionRate = payments.length > 0 
      ? (approvedPayments.length / payments.length) * 100 
      : 0;

    setOverallStats({
      totalStudents,
      totalResults,
      avgScore: avgScore.toFixed(1),
      totalRevenue,
      collectionRate: collectionRate.toFixed(1)
    });
  };

  const exportReport = () => {
    const reportData = {
      term: selectedTerm,
      session: selectedSession,
      section: selectedSection,
      performance: performanceData,
      fees: feeData,
      assignments: assignmentData,
      stats: overallStats
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${selectedTerm}-${selectedSession}.json`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500">Comprehensive school performance insights</p>
          </div>
          <Button onClick={exportReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Sections</SelectItem>
                    <SelectItem value="Nursery">Nursery</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024/2025">2024/2025</SelectItem>
                    <SelectItem value="2023/2024">2023/2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Students</p>
                  <p className="text-2xl font-bold mt-1">{overallStats.totalStudents || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold mt-1">{overallStats.avgScore || 0}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1">₦{(overallStats.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Collection Rate</p>
                  <p className="text-2xl font-bold mt-1">{overallStats.collectionRate || 0}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="performance">Academic Performance</TabsTrigger>
            <TabsTrigger value="fees">Fee Payments</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          {/* Academic Performance */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Average Scores by Class</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="class" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="average" fill="#1e3a5f" name="Average Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Pass Rates by Class</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="class" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} name="Pass Rate %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Detailed Class Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Average Score</TableHead>
                      <TableHead>Pass Rate</TableHead>
                      <TableHead>Total Students</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceData.map((data, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{data.class}</TableCell>
                        <TableCell>{data.average}%</TableCell>
                        <TableCell>{data.passRate}%</TableCell>
                        <TableCell>{data.students}</TableCell>
                        <TableCell>
                          <Badge className={
                            data.average >= 75 ? 'bg-green-100 text-green-800' :
                            data.average >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {data.average >= 75 ? 'Excellent' : data.average >= 50 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fee Payments */}
          <TabsContent value="fees" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Payment Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={feeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, count }) => `${status}: ${count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {feeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Revenue by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={feeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="amount" fill="#3b82f6" name="Amount (₦)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Fee Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeData.map((data, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline" className={
                            data.status === 'Approved' ? 'border-green-500 text-green-700' :
                            data.status === 'Pending' ? 'border-yellow-500 text-yellow-700' :
                            'border-red-500 text-red-700'
                          }>
                            {data.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{data.count}</TableCell>
                        <TableCell>₦{data.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {((data.count / feeData.reduce((sum, d) => sum + d.count, 0)) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments */}
          <TabsContent value="assignments" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Assignment Completion Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={assignmentData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="title" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="graded" fill="#10b981" name="Graded" stackId="a" />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Total Submissions</TableHead>
                      <TableHead>Graded</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Completion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentData.map((data, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{data.title}</TableCell>
                        <TableCell>{data.total}</TableCell>
                        <TableCell>{data.graded}</TableCell>
                        <TableCell>{data.pending}</TableCell>
                        <TableCell>
                          <Badge className={
                            data.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                            data.completionRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {data.completionRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
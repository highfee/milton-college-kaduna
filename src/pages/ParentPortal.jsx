import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  FileText, GraduationCap, LogOut, UserCircle,
  TrendingUp, BookOpen, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ParentPortal() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildStats();
    }
  }, [selectedChild]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const parentStudents = await base44.entities.ParentStudent.filter({ parent_email: userData.email });
      const childrenIds = parentStudents.map(ps => ps.student_id);
      
      if (childrenIds.length > 0) {
        const childrenData = await Promise.all(
          childrenIds.map(id => base44.entities.Student.filter({ id }))
        );
        const flatChildren = childrenData.flat();
        setChildren(flatChildren);
        if (flatChildren[0]) {
          setSelectedChild(flatChildren[0]);
        }
      }
    } catch (error) {
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const loadChildStats = async () => {
    if (!selectedChild) return;

    const [results, assignments] = await Promise.all([
      base44.entities.Result.filter({ student_id: selectedChild.id, status: 'Approved' }),
      base44.entities.Assignment.filter({ class: selectedChild.current_class, status: 'Active' })
    ]);

    setStats({
      totalSubjects: results.length,
      activeAssignments: assignments.length
    });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const quickActions = [
    { icon: FileText, label: 'View Report Card', page: 'ViewReportCard', color: 'bg-blue-500' },
    { icon: TrendingUp, label: 'View Results', page: 'ViewResults', color: 'bg-green-500' },
    { icon: Calendar, label: 'School Calendar', page: 'ManageCalendar', color: 'bg-purple-500' },
    { icon: BookOpen, label: 'Assignments', page: 'ManageAssignments', color: 'bg-orange-500' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">No Children Found</h2>
            <p className="text-gray-600 mb-4">No student records are linked to your account.</p>
            <Button onClick={handleLogout}>Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <UserCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Parent Portal</h1>
                <p className="text-sm text-white/80">{user?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white border-0 hidden md:flex">Parent</Badge>
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Child Selection */}
        {children.length > 1 && (
          <Card className="border-0 shadow-md mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <label className="font-medium text-gray-700">Select Child:</label>
                <Select 
                  value={selectedChild?.id} 
                  onValueChange={(id) => {
                    const child = children.find(c => c.id === id);
                    setSelectedChild(child);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map(child => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.first_name} {child.last_name} - {child.current_class}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Info Card */}
        {selectedChild && (
          <Card className="border-0 shadow-md mb-8 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {selectedChild.passport_photo && (
                  <img 
                    src={selectedChild.passport_photo} 
                    alt={selectedChild.first_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    {selectedChild.first_name} {selectedChild.middle_name} {selectedChild.last_name}
                  </h2>
                  <p className="text-white/90">Admission No: {selectedChild.admission_number}</p>
                  <p className="text-white/90">{selectedChild.current_class} | {selectedChild.section} Section</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Subjects</p>
                  <p className="text-3xl font-bold">{stats.totalSubjects || 0}</p>
                </div>
                <div className="w-12 h-12 text-blue-600 bg-blue-600 bg-opacity-10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Assignments</p>
                  <p className="text-3xl font-bold">{stats.activeAssignments || 0}</p>
                </div>
                <div className="w-12 h-12 text-green-600 bg-green-600 bg-opacity-10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link key={idx} to={createPageUrl(action.page)}>
                    <div className="flex flex-col items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                      <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm text-center font-medium text-gray-700">{action.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
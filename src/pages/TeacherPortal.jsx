import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { 
  BookOpen, ClipboardList, FileText, Users, Calendar,
  CheckSquare, MessageSquare, LogOut, GraduationCap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TeacherPortal() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const teacherData = await base44.entities.Teacher.filter({ email: userData.email });
      if (teacherData[0]) {
        setTeacher(teacherData[0]);

        const [assignments, subjects, students] = await Promise.all([
          base44.entities.Assignment.filter({ teacher_id: teacherData[0].id }),
          base44.entities.Subject.filter({ teacher_id: teacherData[0].id }),
          teacherData[0].assigned_class 
            ? base44.entities.Student.filter({ current_class: teacherData[0].assigned_class })
            : []
        ]);

        setStats({
          mySubjects: subjects.length,
          myAssignments: assignments.length,
          myStudents: students.length
        });
      }
    } catch (error) {
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const quickActions = [
    { icon: FileText, label: 'Enter Results', page: 'EnterResults', color: 'bg-blue-500' },
    { icon: ClipboardList, label: 'Review Class Results', page: 'ReviewClassResults', color: 'bg-green-500' },
    { icon: CheckSquare, label: 'Manage Assignments', page: 'ManageAssignments', color: 'bg-purple-500' },
    { icon: BookOpen, label: 'Manage CBT', page: 'ManageCBT', color: 'bg-orange-500' },
    { icon: Calendar, label: 'View Timetable', page: 'ManageTimetable', color: 'bg-teal-500' },
    { icon: Users, label: 'My Students', page: 'ManageStudents', color: 'bg-indigo-500' }
  ];

  const statCards = [
    { label: 'My Subjects', value: stats.mySubjects, icon: BookOpen, color: 'text-blue-600' },
    { label: 'My Assignments', value: stats.myAssignments, icon: ClipboardList, color: 'text-green-600' },
    { label: 'My Students', value: stats.myStudents, icon: GraduationCap, color: 'text-purple-600' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
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
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Teacher Portal</h1>
                <p className="text-sm text-white/80">{user?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white border-0 hidden md:flex">
                {teacher?.section} Section
              </Badge>
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
        {/* Welcome Card */}
        <Card className="border-0 shadow-md mb-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-2">Welcome back, {teacher?.first_name}!</h2>
            <p className="text-white/90">
              {teacher?.teacher_type === 'Class Teacher' && `Class Teacher - ${teacher?.assigned_class}`}
              {teacher?.teacher_type === 'Form Teacher' && `Form Teacher - ${teacher?.form_teacher_class}`}
              {teacher?.teacher_type === 'Subject Teacher' && 'Subject Teacher'}
            </p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold">{stat.value || 0}</p>
                    </div>
                    <div className={`w-12 h-12 ${stat.color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
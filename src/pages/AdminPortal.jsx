import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Users, GraduationCap, BookOpen, Calendar, FileText, Settings,
  TrendingUp, UserPlus, ClipboardList, Image, MessageSquare, BarChart3,
  LogOut, Menu, X, Printer, Archive
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminPortal() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [students, teachers, subjects, applications] = await Promise.all([
        base44.entities.Student.list(),
        base44.entities.Teacher.list(),
        base44.entities.Subject.list(),
        base44.entities.AdmissionApplication.filter({ status: 'Pending' })
      ]);

      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalSubjects: subjects.length,
        pendingApplications: applications.length
      });
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
    { icon: UserPlus, label: 'Manage Students', page: 'ManageStudents', color: 'bg-blue-500' },
    { icon: Users, label: 'Manage Teachers', page: 'ManageTeachers', color: 'bg-green-500' },
    { icon: BookOpen, label: 'Manage Subjects', page: 'ManageSubjects', color: 'bg-purple-500' },
    { icon: ClipboardList, label: 'Staff Roles', page: 'StaffRoles', color: 'bg-orange-500' },
    { icon: FileText, label: 'Review Results', page: 'ReviewResults', color: 'bg-red-500' },
    { icon: BarChart3, label: 'Reports & Analytics', page: 'Reports', color: 'bg-indigo-500' },
    { icon: Calendar, label: 'Calendar', page: 'ManageCalendar', color: 'bg-teal-500' },
    { icon: Image, label: 'Gallery', page: 'ManageGallery', color: 'bg-pink-500' },
    { icon: MessageSquare, label: 'Newsletter', page: 'ManageNewsletter', color: 'bg-yellow-500' },
    { icon: Printer, label: 'Print/Send Results', page: 'PrintResult', color: 'bg-cyan-600' },
    { icon: Settings, label: 'School Settings', page: 'SchoolSettings', color: 'bg-gray-600' },
    { icon: Users, label: 'Non-Academic Staff', page: 'ManageNonAcademicStaff', color: 'bg-slate-600' },
    { icon: TrendingUp, label: 'Master List', page: 'MasterList', color: 'bg-emerald-600' },
    { icon: ClipboardList, label: 'Result Tokens', page: 'ResultTokens', color: 'bg-amber-600' },
    { icon: Archive, label: 'Student Archive', page: 'StudentArchive', color: 'bg-slate-700' },
  ];

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: 'text-blue-600' },
    { label: 'Total Teachers', value: stats.totalTeachers, icon: Users, color: 'text-green-600' },
    { label: 'Total Subjects', value: stats.totalSubjects, icon: BookOpen, color: 'text-purple-600' },
    { label: 'Pending Applications', value: stats.pendingApplications, icon: TrendingUp, color: 'text-orange-600' }
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
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Portal</h1>
                <p className="text-sm text-white/80">{user?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white border-0 hidden md:flex">Administrator</Badge>
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
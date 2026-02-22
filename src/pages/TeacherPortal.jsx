import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  BookOpen, ClipboardList, FileText, Users, Calendar,
  CheckSquare, MessageSquare, LogOut, GraduationCap, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEFAULT_PASSWORD = 'User123';

export default function TeacherPortal() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('teacher_portal_logged_in');
    const savedStaffId = sessionStorage.getItem('teacher_portal_staff_id');
    if (session === 'true' && savedStaffId) {
      loadTeacherByStaffId(savedStaffId);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async () => {
    if (!staffId || !password) {
      setLoginError('Please enter your Staff ID and password');
      return;
    }
    if (password !== DEFAULT_PASSWORD) {
      setLoginError('Incorrect password. Default password is User123');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    const teachers = await base44.entities.Teacher.filter({ staff_id: staffId.trim() });
    if (!teachers[0]) {
      setLoginError('Staff ID not found. Please check and try again.');
      setLoginLoading(false);
      return;
    }
    // Head Teacher and Principal have their own dedicated portals
    if (teachers[0].teacher_type === 'Head Teacher') {
      setLoginError('Please use the Head Teacher Portal instead.');
      setLoginLoading(false);
      return;
    }
    if (teachers[0].teacher_type === 'Principal') {
      setLoginError("Please use the Principal's Portal instead.");
      setLoginLoading(false);
      return;
    }
    sessionStorage.setItem('teacher_portal_logged_in', 'true');
    sessionStorage.setItem('teacher_portal_staff_id', staffId.trim());
    setLoginLoading(false);
    loadTeacherByStaffId(staffId.trim());
  };

  const loadTeacherByStaffId = async (sid) => {
    setLoading(true);
    const teacherData = await base44.entities.Teacher.filter({ staff_id: sid });
    if (teacherData[0]) {
      setTeacher(teacherData[0]);

      const [assignments, subjects, students] = await Promise.all([
        base44.entities.Assignment.filter({ teacher_id: teacherData[0].id }),
        base44.entities.Subject.filter({ teacher_id: teacherData[0].id }),
        teacherData[0].assigned_class 
          ? base44.entities.Student.filter({ current_class: teacherData[0].assigned_class })
          : Promise.resolve([])
      ]);

      setStats({
        mySubjects: subjects.length,
        myAssignments: assignments.length,
        myStudents: students.length
      });
      setLoggedIn(true);
    } else {
      setLoginError('Teacher record not found.');
      sessionStorage.removeItem('teacher_portal_logged_in');
      sessionStorage.removeItem('teacher_portal_staff_id');
    }
    setLoading(false);
  };

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
    sessionStorage.removeItem('teacher_portal_logged_in');
    sessionStorage.removeItem('teacher_portal_staff_id');
    setLoggedIn(false);
    setTeacher(null);
    setStaffId('');
    setPassword('');
  };

  // Determine portal role label and color based on section + type
  const isNurseryPrimary = teacher?.section === 'Nursery' || teacher?.section === 'Primary';
  const isHeadTeacher = teacher?.teacher_type === 'Head Teacher' || 
    (isNurseryPrimary && teacher?.teacher_type === 'Head Teacher');

  const getRoleLabel = () => {
    if (isHeadTeacher) {
      return 'Class Teacher · Form Teacher · Head Teacher';
    }
    if (isNurseryPrimary && (teacher?.teacher_type === 'Class Teacher' || teacher?.teacher_type === 'Form Teacher')) {
      return 'Class Teacher & Form Teacher';
    }
    if (teacher?.teacher_type === 'Class Teacher') return `Class Teacher — ${teacher?.assigned_class}`;
    if (teacher?.teacher_type === 'Form Teacher') return `Form Teacher — ${teacher?.form_teacher_class}`;
    return 'Subject Teacher';
  };

  const getRoleBadges = () => {
    if (isHeadTeacher) {
      return ['Class Teacher', 'Form Teacher', 'Head Teacher'];
    }
    if (isNurseryPrimary && (teacher?.teacher_type === 'Class Teacher' || teacher?.teacher_type === 'Form Teacher')) {
      return ['Class Teacher', 'Form Teacher'];
    }
    return [teacher?.teacher_type];
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

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <div className="bg-[#1e3a5f] rounded-t-xl p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Teacher Portal</h1>
            <p className="text-white/80 text-sm mt-1">Sign in with your Staff ID</p>
          </div>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Staff ID</Label>
              <Input
                placeholder="Enter your Staff ID (e.g. TCH001)"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <Button className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </Button>

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
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Teacher Portal</h1>
                <p className="text-sm text-white/80">{teacher?.first_name} {teacher?.last_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isHeadTeacher ? (
                <Badge className="bg-white/20 text-white border-0 hidden md:flex">Head Teacher</Badge>
              ) : isNurseryPrimary && (teacher?.teacher_type === 'Class Teacher' || teacher?.teacher_type === 'Form Teacher') ? (
                <Badge className="bg-white/20 text-white border-0 hidden md:flex">Class & Form Teacher</Badge>
              ) : (
                <Badge className="bg-white/20 text-white border-0 hidden md:flex">{teacher?.teacher_type}</Badge>
              )}
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
            <p className="text-white/90 mb-3">{getRoleLabel()}</p>
            <div className="flex flex-wrap gap-2">
              {getRoleBadges().map((badge, i) => (
                <span key={i} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                  {badge}
                </span>
              ))}
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                {teacher?.section} Section
              </span>
            </div>
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
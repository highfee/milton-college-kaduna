import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  FileText, ClipboardList, BookOpen, Calendar,
  GraduationCap, LogOut, TrendingUp, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEFAULT_PASSWORD = 'User123';

export default function StudentPortal() {
  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [admissionNo, setAdmissionNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('student_portal_logged_in');
    const savedAdmNo = sessionStorage.getItem('student_portal_adm');
    if (session === 'true' && savedAdmNo) {
      loadStudentByAdmission(savedAdmNo);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async () => {
    if (!admissionNo || !password) {
      setLoginError('Please enter your Admission Number and password');
      return;
    }
    if (password !== DEFAULT_PASSWORD) {
      setLoginError('Incorrect password. Default password is User123');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    const students = await base44.entities.Student.filter({ admission_number: admissionNo.trim() });
    if (!students[0]) {
      setLoginError('Admission number not found. Please check and try again.');
      setLoginLoading(false);
      return;
    }
    sessionStorage.setItem('student_portal_logged_in', 'true');
    sessionStorage.setItem('student_portal_adm', admissionNo.trim());
    setLoginLoading(false);
    loadStudentByAdmission(admissionNo.trim());
  };

  const loadStudentByAdmission = async (admNo) => {
    setLoading(true);
    const studentData = await base44.entities.Student.filter({ admission_number: admNo });
    if (studentData[0]) {
      setStudent(studentData[0]);

      const [assignments, results, cbtExams, allSubjects] = await Promise.all([
        base44.entities.Assignment.filter({ class: studentData[0].current_class, status: 'Active' }),
        base44.entities.Result.filter({ student_id: studentData[0].id, status: 'Approved' }),
        base44.entities.CBTExam.filter({ status: 'Published' }),
        base44.entities.Subject.filter({ status: 'Active' })
      ]);

      const classSubjects = allSubjects.filter(s => s.classes?.includes(studentData[0].current_class));
      setSubjects(classSubjects);

      const now = new Date().toISOString();
      const availableCBT = cbtExams.filter(exam =>
        exam.classes?.includes(studentData[0].current_class) &&
        exam.start_date <= now && exam.end_date >= now
      );

      setStats({
        activeAssignments: assignments.length,
        completedSubjects: results.length,
        availableCBT: availableCBT.length,
        totalSubjects: classSubjects.length
      });
      setLoggedIn(true);
    } else {
      setLoginError('Student record not found.');
      sessionStorage.removeItem('student_portal_logged_in');
      sessionStorage.removeItem('student_portal_adm');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('student_portal_logged_in');
    sessionStorage.removeItem('student_portal_adm');
    setLoggedIn(false);
    setStudent(null);
    setAdmissionNo('');
    setPassword('');
  };

  const quickActions = [
    { icon: FileText, label: 'Check Result', page: 'CheckResult', color: 'bg-blue-500' },
    { icon: ClipboardList, label: 'View Assignments & Homework', page: 'ManageAssignments', color: 'bg-green-500' },
    { icon: BookOpen, label: 'Take CBT Exam', page: 'TakeCBT', color: 'bg-purple-500' },
    { icon: TrendingUp, label: 'My CBT Results', page: 'ViewCBTResults', color: 'bg-orange-500' },
    { icon: Calendar, label: 'School Calendar', page: 'ManageCalendar', color: 'bg-teal-500' }
  ];

  const statCards = [
    { label: 'My Subjects', value: stats.totalSubjects, icon: BookOpen, color: 'text-blue-600' },
    { label: 'Results Available', value: stats.completedSubjects, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Assignments & Homework', value: stats.activeAssignments, icon: ClipboardList, color: 'text-orange-600' },
    { label: 'CBT Exams Available', value: stats.availableCBT, icon: FileText, color: 'text-purple-600' }
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
          <div className="bg-green-600 rounded-t-xl p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Student Portal</h1>
            <p className="text-white/80 text-sm mt-1">Sign in with your Admission Number</p>
          </div>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Admission Number / Student ID</Label>
              <Input
                placeholder="Enter your Admission Number"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
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
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleLogin} disabled={loginLoading}>
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
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Student Portal</h1>
                <p className="text-sm text-white/80">{student?.first_name} {student?.last_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white border-0 hidden md:flex">
                {student?.current_class}
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
        {/* Student Info Card */}
        <Card className="border-0 shadow-md mb-8 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {student.passport_photo && (
                <img 
                  src={student.passport_photo} 
                  alt={student.first_name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {student.first_name} {student.middle_name} {student.last_name}
                </h2>
                <p className="text-white/90">Admission No: {student.admission_number}</p>
                <p className="text-white/90">{student.current_class} | {student.section} Section</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-opacity-10`} style={{backgroundColor: 'rgba(0,0,0,0.05)'}}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* My Subjects */}
        {subjects.length > 0 && (
          <Card className="border-0 shadow-md mb-8">
            <CardHeader>
              <CardTitle>My Subjects ({subjects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{subject.name}</p>
                      <p className="text-xs text-gray-500 truncate">{subject.teacher_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  FileText, ClipboardList, BookOpen, Calendar,
  GraduationCap, LogOut, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function StudentPortal() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const studentData = await base44.entities.Student.filter({ parent_email: userData.email });
      if (studentData[0]) {
        setStudent(studentData[0]);

        const [assignments, results, cbtExams, allSubjects] = await Promise.all([
          base44.entities.Assignment.filter({ class: studentData[0].current_class, status: 'Active' }),
          base44.entities.Result.filter({ student_id: studentData[0].id, status: 'Approved' }),
          base44.entities.CBTExam.filter({ status: 'Published' }),
          base44.entities.Subject.filter({ status: 'Active' })
        ]);

        // Filter subjects for this student's class
        const classSubjects = allSubjects.filter(s => 
          s.classes?.includes(studentData[0].current_class)
        );
        setSubjects(classSubjects);

        // Filter CBT exams for this student's class that are active
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
    { icon: FileText, label: 'View Results', page: 'ViewResults', color: 'bg-blue-500' },
    { icon: ClipboardList, label: 'My Assignments', page: 'ManageAssignments', color: 'bg-green-500' },
    { icon: BookOpen, label: 'Take CBT Exam', page: 'TakeCBT', color: 'bg-purple-500' },
    { icon: TrendingUp, label: 'CBT Results', page: 'ViewCBTResults', color: 'bg-orange-500' },
    { icon: Calendar, label: 'School Calendar', page: 'ManageCalendar', color: 'bg-teal-500' }
  ];

  const statCards = [
    { label: 'My Subjects', value: stats.totalSubjects, icon: BookOpen, color: 'text-blue-600' },
    { label: 'Results Available', value: stats.completedSubjects, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Active Assignments', value: stats.activeAssignments, icon: ClipboardList, color: 'text-orange-600' },
    { label: 'Available CBT', value: stats.availableCBT, icon: FileText, color: 'text-purple-600' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Student Not Found</h2>
            <p className="text-gray-600 mb-4">No student record is linked to your account.</p>
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
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Users, GraduationCap, BookOpen, DollarSign, FileText, 
  Calendar, Bell, MessageCircle, ClipboardList, Settings,
  TrendingUp, Clock, CheckCircle, AlertCircle, School
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [parentStudents, setParentStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Get staff role
      const roles = await base44.entities.StaffRole.filter({ user_email: userData.email, status: 'Active' });
      const role = roles[0];
      setStaffRole(role);

      // Get parent-student relationship
      const parentLinks = await base44.entities.ParentStudent.filter({ parent_email: userData.email });
      setParentStudents(parentLinks);

      // Load stats based on role
      await loadStats(role, userData, parentLinks);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      navigate(createPageUrl('Login'));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (role, userData, parentLinks) => {
    const statsData = {};

    if (role?.role === 'Admin' || role?.role === 'Principal' || role?.role === 'Head Teacher') {
      const [students, teachers, subjects] = await Promise.all([
        base44.entities.Student.filter({ status: 'Active' }),
        base44.entities.Teacher.filter({ status: 'Active' }),
        base44.entities.Subject.filter({ status: 'Active' })
      ]);
      statsData.totalStudents = students.length;
      statsData.totalTeachers = teachers.length;
      statsData.totalSubjects = subjects.length;
      statsData.pendingPayments = 0;
    }

    if (role?.role === 'Teacher' || role?.role === 'Form Teacher') {
      const teacher = await base44.entities.Teacher.filter({ email: userData.email });
      if (teacher[0]) {
        statsData.teacherInfo = teacher[0];
        const assignments = await base44.entities.Assignment.filter({ teacher_id: teacher[0].id });
        statsData.totalAssignments = assignments.length;
      }
    }

    if (role?.role === 'Accountant') {
      statsData.pendingPayments = 0;
      statsData.approvedPayments = 0;
    }

    // For students
    if (!role && !parentLinks.length) {
      const studentData = await base44.entities.Student.filter({ parent_email: userData.email });
      if (studentData[0]) {
        statsData.studentInfo = studentData[0];
      }
    }

    setStats(statsData);
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'bg-red-500',
      'Principal': 'bg-blue-600',
      'Head Teacher': 'bg-green-600',
      'Teacher': 'bg-purple-500',
      'Form Teacher': 'bg-indigo-500',
      'Accountant': 'bg-orange-500'
    };
    return colors[role] || 'bg-gray-500';
  };

  const getQuickLinks = () => {
    const role = staffRole?.role;
    const links = [];

    if (role === 'Admin') {
      links.push(
        { name: 'Manage Teachers', icon: Users, url: 'ManageTeachers', color: 'bg-blue-500' },
        { name: 'Manage Students', icon: GraduationCap, url: 'ManageStudents', color: 'bg-green-500' },
        { name: 'Manage Subjects', icon: BookOpen, url: 'ManageSubjects', color: 'bg-purple-500' },
        { name: 'Staff Roles', icon: Settings, url: 'StaffRoles', color: 'bg-orange-500' },
        { name: 'Newsletter', icon: FileText, url: 'ManageNewsletter', color: 'bg-pink-500' },
        { name: 'Gallery', icon: School, url: 'ManageGallery', color: 'bg-indigo-500' },
        { name: 'School Settings', icon: Settings, url: 'SchoolSettings', color: 'bg-gray-500' },
        { name: 'Messages', icon: MessageCircle, url: 'Messages', color: 'bg-teal-500' }
      );
    }

    if (role === 'Principal') {
      links.push(
        { name: 'Assign Subjects', icon: BookOpen, url: 'AssignSubjects', color: 'bg-blue-500' },
        { name: 'Assign Teachers', icon: Users, url: 'AssignTeachers', color: 'bg-green-500' },
        { name: 'Review Results', icon: ClipboardList, url: 'ReviewResults', color: 'bg-purple-500' },
        { name: 'Calendar', icon: Calendar, url: 'ManageCalendar', color: 'bg-orange-500' },
        { name: 'Timetable', icon: Clock, url: 'ManageTimetable', color: 'bg-pink-500' },
        { name: 'Transcripts', icon: FileText, url: 'Transcripts', color: 'bg-indigo-500' }
      );
    }

    if (role === 'Head Teacher') {
      links.push(
        { name: 'Assign Classes', icon: School, url: 'AssignClasses', color: 'bg-blue-500' },
        { name: 'Review Results', icon: ClipboardList, url: 'ReviewResults', color: 'bg-purple-500' },
        { name: 'Calendar', icon: Calendar, url: 'ManageCalendar', color: 'bg-orange-500' },
        { name: 'Timetable', icon: Clock, url: 'ManageTimetable', color: 'bg-pink-500' },
        { name: 'Transcripts', icon: FileText, url: 'Transcripts', color: 'bg-indigo-500' }
      );
    }

    if (role === 'Teacher' || role === 'Form Teacher') {
      links.push(
        { name: 'Enter Results', icon: ClipboardList, url: 'EnterResults', color: 'bg-blue-500' },
        { name: 'Assignments', icon: FileText, url: 'ManageAssignments', color: 'bg-green-500' },
        { name: 'CBT Exams', icon: ClipboardList, url: 'ManageCBT', color: 'bg-purple-500' },
        { name: 'Lesson Notes', icon: BookOpen, url: 'ManageLessonNotes', color: 'bg-orange-500' }
      );
      if (role === 'Form Teacher') {
        links.push(
          { name: 'Review Class Results', icon: CheckCircle, url: 'ReviewClassResults', color: 'bg-indigo-500' }
        );
      }
    }

    if (role === 'Accountant') {
      links.push(
        { name: 'Fee Payments', icon: DollarSign, url: 'FeePayments', color: 'bg-green-500' },
        { name: 'Approve Results', icon: CheckCircle, url: 'ApproveResultsPrint', color: 'bg-blue-500' },
        { name: 'Fee Records', icon: FileText, url: 'FeeRecords', color: 'bg-purple-500' }
      );
    }

    // Student/Parent links
    if (!role || parentStudents.length > 0) {
      links.push(
        { name: 'View Results', icon: ClipboardList, url: 'ViewResults', color: 'bg-blue-500' },
        { name: 'Assignments', icon: FileText, url: 'StudentAssignments', color: 'bg-green-500' },
        { name: 'CBT Exams', icon: ClipboardList, url: 'TakeCBT', color: 'bg-purple-500' },
        { name: 'Lesson Notes', icon: BookOpen, url: 'ViewLessonNotes', color: 'bg-orange-500' },
        { name: 'Timetable', icon: Clock, url: 'ViewTimetable', color: 'bg-pink-500' },
        { name: 'Newsletter', icon: Bell, url: 'ViewNewsletter', color: 'bg-indigo-500' },
        { name: 'Calendar', icon: Calendar, url: 'ViewCalendar', color: 'bg-teal-500' }
      );
      if (parentStudents.length > 0) {
        links.push(
          { name: 'Message Teacher', icon: MessageCircle, url: 'ParentMessages', color: 'bg-red-500' }
        );
      }
    }

    return links;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2c4a6e] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome, {user?.full_name || 'User'}
              </h1>
              <p className="text-blue-200 mt-1">{user?.email}</p>
              {staffRole && (
                <Badge className={`${getRoleColor(staffRole.role)} mt-2`}>
                  {staffRole.role} {staffRole.section !== 'All' && `- ${staffRole.section}`}
                </Badge>
              )}
              {parentStudents.length > 0 && (
                <Badge className="bg-orange-500 mt-2">Parent</Badge>
              )}
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="outline" className="border-white text-white hover:bg-white/10">
                  View Website
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white/10"
                onClick={() => base44.auth.logout(createPageUrl('Home'))}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        {(staffRole?.role === 'Admin' || staffRole?.role === 'Principal' || staffRole?.role === 'Head Teacher') && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalStudents || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Teachers</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalTeachers || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Subjects</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalSubjects || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending Payments</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.pendingPayments || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {staffRole?.role === 'Accountant' && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending Payments</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.pendingPayments || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Approved Payments</p>
                    <p className="text-3xl font-bold text-green-600">{stats.approvedPayments || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Links */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {getQuickLinks().map((link, idx) => (
                <Link key={idx} to={createPageUrl(link.url)}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer text-center"
                  >
                    <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                      <link.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{link.name}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Student/Parent Info */}
        {parentStudents.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">My Children/Wards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {parentStudents.map((ps) => (
                  <div key={ps.id} className="p-4 bg-gray-50 rounded-xl">
                    <p className="font-semibold text-gray-900">{ps.student_name}</p>
                    <p className="text-sm text-gray-500">{ps.relationship}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  BookOpen, ClipboardList, FileText, Users, Calendar,
  CheckSquare, MessageSquare, LogOut, GraduationCap, Eye, EyeOff, Star,
  UserCheck, Camera, Key, UserCircle, BarChart2, Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';

export default function TeacherPortal() {
  const [teacher, setTeacher] = useState(null);
  const [stats, setStats] = useState({});
  const [pendingCbtGrading, setPendingCbtGrading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);

  // Profile edit
  const [showProfile, setShowProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    const session = sessionStorage.getItem('teacher_portal_logged_in');
    const savedStaffId = sessionStorage.getItem('teacher_portal_staff_id');
    if (session === 'true' && savedStaffId) loadTeacherByStaffId(savedStaffId);
    else setLoading(false);
  }, []);

  const getStoredPassword = (t) => t.custom_password || 'User123';

  const handleLogin = async () => {
    if (!staffId || !password) { setLoginError('Please enter your Staff ID and password'); return; }
    setLoginLoading(true); setLoginError('');
    const teachers = await base44.entities.Teacher.filter({ staff_id: staffId.trim() });
    if (!teachers[0]) { setLoginError('Staff ID not found.'); setLoginLoading(false); return; }
    if (teachers[0].teacher_type === 'Head Teacher') { setLoginError('Please use the Head Teacher Portal.'); setLoginLoading(false); return; }
    if (teachers[0].teacher_type === 'Principal') { setLoginError("Please use the Principal's Portal."); setLoginLoading(false); return; }
    const expected = getStoredPassword(teachers[0]);
    if (password !== expected) { setLoginError('Incorrect password.'); setLoginLoading(false); return; }
    sessionStorage.setItem('teacher_portal_logged_in', 'true');
    sessionStorage.setItem('teacher_portal_staff_id', staffId.trim());
    setLoginLoading(false);
    loadTeacherByStaffId(staffId.trim());
  };

  const loadTeacherByStaffId = async (sid) => {
    setLoading(true);
    const userData = await base44.auth.me().catch(() => null);
    const teacherData = await base44.entities.Teacher.filter({ staff_id: sid });
    if (teacherData[0]) {
      const t = teacherData[0];
      setTeacher(t);
      const cls = t.assigned_class || t.form_teacher_class;
      const isClassOrHead = t.teacher_type === 'Class Teacher' || t.teacher_type === 'Head Teacher';
      const isForm = t.teacher_type === 'Form Teacher';
      let subjectsPromise;
      if (isClassOrHead && cls) {
        subjectsPromise = base44.entities.Subject.filter({ section: t.section, status: 'Active' })
          .then(all => all.filter(s => (s.classes || []).includes(cls)));
      } else if (isForm && cls) {
        subjectsPromise = base44.entities.Subject.filter({ section: 'Secondary', status: 'Active' })
          .then(all => all.filter(s => (s.classes || []).includes(cls)));
      } else {
        subjectsPromise = base44.entities.Subject.filter({ teacher_id: t.id });
      }
      const teacherEmail = userData?.email || t.email || '';
      const [assignments, subjects, students, allExams, allResults] = await Promise.all([
        base44.entities.Assignment.filter({ teacher_id: t.id }),
        subjectsPromise,
        cls ? base44.entities.Student.filter({ current_class: cls, status: 'Active' }) : Promise.resolve([]),
        base44.entities.CBTExam.filter({ created_by: teacherEmail }),
        base44.entities.CBTResult.list('-created_date', 200)
      ]);
      setStats({ mySubjects: subjects.length, myAssignments: assignments.length, myStudents: students.length });
      // Find exams with ungraded theory results
      const pending = allExams.filter(exam => {
        const hasTheory = exam.questions?.some(q => q.type === 'theory');
        if (!hasTheory) return false;
        return allResults.some(r => r.exam_id === exam.id && r.theory_graded === false);
      });
      setPendingCbtGrading(pending);
      setLoggedIn(true);
    } else {
      setLoginError('Teacher record not found.');
      sessionStorage.removeItem('teacher_portal_logged_in');
      sessionStorage.removeItem('teacher_portal_staff_id');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('teacher_portal_logged_in');
    sessionStorage.removeItem('teacher_portal_staff_id');
    setLoggedIn(false); setTeacher(null); setStaffId(''); setPassword('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true); setProfileMsg('');
    const updates = {};
    if (newPassword) {
      if (newPassword.length < 6) { setProfileMsg('Password must be at least 6 characters'); setProfileSaving(false); return; }
      if (newPassword !== confirmPassword) { setProfileMsg('Passwords do not match'); setProfileSaving(false); return; }
      updates.custom_password = newPassword;
    }
    if (photoFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
      updates.passport_photo = file_url;
    }
    if (Object.keys(updates).length === 0) { setProfileMsg('No changes to save'); setProfileSaving(false); return; }
    await base44.entities.Teacher.update(teacher.id, updates);
    setTeacher({ ...teacher, ...updates });
    setProfileMsg('Profile updated successfully!');
    setNewPassword(''); setConfirmPassword(''); setPhotoFile(null);
    setProfileSaving(false);
  };

  const isNurseryPrimary = teacher?.section === 'Nursery' || teacher?.section === 'Primary';
  const isClassOrFormTeacher = teacher?.teacher_type === 'Class Teacher' || teacher?.teacher_type === 'Form Teacher';
  const hasClass = !!(teacher?.assigned_class || teacher?.form_teacher_class);

  const getRoleLabel = () => {
    if (isNurseryPrimary && (teacher?.teacher_type === 'Class Teacher' || teacher?.teacher_type === 'Form Teacher')) return 'Class Teacher & Form Teacher';
    if (teacher?.teacher_type === 'Class Teacher') return `Class Teacher — ${teacher?.assigned_class}`;
    if (teacher?.teacher_type === 'Form Teacher') return `Form Teacher — ${teacher?.form_teacher_class}`;
    return 'Subject Teacher';
  };

  const quickActions = [
    { icon: FileText, label: 'Enter Results', to: '/EnterResults', color: 'bg-blue-500' },
    { icon: ClipboardList, label: 'Review Class Results', to: '/ReviewClassResults', color: 'bg-green-500' },
    { icon: CheckSquare, label: 'Manage Assignments', to: '/ManageAssignments', color: 'bg-purple-500' },
    { icon: BookOpen, label: 'CBT & Question Bank', to: '/ManageCBT', color: 'bg-orange-500' },
    { icon: Calendar, label: 'View Timetable', to: '/ManageTimetable', color: 'bg-teal-500' },
    { icon: Users, label: 'My Students', to: '/ManageStudents', color: 'bg-indigo-500' },
    { icon: Layers, label: 'CMS — Classroom Mgmt', to: '/TeacherCMS', color: 'bg-pink-500' },
    ...(isClassOrFormTeacher ? [{ icon: UserCheck, label: 'Mark Attendance', to: '/MarkAttendance', color: 'bg-emerald-600' }] : []),
    ...(isClassOrFormTeacher ? [{ icon: Star, label: 'Enter Traits & Fees', to: '/ReviewClassResults', color: 'bg-amber-500' }] : []),
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
    </div>
  );

  if (!loggedIn) return (
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
            <Input placeholder="Enter your Staff ID" value={staffId}
              onChange={e => setStaffId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} className="pr-10" />
              <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <Button className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <button type="button" className="w-full text-sm text-[#1e3a5f] hover:text-[#2c4a6e] font-medium" onClick={() => setShowForgotPw(true)}>
            Forgot Password?
          </button>
        </CardContent>
      </Card>
      <ForgotPasswordDialog
        open={showForgotPw}
        onOpenChange={setShowForgotPw}
        entityType="Teacher"
        identifierField="staff_id"
        identifierLabel="Staff ID"
        phoneField="phone"
        themeColor="bg-[#1e3a5f]"
      />
    </div>
  );

  if (showProfile) return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" onClick={() => setShowProfile(false)}>← Back</Button>
          <h2 className="text-xl font-bold">Edit My Profile</h2>
        </div>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-col items-center gap-3">
              {(photoPreview || teacher.passport_photo) ? (
                <img src={photoPreview || teacher.passport_photo} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-blue-200" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserCircle className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <Label className="cursor-pointer bg-blue-50 border border-blue-300 text-blue-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" /> Change Photo
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </Label>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              <p className="font-medium">Password Reset</p>
              <p className="text-xs mt-1">Teachers reset password using their <strong>phone number</strong> as verification.</p>
            </div>
            <div>
              <Label>New Password (leave blank to keep current)</Label>
              <Input type="password" placeholder="New password (min. 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1" />
            </div>
            {profileMsg && <p className={`text-sm font-medium ${profileMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{profileMsg}</p>}
            <Button className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {teacher.passport_photo ? (
              <img src={teacher.passport_photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Users className="w-6 h-6" /></div>
            )}
            <div>
              <h1 className="text-xl font-bold">Teacher Portal</h1>
              <p className="text-sm text-white/80">{teacher?.first_name} {teacher?.last_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0 hidden md:flex">{teacher?.teacher_type}</Badge>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setShowProfile(true)}>
              <Key className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Profile</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Pending CBT theory grading notification */}
        {pendingCbtGrading.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
            <p className="font-bold text-amber-800">⚠️ Action Required: Theory Questions Pending Grading</p>
            <p className="text-sm text-amber-700 mt-1">
              The following CBT exam(s) have ungraded theory answers submitted by students:
            </p>
            <ul className="mt-2 space-y-1">
              {pendingCbtGrading.map(e => (
                <li key={e.id} className="text-sm text-amber-800 font-medium">• {e.title} ({e.subject_name})</li>
              ))}
            </ul>
            <Link to="/ViewCBTResults" className="inline-block mt-2 text-sm text-amber-700 underline font-semibold">
              Go to CBT Results to grade theory answers →
            </Link>
          </div>
        )}

        <Card className="border-0 shadow-md mb-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6 flex items-center gap-4">
            {teacher.passport_photo ? (
              <img src={teacher.passport_photo} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">Welcome, {teacher?.first_name}!</h2>
              <p className="text-white/90">{getRoleLabel()} — {teacher?.section} Section</p>
              {(teacher?.assigned_class || teacher?.form_teacher_class) && (
                <p className="text-white/80 text-sm">Class: {teacher?.assigned_class || teacher?.form_teacher_class}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'My Subjects', value: stats.mySubjects, icon: BookOpen, color: 'text-blue-600' },
            { label: 'My Assignments', value: stats.myAssignments, icon: ClipboardList, color: 'text-green-600' },
            { label: 'My Students', value: stats.myStudents, icon: GraduationCap, color: 'text-purple-600' }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="border-0 shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">{stat.label}</p><p className="text-3xl font-bold">{stat.value || 0}</p></div>
                  <Icon className={`w-8 h-8 ${stat.color} opacity-60`} />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link key={idx} to={action.to}>
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
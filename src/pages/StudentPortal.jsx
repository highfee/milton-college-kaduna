import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  FileText, ClipboardList, BookOpen, Calendar,
  GraduationCap, LogOut, TrendingUp, Eye, EyeOff,
  Camera, Key, Award, UserCircle, CheckSquare, BarChart2,
  CreditCard, Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StudentPortal() {
  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [admissionNo, setAdmissionNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Profile edit
  const [showProfile, setShowProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    const session = sessionStorage.getItem('student_portal_logged_in');
    const savedAdmNo = sessionStorage.getItem('student_portal_adm');
    if (session === 'true' && savedAdmNo) {
      loadStudentByAdmission(savedAdmNo);
    } else {
      setLoading(false);
    }
  }, []);

  const getStoredPassword = (s) => s.custom_password || 'User123';

  const handleLogin = async () => {
    if (!admissionNo || !password) { setLoginError('Please enter your Admission Number and password'); return; }
    setLoginLoading(true); setLoginError('');
    const students = await base44.entities.Student.filter({ admission_number: admissionNo.trim() });
    if (!students[0]) { setLoginError('Admission number not found.'); setLoginLoading(false); return; }
    const expected = getStoredPassword(students[0]);
    if (password !== expected) { setLoginError('Incorrect password.'); setLoginLoading(false); return; }
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
      const [allAssignments, results, cbtExams, allSubjects, cbtResults, payments] = await Promise.all([
        base44.entities.Assignment.filter({ class: studentData[0].current_class }),
        base44.entities.Result.filter({ student_id: studentData[0].id, status: 'Approved' }),
        base44.entities.CBTExam.filter({ status: 'Published' }),
        base44.entities.Subject.filter({ status: 'Active' }),
        base44.entities.CBTResult.filter({ student_id: studentData[0].id }),
        base44.entities.SchoolFeePayment.filter({ admission_number: studentData[0].admission_number })
      ]);
      setFeePayments(payments);
      // Show Active assignments OR any assignment not explicitly Inactive
      const assignments = allAssignments.filter(a => !a.status || a.status === 'Active');
      const classSubjects = allSubjects.filter(s => s.classes?.includes(studentData[0].current_class));
      setSubjects(classSubjects);
      const now = new Date();
      const takenCBT = cbtResults.map(r => r.exam_id);
      const availableCBT = cbtExams.filter(exam => {
        if (!exam.classes?.includes(studentData[0].current_class)) return false;
        if (takenCBT.includes(exam.id)) return false;
        // Check date window only if both dates are set
        if (exam.start_date && exam.end_date) {
          return new Date(exam.start_date) <= now && new Date(exam.end_date) >= now;
        }
        return true; // No date restriction — always available
      });
      setStats({
        activeAssignments: assignments.length,
        completedSubjects: results.length,
        availableCBT: availableCBT.length,
        totalSubjects: classSubjects.length,
        cbtScores: cbtResults.length
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
    setLoggedIn(false); setStudent(null); setAdmissionNo(''); setPassword('');
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
    await base44.entities.Student.update(student.id, updates);
    setStudent({ ...student, ...updates });
    setProfileMsg('Profile updated successfully!');
    setNewPassword(''); setConfirmPassword(''); setPhotoFile(null);
    setProfileSaving(false);
  };

  const quickActions = [
    { icon: FileText, label: 'Check My Results', to: '/CheckResult', color: 'bg-blue-500' },
    { icon: CheckSquare, label: 'Take Assignments & Homework', to: '/StudentAssignments', color: 'bg-green-500' },
    { icon: BookOpen, label: 'Take CBT Exam', to: '/TakeCBT', color: 'bg-purple-500' },
    { icon: TrendingUp, label: 'My CBT Results', to: '/ViewCBTResults', color: 'bg-orange-500' },
    { icon: Award, label: 'Assignment Scores', to: '/StudentAssignmentScores', color: 'bg-pink-500' },
    { icon: BarChart2, label: 'LMS — Learning Portal', to: '/StudentLMS', color: 'bg-indigo-600' },
    { icon: Calendar, label: 'School Calendar', to: '/ManageCalendar', color: 'bg-teal-500' },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
    </div>
  );

  if (!loggedIn) return (
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
            <Label>Admission Number</Label>
            <Input placeholder="Enter your Admission Number" value={admissionNo}
              onChange={e => setAdmissionNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
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
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardContent>
      </Card>
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
              {(photoPreview || student.passport_photo) ? (
                <img src={photoPreview || student.passport_photo} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-green-200" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserCircle className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <Label className="cursor-pointer bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" /> Change Photo
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </Label>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              <p className="font-medium">Password Reset</p>
              <p className="text-xs mt-1">Students reset password using their <strong>Admission Number</strong> as verification.</p>
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
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSaveProfile} disabled={profileSaving}>
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
            {student.passport_photo ? (
              <img src={student.passport_photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><GraduationCap className="w-6 h-6" /></div>
            )}
            <div>
              <h1 className="text-xl font-bold">Student Portal</h1>
              <p className="text-sm text-white/80">{student?.first_name} {student?.last_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0 hidden md:flex">{student?.current_class}</Badge>
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
        <Card className="border-0 shadow-md mb-8 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {student.passport_photo ? (
                <img src={student.passport_photo} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white/30" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <GraduationCap className="w-10 h-10" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{student.first_name} {student.middle_name} {student.last_name}</h2>
                <p className="text-white/90">Admission No: {student.admission_number}</p>
                <p className="text-white/90">{student.current_class} | {student.section} Section</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'My Subjects', value: stats.totalSubjects, icon: BookOpen, color: 'text-blue-600' },
            { label: 'Results Available', value: stats.completedSubjects, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Assignments', value: stats.activeAssignments, icon: ClipboardList, color: 'text-orange-600' },
            { label: 'CBT Exams Available', value: stats.availableCBT, icon: FileText, color: 'text-purple-600' },
            { label: 'Fee Payments', value: feePayments.length, icon: CreditCard, color: 'text-emerald-600' },
            { label: 'Total Paid', value: `₦${feePayments.reduce((s,p) => s + (p.amount_paid||0), 0).toLocaleString()}`, icon: Wallet, color: 'text-green-600' },
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

        {subjects.length > 0 && (
          <Card className="border-0 shadow-md mb-8">
            <CardHeader><CardTitle>My Subjects ({subjects.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subjects.map(subject => (
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

        {feePayments.length > 0 && (
          <Card className="border-0 shadow-md mb-8">
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" /> My Fee Payments ({feePayments.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Receipt #', 'Term', 'Session', 'Amount Paid', 'Balance', 'Method', 'Date', 'Status'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {feePayments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-mono text-blue-700">{p.receipt_number}</td>
                        <td className="px-4 py-3 text-sm">{p.term}</td>
                        <td className="px-4 py-3 text-sm">{p.session || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-700">₦{(p.amount_paid || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{p.balance ? `₦${p.balance.toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-3 text-sm">{p.payment_method}</td>
                        <td className="px-4 py-3 text-sm">{p.payment_date}</td>
                        <td className="px-4 py-3">
                          <Badge variant={p.status === 'Paid' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
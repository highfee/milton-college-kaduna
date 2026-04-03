import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  FileText, GraduationCap, LogOut, UserCircle, TrendingUp, BookOpen, 
  Eye, Bell, CreditCard, ClipboardCheck, CheckCircle2, XCircle, Clock, 
  AlertCircle, BarChart2, Award, Phone, Star, MessageCircle, Download,
  Calendar, Newspaper, Layout, Lock, Key, Send, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import ResultSlip from '@/components/ResultSlip';

const BANK_DETAILS = {
  accountNumber: '0232002677',
  accountName: 'Milton College',
  bankName: 'EcoBank Nigeria Plc',
};

export default function ParentPortal() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [parentRecord, setParentRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Login state
  const [parentIdInput, setParentIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Data states
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [newsletters, setNewsletters] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [showResultSlip, setShowResultSlip] = useState(null);

  // Rating state
  const [rating, setRating] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Message state
  const [messageText, setMessageText] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  // Fee payment
  const [selectedFeeType, setSelectedFeeType] = useState('');
  const [feeAmount, setFeeAmount] = useState('');

  useEffect(() => {
    const session = sessionStorage.getItem('parent_portal_pid');
    if (session) loadParentByParentId(session, true);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedChild) loadChildData();
  }, [selectedChild]);

  const handleLogin = async () => {
    if (!parentIdInput.trim() || !passwordInput.trim()) {
      setLoginError('Please enter your Parent ID and password');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    const parents = await base44.entities.Parent.filter({ parent_id: parentIdInput.trim() });
    if (!parents[0]) {
      setLoginError('Parent ID not found. Please check and try again.');
      setLoginLoading(false);
      return;
    }
    const parent = parents[0];
    // Default password = phone number. Custom password stored in parent.custom_password
    const expectedPassword = parent.custom_password || parent.phone;
    if (passwordInput.trim() !== expectedPassword) {
      setLoginError('Incorrect password. Default password is your phone number.');
      setLoginLoading(false);
      return;
    }
    // Check if first login (no custom_password set yet)
    const firstLogin = !parent.custom_password;
    setIsFirstLogin(firstLogin);
    sessionStorage.setItem('parent_portal_pid', parentIdInput.trim());
    setLoginLoading(false);
    loadParentByParentId(parentIdInput.trim(), false, firstLogin);
  };

  const loadParentByParentId = async (pid, silent, firstLogin = false) => {
    if (!silent) setLoading(true);
    const parents = await base44.entities.Parent.filter({ parent_id: pid });
    if (!parents[0]) {
      sessionStorage.removeItem('parent_portal_pid');
      setLoading(false);
      return;
    }
    const parent = parents[0];
    setParentRecord(parent);
    if (!parent.custom_password) setIsFirstLogin(true);

    const [settingsData, byEmail, byLink] = await Promise.all([
      base44.entities.SchoolSettings.list(),
      parent.email ? base44.entities.Student.filter({ parent_email: parent.email }) : Promise.resolve([]),
      parent.email ? base44.entities.ParentStudent.filter({ parent_email: parent.email }) : Promise.resolve([])
    ]);
    setSchoolSettings(settingsData[0] || {});

    const byPhone = await base44.entities.Student.filter({ parent_phone: parent.phone });
    const linkedIds = byLink.map(l => l.student_id);
    const linkedStudents = linkedIds.length > 0
      ? (await Promise.all(linkedIds.map(id => base44.entities.Student.filter({ id })))).flat()
      : [];

    const allChildren = [...byEmail];
    [...byPhone, ...linkedStudents].forEach(s => {
      if (!allChildren.find(c => c.id === s.id)) allChildren.push(s);
    });

    setChildren(allChildren);
    if (allChildren[0]) setSelectedChild(allChildren[0]);
    setLoggedIn(true);
    setLoading(false);

    // Load shared data
    const [nl, cal] = await Promise.all([
      base44.entities.Newsletter.filter({ status: 'Published' }),
      base44.entities.Calendar.list()
    ]);
    setNewsletters(nl);
    setCalendars(cal);
  };

  const loadChildData = async () => {
    if (!selectedChild) return;
    setDataLoading(true);
    const [resultsData, attendanceData, timetableData] = await Promise.all([
      base44.entities.Result.filter({ student_id: selectedChild.id }),
      base44.entities.Attendance.filter({ student_id: selectedChild.id }),
      base44.entities.Timetable.filter({ class: selectedChild.current_class })
    ]);
    setResults(resultsData);
    setAttendance(attendanceData);
    setTimetables(timetableData);
    setDataLoading(false);
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!newPassword || newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    await base44.entities.Parent.update(parentRecord.id, { custom_password: newPassword });
    setParentRecord({ ...parentRecord, custom_password: newPassword });
    setIsFirstLogin(false);
    setPwSuccess('Password changed successfully!');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => { setShowChangePw(false); setPwSuccess(''); }, 2000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('parent_portal_pid');
    setLoggedIn(false);
    setParentRecord(null);
    setChildren([]);
    setSelectedChild(null);
    setParentIdInput('');
    setPasswordInput('');
    setResults([]);
    setAttendance([]);
    setShowResultSlip(null);
    setIsFirstLogin(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    await base44.entities.Message.create({
      from_name: parentRecord?.full_name,
      from_phone: parentRecord?.phone,
      subject: `Message from parent of ${selectedChild?.first_name} ${selectedChild?.last_name} (${selectedChild?.current_class})`,
      content: messageText,
      message_type: 'Parent-Teacher'
    });
    setMessageSent(true);
    setMessageText('');
    setTimeout(() => setMessageSent(false), 3000);
  };

  const handleRatingSubmit = async () => {
    if (!ratingReview.trim()) return;
    await base44.entities.Rating.create({
      user_name: parentRecord?.full_name || 'Parent',
      user_email: parentRecord?.email || '',
      user_type: 'Parent',
      rating,
      review: ratingReview
    });
    setRatingSubmitted(true);
  };

  // Computed helpers
  const currentTerm = schoolSettings?.current_term;
  const currentSession = schoolSettings?.current_session;

  const termAttendance = attendance.filter(a => a.term === currentTerm && a.session === currentSession);
  const presentCount = termAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const absentCount = termAttendance.filter(a => a.status === 'Absent').length;

  const currentResults = results.filter(r => r.term === currentTerm && r.session === currentSession && r.status === 'Approved');
  const currentAvg = currentResults.length
    ? (currentResults.reduce((s, r) => s + (r.total || 0), 0) / currentResults.length).toFixed(1)
    : null;

  const termGroups = {};
  results.filter(r => r.status === 'Approved').forEach(r => {
    const key = `${r.session}__${r.term}`;
    if (!termGroups[key]) termGroups[key] = { term: r.term, session: r.session, results: [] };
    termGroups[key].results.push(r);
  });
  const termHistory = Object.values(termGroups).sort((a, b) => {
    const order = { 'First Term': 1, 'Second Term': 2, 'Third Term': 3 };
    return b.session.localeCompare(a.session) || order[b.term] - order[a.term];
  });

  const progressResults = results.filter(r =>
    r.term === currentTerm && r.session === currentSession &&
    (r.first_ca != null || r.second_ca != null)
  );

  const feeRecord = results.find(r => r.school_fees_current > 0);

  // ---- LOADING ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // ---- LOGIN ----
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-blue-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Parent Portal</h1>
            <p className="text-white/70 mt-2">Milton College of Arts & Science</p>
          </div>
          <Card className="border-0 shadow-2xl">
            <CardContent className="p-8 space-y-5">
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-gray-800">Sign In</h2>
                <p className="text-gray-500 text-sm mt-1">Username: Parent ID | Default Password: Phone Number</p>
              </div>
              <div>
                <Label className="text-gray-700 font-medium">Parent ID (Username)</Label>
                <div className="relative mt-1">
                  <UserCircle className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="e.g. PAR123456"
                    value={parentIdInput}
                    onChange={(e) => setParentIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-700 font-medium">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Default: your phone number"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="pl-10 pr-10 h-11"
                  />
                  <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{loginError}</p>
                </div>
              )}
              <Button
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-base"
                onClick={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Contact the school admin if you cannot log in
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loggedIn && children.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Children Found</h2>
            <p className="text-gray-600 mb-4">No student records are linked to your account. Please contact the school admin.</p>
            <Button onClick={handleLogout} className="bg-purple-600 hover:bg-purple-700">Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- RESULT SLIP VIEW (view only, no download/screenshot) ----
  if (showResultSlip) {
    const slipResults = results.filter(r =>
      r.term === showResultSlip.term &&
      r.session === showResultSlip.session &&
      r.student_id === selectedChild.id &&
      r.status === 'Approved'
    );
    return (
      <div className="min-h-screen bg-gray-50" style={{ userSelect: 'none' }}>
        <style>{`
          @media print { .no-print { display: none !important; } }
          * { -webkit-user-select: none; user-select: none; }
        `}</style>
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3 no-print">
          <Button variant="outline" size="sm" onClick={() => setShowResultSlip(null)}>← Back</Button>
          <span className="font-semibold text-sm">{showResultSlip.term} — {showResultSlip.session} Result</span>
          <Badge className="ml-2 bg-green-100 text-green-700 border-0 text-xs">
            <ShieldCheck className="w-3 h-3 mr-1" /> View Only
          </Badge>
        </div>
        <div className="p-4 overflow-auto" onContextMenu={(e) => e.preventDefault()}>
          <ResultSlip
            student={selectedChild}
            results={slipResults}
            settings={schoolSettings}
            term={showResultSlip.term}
            session={showResultSlip.session}
          />
        </div>
      </div>
    );
  }

  // ---- CHANGE PASSWORD (forced on first login) ----
  if (isFirstLogin || showChangePw) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-xl p-5 text-white text-center">
            <Key className="w-10 h-10 mx-auto mb-2" />
            <h2 className="text-xl font-bold">{isFirstLogin ? 'Set Your New Password' : 'Change Password'}</h2>
            {isFirstLogin && <p className="text-white/80 text-sm mt-1">Please change your default password to continue</p>}
          </div>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>New Password (min. 6 characters)</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
            {pwSuccess && <p className="text-green-600 text-sm font-medium">{pwSuccess}</p>}
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleChangePassword}>
              Save New Password
            </Button>
            {!isFirstLogin && (
              <Button variant="outline" className="w-full" onClick={() => setShowChangePw(false)}>
                Cancel
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- MAIN DASHBOARD ----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-blue-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <UserCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Parent Portal</h1>
                <p className="text-white/80 text-xs">{parentRecord?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setShowChangePw(true)}>
                <Key className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Change Password</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Child Selector */}
        {children.length > 1 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <label className="text-sm font-medium text-gray-600 block mb-2">Select Child</label>
              <Select value={selectedChild?.id} onValueChange={(id) => setSelectedChild(children.find(c => c.id === id))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {children.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.first_name} {child.last_name} — {child.current_class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Student Profile Card */}
        {selectedChild && (
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5 flex items-center gap-4">
              {selectedChild.passport_photo ? (
                <img src={selectedChild.passport_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/40 shadow" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <UserCircle className="w-9 h-9 text-white" />
                </div>
              )}
              <div className="text-white">
                <h2 className="text-xl font-bold">{selectedChild.first_name} {selectedChild.middle_name} {selectedChild.last_name}</h2>
                <p className="text-white/80 text-sm">Adm. No: {selectedChild.admission_number}</p>
                <p className="text-white/80 text-sm">{selectedChild.current_class} · {selectedChild.section} Section</p>
              </div>
              <div className="ml-auto">
                <Badge className="bg-white/20 text-white border-0">{selectedChild.status || 'Active'}</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Stats */}
        {selectedChild && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={ClipboardCheck} iconColor="text-green-600" bg="bg-green-50" label="Days Present" value={presentCount} sub={`${termAttendance.length} total`} />
            <StatCard icon={XCircle} iconColor="text-red-500" bg="bg-red-50" label="Days Absent" value={absentCount} sub="this term" />
            <StatCard icon={BookOpen} iconColor="text-blue-600" bg="bg-blue-50" label="Subjects" value={currentResults.length} sub="approved" />
            <StatCard icon={BarChart2} iconColor="text-purple-600" bg="bg-purple-50" label="Current Avg" value={currentAvg ? `${currentAvg}%` : 'N/A'} sub="results" />
          </div>
        )}

        {/* Main Tabs */}
        {selectedChild && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4 md:grid-cols-8 bg-white shadow-sm border rounded-xl p-1 h-auto gap-1">
              {[
                { value: 'overview', label: 'Overview' },
                { value: 'attendance', label: 'Attendance' },
                { value: 'results', label: 'Results' },
                { value: 'fees', label: 'Fees' },
                { value: 'timetable', label: 'Timetable' },
                { value: 'newsletter', label: 'Newsletter' },
                { value: 'messages', label: 'Messages' },
                { value: 'rate', label: 'Rate School' },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs py-1.5 px-1">{t.label}</TabsTrigger>
              ))}
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    Current Term Academic Progress
                    <Badge variant="outline" className="ml-auto text-xs">{currentTerm} · {currentSession}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dataLoading ? <LoadingSpinner /> : progressResults.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No scores uploaded yet for this term.</p>
                  ) : (
                    <div className="space-y-3">
                      {progressResults.map((r, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{r.subject_name}</span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {r.first_ca != null && <Badge className="bg-blue-100 text-blue-700 text-xs border-0">CA1: {r.first_ca}</Badge>}
                              {r.second_ca != null && <Badge className="bg-green-100 text-green-700 text-xs border-0">CA2: {r.second_ca}</Badge>}
                              {r.third_ca != null && <Badge className="bg-yellow-100 text-yellow-700 text-xs border-0">CA3: {r.third_ca}</Badge>}
                              {r.total != null && <Badge className="bg-purple-100 text-purple-700 text-xs border-0">Total: {r.total}</Badge>}
                            </div>
                          </div>
                          {r.total != null && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${r.total >= 70 ? 'bg-green-500' : r.total >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(r.total, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-500" />
                    Recent Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dataLoading ? <LoadingSpinner /> : termAttendance.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No attendance records this term.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...termAttendance].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 7).map((a, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            {a.status === 'Present' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                             a.status === 'Late' ? <Clock className="w-4 h-4 text-yellow-500" /> :
                             a.status === 'Excused' ? <AlertCircle className="w-4 h-4 text-blue-500" /> :
                             <XCircle className="w-4 h-4 text-red-500" />}
                            <span className="text-sm text-gray-700">{a.date}</span>
                          </div>
                          <Badge className={`text-xs border-0 ${
                            a.status === 'Present' ? 'bg-green-100 text-green-700' :
                            a.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                            a.status === 'Excused' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>{a.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ATTENDANCE TAB */}
            <TabsContent value="attendance" className="space-y-4 mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Attendance — {currentTerm}, {currentSession}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                      <p className="text-xs text-green-700">Present</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-red-500">{absentCount}</p>
                      <p className="text-xs text-red-600">Absent</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{termAttendance.length}</p>
                      <p className="text-xs text-blue-700">Total Days</p>
                    </div>
                  </div>
                  {dataLoading ? <LoadingSpinner /> : termAttendance.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No attendance records found for this term.</p>
                  ) : (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {[...termAttendance].sort((a, b) => b.date?.localeCompare(a.date)).map((a, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            {a.status === 'Present' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                             a.status === 'Late' ? <Clock className="w-4 h-4 text-yellow-500" /> :
                             a.status === 'Excused' ? <AlertCircle className="w-4 h-4 text-blue-500" /> :
                             <XCircle className="w-4 h-4 text-red-500" />}
                            <span className="text-sm text-gray-700">{a.date}</span>
                            {a.remarks && <span className="text-xs text-gray-400">— {a.remarks}</span>}
                          </div>
                          <Badge className={`text-xs border-0 ${
                            a.status === 'Present' ? 'bg-green-100 text-green-700' :
                            a.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                            a.status === 'Excused' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>{a.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* RESULTS TAB */}
            <TabsContent value="results" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">Results are view-only. Download and screenshot are disabled.</p>
              </div>

              {currentResults.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{currentTerm} Results ({currentSession})</span>
                      <Button size="sm" variant="outline" className="text-xs h-7"
                        onClick={() => setShowResultSlip({ term: currentTerm, session: currentSession })}>
                        <Eye className="w-3 h-3 mr-1" /> View Slip
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2" style={{ userSelect: 'none' }}>
                      {currentResults.map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-800">{r.subject_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{r.total ?? '—'}/100</span>
                            <Badge className={`text-xs border-0 ${
                              (r.total || 0) >= 70 ? 'bg-green-100 text-green-700' :
                              (r.total || 0) >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>{r.grade}</Badge>
                          </div>
                        </div>
                      ))}
                      {currentAvg && (
                        <div className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-lg mt-2">
                          <span className="text-sm font-bold text-purple-700">Average</span>
                          <span className="font-bold text-purple-700">{currentAvg}%</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    Term-by-Term Performance History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dataLoading ? <LoadingSpinner /> : termHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No result history available yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {termHistory.map((th, i) => {
                        const avg = (th.results.reduce((s, r) => s + (r.total || 0), 0) / th.results.length).toFixed(1);
                        const isCurrent = th.term === currentTerm && th.session === currentSession;
                        return (
                          <div key={i} className={`border rounded-xl p-4 ${isCurrent ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{th.term}</p>
                                <p className="text-xs text-gray-500">{th.session}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${Number(avg) >= 70 ? 'text-green-600' : Number(avg) >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{avg}%</span>
                                <Button size="sm" variant="outline" className="text-xs h-7"
                                  onClick={() => setShowResultSlip({ term: th.term, session: th.session })}>
                                  <Eye className="w-3 h-3 mr-1" /> View
                                </Button>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full ${Number(avg) >= 70 ? 'bg-green-500' : Number(avg) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(Number(avg), 100)}%` }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{th.results.length} subjects</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* FEES TAB */}
            <TabsContent value="fees" className="space-y-4 mt-4">
              {/* Fee balance */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    Fee Status — {currentTerm}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feeRecord ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-blue-600 mb-1">Current Term Fees</p>
                        <p className="text-2xl font-bold text-blue-700">₦{(feeRecord.school_fees_current || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-orange-600 mb-1">Arrears</p>
                        <p className="text-2xl font-bold text-orange-700">₦{(feeRecord.school_fees_arrears || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-2">Contact school admin for your fee details.</p>
                  )}
                </CardContent>
              </Card>

              {/* Payment options */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pay Fees — Bank Transfer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-5 text-white">
                    <p className="text-xs text-green-100 mb-3 font-medium uppercase tracking-wide">School Bank Account</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-green-200">Account Name</p>
                        <p className="text-lg font-bold">{BANK_DETAILS.accountName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-200">Account Number</p>
                        <p className="text-2xl font-bold tracking-widest">{BANK_DETAILS.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-200">Bank</p>
                        <p className="font-semibold">{BANK_DETAILS.bankName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Fee Type</Label>
                      <Select value={selectedFeeType} onValueChange={setSelectedFeeType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select fee type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tuition">School Tuition Fees</SelectItem>
                          <SelectItem value="books">Books / Textbooks</SelectItem>
                          <SelectItem value="uniform">School Uniform</SelectItem>
                          <SelectItem value="exam">Exam Fees</SelectItem>
                          <SelectItem value="ict">ICT / Computer Levy</SelectItem>
                          <SelectItem value="other">Other Fees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Amount (₦)</Label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                    <p className="font-semibold">Payment Instructions:</p>
                    <p>1. Transfer to the account above</p>
                    <p>2. Use your child's Admission Number as narration</p>
                    <p>3. Send proof of payment to the school via WhatsApp</p>
                    <p className="font-medium">Admission No: <span className="text-blue-900">{selectedChild?.admission_number}</span></p>
                  </div>

                  <a
                    href={`https://wa.me/2348033492870?text=${encodeURIComponent(`Hello, I have made a payment for ${selectedFeeType || 'school fees'} for my child ${selectedChild?.first_name} ${selectedChild?.last_name} (Adm. No: ${selectedChild?.admission_number}) - Amount: ₦${feeAmount || '___'}. Please find attached proof of payment.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <MessageCircle className="w-4 h-4 mr-2" /> Send Payment Proof via WhatsApp
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TIMETABLE TAB */}
            <TabsContent value="timetable" className="space-y-4 mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layout className="w-4 h-4 text-blue-600" />
                    Class Timetable — {selectedChild?.current_class}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dataLoading ? <LoadingSpinner /> : timetables.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6">No timetable available for this class yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {timetables.map((tt, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-800">{tt.title}</p>
                              <p className="text-xs text-gray-500">{tt.term} · {tt.session}</p>
                            </div>
                            {tt.attachment_url && (
                              <a href={tt.attachment_url} download target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="text-xs h-7">
                                  <Download className="w-3 h-3 mr-1" /> Download
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* NEWSLETTER TAB */}
            <TabsContent value="newsletter" className="space-y-4 mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-indigo-600" />
                    School Newsletter & Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {newsletters.length === 0 && calendars.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6">No newsletters or calendars published yet.</p>
                  ) : (
                    <>
                      {newsletters.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2 text-sm">Newsletters</p>
                          <div className="space-y-2">
                            {newsletters.map((nl, i) => (
                              <div key={i} className="border rounded-lg p-3 flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{nl.title}</p>
                                  <p className="text-xs text-gray-500">{nl.term} · {nl.session}</p>
                                </div>
                                {nl.attachment_url && (
                                  <a href={nl.attachment_url} download target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline" className="text-xs h-7">
                                      <Download className="w-3 h-3 mr-1" /> Download
                                    </Button>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {calendars.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2 text-sm">School Calendars</p>
                          <div className="space-y-2">
                            {calendars.map((cal, i) => (
                              <div key={i} className="border rounded-lg p-3 flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{cal.title}</p>
                                  <p className="text-xs text-gray-500">{cal.term} · {cal.session} · {cal.section}</p>
                                </div>
                                {cal.attachment_url && (
                                  <a href={cal.attachment_url} download target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline" className="text-xs h-7">
                                      <Download className="w-3 h-3 mr-1" /> Download
                                    </Button>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* MESSAGES TAB */}
            <TabsContent value="messages" className="space-y-4 mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-teal-600" />
                    Message Class/Form Teacher
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-medium">Child: {selectedChild?.first_name} {selectedChild?.last_name}</p>
                    <p className="text-xs text-blue-600">Class: {selectedChild?.current_class}</p>
                  </div>
                  <Textarea
                    placeholder="Type your message to the class/form teacher..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                  />
                  {messageSent && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <p className="text-green-700 text-sm">Message sent successfully!</p>
                    </div>
                  )}
                  <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleSendMessage} disabled={!messageText.trim()}>
                    <Send className="w-4 h-4 mr-2" /> Send Message
                  </Button>
                  <p className="text-xs text-gray-400 text-center">Message goes to the school admin who will forward to the teacher</p>

                  <div className="border-t pt-3 mt-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Contact via WhatsApp</p>
                    <a href="https://wa.me/2348033492870" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full border-green-400 text-green-700">
                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp School: 08033492870
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* RATE SCHOOL TAB */}
            <TabsContent value="rate" className="space-y-4 mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Rate Our School
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ratingSubmitted ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                      <h3 className="text-xl font-bold text-gray-800">Thank You!</h3>
                      <p className="text-gray-500 mt-2">Your rating has been submitted. We appreciate your feedback.</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <p className="text-gray-600 mb-3">How would you rate Milton College?</p>
                        <div className="flex justify-center gap-2 mb-2">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} type="button" onClick={() => setRating(s)}>
                              <Star className={`w-8 h-8 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500">{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}</p>
                      </div>
                      <Textarea
                        placeholder="Share your experience with the school..."
                        value={ratingReview}
                        onChange={(e) => setRatingReview(e.target.value)}
                        rows={4}
                      />
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleRatingSubmit} disabled={!ratingReview.trim()}>
                        <Star className="w-4 h-4 mr-2" /> Submit Rating
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, bg, label, value, sub }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-2`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs font-medium text-gray-600">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
    </div>
  );
}
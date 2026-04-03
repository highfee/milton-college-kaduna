import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  FileText, GraduationCap, LogOut, UserCircle, TrendingUp, BookOpen, 
  Eye, Bell, CreditCard, ClipboardCheck,
  CheckCircle2, XCircle, Clock, AlertCircle, BarChart2, Award, Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResultSlip from '@/components/ResultSlip';

export default function ParentPortal() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [parentRecord, setParentRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [showResultSlip, setShowResultSlip] = useState(null); // { term, session }

  useEffect(() => {
    const session = sessionStorage.getItem('parent_portal_phone');
    if (session) loadParentByPhone(session, true);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedChild) loadChildData();
  }, [selectedChild]);

  const handleLogin = async () => {
    if (!phoneInput.trim()) { setLoginError('Please enter your phone number'); return; }
    setLoginLoading(true);
    setLoginError('');
    // Try matching phone on Parent entity
    const parents = await base44.entities.Parent.filter({ phone: phoneInput.trim() });
    if (!parents[0]) {
      // Try partial match variant
      setLoginError('Phone number not found. Please use the number registered with the school.');
      setLoginLoading(false);
      return;
    }
    sessionStorage.setItem('parent_portal_phone', phoneInput.trim());
    setLoginLoading(false);
    loadParentByPhone(phoneInput.trim(), false);
  };

  const loadParentByPhone = async (phone, silent) => {
    if (!silent) setLoading(true);
    const parents = await base44.entities.Parent.filter({ phone });
    if (!parents[0]) {
      sessionStorage.removeItem('parent_portal_phone');
      setLoading(false);
      return;
    }
    const parent = parents[0];
    setParentRecord(parent);

    const [settingsData, byEmail, byLink] = await Promise.all([
      base44.entities.SchoolSettings.list(),
      parent.email ? base44.entities.Student.filter({ parent_email: parent.email }) : Promise.resolve([]),
      parent.email ? base44.entities.ParentStudent.filter({ parent_email: parent.email }) : Promise.resolve([])
    ]);
    setSchoolSettings(settingsData[0] || {});

    // Also try matching by parent_phone on Student
    const byPhone = await base44.entities.Student.filter({ parent_phone: phone });

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
  };

  const loadChildData = async () => {
    if (!selectedChild) return;
    setDataLoading(true);
    const [resultsData, attendanceData] = await Promise.all([
      base44.entities.Result.filter({ student_id: selectedChild.id }),
      base44.entities.Attendance.filter({ student_id: selectedChild.id })
    ]);
    setResults(resultsData);
    setAttendance(attendanceData);
    setDataLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('parent_portal_phone');
    setLoggedIn(false);
    setParentRecord(null);
    setChildren([]);
    setSelectedChild(null);
    setPhoneInput('');
    setResults([]);
    setAttendance([]);
    setShowResultSlip(null);
  };

  // ---- Computed helpers ----
  const currentTerm = schoolSettings?.current_term;
  const currentSession = schoolSettings?.current_session;

  const termAttendance = attendance.filter(a => a.term === currentTerm && a.session === currentSession);
  const presentCount = termAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const absentCount = termAttendance.filter(a => a.status === 'Absent').length;

  const currentResults = results.filter(r => r.term === currentTerm && r.session === currentSession && r.status === 'Approved');
  const currentAvg = currentResults.length
    ? (currentResults.reduce((s, r) => s + (r.total || 0), 0) / currentResults.length).toFixed(1)
    : null;

  // Group results by term+session for history
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

  // Early CA progress (any result with first_ca filled even if not approved)
  const progressResults = results.filter(r => r.term === currentTerm && r.session === currentSession && (r.first_ca != null || r.second_ca != null));

  // School fees from results (latest record with fee data)
  const feeRecord = results.find(r => r.school_fees_current > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo / School branding */}
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
                <p className="text-gray-500 text-sm mt-1">Use the phone number registered with the school</p>
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="pl-10 h-11"
                  />
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
                  <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Signing in...</span>
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
            <p className="text-gray-600 mb-4">No student records are linked to your phone number. Please contact the school admin.</p>
            <Button onClick={handleLogout} className="bg-purple-600 hover:bg-purple-700">Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Result Slip View ----
  if (showResultSlip) {
    const slipResults = results.filter(r =>
      r.term === showResultSlip.term &&
      r.session === showResultSlip.session &&
      r.student_id === selectedChild.id
    );
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3 no-print">
          <Button variant="outline" size="sm" onClick={() => setShowResultSlip(null)}>
            ← Back
          </Button>
          <span className="font-semibold">{showResultSlip.term} — {showResultSlip.session} Result Slip</span>
          <Button size="sm" className="ml-auto bg-[#1e3a5f]" onClick={() => window.print()}>Print</Button>
        </div>
        <div className="p-4">
          <ResultSlip
            student={selectedChild}
            results={slipResults}
            term={showResultSlip.term}
            session={showResultSlip.session}
            schoolSettings={schoolSettings}
            allStudentResults={results}
          />
        </div>
      </div>
    );
  }

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
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <img src={selectedChild.passport_photo} alt="" className="w-16 h-16 rounded-full object-cover border-3 border-white/40 shadow" />
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
                <Badge className="bg-white/20 text-white border-0 capitalize">{selectedChild.status || 'Active'}</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Stats */}
        {selectedChild && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={ClipboardCheck} iconColor="text-green-600" bg="bg-green-50" label="Days Present" value={presentCount} sub={`${termAttendance.length} total days`} />
            <StatCard icon={XCircle} iconColor="text-red-500" bg="bg-red-50" label="Days Absent" value={absentCount} sub="this term" />
            <StatCard icon={BookOpen} iconColor="text-blue-600" bg="bg-blue-50" label="Subjects" value={currentResults.length} sub="results available" />
            <StatCard icon={BarChart2} iconColor="text-purple-600" bg="bg-purple-50" label="Current Avg" value={currentAvg ? `${currentAvg}%` : 'N/A'} sub="approved results" />
          </div>
        )}

        {/* Tabs */}
        {selectedChild && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4 bg-white shadow-sm border rounded-xl p-1 h-auto">
              <TabsTrigger value="overview" className="text-xs py-2">Overview</TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs py-2">Attendance</TabsTrigger>
              <TabsTrigger value="results" className="text-xs py-2">Results</TabsTrigger>
              <TabsTrigger value="fees" className="text-xs py-2">Fees</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* CA Progress */}
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
                      {progressResults.map((r, i) => {
                        const totalSoFar = (r.first_ca || 0) + (r.second_ca || 0) + (r.third_ca || 0);
                        return (
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
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Attendance Notifications */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-500" />
                    Recent Attendance Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dataLoading ? <LoadingSpinner /> : termAttendance.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No attendance records this term.</p>
                  ) : (
                    <div className="space-y-2">
                      {termAttendance.slice(-7).reverse().map((a, i) => (
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
                            a.status === 'Excused' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
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
                            a.status === 'Excused' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
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
              {/* Current Term Results */}
              {currentResults.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{currentTerm} Results ({currentSession})</span>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowResultSlip({ term: currentTerm, session: currentSession })}>
                        <FileText className="w-3 h-3 mr-1" /> View Slip
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentResults.map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-800">{r.subject_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{r.total ?? '—'}/100</span>
                            <Badge className={`text-xs border-0 ${
                              (r.total || 0) >= 70 ? 'bg-green-100 text-green-700' :
                              (r.total || 0) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
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

              {/* Term-by-Term History */}
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
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowResultSlip({ term: th.term, session: th.session })}>
                                  <Eye className="w-3 h-3 mr-1" /> Slip
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
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    School Fees
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feeRecord ? (
                    <>
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
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600">Total Outstanding</p>
                        <p className="text-3xl font-bold text-gray-800">₦{((feeRecord.school_fees_current || 0) + (feeRecord.school_fees_arrears || 0)).toLocaleString()}</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No fee information available yet.</p>
                      <p className="text-gray-400 text-xs mt-1">Contact the school admin for fee details.</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-700 mb-3 text-sm">Payment Options</h4>
                    <div className="space-y-2">
                      <a href="https://wa.me/2348033492870" target="_blank" rel="noopener noreferrer">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                          <Phone className="w-4 h-4 mr-2" /> Contact School via WhatsApp
                        </Button>
                      </a>
                      <Button variant="outline" className="w-full" onClick={() => window.open('tel:08033492870')}>
                        <Phone className="w-4 h-4 mr-2" /> Call School: 08033492870
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      Visit the school office or contact admin to process payment and update your fee record.
                    </p>
                  </div>
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
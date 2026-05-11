import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Eye, EyeOff, LogOut, Users, GraduationCap, BookOpen, FileText,
  CheckCircle, MessageSquare, BarChart2, Settings, ClipboardList,
  Save, Search, ArrowUp, ArrowDown, Star, Shield, Printer, Trash2, Edit, List
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SCHOOL_CLASSES } from '@/components/GradingUtils';

const DEFAULT_PASSWORD = 'User123';
// Principal approves Secondary classes only
const ALL_CLASSES = [...(SCHOOL_CLASSES['Secondary'] || [])];

// Full ordered class progression map (parallel streams each move within their stream)
const CLASS_PROGRESSION = {
  // Nursery
  'Reception Class': 'Nursery 1',
  'Nursery 1': 'Nursery 2',
  'Nursery 2': 'Primary 1A',
  // Primary
  'Primary 1A': 'Primary 2A', 'Primary 1B': 'Primary 2B',
  'Primary 2A': 'Primary 3A', 'Primary 2B': 'Primary 3B',
  'Primary 3A': 'Primary 4A', 'Primary 3B': 'Primary 4B',
  'Primary 4A': 'Primary 5A', 'Primary 4B': 'Primary 5B',
  'Primary 5A': 'JSS 1A',    'Primary 5B': 'JSS 1B',
  // JSS
  'JSS 1A': 'JSS 2A', 'JSS 1B': 'JSS 2B',
  'JSS 2A': 'JSS 3A', 'JSS 2B': 'JSS 3B',
  'JSS 3A': 'SS1 Arts A', 'JSS 3B': 'SS1 Arts B',
  // SS1
  'SS1 Arts A': 'SS2 Arts A', 'SS1 Arts B': 'SS2 Arts B',
  'SS1 Com A':  'SS2 Com A',  'SS1 Com B':  'SS2 Com B',
  'SS1 Sci A':  'SS2 Sci A',  'SS1 Sci B':  'SS2 Sci B',
  // SS2
  'SS2 Arts A': 'SS3 Arts A', 'SS2 Arts B': 'SS3 Arts B',
  'SS2 Com A':  'SS3 Com A',  'SS2 Com B':  'SS3 Com B',
  'SS2 Sci A':  'SS3 Sci A',  'SS2 Sci B':  'SS3 Sci B',
  // SS3 — graduated (no next class)
};
const CLASS_DEMOTION = Object.fromEntries(Object.entries(CLASS_PROGRESSION).map(([k, v]) => [v, k]));

// ─── Login ─────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!staffId || !password) { setError('Please enter Staff ID and password'); return; }
    if (password !== DEFAULT_PASSWORD) { setError('Incorrect password. Please try again.'); return; }
    setLoading(true); setError('');
    const teachers = await base44.entities.Teacher.filter({ staff_id: staffId.trim() });
    if (!teachers[0]) { setError('Staff ID not found.'); setLoading(false); return; }
    if (teachers[0].teacher_type !== 'Principal') {
      setError('This portal is for the Principal only.'); setLoading(false); return;
    }
    sessionStorage.setItem('principal_portal_logged_in', 'true');
    sessionStorage.setItem('principal_portal_staff_id', staffId.trim());
    setLoading(false);
    onLogin(teachers[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <div className="bg-[#1e3a5f] rounded-t-xl p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Principal's Portal</h1>
          <p className="text-white/80 text-sm mt-1">School Administration Dashboard</p>
        </div>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Staff ID</Label>
            <Input placeholder="Enter your Staff ID" value={staffId} onChange={e => setStaffId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="pr-10" />
              <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────
function OverviewTab({ principal, stats, setActiveTab }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: stats.students, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Teachers', value: stats.teachers, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Subjects', value: stats.subjects, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pending Approvals', value: stats.pending, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="p-5 flex items-center justify-between">
                <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value ?? 0}</p></div>
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}><Icon className={`w-5 h-5 ${s.color}`} /></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Welcome card */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-[#1e3a5f] to-[#2c4a6e] text-white">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2">Welcome, {principal?.first_name} {principal?.last_name}</h2>
          <p className="text-white/80 mb-4">Principal — Milton College of Arts and Science, Kaduna</p>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { label: 'Review & Approve Results', tab: 'review_results', icon: CheckCircle, desc: 'Review, comment and approve student results for all classes' },
              { label: 'Manage Teachers', tab: 'teachers', icon: Users, desc: 'View all teachers, their assignments and sections' },
              { label: 'Student Overview', tab: 'students', icon: GraduationCap, desc: 'Browse all students across every class and section' },
            ].map(({ label, tab, icon: Icon, desc }) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="bg-white/10 hover:bg-white/20 rounded-lg p-4 text-left transition-colors">
                <Icon className="w-5 h-5 mb-2" />
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-white/70 mt-1">{desc}</p>
              </button>
            ))}

            <Link to="/ManageNewsletter" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 text-left transition-colors block">
              <FileText className="w-5 h-5 mb-2" />
              <p className="font-semibold text-sm">Print Newsletter</p>
              <p className="text-xs text-white/70 mt-1">Create and print term newsletters</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Review & Approve Results Tab ─────────────────────────────────────────
function ReviewResultsTab({ principal, settings }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [comment, setComment] = useState('');
  const [promotion, setPromotion] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(settings?.current_term || '');
  const [selectedSession, setSelectedSession] = useState(settings?.current_session || '');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedClass && selectedTerm && selectedSession) loadStudents();
  }, [selectedClass, selectedTerm, selectedSession]);

  const loadStudents = async () => {
    const data = await base44.entities.Student.filter({ current_class: selectedClass, status: 'Active' });
    setStudents(data);
  };

  const handleReview = async (student) => {
    setSelectedStudent(student);
    const res = await base44.entities.Result.filter({ student_id: student.id, term: selectedTerm, session: selectedSession });
    setResults(res);
    setComment(res[0]?.principal_comment || '');
    setPromotion('');
    setDialogOpen(true);
  };

  const handleSaveComment = async () => {
    setSaving(true);
    for (const r of results) {
      await base44.entities.Result.update(r.id, { principal_comment: comment, status: 'Reviewed' });
    }
    setSaving(false);
    alert('Comment saved!');
    setDialogOpen(false);
    loadStudents();
  };

  const handleDeleteResult = async (resultId) => {
    if (!confirm('Delete this subject result from this student\'s record?')) return;
    await base44.entities.Result.delete(resultId);
    setResults(prev => prev.filter(r => r.id !== resultId));
  };

  const handleApprove = async () => {
    if (selectedTerm === 'Third Term' && !promotion) {
      alert('Please select a promotion decision (Promote, Repeat, or Demote) before approving.');
      return;
    }
    setSaving(true);
    const nextClass = promotion || selectedStudent.current_class;
    const promotionStatus = promotion === getNextClass(selectedStudent.current_class) ? 'Promoted'
      : promotion === getPrevClass(selectedStudent.current_class) ? 'Demoted' : 'Repeated';

    for (const r of results) {
      await base44.entities.Result.update(r.id, {
        principal_comment: comment,
        status: 'Approved',
        approved_by: principal?.email || principal?.staff_id,
        approved_date: new Date().toISOString().split('T')[0],
        ...(selectedTerm === 'Third Term' ? { promotion_status: promotionStatus } : {})
      });
    }
    if (selectedTerm === 'Third Term' && promotion) {
      const newSection = ['Reception Class','Nursery 1','Nursery 2'].includes(nextClass) ? 'Nursery'
        : nextClass.startsWith('Primary') ? 'Primary' : 'Secondary';
      await base44.entities.Student.update(selectedStudent.id, { current_class: nextClass, section: newSection });
    }
    setSaving(false);
    alert(`Results approved! Student ${promotionStatus === 'Promoted' ? `promoted to ${nextClass}` : promotionStatus === 'Demoted' ? `demoted to ${nextClass}` : 'set to repeat class'}.`);
    setDialogOpen(false);
    loadStudents();
  };

  const avg = results.length ? (results.reduce((s, r) => s + (r.total || 0), 0) / results.length).toFixed(1) : 0;
  const gpa = results.length
    ? (results.reduce((s, r) => {
        const map = { A1:5, B2:4, B3:3.5, C4:3, C5:2.5, C6:2, D7:1.5, E8:1, F9:0 };
        return s + (map[r.grade] ?? 0);
      }, 0) / results.length).toFixed(2)
    : 0;
  const filtered = students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()));

  const getNextClass = (cls) => CLASS_PROGRESSION[cls] || cls;
  const getPrevClass = (cls) => CLASS_DEMOTION[cls] || cls;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>Review & Approve Student Results</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session</Label>
              <Input value={selectedSession} onChange={e => setSelectedSession(e.target.value)} />
            </div>
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          {selectedClass ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Adm. No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                      <TableCell>{s.admission_number}</TableCell>
                      <TableCell><Badge variant="outline">{s.current_class}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleReview(s)}>
                          <MessageSquare className="w-4 h-4 mr-1" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-400">No students found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-400">Select a class to view students</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Principal Review — {selectedStudent?.first_name} {selectedStudent?.last_name}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 p-4 bg-blue-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Adm. No.</p><p className="font-semibold">{selectedStudent.admission_number}</p></div>
                <div><p className="text-xs text-gray-500">Class</p><p className="font-semibold">{selectedStudent.current_class}</p></div>
                <div><p className="text-xs text-gray-500">Average</p><p className="font-bold text-xl text-blue-700">{avg}%</p></div>
                <div><p className="text-xs text-gray-500">GPA</p><p className="font-bold text-xl text-cyan-700">{gpa}/5</p></div>
                <div><p className="text-xs text-gray-500">Subjects</p><p className="font-semibold">{results.length}</p></div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>1st CA</TableHead>
                        <TableHead>2nd CA</TableHead>
                        <TableHead>3rd CA</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.subject_name}</TableCell>
                        <TableCell>{r.first_ca ?? '—'}</TableCell>
                        <TableCell>{r.second_ca ?? '—'}</TableCell>
                        <TableCell>{r.third_ca ?? '—'}</TableCell>
                        <TableCell>{r.exam_score ?? '—'}</TableCell>
                        <TableCell><strong>{r.total}</strong></TableCell>
                        <TableCell><Badge variant="outline">{r.grade}</Badge></TableCell>
                        <TableCell>
                          <Badge className={r.status === 'Approved' ? 'bg-green-100 text-green-800' : r.status === 'Reviewed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                            {r.status || 'Submitted'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteResult(r.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {results[0]?.head_teacher_comment && (
                <div className="p-3 bg-amber-50 rounded border border-amber-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">Head Teacher's Comment</p>
                  <p className="text-sm">{results[0].head_teacher_comment}</p>
                </div>
              )}
              {results[0]?.class_teacher_comment && (
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500 font-medium mb-1">Class Teacher's Comment</p>
                  <p className="text-sm">{results[0].class_teacher_comment}</p>
                </div>
              )}

              <div>
                <Label>Principal's Comment</Label>
                <Textarea rows={3} placeholder="Enter your comment..." value={comment} onChange={e => setComment(e.target.value)} className="mt-1" />
              </div>

              {selectedTerm === 'Third Term' && (
                <div>
                  <Label className="text-base font-semibold">Promotion Decision <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-gray-500 mb-2">Current class: <strong>{selectedStudent.current_class}</strong></p>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <button
                      onClick={() => setPromotion(getNextClass(selectedStudent.current_class))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${promotion === getNextClass(selectedStudent.current_class) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'}`}>
                      <ArrowUp className="w-5 h-5" />
                      <span className="font-semibold text-xs">PROMOTE</span>
                      <span className="text-xs text-gray-500 text-center">→ {getNextClass(selectedStudent.current_class)}</span>
                    </button>
                    <button
                      onClick={() => setPromotion(selectedStudent.current_class)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${promotion === selectedStudent.current_class ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-amber-300'}`}>
                      <span className="text-lg">↺</span>
                      <span className="font-semibold text-xs">REPEAT</span>
                      <span className="text-xs text-gray-500">{selectedStudent.current_class}</span>
                    </button>
                    <button
                      onClick={() => setPromotion(getPrevClass(selectedStudent.current_class))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${promotion === getPrevClass(selectedStudent.current_class) ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-300'}`}>
                      <ArrowDown className="w-5 h-5" />
                      <span className="font-semibold text-xs">DEMOTE</span>
                      <span className="text-xs text-gray-500 text-center">→ {getPrevClass(selectedStudent.current_class)}</span>
                    </button>
                  </div>
                  {promotion && (
                    <p className="mt-2 text-sm font-medium text-center">
                      {promotion === getNextClass(selectedStudent.current_class) && <span className="text-green-600">✓ Will be promoted to {promotion}</span>}
                      {promotion === selectedStudent.current_class && <span className="text-amber-600">↺ Will repeat {promotion}</span>}
                      {promotion === getPrevClass(selectedStudent.current_class) && <span className="text-red-600">↓ Will be demoted to {promotion}</span>}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end flex-wrap">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="outline" onClick={handleSaveComment} disabled={saving}><Save className="w-4 h-4 mr-2" />Save Comment</Button>
                <Button onClick={handleApprove} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                  <CheckCircle className="w-4 h-4 mr-2" />{saving ? 'Processing...' : 'Approve Results'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Teachers Tab ──────────────────────────────────────────────────────────
function TeachersTab() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => { loadTeachers(); }, []);

  const loadTeachers = async () => {
    const data = await base44.entities.Teacher.list();
    setTeachers(data);
  };

  const filtered = teachers.filter(t => {
    const name = `${t.first_name} ${t.last_name}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || t.staff_id?.toLowerCase().includes(search.toLowerCase());
    const matchSection = sectionFilter === 'All' || t.section === sectionFilter;
    const matchType = typeFilter === 'All' || t.teacher_type === typeFilter;
    return matchSearch && matchSection && matchType;
  });

  const typeColors = {
    'Principal': 'bg-red-100 text-red-800',
    'Head Teacher': 'bg-amber-100 text-amber-800',
    'Form Teacher': 'bg-blue-100 text-blue-800',
    'Class Teacher': 'bg-green-100 text-green-800',
    'Subject Teacher': 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['All', 'Nursery', 'Primary', 'Secondary'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['All', 'Principal', 'Head Teacher', 'Form Teacher', 'Class Teacher', 'Subject Teacher'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Class/Form</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.passport_photo ? (
                        <img src={t.passport_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {t.first_name?.[0]}{t.last_name?.[0]}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{t.first_name} {t.last_name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{t.staff_id}</TableCell>
                    <TableCell><Badge className={typeColors[t.teacher_type] || 'bg-gray-100 text-gray-800'}>{t.teacher_type}</Badge></TableCell>
                    <TableCell>{t.section}</TableCell>
                    <TableCell className="text-sm">{t.assigned_class || t.form_teacher_class || '—'}</TableCell>
                    <TableCell><Badge className={t.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No teachers found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Students Tab ──────────────────────────────────────────────────────────
function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    const data = await base44.entities.Student.filter({ status: 'Active' });
    setStudents(data);
  };

  const sections = ['All', 'Nursery', 'Primary', 'Secondary'];
  const allPrincipalClasses = [...(SCHOOL_CLASSES['Nursery'] || []), ...(SCHOOL_CLASSES['Primary'] || []), ...(SCHOOL_CLASSES['Secondary'] || [])];
  const classesForSection = sectionFilter === 'All' ? allPrincipalClasses : (SCHOOL_CLASSES[sectionFilter] || []);

  const filtered = students.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || s.admission_number?.toLowerCase().includes(search.toLowerCase());
    const matchSection = sectionFilter === 'All' || s.section === sectionFilter;
    const matchClass = classFilter === 'All' || s.current_class === classFilter;
    return matchSearch && matchSection && matchClass;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={sectionFilter} onValueChange={v => { setSectionFilter(v); setClassFilter('All'); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Classes</SelectItem>
            {classesForSection.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-gray-500">{filtered.length} students found</p>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Adm. No.</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Parent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.passport_photo ? (
                        <img src={s.passport_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{s.admission_number}</TableCell>
                    <TableCell><Badge variant="outline">{s.current_class}</Badge></TableCell>
                    <TableCell>{s.section}</TableCell>
                    <TableCell>{s.gender}</TableCell>
                    <TableCell className="text-sm">{s.parent_name || '—'}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No students found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Portal ────────────────────────────────────────────────────────────
export default function PrincipalPortal() {
  const [principal, setPrincipal] = useState(null);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const session = sessionStorage.getItem('principal_portal_logged_in');
    const savedId = sessionStorage.getItem('principal_portal_staff_id');
    if (session === 'true' && savedId) {
      initPortal(savedId);
    } else {
      setLoading(false);
    }
  }, []);

  const initPortal = async (staffId) => {
    setLoading(true);
    const [teachers, settingsData] = await Promise.all([
      base44.entities.Teacher.filter({ staff_id: staffId }),
      base44.entities.SchoolSettings.list()
    ]);
    if (teachers[0]) {
      setPrincipal(teachers[0]);
      setSettings(settingsData[0] || {});
      const [allStudents, allTeachers, allSubjects, pending] = await Promise.all([
        base44.entities.Student.filter({ status: 'Active' }),
        base44.entities.Teacher.list(),
        base44.entities.Subject.filter({ status: 'Active' }),
        base44.entities.Result.filter({ status: 'Submitted' })
      ]);
      setStats({ students: allStudents.length, teachers: allTeachers.length, subjects: allSubjects.length, pending: pending.length });
      setLoggedIn(true);
    }
    setLoading(false);
  };

  const handleLoginSuccess = async (t) => {
    setPrincipal(t);
    const settingsData = await base44.entities.SchoolSettings.list();
    setSettings(settingsData[0] || {});
    const [allStudents, allTeachers, allSubjects, pending] = await Promise.all([
      base44.entities.Student.filter({ status: 'Active' }),
      base44.entities.Teacher.list(),
      base44.entities.Subject.filter({ status: 'Active' }),
      base44.entities.Result.filter({ status: 'Submitted' })
    ]);
    setStats({ students: allStudents.length, teachers: allTeachers.length, subjects: allSubjects.length, pending: pending.length });
    setLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('principal_portal_logged_in');
    sessionStorage.removeItem('principal_portal_staff_id');
    setLoggedIn(false); setPrincipal(null); setActiveTab('overview');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-[#1e3a5f] border-t-transparent rounded-full" /></div>;
  if (!loggedIn) return <LoginScreen onLogin={handleLoginSuccess} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Principal's Portal</h1>
              <p className="text-sm text-white/80">{principal?.first_name} {principal?.last_name} — Principal</p>
            </div>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white shadow-sm border w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white">
              <BarChart2 className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="review_results" className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4 mr-2" /> Review & Approve
            </TabsTrigger>
            <TabsTrigger value="teachers" className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" /> Teachers
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white">
              <GraduationCap className="w-4 h-4 mr-2" /> Students
            </TabsTrigger>
            <Link to="/EnterResults">
              <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                <Edit className="w-4 h-4 mr-2" /> Enter Results
              </button>
            </Link>
            <Link to="/ManageNewsletter">
              <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                <FileText className="w-4 h-4 mr-2" /> Newsletter
              </button>
            </Link>
            <Link to="/MasterList">
              <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                <BarChart2 className="w-4 h-4 mr-2" /> Master List & Transcript
              </button>
            </Link>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab principal={principal} stats={stats} setActiveTab={setActiveTab} />
          </TabsContent>
          <TabsContent value="review_results">
            <ReviewResultsTab principal={principal} settings={settings} />
          </TabsContent>
          <TabsContent value="teachers">
            <TeachersTab />
          </TabsContent>
          <TabsContent value="students">
            <StudentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import {
  BookOpen, ClipboardList, FileText, Users, LogOut, Eye, EyeOff,
  GraduationCap, CheckCircle, MessageSquare, Star, Save, Search,
  ChevronLeft, TrendingUp
} from 'lucide-react';
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
import { getGrade, getRemark, SCHOOL_CLASSES } from '@/components/GradingUtils';
import EnterTraitsDialog from '@/components/EnterTraitsDialog';

const DEFAULT_PASSWORD = 'User123';

// ─── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!staffId || !password) { setError('Please enter Staff ID and password'); return; }
    if (password !== DEFAULT_PASSWORD) { setError('Incorrect password. Default: User123'); return; }
    setLoading(true); setError('');
    const teachers = await base44.entities.Teacher.filter({ staff_id: staffId.trim() });
    if (!teachers[0]) { setError('Staff ID not found.'); setLoading(false); return; }
    if (teachers[0].teacher_type !== 'Head Teacher') {
      setError('This portal is for Head Teachers only.'); setLoading(false); return;
    }
    sessionStorage.setItem('ht_portal_logged_in', 'true');
    sessionStorage.setItem('ht_portal_staff_id', staffId.trim());
    setLoading(false);
    onLogin(teachers[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <div className="bg-amber-700 rounded-t-xl p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Star className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Head Teacher Portal</h1>
          <p className="text-white/80 text-sm mt-1">Class · Form · Head Teacher</p>
        </div>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Staff ID</Label>
            <Input placeholder="e.g. HT001" value={staffId} onChange={e => setStaffId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="pr-10" />
              <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button className="w-full bg-amber-700 hover:bg-amber-800" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Enter Results Tab (Class Teacher role) ──────────────────────────────────
function EnterResultsTab({ teacher, settings }) {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState(teacher?.assigned_class || '');
  const [selectedTerm, setSelectedTerm] = useState(settings?.current_term || '');
  const [selectedSession, setSelectedSession] = useState(settings?.current_session || '');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm && selectedSession) {
      loadStudentsAndResults();
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedSession]);

  const loadSubjects = async () => {
    const sectionClass = teacher?.assigned_class || teacher?.form_teacher_class;
    // Get subjects assigned to this teacher + subjects for their class
    const [byTeacher, allSubjects] = await Promise.all([
      base44.entities.Subject.filter({ teacher_id: teacher.id, status: 'Active' }),
      base44.entities.Subject.filter({ status: 'Active' })
    ]);
    // Head teacher can enter results for all subjects in their assigned class
    const classSubjects = allSubjects.filter(s => s.classes?.includes(selectedClass || sectionClass));
    const combined = [...byTeacher];
    classSubjects.forEach(s => { if (!combined.find(c => c.id === s.id)) combined.push(s); });
    setSubjects(combined.length > 0 ? combined : allSubjects.filter(s => s.section === teacher.section));
  };

  const loadStudentsAndResults = async () => {
    setLoadingData(true);
    const [studentsData, existingResults] = await Promise.all([
      base44.entities.Student.filter({ current_class: selectedClass, status: 'Active' }),
      base44.entities.Result.filter({ class: selectedClass, subject_id: selectedSubject, term: selectedTerm, session: selectedSession })
    ]);
    setStudents(studentsData);
    const map = {};
    existingResults.forEach(r => { map[r.student_id] = r; });
    setResults(map);
    setLoadingData(false);
  };

  const handleScoreChange = (studentId, field, value) => {
    const max = field === 'exam_score' ? 70 : 10;
    const numValue = value === '' ? '' : Math.min(parseFloat(value) || 0, max);
    const cur = results[studentId] || {};
    const ca1 = field === 'first_ca' ? numValue : (cur.first_ca || 0);
    const ca2 = field === 'second_ca' ? numValue : (cur.second_ca || 0);
    const ca3 = field === 'third_ca' ? numValue : (cur.third_ca || 0);
    const exam = field === 'exam_score' ? numValue : (cur.exam_score || 0);
    const total = (parseFloat(ca1) || 0) + (parseFloat(ca2) || 0) + (parseFloat(ca3) || 0) + (parseFloat(exam) || 0);
    const student = students.find(s => s.id === studentId);
    setResults(prev => ({ ...prev, [studentId]: { ...cur, [field]: numValue, third_ca: field === 'third_ca' ? numValue : (cur.third_ca || 0), total, grade: getGrade(total, student?.section || teacher.section), remark: getRemark(total, student?.section || teacher.section) } }));
  };

  const handleSaveAll = async () => {
    if (!selectedSubject || !selectedClass || !selectedTerm || !selectedSession) { alert('Please select all parameters'); return; }
    setSaving(true);
    const subjectData = subjects.find(s => s.id === selectedSubject);
    for (const student of students) {
      const r = results[student.id];
      if (!r || (!r.first_ca && !r.second_ca && !r.exam_score)) continue;
      const payload = {
        student_id: student.id, student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number, class: selectedClass, section: student.section || teacher.section,
        term: selectedTerm, session: selectedSession, subject_id: selectedSubject, subject_name: subjectData?.name,
        first_ca: parseFloat(r.first_ca) || 0, second_ca: parseFloat(r.second_ca) || 0, third_ca: parseFloat(r.third_ca) || 0, exam_score: parseFloat(r.exam_score) || 0,
        total: r.total || 0, grade: r.grade || '', remark: r.remark || '', teacher_id: teacher.id, status: 'Submitted'
      };
      r.id ? await base44.entities.Result.update(r.id, payload) : await base44.entities.Result.create(payload);
    }
    setSaving(false);
    alert('Results saved!');
    loadStudentsAndResults();
  };

  // HT can enter results for Nursery and Primary classes only
  const sectionClasses = [...(SCHOOL_CLASSES['Nursery'] || []), ...(SCHOOL_CLASSES['Primary'] || [])];
  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>Enter Student Scores</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{sectionClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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
              <Input value={selectedSession} onChange={e => setSelectedSession(e.target.value)} placeholder="2024/2025" />
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={handleSaveAll} disabled={saving} className="bg-amber-700 hover:bg-amber-800">
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
          {loadingData ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full" /></div>
          ) : selectedClass && selectedSubject ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Adm. No.</TableHead>
                    <TableHead>1st CA (10)</TableHead>
                    <TableHead>2nd CA (10)</TableHead>
                    <TableHead>3rd CA (10)</TableHead>
                    <TableHead>Exam (70)</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => {
                    const r = results[student.id] || {};
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell>{student.admission_number}</TableCell>
                        {['first_ca', 'second_ca', 'third_ca', 'exam_score'].map(field => (
                          <TableCell key={field}>
                            <Input type="number" min="0" max={field === 'exam_score' ? 70 : 10}
                              value={r[field] ?? ''} onChange={e => handleScoreChange(student.id, field, e.target.value)}
                              className="w-16 text-center" />
                          </TableCell>
                        ))}
                        <TableCell><Badge variant="outline" className="font-bold">{r.total || 0}</Badge></TableCell>
                        <TableCell><span className={`font-bold ${r.grade === 'A' || r.grade === 'A1' ? 'text-green-600' : r.grade?.startsWith('F') ? 'text-red-600' : 'text-blue-600'}`}>{r.grade || '-'}</span></TableCell>
                        <TableCell className="text-sm text-gray-600">{r.remark || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredStudents.length === 0 && <p className="text-center py-8 text-gray-400">No students found</p>}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-400">Select class and subject to enter results</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Form Teacher Tab (review + comment on class) ────────────────────────────
function FormTeacherTab({ teacher, settings }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [comment, setComment] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(settings?.current_term || '');
  const [selectedSession, setSelectedSession] = useState(settings?.current_session || '');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [traitsStudent, setTraitsStudent] = useState(null);

  const myClass = teacher?.assigned_class || teacher?.form_teacher_class;

  useEffect(() => {
    if (myClass && selectedTerm && selectedSession) loadStudents();
  }, [myClass, selectedTerm, selectedSession]);

  const loadStudents = async () => {
    const data = await base44.entities.Student.filter({ current_class: myClass, status: 'Active' });
    setStudents(data);
  };

  const handleReview = async (student) => {
    setSelectedStudent(student);
    const res = await base44.entities.Result.filter({ student_id: student.id, term: selectedTerm, session: selectedSession });
    setResults(res);
    setComment(res[0]?.class_teacher_comment || '');
    setDialogOpen(true);
  };

  const handleSaveComment = async () => {
    setSaving(true);
    for (const r of results) {
      await base44.entities.Result.update(r.id, { class_teacher_comment: comment });
    }
    setSaving(false);
    alert('Comment saved!');
    setDialogOpen(false);
  };

  const avg = results.length ? (results.reduce((s, r) => s + (r.total || 0), 0) / results.length).toFixed(1) : 0;
  const filtered = students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Form/Class Teacher Review</CardTitle>
          {myClass && <p className="text-sm text-amber-700 font-medium">My Class: <strong>{myClass}</strong></p>}
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
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
              <Input value={selectedSession} onChange={e => setSelectedSession(e.target.value)} placeholder="2024/2025" />
            </div>
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
          {!myClass ? (
            <p className="text-center py-8 text-gray-400">No class assigned. Set assigned_class in your teacher record.</p>
          ) : (
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
                      <TableCell>{s.current_class}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleReview(s)}>
                            <MessageSquare className="w-4 h-4 mr-1" /> Comment
                          </Button>
                          <Button size="sm" variant="outline" className="border-amber-400 text-amber-700" onClick={() => setTraitsStudent(s)}>
                            <Star className="w-4 h-4 mr-1" /> Traits
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">No students found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EnterTraitsDialog
        open={!!traitsStudent}
        onClose={() => setTraitsStudent(null)}
        student={traitsStudent}
        term={selectedTerm}
        session={selectedSession}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review — {selectedStudent?.first_name} {selectedStudent?.last_name}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-amber-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Adm. No.</p><p className="font-semibold">{selectedStudent.admission_number}</p></div>
                <div><p className="text-xs text-gray-500">Class</p><p className="font-semibold">{selectedStudent.current_class}</p></div>
                <div><p className="text-xs text-gray-500">Average</p><p className="font-bold text-xl text-amber-700">{avg}%</p></div>
                <div><p className="text-xs text-gray-500">Subjects</p><p className="font-semibold">{results.length}</p></div>
              </div>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div>
                <Label>Class Teacher's Comment</Label>
                <Textarea rows={3} placeholder="Enter your comment for this student..." value={comment} onChange={e => setComment(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveComment} disabled={saving} className="bg-amber-700 hover:bg-amber-800">
                  <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Comment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Head Teacher Tab (review, approve, add HT comment across section) ───────
function HeadTeacherReviewTab({ teacher, settings }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [htComment, setHtComment] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(settings?.current_term || '');
  const [selectedSession, setSelectedSession] = useState(settings?.current_session || '');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Head Teacher approves Nursery + Primary only
  const sectionClasses = [...(SCHOOL_CLASSES['Nursery'] || []), ...(SCHOOL_CLASSES['Primary'] || [])];

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
    setHtComment(res[0]?.head_teacher_comment || '');
    setDialogOpen(true);
  };

  const handleSaveAndApprove = async (approve) => {
    setSaving(true);
    for (const r of results) {
      const update = { head_teacher_comment: htComment };
      if (approve) { update.status = 'Approved'; update.approved_by = teacher.email; update.approved_date = new Date().toISOString().split('T')[0]; }
      await base44.entities.Result.update(r.id, update);
    }
    setSaving(false);
    alert(approve ? 'Results approved!' : 'Comment saved!');
    setDialogOpen(false);
    loadStudents();
  };

  const avg = results.length ? (results.reduce((s, r) => s + (r.total || 0), 0) / results.length).toFixed(1) : 0;
  const filtered = students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Head Teacher Review & Approval</CardTitle>
          <p className="text-sm text-gray-500">Review results across your section, add Head Teacher comment and approve</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{sectionClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
              <Input value={selectedSession} onChange={e => setSelectedSession(e.target.value)} placeholder="2024/2025" />
            </div>
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
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
                      <TableCell>{s.current_class}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleReview(s)}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Review & Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">No students found</TableCell></TableRow>}
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
            <DialogTitle>HT Review — {selectedStudent?.first_name} {selectedStudent?.last_name}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 p-4 bg-amber-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Adm. No.</p><p className="font-semibold">{selectedStudent.admission_number}</p></div>
                <div><p className="text-xs text-gray-500">Class</p><p className="font-semibold">{selectedStudent.current_class}</p></div>
                <div><p className="text-xs text-gray-500">Average</p><p className="font-bold text-xl text-amber-700">{avg}%</p></div>
                <div><p className="text-xs text-gray-500">Subjects</p><p className="font-semibold">{results.length}</p></div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>1st CA</TableHead>
                    <TableHead>2nd CA</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.subject_name}</TableCell>
                      <TableCell>{r.first_ca}</TableCell>
                      <TableCell>{r.second_ca}</TableCell>
                      <TableCell>{r.exam_score}</TableCell>
                      <TableCell><strong>{r.total}</strong></TableCell>
                      <TableCell><Badge variant="outline">{r.grade}</Badge></TableCell>
                      <TableCell>
                        <Badge className={r.status === 'Approved' ? 'bg-green-100 text-green-800' : r.status === 'Reviewed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                          {r.status || 'Submitted'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Class teacher comment (read-only) */}
              {results[0]?.class_teacher_comment && (
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-xs text-gray-500 font-medium mb-1">Class Teacher's Comment</p>
                  <p className="text-sm">{results[0].class_teacher_comment}</p>
                </div>
              )}

              <div>
                <Label>Head Teacher's Comment</Label>
                <Textarea rows={3} placeholder="Enter your comment as Head Teacher..." value={htComment} onChange={e => setHtComment(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2 justify-end flex-wrap">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="outline" onClick={() => handleSaveAndApprove(false)} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />Save Comment
                </Button>
                <Button onClick={() => handleSaveAndApprove(true)} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />{saving ? 'Approving...' : 'Save & Approve'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Portal ─────────────────────────────────────────────────────────────
export default function HeadTeacherPortal() {
  const [teacher, setTeacher] = useState(null);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const session = sessionStorage.getItem('ht_portal_logged_in');
    const savedId = sessionStorage.getItem('ht_portal_staff_id');
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
      setTeacher(teachers[0]);
      setSettings(settingsData[0] || {});
      // Load stats
      const myClass = teachers[0].assigned_class || teachers[0].form_teacher_class;
      const [myStudents, mySubjects, pendingResults] = await Promise.all([
        myClass ? base44.entities.Student.filter({ current_class: myClass, status: 'Active' }) : Promise.resolve([]),
        base44.entities.Subject.filter({ teacher_id: teachers[0].id, status: 'Active' }),
        base44.entities.Result.filter({ section: teachers[0].section, status: 'Submitted' })
      ]);
      setStats({ myStudents: myStudents.length, mySubjects: mySubjects.length, pendingApproval: pendingResults.length });
      setLoggedIn(true);
    }
    setLoading(false);
  };

  const handleLoginSuccess = async (t) => {
    setTeacher(t);
    const settingsData = await base44.entities.SchoolSettings.list();
    setSettings(settingsData[0] || {});
    const myClass = t.assigned_class || t.form_teacher_class;
    const [myStudents, mySubjects, pendingResults] = await Promise.all([
      myClass ? base44.entities.Student.filter({ current_class: myClass, status: 'Active' }) : Promise.resolve([]),
      base44.entities.Subject.filter({ teacher_id: t.id, status: 'Active' }),
      base44.entities.Result.filter({ section: t.section, status: 'Submitted' })
    ]);
    setStats({ myStudents: myStudents.length, mySubjects: mySubjects.length, pendingApproval: pendingResults.length });
    setLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ht_portal_logged_in');
    sessionStorage.removeItem('ht_portal_staff_id');
    setLoggedIn(false); setTeacher(null); setActiveTab('overview');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-amber-700 border-t-transparent rounded-full" /></div>;
  if (!loggedIn) return <LoginScreen onLogin={handleLoginSuccess} />;

  const myClass = teacher?.assigned_class || teacher?.form_teacher_class;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-amber-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Head Teacher Portal</h1>
                <p className="text-sm text-white/80">{teacher?.first_name} {teacher?.last_name} — {teacher?.section} Section</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex gap-1">
                {['Class Teacher', 'Form Teacher', 'Head Teacher'].map(role => (
                  <Badge key={role} className="bg-white/20 text-white border-0 text-xs">{role}</Badge>
                ))}
              </div>
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white shadow-sm border w-full md:w-auto flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="enter_results" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" /> Enter Results
            </TabsTrigger>
            <TabsTrigger value="form_teacher" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" /> Form Teacher Review
            </TabsTrigger>
            <TabsTrigger value="head_teacher" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4 mr-2" /> HT Approval
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'My Students', value: stats.myStudents, icon: GraduationCap, color: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'My Subjects', value: stats.mySubjects, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Pending Approval', value: stats.pendingApproval, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <Card key={i} className="border-0 shadow-md">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div><p className="text-sm text-gray-500">{s.label}</p><p className="text-3xl font-bold mt-1">{s.value ?? 0}</p></div>
                      <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}><Icon className={`w-6 h-6 ${s.color}`} /></div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-0 shadow-md bg-gradient-to-br from-amber-700 to-amber-800 text-white mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-2">Welcome, {teacher?.first_name}!</h2>
                <p className="text-white/90 mb-3">You have <strong>3 roles</strong> in this portal:</p>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { role: 'Class Teacher', desc: 'Enter results for your class subjects', tab: 'enter_results', icon: FileText },
                    { role: 'Form Teacher', desc: 'Review results & add class teacher comment', tab: 'form_teacher', icon: MessageSquare },
                    { role: 'Head Teacher', desc: 'Approve results across your section', tab: 'head_teacher', icon: CheckCircle },
                  ].map(({ role, desc, tab, icon: Icon }) => (
                    <button key={role} onClick={() => setActiveTab(tab)}
                      className="bg-white/10 hover:bg-white/20 rounded-lg p-4 text-left transition-colors">
                      <Icon className="w-5 h-5 mb-2" />
                      <p className="font-semibold text-sm">{role}</p>
                      <p className="text-xs text-white/80 mt-1">{desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="font-medium text-gray-700 mb-1">My Assigned Class</p>
                  <p className="text-2xl font-bold text-amber-700">{myClass || 'Not assigned'}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="font-medium text-gray-700 mb-1">Section</p>
                  <p className="text-2xl font-bold text-amber-700">{teacher?.section}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="enter_results">
            <EnterResultsTab teacher={teacher} settings={settings} />
          </TabsContent>

          <TabsContent value="form_teacher">
            <FormTeacherTab teacher={teacher} settings={settings} />
          </TabsContent>

          <TabsContent value="head_teacher">
            <HeadTeacherReviewTab teacher={teacher} settings={settings} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
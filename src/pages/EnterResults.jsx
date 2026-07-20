import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Search, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SCHOOL_CLASSES, getGrade, getRemark } from '@/components/GradingUtils';

// JSS classes only — no SS subjects should appear here
const JSS_CLASSES = ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B'];
const SS_CLASSES = ['SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B',
  'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B',
  'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B'];

const isJSSClass = (cls) => JSS_CLASSES.includes(cls);
const isSSClass = (cls) => SS_CLASSES.includes(cls);

// Subject is valid for a class if it's assigned to that class AND not cross-level
const isSubjectValidForClass = (subject, className) => {
  if (!subject.classes?.includes(className)) return false;
  // Prevent JSS students from getting SS-only subjects and vice versa
  if (isJSSClass(className)) {
    // Subject must have at least one JSS class assigned (not purely SS)
    const hasJSS = (subject.classes || []).some(c => isJSSClass(c));
    return hasJSS;
  }
  if (isSSClass(className)) {
    // Subject must have at least one SS class assigned (not purely JSS)
    const hasSS = (subject.classes || []).some(c => isSSClass(c));
    return hasSS;
  }
  return true;
};

export default function EnterResults() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm && selectedSession) {
      loadStudentsAndResults();
      setEditMode(false);
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedSession]);

  const loadSubjectsForTeacher = async (t) => {
    const teacherType = t.teacher_type;
    const myClass = t.assigned_class || t.form_teacher_class;

    if (teacherType === 'Class Teacher' || teacherType === 'Head Teacher') {
      if (myClass) {
        setSelectedClass(myClass);
        const allSectionSubjects = await base44.entities.Subject.filter({ section: t.section, status: 'Active' });
        const classSubjects = allSectionSubjects.filter(s => isSubjectValidForClass(s, myClass));
        setSubjects(classSubjects.length > 0 ? classSubjects : allSectionSubjects);
      } else {
        const allSectionSubjects = await base44.entities.Subject.filter({ section: t.section, status: 'Active' });
        setSubjects(allSectionSubjects);
      }
    } else if (teacherType === 'Form Teacher') {
      const formClass = t.form_teacher_class || t.assigned_class;
      if (formClass) {
        setSelectedClass(formClass);
        const allSecSubjects = await base44.entities.Subject.filter({ section: t.section || 'Secondary', status: 'Active' });
        const classSubjects = allSecSubjects.filter(s => isSubjectValidForClass(s, formClass));
        setSubjects(classSubjects);
      }
    } else {
      // Subject Teacher / Principal — load their assigned subjects only
      const subjectsData = await base44.entities.Subject.filter({ teacher_id: t.id, status: 'Active' });
      setSubjects(subjectsData);
      if (myClass) setSelectedClass(myClass);
    }
  };

  const loadData = async () => {
    const portalSessions = [
      'teacher_portal_staff_id',
      'ht_portal_staff_id',
      'principal_portal_staff_id',
    ];

    const settings = await base44.entities.SchoolSettings.list();
    if (settings[0]) {
      setSelectedTerm(settings[0].current_term);
      setSelectedSession(settings[0].current_session);
    }

    let portalStaffId = null;
    for (const key of portalSessions) {
      const sid = sessionStorage.getItem(key);
      if (sid) { portalStaffId = sid; break; }
    }

    if (portalStaffId) {
      const teacherData = await base44.entities.Teacher.filter({ staff_id: portalStaffId });
      if (teacherData[0]) {
        const t = teacherData[0];
        setTeacher(t);
        await loadSubjectsForTeacher(t);
        setLoading(false);
        return;
      }
    }

    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [teacherData, staffRoles] = await Promise.all([
        base44.entities.Teacher.filter({ email: userData.email }),
        base44.entities.StaffRole.filter({ user_email: userData.email })
      ]);

      const isAdmin = userData.role === 'admin' || staffRoles.some(r => r.role === 'Admin');

      if (isAdmin) {
        const allSubjects = await base44.entities.Subject.filter({ status: 'Active' });
        setSubjects(allSubjects);
      } else if (teacherData.length > 0) {
        const typePriority = ['Head Teacher', 'Class Teacher', 'Principal', 'Subject Teacher', 'Form Teacher'];
        const t = [...teacherData].sort((a, b) => {
          const pa = typePriority.indexOf(a.teacher_type);
          const pb = typePriority.indexOf(b.teacher_type);
          return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
        })[0];
        setTeacher(t);
        await loadSubjectsForTeacher(t);
      }
    } catch (e) { /* not platform authenticated */ }

    setLoading(false);
  };

  const loadStudentsAndResults = async () => {
    const studentsData = await base44.entities.Student.filter({
      current_class: selectedClass,
      status: 'Active'
    });
    setStudents(studentsData);

    const existingResults = await base44.entities.Result.filter({
      class: selectedClass,
      subject_id: selectedSubject,
      term: selectedTerm,
      session: selectedSession
    });

    const resultsMap = {};
    existingResults.forEach(r => { resultsMap[r.student_id] = r; });
    setResults(resultsMap);
  };

  const calculateTotal = (firstCA, secondCA, thirdCA, exam) => {
    return (parseFloat(firstCA) || 0) + (parseFloat(secondCA) || 0) + (parseFloat(thirdCA) || 0) + (parseFloat(exam) || 0);
  };

  const getStudentSection = (student) => student.section || 'Primary';
  const computeGrade = (total, student) => getGrade(total, getStudentSection(student));
  const computeRemark = (total, student) => getRemark(total, getStudentSection(student));

  const handleScoreChange = (studentId, field, value) => {
    const maxVal = field === 'exam_score' ? 70 : 10;
    const numValue = value === '' ? '' : Math.min(parseFloat(value), maxVal);
    const currentResult = results[studentId] || {};
    const firstCA = field === 'first_ca' ? numValue : (currentResult.first_ca || 0);
    const secondCA = field === 'second_ca' ? numValue : (currentResult.second_ca || 0);
    const thirdCA = field === 'third_ca' ? numValue : (currentResult.third_ca || 0);
    const examScore = field === 'exam_score' ? numValue : (currentResult.exam_score || 0);
    const total = calculateTotal(firstCA, secondCA, thirdCA, examScore);
    const studentObj = students.find(s => s.id === studentId);
    const grade = computeGrade(total, studentObj || {});
    const remark = computeRemark(total, studentObj || {});
    setResults({
      ...results,
      [studentId]: { ...currentResult, [field]: numValue, total, grade, remark }
    });
  };

  const handleSaveAll = async () => {
    if (!selectedSubject || !selectedClass || !selectedTerm || !selectedSession) {
      alert('Please select subject, class, term, and session');
      return;
    }
    setSaving(true);
    try {
    const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

    for (const student of students) {
      const result = results[student.id];
      // Skip students with no scores entered at all (don't overwrite existing data with blanks)
      if (!result) continue;
      const hasAnyScore = result.first_ca || result.second_ca || result.third_ca || result.exam_score;
      // If record already exists in DB and no scores entered, skip (preserve existing data)
      if (!hasAnyScore && !result.id) continue;

      const resultData = {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: selectedClass,
        section: student.section,
        term: selectedTerm,
        session: selectedSession,
        subject_id: selectedSubject,
        subject_name: selectedSubjectData?.name,
        first_ca: parseFloat(result.first_ca) || 0,
        second_ca: parseFloat(result.second_ca) || 0,
        third_ca: parseFloat(result.third_ca) || 0,
        exam_score: parseFloat(result.exam_score) || 0,
        total: result.total || 0,
        grade: result.grade || '',
        remark: result.remark || '',
        teacher_id: teacher?.id,
        status: 'Submitted'
      };

      // Always check DB for existing record to prevent duplicates
      const existing = await base44.entities.Result.filter({
        student_id: student.id,
        subject_id: selectedSubject,
        term: selectedTerm,
        session: selectedSession
      });
      if (existing[0]) {
        await base44.entities.Result.update(existing[0].id, resultData);
      } else {
        await base44.entities.Result.create(resultData);
      }
    }

      setEditMode(false);
      alert('Results saved successfully!');
      loadStudentsAndResults();
    } catch (error) {
      alert('Failed to save results: ' + (error.message || error));
    }
    setSaving(false);
  };

  // If any student in the class has per-student subjects assigned, filter strictly.
  // Otherwise, show all students in the class (backward compatibility).
  const hasSubjectAssignments = students.some(s => s.subjects && s.subjects.length > 0);

  const filteredStudents = students.filter(s => {
    if (hasSubjectAssignments) {
      return s.subjects && s.subjects.includes(selectedSubject);
    }
    return true;
  }).filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  const availableClasses = React.useMemo(() => {
    if (subjects.length === 0) return [];
    if (teacher) {
      const tt = teacher.teacher_type;
      if (tt === 'Class Teacher' || tt === 'Head Teacher') {
        const myClass = teacher.assigned_class || teacher.form_teacher_class;
        if (myClass) return [myClass];
      }
      if (tt === 'Form Teacher') {
        if (teacher.form_teacher_class) return [teacher.form_teacher_class];
      }
    }
    const classSet = new Set();
    subjects.forEach(s => (s.classes || []).forEach(c => classSet.add(c)));
    const allClassOrder = [...SCHOOL_CLASSES['Nursery'], ...SCHOOL_CLASSES['Primary'], ...SCHOOL_CLASSES['Secondary']];
    return allClassOrder.filter(c => classSet.has(c));
  }, [subjects, teacher]);

  // Filter subjects valid for selected class (prevents cross-level entry)
  const filteredSubjects = subjects.filter(s => !selectedClass || isSubjectValidForClass(s, selectedClass));

  const hasExistingResults = Object.values(results).some(r => r.id);
  const isReadOnly = hasExistingResults && !editMode;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Enter Results</h1>
          <p className="text-gray-500">Enter student CA and exam scores</p>
        </div>

        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader><CardTitle>Select Parameters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
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
                <Input value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} placeholder="2024/2025" />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedClass && selectedSubject && selectedTerm && selectedSession && (
          <>
            <Card className="mb-6 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="flex gap-2">
                    {hasExistingResults && !editMode && (
                      <Button variant="outline" onClick={() => setEditMode(true)} className="border-blue-400 text-blue-700">
                        <Edit className="w-4 h-4 mr-2" /> Edit Scores
                      </Button>
                    )}
                    {(!hasExistingResults || editMode) && (
                      <Button onClick={handleSaveAll} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save All Results'}
                      </Button>
                    )}
                  </div>
                </div>
                {isReadOnly && (
                  <p className="text-sm text-amber-600 mt-2">Results already saved. Click "Edit Scores" to modify.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Adm. No.</TableHead>
                          <TableHead>Student Name</TableHead>
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
                        {filteredStudents.map((student) => {
                          const result = results[student.id] || {};
                          return (
                            <TableRow key={student.id}>
                              <TableCell>{student.admission_number}</TableCell>
                              <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                              <TableCell>
                                <Input type="number" min="0" max="10" value={result.first_ca ?? ''}
                                  onChange={(e) => handleScoreChange(student.id, 'first_ca', e.target.value)}
                                  className="w-16" disabled={isReadOnly} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min="0" max="10" value={result.second_ca ?? ''}
                                  onChange={(e) => handleScoreChange(student.id, 'second_ca', e.target.value)}
                                  className="w-16" disabled={isReadOnly} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min="0" max="10" value={result.third_ca ?? ''}
                                  onChange={(e) => handleScoreChange(student.id, 'third_ca', e.target.value)}
                                  className="w-16" disabled={isReadOnly} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min="0" max="70" value={result.exam_score ?? ''}
                                  onChange={(e) => handleScoreChange(student.id, 'exam_score', e.target.value)}
                                  className="w-16" disabled={isReadOnly} />
                              </TableCell>
                              <TableCell><span className="font-bold text-lg">{result.total || 0}</span></TableCell>
                              <TableCell>
                                <Badge className={
                                  (result.grade === 'A' || result.grade === 'A1') ? 'bg-green-100 text-green-800' :
                                  (result.grade === 'B' || result.grade === 'B2' || result.grade === 'B3') ? 'bg-blue-100 text-blue-800' :
                                  (result.grade === 'C' || result.grade === 'C4' || result.grade === 'C5' || result.grade === 'C6') ? 'bg-yellow-100 text-yellow-800' :
                                  (result.grade === 'F' || result.grade === 'F9') ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }>{result.grade || '-'}</Badge>
                              </TableCell>
                              <TableCell>{result.remark || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredStudents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12 text-gray-500">No students found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {(!selectedClass || !selectedSubject || !selectedTerm || !selectedSession) && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center text-gray-500">
              {!loading && teacher && subjects.length === 0 ? (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">No subjects found for your profile</p>
                  <p className="text-sm">
                    {teacher.teacher_type === 'Class Teacher' || teacher.teacher_type === 'Head Teacher'
                      ? `Your assigned class (${teacher.assigned_class || teacher.form_teacher_class || 'not set'}) has no subjects linked to it yet.`
                      : 'No subjects are currently assigned to you. Please contact the admin.'}
                  </p>
                </div>
              ) : (
                <p>Please select class, subject, term, and session to enter results</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
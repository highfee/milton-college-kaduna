import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Search, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SCHOOL_CLASSES, getGrade, getRemark } from '@/components/GradingUtils';

const CLASSES = SCHOOL_CLASSES;

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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm && selectedSession) {
      loadStudentsAndResults();
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedSession]);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    const [teacherData, settings, staffRoles] = await Promise.all([
      base44.entities.Teacher.filter({ email: userData.email }),
      base44.entities.SchoolSettings.list(),
      base44.entities.StaffRole.filter({ user_email: userData.email })
    ]);

    if (settings[0]) {
      setSelectedTerm(settings[0].current_term);
      setSelectedSession(settings[0].current_session);
    }

    const isAdmin = userData.role === 'admin' || staffRoles.some(r => r.role === 'Admin');

    if (isAdmin) {
      // Admins see all subjects and classes
      const allSubjects = await base44.entities.Subject.filter({ status: 'Active' });
      setSubjects(allSubjects);
    } else if (teacherData.length > 0) {
      // Match teacher profile — if multiple records exist (e.g. duplicate), use the best match
      // Prefer ones with assigned_class or form_teacher_class set
      const t = teacherData.find(t => t.assigned_class || t.form_teacher_class) || teacherData[0];
      setTeacher(t);

      const teacherType = t.teacher_type;

      if (teacherType === 'Class Teacher' || teacherType === 'Head Teacher') {
        // Class teachers (Primary/Nursery) and Head Teachers teach ALL subjects for their assigned class
        // Load all subjects in their section that include their class
        const myClass = t.assigned_class || t.form_teacher_class;
        if (myClass) {
          setSelectedClass(myClass);
          const allSectionSubjects = await base44.entities.Subject.filter({ section: t.section, status: 'Active' });
          // Filter to subjects that include this class
          const classSubjects = allSectionSubjects.filter(s => (s.classes || []).includes(myClass));
          setSubjects(classSubjects);
        } else {
          // No class assigned yet — show all subjects in their section
          const allSectionSubjects = await base44.entities.Subject.filter({ section: t.section, status: 'Active' });
          setSubjects(allSectionSubjects);
        }
      } else if (teacherType === 'Form Teacher') {
        // Form teachers (Secondary) only see subjects for their form class
        // They don't enter subject scores — they add comments. But if they need to enter results,
        // show all subjects for their form_teacher_class
        const myClass = t.form_teacher_class;
        if (myClass) {
          setSelectedClass(myClass);
          const allSecSubjects = await base44.entities.Subject.filter({ section: 'Secondary', status: 'Active' });
          const classSubjects = allSecSubjects.filter(s => (s.classes || []).includes(myClass));
          setSubjects(classSubjects);
        }
      } else if (teacherType === 'Subject Teacher' || teacherType === 'Principal') {
        // Subject teachers and Principal only see subjects assigned to them via teacher_id
        const subjectsData = await base44.entities.Subject.filter({ teacher_id: t.id, status: 'Active' });
        setSubjects(subjectsData);
        // If they also have a form_teacher_class, pre-select it
        if (t.form_teacher_class) setSelectedClass(t.form_teacher_class);
      } else {
        // Fallback: show subjects by teacher_id
        const subjectsData = await base44.entities.Subject.filter({ teacher_id: t.id, status: 'Active' });
        setSubjects(subjectsData);
        if (t.assigned_class) setSelectedClass(t.assigned_class);
        else if (t.form_teacher_class) setSelectedClass(t.form_teacher_class);
      }
    }

    setLoading(false);
  };

  const loadStudentsAndResults = async () => {
    const studentsData = await base44.entities.Student.filter({ 
      current_class: selectedClass, 
      status: 'Active' 
    });
    setStudents(studentsData);

    // Load existing results
    const existingResults = await base44.entities.Result.filter({
      class: selectedClass,
      subject_id: selectedSubject,
      term: selectedTerm,
      session: selectedSession
    });

    const resultsMap = {};
    existingResults.forEach(r => {
      resultsMap[r.student_id] = r;
    });
    setResults(resultsMap);
  };

  const calculateTotal = (firstCA, secondCA, thirdCA, exam) => {
    const ca1 = parseFloat(firstCA) || 0;
    const ca2 = parseFloat(secondCA) || 0;
    const ca3 = parseFloat(thirdCA) || 0;
    const ex = parseFloat(exam) || 0;
    return ca1 + ca2 + ca3 + ex;
  };

  // section is derived from the class student belongs to
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
    // find student to get section for proper grading
    const studentObj = students.find(s => s.id === studentId);
    const grade = computeGrade(total, studentObj || {});
    const remark = computeRemark(total, studentObj || {});

    setResults({
      ...results,
      [studentId]: {
        ...currentResult,
        [field]: numValue,
        third_ca: field === 'third_ca' ? numValue : (currentResult.third_ca || 0),
        total,
        grade,
        remark
      }
    });
  };

  const handleSaveAll = async () => {
    if (!selectedSubject || !selectedClass || !selectedTerm || !selectedSession) {
      alert('Please select subject, class, term, and session');
      return;
    }

    setSaving(true);

    const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

    for (const student of students) {
      const result = results[student.id];
      if (!result || (!result.first_ca && !result.second_ca && !result.exam_score)) continue;

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

      if (result.id) {
        await base44.entities.Result.update(result.id, resultData);
      } else {
        await base44.entities.Result.create(resultData);
      }
    }

    setSaving(false);
    alert('Results saved successfully!');
    loadStudentsAndResults();
  };

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Derive available classes from the subjects assigned (or all classes for admin)
  const availableClasses = React.useMemo(() => {
    if (subjects.length === 0) return [];

    // For class teachers / form teachers, restrict to only their assigned class
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

    // Subject Teachers, Principals and Admins: all classes across their subjects
    const classSet = new Set();
    subjects.forEach(s => (s.classes || []).forEach(c => classSet.add(c)));
    const allClassOrder = [
      ...CLASSES['Nursery'], ...CLASSES['Primary'], ...CLASSES['Secondary']
    ];
    return allClassOrder.filter(c => classSet.has(c));
  }, [subjects, teacher]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Enter Results</h1>
          <p className="text-gray-500">Enter student CA and exam scores</p>
        </div>

        {/* Selection Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Select Parameters</CardTitle>
          </CardHeader>
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
                    {subjects.filter(s => !selectedClass || s.classes?.includes(selectedClass)).map(s => 
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    )}
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
            {/* Search and Actions */}
            <Card className="mb-6 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search students..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleSaveAll} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save All Results'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Entry Table */}
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
                                <Input type="number" min="0" max="10" value={result.first_ca || ''}
                                  onChange={(e) => handleScoreChange(student.id, 'first_ca', e.target.value)} className="w-16" />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min="0" max="10" value={result.second_ca || ''}
                                  onChange={(e) => handleScoreChange(student.id, 'second_ca', e.target.value)} className="w-16" />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min="0" max="10" value={result.third_ca || ''}
                                  onChange={(e) => handleScoreChange(student.id, 'third_ca', e.target.value)} className="w-16" />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min="0" max="70" value={result.exam_score || ''}
                                  onChange={(e) => handleScoreChange(student.id, 'exam_score', e.target.value)} className="w-16" />
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-lg">{result.total || 0}</span>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  (result.grade === 'A' || result.grade === 'A1') ? 'bg-green-100 text-green-800' :
                                  (result.grade === 'B' || result.grade === 'B2' || result.grade === 'B3') ? 'bg-blue-100 text-blue-800' :
                                  (result.grade === 'C' || result.grade === 'C4' || result.grade === 'C5' || result.grade === 'C6') ? 'bg-yellow-100 text-yellow-800' :
                                  (result.grade === 'F' || result.grade === 'F9') ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {result.grade || '-'}
                                </Badge>
                              </TableCell>
                              <TableCell>{result.remark || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredStudents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                              No students found
                            </TableCell>
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
              <p>Please select class, subject, term, and session to enter results</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
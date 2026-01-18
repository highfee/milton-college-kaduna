import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Search, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const CLASSES = {
  'Nursery': ['Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
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

    const teacherData = await base44.entities.Teacher.filter({ email: userData.email });
    if (teacherData[0]) {
      setTeacher(teacherData[0]);
      
      // Load subjects assigned to this teacher
      if (teacherData[0].teacher_type === 'Subject Teacher') {
        const subjectsData = await base44.entities.Subject.filter({ teacher_id: teacherData[0].id });
        setSubjects(subjectsData);
      } else if (teacherData[0].teacher_type === 'Class Teacher') {
        // For class teachers, get all subjects for their class
        const subjectsData = await base44.entities.Subject.filter({ section: teacherData[0].section });
        setSubjects(subjectsData);
        setSelectedClass(teacherData[0].assigned_class);
      }
    }

    const settings = await base44.entities.SchoolSettings.list();
    if (settings[0]) {
      setSelectedTerm(settings[0].current_term);
      setSelectedSession(settings[0].current_session);
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

  const calculateTotal = (firstCA, secondCA, exam) => {
    const ca1 = parseFloat(firstCA) || 0;
    const ca2 = parseFloat(secondCA) || 0;
    const ex = parseFloat(exam) || 0;
    return ca1 + ca2 + ex;
  };

  const calculateGrade = (total) => {
    if (total >= 70) return 'A';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 40) return 'D';
    if (total >= 30) return 'E';
    return 'F';
  };

  const getRemarkFromGrade = (grade) => {
    const remarks = {
      'A': 'Excellent',
      'B': 'Very Good',
      'C': 'Good',
      'D': 'Fair',
      'E': 'Poor',
      'F': 'Fail'
    };
    return remarks[grade] || '';
  };

  const handleScoreChange = (studentId, field, value) => {
    const numValue = value === '' ? '' : Math.min(parseFloat(value), field === 'exam_score' ? 60 : 20);
    
    const currentResult = results[studentId] || {};
    const firstCA = field === 'first_ca' ? numValue : (currentResult.first_ca || 0);
    const secondCA = field === 'second_ca' ? numValue : (currentResult.second_ca || 0);
    const examScore = field === 'exam_score' ? numValue : (currentResult.exam_score || 0);
    
    const total = calculateTotal(firstCA, secondCA, examScore);
    const grade = calculateGrade(total);
    const remark = getRemarkFromGrade(grade);

    setResults({
      ...results,
      [studentId]: {
        ...currentResult,
        [field]: numValue,
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

  const availableClasses = teacher?.teacher_type === 'Class Teacher' 
    ? [teacher.assigned_class] 
    : (teacher?.section ? CLASSES[teacher.section] || [] : []);

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
                          <TableHead>1st CA (20)</TableHead>
                          <TableHead>2nd CA (20)</TableHead>
                          <TableHead>Exam (60)</TableHead>
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
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={result.first_ca || ''}
                                  onChange={(e) => handleScoreChange(student.id, 'first_ca', e.target.value)}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={result.second_ca || ''}
                                  onChange={(e) => handleScoreChange(student.id, 'second_ca', e.target.value)}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max="60"
                                  value={result.exam_score || ''}
                                  onChange={(e) => handleScoreChange(student.id, 'exam_score', e.target.value)}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-lg">{result.total || 0}</span>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  result.grade === 'A' ? 'bg-green-100 text-green-800' :
                                  result.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                  result.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
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
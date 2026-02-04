import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, CheckCircle, Loader2 } from 'lucide-react';
import { calculateGrade, calculateRemark, calculateAverage, formatPosition } from '@/components/GradingUtils';

const CLASSES = {
  Nursery: ['Nursery 1', 'Nursery 2'],
  Primary: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
  Secondary: ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3']
};

export default function GenerateReportCards() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [section, setSection] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [term, setTerm] = useState('');
  const [session, setSession] = useState('');
  const [nextTermBegins, setNextTermBegins] = useState('');
  const [students, setStudents] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const userData = await base44.auth.me();
      const settingsData = await base44.entities.SchoolSettings.list();
      setUser(userData);
      setSettings(settingsData[0] || {});
      if (settingsData[0]) {
        setTerm(settingsData[0].current_term || '');
        setSession(settingsData[0].current_session || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedClass || !term || !session) return;
    
    try {
      const studentsData = await base44.entities.Student.filter({
        current_class: selectedClass,
        status: 'Active'
      });
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  useEffect(() => {
    if (selectedClass && term && session) {
      loadStudents();
    }
  }, [selectedClass, term, session]);

  const calculatePosition = (studentAverage, allAverages) => {
    const sortedAverages = [...allAverages].sort((a, b) => b - a);
    return sortedAverages.indexOf(studentAverage) + 1;
  };

  const generateReportCard = async (student) => {
    try {
      // Get all approved results for this student
      const results = await base44.entities.Result.filter({
        student_id: student.id,
        term: term,
        session: session,
        status: 'Approved'
      });

      if (results.length === 0) {
        alert(`No approved results found for ${student.first_name} ${student.last_name}`);
        return null;
      }

      // Get all students in the same class to calculate position
      const classStudents = await base44.entities.Student.filter({
        current_class: selectedClass,
        status: 'Active'
      });

      // Calculate averages for all students
      const studentAverages = await Promise.all(
        classStudents.map(async (s) => {
          const sResults = await base44.entities.Result.filter({
            student_id: s.id,
            term: term,
            session: session,
            status: 'Approved'
          });
          const { average } = calculateAverage(sResults);
          return average;
        })
      );

      // Calculate student's performance
      const { average, totalScore } = calculateAverage(results);
      const overallGrade = calculateGrade(average, student.section || section);
      const position = calculatePosition(average, studentAverages);

      // Prepare subjects data
      const subjectsData = results.map(result => ({
        subject_name: result.subject_name,
        first_ca: result.first_ca,
        second_ca: result.second_ca,
        exam_score: result.exam_score,
        total: result.total,
        grade: result.grade,
        remark: result.remark
      }));

      // Get comments from results
      const sampleResult = results[0];

      const reportCardData = {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: selectedClass,
        section: student.section || section,
        term: term,
        session: session,
        subjects_data: subjectsData,
        total_score: totalScore,
        average: parseFloat(average.toFixed(2)),
        overall_grade: overallGrade,
        position: position,
        total_students: classStudents.length,
        class_teacher_comment: sampleResult.teacher_comment || '',
        form_teacher_comment: sampleResult.form_teacher_comment || '',
        head_teacher_comment: sampleResult.head_teacher_comment || '',
        principal_comment: sampleResult.principal_comment || '',
        next_term_begins: nextTermBegins,
        status: 'Generated',
        generated_by: user.email
      };

      // Check if report card already exists
      const existing = await base44.entities.ReportCard.filter({
        student_id: student.id,
        term: term,
        session: session
      });

      if (existing.length > 0) {
        await base44.entities.ReportCard.update(existing[0].id, reportCardData);
        return { ...reportCardData, id: existing[0].id };
      } else {
        const created = await base44.entities.ReportCard.create(reportCardData);
        return created;
      }
    } catch (error) {
      console.error('Error generating report card:', error);
      return null;
    }
  };

  const handleGenerateAll = async () => {
    if (!nextTermBegins) {
      alert('Please set the next term resumption date');
      return;
    }

    setGenerating(true);
    const generated = [];

    for (const student of students) {
      const card = await generateReportCard(student);
      if (card) {
        generated.push(card);
      }
    }

    setGeneratedCards(generated);
    setGenerating(false);
    alert(`Successfully generated ${generated.length} report cards`);
  };

  const handlePublishAll = async () => {
    try {
      for (const card of generatedCards) {
        await base44.entities.ReportCard.update(card.id, { status: 'Published' });
      }
      alert('All report cards published successfully!');
      setGeneratedCards(generatedCards.map(c => ({ ...c, status: 'Published' })));
    } catch (error) {
      console.error('Error publishing:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Generate Report Cards</h1>
          <p className="text-gray-600">Generate official report cards for students</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selection Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Section</Label>
                <Select value={section} onValueChange={(value) => {
                  setSection(value);
                  setSelectedClass('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nursery">Nursery</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!section}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {section && CLASSES[section].map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Session</Label>
                <Input
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  placeholder="e.g. 2023/2024"
                />
              </div>

              <div>
                <Label>Next Term Begins</Label>
                <Input
                  type="date"
                  value={nextTermBegins}
                  onChange={(e) => setNextTermBegins(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={handleGenerateAll}
                disabled={!selectedClass || !term || !session || !nextTermBegins || students.length === 0 || generating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate All Report Cards ({students.length})
                  </>
                )}
              </Button>

              {generatedCards.length > 0 && (
                <Button 
                  onClick={handlePublishAll}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publish All ({generatedCards.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {students.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Students ({students.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => {
                    const generated = generatedCards.find(c => c.student_id === student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell>{student.admission_number}</TableCell>
                        <TableCell>{student.first_name} {student.last_name}</TableCell>
                        <TableCell>{student.current_class}</TableCell>
                        <TableCell>
                          {generated ? (
                            <Badge className={generated.status === 'Published' ? 'bg-green-500' : 'bg-blue-500'}>
                              {generated.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Generated</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
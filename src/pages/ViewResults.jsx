import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, FileText, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { calculateStudentAverage, getPosition } from '@/components/GradingUtils';

export default function ViewResults() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [myChildren, setMyChildren] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [classRanking, setClassRanking] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStudent && selectedTerm && selectedSession) {
      loadResults();
    }
  }, [selectedStudent, selectedTerm, selectedSession]);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    // Check if user is a student
    const studentData = await base44.entities.Student.filter({ parent_email: userData.email });
    if (studentData[0]) {
      setStudent(studentData[0]);
      setSelectedStudent(studentData[0].id);
    }

    // Check if user is a parent
    const parentLinks = await base44.entities.ParentStudent.filter({ parent_email: userData.email });
    if (parentLinks.length > 0) {
      const studentIds = parentLinks.map(p => p.student_id);
      const children = await Promise.all(
        studentIds.map(id => base44.entities.Student.filter({ id }))
      );
      setMyChildren(children.map(c => c[0]).filter(Boolean));
      if (children[0]?.[0]) {
        setSelectedStudent(children[0][0].id);
      }
    }

    const settings = await base44.entities.SchoolSettings.list();
    if (settings[0]) {
      setSelectedTerm(settings[0].current_term);
      setSelectedSession(settings[0].current_session);
    }

    setLoading(false);
  };

  const loadResults = async () => {
    // Load results
    const resultsData = await base44.entities.Result.filter({
      student_id: selectedStudent,
      term: selectedTerm,
      session: selectedSession,
      status: 'Approved'
    });
    setResults(resultsData);

    // Calculate class ranking
    if (resultsData.length > 0) {
      const currentClass = resultsData[0].class;
      const allClassResults = await base44.entities.Result.filter({
        class: currentClass,
        term: selectedTerm,
        session: selectedSession,
        status: 'Approved'
      });

      // Group by student
      const studentScores = {};
      allClassResults.forEach(r => {
        if (!studentScores[r.student_id]) {
          studentScores[r.student_id] = [];
        }
        studentScores[r.student_id].push(r);
      });

      // Calculate averages and rank
      const rankings = Object.entries(studentScores).map(([sid, results]) => ({
        student_id: sid,
        ...calculateStudentAverage(results)
      })).sort((a, b) => parseFloat(b.average) - parseFloat(a.average));

      const myRank = rankings.findIndex(r => r.student_id === selectedStudent) + 1;
      setClassRanking({ rank: myRank, total: rankings.length, position: getPosition(myRank) });
    }
  };

  const currentStudent = student || myChildren.find(c => c.id === selectedStudent);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">View Results</h1>
          <p className="text-gray-500">Check academic performance</p>
        </div>

        {/* Selection */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              {myChildren.length > 0 && (
                <div>
                  <Label>Select Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {myChildren.map(child => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.first_name} {child.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024/2025">2024/2025</SelectItem>
                    <SelectItem value="2023/2024">2023/2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {currentStudent && results.length > 0 && (
          <>
            {/* Student Info Card */}
            <Card className="mb-6 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {currentStudent.passport_photo && (
                    <img 
                      src={currentStudent.passport_photo} 
                      alt={currentStudent.first_name}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">
                      {currentStudent.first_name} {currentStudent.middle_name} {currentStudent.last_name}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-gray-500">Admission Number</p>
                        <p className="font-medium">{currentStudent.admission_number}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Class</p>
                        <p className="font-medium">{currentStudent.current_class}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Section</p>
                        <p className="font-medium">{currentStudent.section}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date of Birth</p>
                        <p className="font-medium">{currentStudent.date_of_birth}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">State of Origin</p>
                        <p className="font-medium">{currentStudent.state_of_origin}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sport House</p>
                        <p className="font-medium">{currentStudent.sport_house || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Subjects</p>
                      <p className="text-3xl font-bold text-gray-900">{results.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Average Score</p>
                      <p className="text-3xl font-bold text-green-600">{calculateStudentAverage(results).average}%</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Average Grade</p>
                      <p className="text-3xl font-bold text-indigo-600">{calculateStudentAverage(results).grade}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Class Position</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {classRanking ? classRanking.position : '-'}
                      </p>
                      <p className="text-xs text-gray-500">of {classRanking?.total || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Academic Results - {selectedTerm} {selectedSession}</CardTitle>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>1st CA</TableHead>
                        <TableHead>2nd CA</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.subject_name}</TableCell>
                          <TableCell>{result.first_ca}</TableCell>
                          <TableCell>{result.second_ca}</TableCell>
                          <TableCell>{result.exam_score}</TableCell>
                          <TableCell className="font-bold">{result.total}</TableCell>
                          <TableCell>
                            <Badge className={
                              result.grade?.startsWith('A') ? 'bg-green-100 text-green-800' :
                              result.grade?.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                              result.grade?.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                              result.grade?.startsWith('D') || result.grade?.startsWith('E') ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {result.grade}
                            </Badge>
                          </TableCell>
                          <TableCell>{result.remark}</TableCell>
                        </TableRow>
                      ))}
                      {results.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                            No results available for this term
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {results.length > 0 && (
                  <div className="border-t p-6 space-y-4">
                    {results[0]?.form_teacher_comment && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Form Teacher's Comment</p>
                        <p className="mt-1">{results[0].form_teacher_comment}</p>
                      </div>
                    )}
                    {results[0]?.principal_comment && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Principal's Comment</p>
                        <p className="mt-1">{results[0].principal_comment}</p>
                      </div>
                    )}
                    {results[0]?.head_teacher_comment && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Head Teacher's Comment</p>
                        <p className="mt-1">{results[0].head_teacher_comment}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
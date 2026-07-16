import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StudentAssignmentScores() {
  const navigate = useNavigate();
  const admNo = sessionStorage.getItem('student_portal_adm');

  const [student, setStudent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [cbtResults, setCbtResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const isScoreReleased = (endDate) => {
    if (!endDate) return true;
    return new Date(endDate) <= new Date();
  };

  useEffect(() => {
    if (!admNo) { navigate('/StudentPortal'); return; }
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const studentData = await base44.entities.Student.filter({ admission_number: admNo });
    if (!studentData[0]) { navigate('/StudentPortal'); return; }
    setStudent(studentData[0]);
    const [subs, cbts, examsData, assignmentsData] = await Promise.all([
      base44.entities.AssignmentSubmission.filter({ student_id: studentData[0].id }),
      base44.entities.CBTResult.filter({ student_id: studentData[0].id }),
      base44.entities.CBTExam.filter({ status: 'Published' }),
      base44.entities.Assignment.filter({ class: studentData[0].current_class })
    ]);
    setSubmissions(subs);
    setCbtResults(cbts);
    setExams(examsData);
    setAssignments(assignmentsData);
    setLoading(false);
  };

  const getScoreColor = (score, total) => {
    if (!total) return 'text-gray-600';
    const pct = (score / total) * 100;
    if (pct >= 70) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-pink-600 text-white px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/StudentPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
          <Award className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">My Assignment & Exam Scores</h1>
            <p className="text-white/80 text-sm">{student?.first_name} — {student?.current_class}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="assignments">
          <TabsList className="mb-4">
            <TabsTrigger value="assignments">Assignments & Homework ({submissions.length})</TabsTrigger>
            <TabsTrigger value="cbt">CBT Exam Scores ({cbtResults.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            {submissions.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No assignment submissions yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {submissions.map(s => (
                  <Card key={s.id} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{s.assignment_title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Submitted: {s.submitted_date}</p>
                        {s.teacher_feedback && (
                          <p className="text-xs text-blue-600 mt-1 italic">Teacher: {s.teacher_feedback}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {s.score != null ? (
                          isScoreReleased(assignments.find(a => a.id === s.assignment_id)?.due_date) ? (
                            <div>
                              <p className={`text-2xl font-bold ${getScoreColor(s.score, s.total_marks)}`}>
                                {s.score}{s.total_marks ? `/${s.total_marks}` : ''}
                              </p>
                              <p className="text-xs text-gray-400">Score</p>
                            </div>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700">
                              <Clock className="w-3 h-3 mr-1" />Score Pending
                            </Badge>
                          )
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3 mr-1" />Awaiting Score
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cbt">
            {cbtResults.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-gray-400">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No CBT exam results yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cbtResults.map(r => {
                  const pct = r.total_marks ? ((r.score / r.total_marks) * 100).toFixed(0) : 0;
                  const scoreReleased = isScoreReleased(exams.find(e => e.id === r.exam_id)?.end_date);
                  return (
                    <Card key={r.id} className="border-0 shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{r.exam_title}</p>
                          <p className="text-xs text-gray-500">{r.subject_name} · {r.submitted_date || r.created_date?.split('T')[0]}</p>
                          {r.passed != null && scoreReleased && (
                            <Badge className={`mt-1 text-xs ${r.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {r.passed ? '✓ Passed' : '✗ Failed'}
                            </Badge>
                          )}
                        </div>
                        {scoreReleased ? (
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${getScoreColor(r.score, r.total_marks)}`}>
                              {r.score}{r.total_marks ? `/${r.total_marks}` : ''}
                            </p>
                            {r.total_marks > 0 && <p className="text-xs text-gray-400">{pct}%</p>}
                          </div>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3 mr-1" />Score Pending
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
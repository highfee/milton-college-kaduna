import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ClipboardList, Bell, Save, CheckCircle, GraduationCap, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import TheoryGradingDialog from '@/components/TheoryGradingDialog';

export default function GradingDashboard() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [cbtExams, setCbtExams] = useState([]);
  const [cbtResults, setCbtResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingExam, setGradingExam] = useState(null);
  const [scoreInputs, setScoreInputs] = useState({});
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const userData = await base44.auth.me();
    setUser(userData);

    const [teacherData, staffRoles] = await Promise.all([
      base44.entities.Teacher.filter({ email: userData.email }),
      base44.entities.StaffRole.filter({ user_email: userData.email })
    ]);

    const isAdmin = userData.role === 'admin' || staffRoles.some(r => r.role === 'Admin');

    if (isAdmin) {
      const [exams, results, assigns, subs] = await Promise.all([
        base44.entities.CBTExam.list('-created_date', 200),
        base44.entities.CBTResult.list('-created_date', 500),
        base44.entities.Assignment.list('-created_date', 200),
        base44.entities.AssignmentSubmission.list('-created_date', 500)
      ]);
      setCbtExams(exams); setCbtResults(results); setAssignments(assigns); setSubmissions(subs);
    } else if (teacherData[0]) {
      setTeacher(teacherData[0]);
      const [exams, results, assigns, subs] = await Promise.all([
        base44.entities.CBTExam.filter({ created_by: userData.email }),
        base44.entities.CBTResult.list('-created_date', 500),
        base44.entities.Assignment.filter({ teacher_id: teacherData[0].id }),
        base44.entities.AssignmentSubmission.list('-created_date', 500)
      ]);
      setCbtExams(exams); setCbtResults(results); setAssignments(assigns); setSubmissions(subs);
    }
    setLoading(false);
  };

  const examsNeedingGrading = cbtExams.filter(exam => {
    const hasTheory = exam.questions?.some(q => q.type === 'theory' || !(q.options && q.options.filter(o => o && o.trim()).length > 0));
    if (!hasTheory) return false;
    return cbtResults.some(r => r.exam_id === exam.id && r.theory_graded === false);
  });

  const teacherAssignmentIds = new Set(assignments.map(a => a.id));
  const ungradedSubs = submissions.filter(s =>
    (s.status === 'Submitted' || s.status === 'Late') && teacherAssignmentIds.has(s.assignment_id)
  );

  const getExamResults = (examId) => cbtResults.filter(r => r.exam_id === examId);
  const getPendingCount = (examId) => cbtResults.filter(r => r.exam_id === examId && r.theory_graded === false).length;

  const handleGradeAssignment = async (submission) => {
    const score = scoreInputs[submission.id];
    const feedback = feedbackInputs[submission.id];
    if (score === undefined || score === '') {
      toast({ title: 'Enter a score first', variant: 'destructive', duration: 3000 });
      return;
    }
    const assignment = assignments.find(a => a.id === submission.assignment_id);
    const maxMarks = assignment?.total_marks || 100;
    if (parseFloat(score) > maxMarks) {
      toast({ title: `Score cannot exceed ${maxMarks}`, variant: 'destructive', duration: 3000 });
      return;
    }
    await base44.entities.AssignmentSubmission.update(submission.id, {
      score: parseFloat(score),
      teacher_feedback: feedback || '',
      graded_by: user.email,
      graded_date: new Date().toISOString().split('T')[0],
      status: 'Graded'
    });
    setScoreInputs(prev => { const n = { ...prev }; delete n[submission.id]; return n; });
    setFeedbackInputs(prev => { const n = { ...prev }; delete n[submission.id]; return n; });
    toast({ title: 'Submission graded!', duration: 3000 });
    loadData();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-4 py-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/TeacherCMS" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Grading Dashboard</h1>
            <p className="text-white/80 text-sm">Grade theory answers & assignment submissions</p>
          </div>
          {(examsNeedingGrading.length + ungradedSubs.length) > 0 && (
            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-xl backdrop-blur">
              <Bell className="w-5 h-5" />
              <div>
                <p className="text-2xl font-bold leading-none">{examsNeedingGrading.length + ungradedSubs.length}</p>
                <p className="text-xs text-white/70">Pending</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{examsNeedingGrading.length}</p>
                <p className="text-xs text-slate-500">CBT Theory Exams</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{ungradedSubs.length}</p>
                <p className="text-xs text-slate-500">Assignment Submissions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="cbt">
          <TabsList className="mb-4 flex-wrap h-auto bg-white shadow-sm">
            <TabsTrigger value="cbt">
              CBT Theory {examsNeedingGrading.length > 0 && <span className="ml-1 bg-purple-500 text-white text-xs px-1.5 rounded-full">{examsNeedingGrading.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="assignments">
              Assignments {ungradedSubs.length > 0 && <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 rounded-full">{ungradedSubs.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* CBT THEORY GRADING */}
          <TabsContent value="cbt">
            {examsNeedingGrading.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p>All theory answers have been graded.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {examsNeedingGrading.map(exam => (
                  <Card key={exam.id} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{exam.title}</p>
                          <p className="text-xs text-slate-500">{exam.subject_name} · {exam.exam_type}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-amber-100 text-amber-700 text-xs">{getPendingCount(exam.id)} pending</Badge>
                            <span className="text-xs text-slate-400">{exam.questions?.length || 0} questions</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 flex-shrink-0" onClick={() => setGradingExam(exam)}>
                        <GraduationCap className="w-4 h-4 mr-1" /> Grade Theory
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ASSIGNMENT GRADING */}
          <TabsContent value="assignments">
            {ungradedSubs.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p>All assignments have been graded.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {ungradedSubs.map(sub => {
                  const assignment = assignments.find(a => a.id === sub.assignment_id);
                  const maxMarks = assignment?.total_marks || 100;
                  return (
                    <Card key={sub.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-slate-800">{sub.student_name}</p>
                            <p className="text-xs text-slate-500">{sub.admission_number} · {sub.class}</p>
                            <p className="text-sm text-slate-600 mt-1">{sub.assignment_title || assignment?.title}</p>
                            {sub.status === 'Late' && <Badge className="bg-red-100 text-red-700 text-xs mt-1">Late</Badge>}
                          </div>
                          <Badge className="bg-amber-100 text-amber-700">{sub.status}</Badge>
                        </div>

                        {sub.submission_text && (
                          <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-400 mb-1">Student's Response:</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.submission_text}</p>
                          </div>
                        )}
                        {sub.file_url && (
                          <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
                            View Attached File
                          </a>
                        )}

                        <div className="grid md:grid-cols-3 gap-2 mt-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={maxMarks}
                              step="0.5"
                              placeholder="Score"
                              value={scoreInputs[sub.id] ?? ''}
                              onChange={e => setScoreInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            />
                            <span className="text-xs text-slate-400 whitespace-nowrap">/ {maxMarks}</span>
                          </div>
                          <Input
                            placeholder="Feedback (optional)"
                            value={feedbackInputs[sub.id] ?? ''}
                            onChange={e => setFeedbackInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          />
                          <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]" onClick={() => handleGradeAssignment(sub)}>
                            <Save className="w-4 h-4 mr-1" /> Grade & Save
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TheoryGradingDialog
        exam={gradingExam}
        results={gradingExam ? getExamResults(gradingExam.id) : []}
        onClose={() => setGradingExam(null)}
        onGraded={() => { setGradingExam(null); loadData(); }}
      />
    </div>
  );
}
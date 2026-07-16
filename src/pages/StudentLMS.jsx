import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, PlayCircle, FileText, CheckCircle, Clock, Award,
  ClipboardList, Calendar, Layers, TrendingUp, AlertCircle, ChevronRight,
  Users, GraduationCap, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const SUBJECT_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-500' },
  { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-500' },
  { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-500' },
  { bg: 'bg-pink-50', text: 'text-pink-600', icon: 'bg-pink-500' },
  { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'bg-teal-500' },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

export default function StudentLMS() {
  const navigate = useNavigate();
  const admNo = sessionStorage.getItem('student_portal_adm');

  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [cbtExams, setCbtExams] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [cbtResults, setCbtResults] = useState({});
  const [timetables, setTimetables] = useState([]);
  const [lessonNotes, setLessonNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admNo) { navigate('/StudentPortal'); return; }
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const studentData = await base44.entities.Student.filter({ admission_number: admNo });
    if (!studentData[0]) { navigate('/StudentPortal'); return; }
    const s = studentData[0];
    setStudent(s);

    const [allSubjects, assgns, cbts, subs, cbtRes, tts, notes] = await Promise.all([
      base44.entities.Subject.filter({ status: 'Active' }),
      base44.entities.Assignment.filter({ class: s.current_class, status: 'Active' }),
      base44.entities.CBTExam.filter({ status: 'Published' }),
      base44.entities.AssignmentSubmission.filter({ student_id: s.id }),
      base44.entities.CBTResult.filter({ student_id: s.id }),
      base44.entities.Timetable.filter({ class: s.current_class }),
      base44.entities.LessonNote.filter({ class: s.current_class, status: 'Published' }).catch(() => [])
    ]);

    setSubjects(allSubjects.filter(sub => (sub.classes || []).includes(s.current_class)));
    setAssignments(assgns);
    const availableCBT = cbts.filter(exam =>
      (exam.classes || []).includes(s.current_class)
    );
    setCbtExams(availableCBT);
    const subMap = {}; subs.forEach(sub => { subMap[sub.assignment_id] = sub; }); setSubmissions(subMap);
    const cbtMap = {}; cbtRes.forEach(r => { cbtMap[r.exam_id] = r; }); setCbtResults(cbtMap);
    setTimetables(tts);
    setLessonNotes(notes);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
  );

  const pendingAssignments = assignments.filter(a => !submissions[a.id]);
  const completedAssignments = assignments.filter(a => !!submissions[a.id]);
  const completedExams = cbtExams.filter(e => !!cbtResults[e.id]);
  const totalTasks = assignments.length + cbtExams.length;
  const completedTasks = completedAssignments.length + completedExams.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Upcoming deadlines
  const upcomingDeadlines = [
    ...pendingAssignments.map(a => ({ ...a, kind: 'assignment', days: daysUntil(a.due_date) })),
    ...cbtExams.filter(e => !cbtResults[e.id]).map(e => ({ ...e, kind: 'exam', days: e.end_date ? daysUntil(e.end_date) : null })),
  ].filter(item => item.days !== null && item.days >= 0).sort((a, b) => (a.days || 0) - (b.days || 0));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white px-4 py-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/StudentPortal" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
            <Layers className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Learning Management System</h1>
            <p className="text-white/80 text-sm">{student?.first_name} {student?.last_name} — {student?.current_class}</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur">
            <TrendingUp className="w-5 h-5" />
            <div>
              <p className="text-2xl font-bold leading-none">{completionRate}%</p>
              <p className="text-xs text-white/70">Completion</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Progress Dashboard */}
        <Card className="border-0 shadow-md mb-6 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" /> Learning Progress
                </h3>
                <Badge className="bg-indigo-100 text-indigo-700">{completedTasks}/{totalTasks} tasks done</Badge>
              </div>
              <Progress value={completionRate} className="h-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'My Subjects', value: subjects.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Pending Tasks', value: pendingAssignments.length, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'CBT Exams', value: cbtExams.length, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Completed', value: completedTasks, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                      <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div><p className="text-xl font-bold text-slate-800">{stat.value}</p><p className="text-xs text-slate-500">{stat.label}</p></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines Strip */}
        {upcomingDeadlines.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Upcoming Deadlines
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {upcomingDeadlines.slice(0, 5).map((item) => (
                <Card key={item.id} className={`border-0 shadow-sm flex-shrink-0 w-56 ${item.days <= 1 ? 'bg-red-50' : item.days <= 3 ? 'bg-amber-50' : 'bg-white'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${item.kind === 'exam' ? 'text-purple-600' : 'text-blue-600'}`}>
                        {item.kind === 'exam' ? 'CBT Exam' : item.type || 'Task'}
                      </Badge>
                      <span className={`text-xs font-bold ${item.days <= 1 ? 'text-red-600' : item.days <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {item.days === 0 ? 'Today!' : `${item.days} day${item.days !== 1 ? 's' : ''} left`}
                      </span>
                    </div>
                    <p className="font-medium text-sm text-slate-800 truncate">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.subject_name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="subjects">
          <TabsList className="mb-4 flex-wrap h-auto bg-white shadow-sm">
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="assignments">
              Assignments {pendingAssignments.length > 0 && <span className="ml-1 bg-orange-500 text-white text-xs px-1.5 rounded-full">{pendingAssignments.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="exams">CBT Exams</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            {lessonNotes.length > 0 && <TabsTrigger value="notes">Lesson Notes</TabsTrigger>}
          </TabsList>

          {/* SUBJECTS */}
          <TabsContent value="subjects">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((sub, i) => {
                const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                return (
                  <Card key={sub.id} className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 ${color.icon} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">{sub.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{sub.teacher_name || 'No teacher assigned'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{sub.code || sub.section}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {subjects.length === 0 && (
                <Card className="col-span-full border-0 shadow-sm">
                  <CardContent className="p-12 text-center text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No subjects assigned to your class yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ASSIGNMENTS */}
          <TabsContent value="assignments">
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center text-slate-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No assignments or homework yet.</p>
                  </CardContent>
                </Card>
              ) : (
                assignments.map(a => {
                  const done = !!submissions[a.id];
                  const days = daysUntil(a.due_date);
                  const overdue = !done && days !== null && days < 0;
                  return (
                    <Card key={a.id} className={`border-0 shadow-sm hover:shadow-md transition-all ${overdue ? 'ring-2 ring-red-200' : ''}`}>
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.type === 'Assignment' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {a.type === 'Assignment' ? <BookOpen className="w-5 h-5 text-blue-600" /> : <ClipboardList className="w-5 h-5 text-green-600" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{a.title}</p>
                            <p className="text-xs text-slate-500">{a.subject_name} · {a.total_marks || 'N/A'} marks</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {done ? (
                            <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Submitted</Badge>
                          ) : overdue ? (
                            <Badge className="bg-red-100 text-red-700 text-xs">Overdue</Badge>
                          ) : days !== null && days <= 3 ? (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">{days === 0 ? 'Due today' : `${days}d left`}</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">{a.due_date || 'No deadline'}</span>
                          )}
                          {!done && (
                            <Link to="/StudentAssignments">
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8">
                                Start <ChevronRight className="w-3 h-3" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* CBT EXAMS */}
          <TabsContent value="exams">
            <div className="grid md:grid-cols-2 gap-4">
              {cbtExams.length === 0 ? (
                <Card className="md:col-span-2 border-0 shadow-sm">
                  <CardContent className="p-12 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No CBT exams available right now.</p>
                  </CardContent>
                </Card>
              ) : (
                cbtExams.map(exam => {
                  const result = cbtResults[exam.id];
                  const hasTheory = exam.questions?.some(q => q.type === 'theory');
                  return (
                    <Card key={exam.id} className={`border-0 shadow-sm hover:shadow-lg transition-all ${result ? 'opacity-75' : ''}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{exam.title}</p>
                              <p className="text-xs text-slate-500">{exam.subject_name}</p>
                            </div>
                          </div>
                          {result && <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                          <div className="bg-slate-50 rounded-lg p-2">
                            <Clock className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                            <p className="text-xs font-bold text-slate-700">{exam.duration_minutes}m</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <FileText className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                            <p className="text-xs font-bold text-slate-700">{exam.questions?.length || 0} Qs</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <Award className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                            <p className="text-xs font-bold text-slate-700">{exam.total_marks} marks</p>
                          </div>
                        </div>
                        {hasTheory && (
                          <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 rounded-lg p-2 mb-3">
                            <AlertCircle className="w-3 h-3" /> Includes theory questions (manual grading)
                          </div>
                        )}
                        {result ? (
                          ((!exam.end_date || new Date(exam.end_date) <= new Date()) && result.theory_graded !== false) ? (
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-green-700">{result.percentage}%</p>
                              <p className="text-xs text-green-600">Score: {result.score}/{result.total_marks} · Grade: {result.grade}</p>
                            </div>
                          ) : (
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                              <Clock className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                              <p className="text-sm font-medium text-amber-700">Submitted — Results Pending</p>
                              <p className="text-xs text-amber-600">{result.theory_graded === false ? 'Awaiting theory grading' : 'Available after exam ends'}</p>
                            </div>
                          )
                        ) : (
                          <Link to="/TakeCBT">
                            <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                              <Zap className="w-4 h-4 mr-2" />Start Exam
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* TIMETABLE */}
          <TabsContent value="timetable">
            {timetables.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No timetable available for your class yet.</p>
                </CardContent>
              </Card>
            ) : (
              timetables.map((tt, i) => (
                <Card key={i} className="border-0 shadow-sm mb-3">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{tt.title}</p>
                        <p className="text-xs text-slate-500">{tt.term} · {tt.session}</p>
                      </div>
                    </div>
                    {tt.attachment_url && (
                      <a href={tt.attachment_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="text-xs h-8">Download</Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* LESSON NOTES */}
          {lessonNotes.length > 0 && (
            <TabsContent value="notes">
              <div className="space-y-3">
                {lessonNotes.map(note => (
                  <Card key={note.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{note.title}</p>
                          <p className="text-xs text-slate-500">{note.subject_name} · {note.date || ''}</p>
                        </div>
                      </div>
                      {note.content && <p className="text-sm text-slate-600 mt-2 line-clamp-3">{note.content}</p>}
                      {note.attachment_url && (
                        <a href={note.attachment_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="mt-2 text-xs h-8">View Note</Button>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
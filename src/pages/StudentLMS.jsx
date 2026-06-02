import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, PlayCircle, FileText, CheckCircle, Clock, Award, ClipboardList, Calendar, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

    const now = new Date().toISOString();
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
      (exam.classes || []).includes(s.current_class) &&
      (!exam.start_date || exam.start_date <= now) && (!exam.end_date || exam.end_date >= now)
    );
    setCbtExams(availableCBT);
    const subMap = {}; subs.forEach(sub => { subMap[sub.assignment_id] = sub; }); setSubmissions(subMap);
    const cbtMap = {}; cbtRes.forEach(r => { cbtMap[r.exam_id] = r; }); setCbtResults(cbtMap);
    setTimetables(tts);
    setLessonNotes(notes);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
  );

  const pendingAssignments = assignments.filter(a => !submissions[a.id]);
  const completedAssignments = assignments.filter(a => !!submissions[a.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-700 text-white px-4 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link to="/StudentPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
          <Layers className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Learning Management System</h1>
            <p className="text-white/80 text-sm">{student?.first_name} {student?.last_name} — {student?.current_class}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'My Subjects', value: subjects.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Pending Tasks', value: pendingAssignments.length, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'CBT Exams', value: cbtExams.length, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Completed', value: completedAssignments.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div><p className="text-xl font-bold">{stat.value}</p><p className="text-xs text-gray-500">{stat.label}</p></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="subjects">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="subjects">My Subjects</TabsTrigger>
            <TabsTrigger value="assignments">Assignments ({assignments.length})</TabsTrigger>
            <TabsTrigger value="exams">CBT Exams ({cbtExams.length})</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            {lessonNotes.length > 0 && <TabsTrigger value="notes">Lesson Notes</TabsTrigger>}
          </TabsList>

          {/* SUBJECTS */}
          <TabsContent value="subjects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subjects.map(sub => (
                <Card key={sub.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{sub.name}</p>
                      <p className="text-xs text-gray-500">{sub.teacher_name || 'No teacher assigned'}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs">{sub.code || sub.section}</Badge>
                  </CardContent>
                </Card>
              ))}
              {subjects.length === 0 && (
                <Card className="col-span-2 border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-gray-400">No subjects assigned to your class yet.</CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ASSIGNMENTS */}
          <TabsContent value="assignments">
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-gray-400">No assignments or homework yet.</CardContent>
                </Card>
              ) : (
                assignments.map(a => {
                  const done = !!submissions[a.id];
                  return (
                    <Card key={a.id} className="border-0 shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.type === 'Assignment' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {a.type === 'Assignment' ? <BookOpen className="w-4 h-4 text-blue-600" /> : <ClipboardList className="w-4 h-4 text-green-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-800">{a.title}</p>
                            <p className="text-xs text-gray-500">{a.subject_name} · Due: {a.due_date || 'No deadline'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {done ? (
                            <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Submitted</Badge>
                          ) : (
                            <Link to="/StudentAssignments">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs h-7">Take</Button>
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
            <div className="space-y-3">
              {cbtExams.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-gray-400">No CBT exams available right now.</CardContent>
                </Card>
              ) : (
                cbtExams.map(exam => {
                  const done = !!cbtResults[exam.id];
                  return (
                    <Card key={exam.id} className="border-0 shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-800">{exam.title}</p>
                            <p className="text-xs text-gray-500">{exam.subject_name} · {exam.duration_minutes} mins · {exam.total_marks} marks</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {done ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />Score: {cbtResults[exam.id].score}
                            </Badge>
                          ) : (
                            <Link to="/TakeCBT">
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs h-7">Start Exam</Button>
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

          {/* TIMETABLE */}
          <TabsContent value="timetable">
            {timetables.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-gray-400">No timetable available for your class yet.</CardContent>
              </Card>
            ) : (
              timetables.map((tt, i) => (
                <Card key={i} className="border-0 shadow-sm mb-3">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{tt.title}</p>
                      <p className="text-xs text-gray-500">{tt.term} · {tt.session}</p>
                    </div>
                    {tt.attachment_url && (
                      <a href={tt.attachment_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="text-xs h-7">Download</Button>
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
                      <p className="font-medium text-gray-800">{note.title}</p>
                      <p className="text-xs text-gray-500">{note.subject_name} · {note.date || ''}</p>
                      {note.content && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{note.content}</p>}
                      {note.attachment_url && (
                        <a href={note.attachment_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="mt-2 text-xs h-7">View Note</Button>
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
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Layers, Users, BookOpen, ClipboardList, Calendar, FileText,
  MessageSquare, CheckSquare, UserCheck, BarChart2, Bell, Clock, ChevronRight,
  Award, TrendingUp, Inbox
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TeacherCMS() {
  const navigate = useNavigate();
  const staffId = sessionStorage.getItem('teacher_portal_staff_id') || sessionStorage.getItem('ht_portal_staff_id');
  const backUrl = sessionStorage.getItem('teacher_portal_staff_id') ? '/TeacherPortal' : '/HeadTeacherPortal';

  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [lessonNotes, setLessonNotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [cbtExams, setCbtExams] = useState([]);
  const [assignmentSubs, setAssignmentSubs] = useState([]);
  const [cbtResults, setCbtResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) { navigate(backUrl); return; }
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const [teacherData, settingsData] = await Promise.all([
      base44.entities.Teacher.filter({ staff_id: staffId }),
      base44.entities.SchoolSettings.list()
    ]);
    if (!teacherData[0]) { navigate(backUrl); return; }
    const t = teacherData[0];
    setTeacher(t);
    setSettings(settingsData[0] || {});
    const cls = t.assigned_class || t.form_teacher_class;
    const term = settingsData[0]?.current_term;
    const session = settingsData[0]?.current_session;

    const promises = [
      base44.entities.Assignment.filter({ teacher_id: t.id }),
      cls ? base44.entities.Student.filter({ current_class: cls, status: 'Active' }) : Promise.resolve([]),
      base44.entities.Subject.filter({ teacher_id: t.id }).catch(() => []),
      cls ? base44.entities.Timetable.filter({ class: cls }) : Promise.resolve([]),
      cls && term && session ? base44.entities.Attendance.filter({ class: cls, term, session }) : Promise.resolve([]),
      cls ? base44.entities.LessonNote.filter({ class: cls }).catch(() => []) : Promise.resolve([]),
      base44.entities.CBTExam.filter({ created_by: t.email }).catch(() => []),
    ];
    const [assgns, stds, subjs, tts, att, notes, cbts] = await Promise.all(promises);
    setAssignments(assgns);
    setStudents(stds);
    setSubjects(subjs);
    setTimetables(tts);
    setAttendance(att);
    setLessonNotes(notes);
    setCbtExams(cbts);

    // Fetch all submissions for teacher's assignments + CBT results
    const assignmentIds = assgns.map(a => a.id);
    const examIds = cbts.map(e => e.id);
    const subPromises = [];
    if (assignmentIds.length > 0) {
      subPromises.push(base44.entities.AssignmentSubmission.list('-created_date', 200).then(allSubs =>
        allSubs.filter(s => assignmentIds.includes(s.assignment_id))
      ));
    } else {
      subPromises.push(Promise.resolve([]));
    }
    if (examIds.length > 0) {
      subPromises.push(base44.entities.CBTResult.list('-created_date', 200).then(allResults =>
        allResults.filter(r => examIds.includes(r.exam_id))
      ));
    } else {
      subPromises.push(Promise.resolve([]));
    }
    const [subs, results] = await Promise.all(subPromises);
    setAssignmentSubs(subs);
    setCbtResults(results);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full"></div>
    </div>
  );

  const myClass = teacher?.assigned_class || teacher?.form_teacher_class;
  const canMarkAttendance = teacher?.teacher_type === 'Class Teacher' || teacher?.teacher_type === 'Form Teacher' || teacher?.teacher_type === 'Head Teacher';
  const todayAttendance = attendance.filter(a => a.date === new Date().toISOString().split('T')[0]);
  const presentToday = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;

  // Ungraded submissions
  const ungradedAssignments = assignmentSubs.filter(s => s.status === 'Submitted');
  const ungradedCBT = cbtResults.filter(r => r.theory_graded === false);
  const totalUngraded = ungradedAssignments.length + ungradedCBT.length;

  // Recent submissions (last 10)
  const recentSubs = [
    ...assignmentSubs.map(s => ({
      id: s.id, student: s.student_name, title: s.assignment_title, type: 'Assignment',
      date: s.submitted_date, status: s.status, score: s.score, total: s.total_marks, class: s.class
    })),
    ...cbtResults.map(r => ({
      id: r.id, student: r.student_name, title: r.exam_title, type: 'CBT Exam',
      date: r.submitted_at?.split('T')[0], status: r.theory_graded ? 'Graded' : 'Pending',
      score: r.score, total: r.total_marks, percentage: r.percentage, grade: r.grade, class: r.class
    })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);

  const cmsMenuItems = [
    ...(canMarkAttendance ? [{ icon: UserCheck, label: 'Mark Attendance', to: '/MarkAttendance', color: 'from-emerald-500 to-green-600', desc: 'Record daily attendance' }] : []),
    { icon: ClipboardList, label: 'Manage Assignments', to: '/ManageAssignments', color: 'from-blue-500 to-indigo-600', desc: 'Create assignments & homework' },
    { icon: FileText, label: 'Question Bank', to: '/ManageCBT', color: 'from-purple-500 to-violet-600', desc: 'Create CBT, assignments & homework' },
    { icon: BarChart2, label: 'Enter Results', to: '/EnterResults', color: 'from-green-500 to-teal-600', desc: 'Record scores and grades' },
    { icon: CheckSquare, label: 'Review Results', to: '/ReviewClassResults', color: 'from-orange-500 to-amber-600', desc: 'Review & add comments' },
    { icon: Calendar, label: 'Timetable', to: '/ManageTimetable', color: 'from-teal-500 to-cyan-600', desc: 'View class timetable' },
    { icon: Users, label: 'My Students', to: '/ManageStudents', color: 'from-indigo-500 to-blue-600', desc: 'View all students' },
    { icon: MessageSquare, label: 'Lesson Notes', to: '/ManageTimetable', color: 'from-pink-500 to-rose-600', desc: 'Upload lesson plans' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-700 via-rose-600 to-purple-600 text-white px-4 py-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to={backUrl} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
            <Layers className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Classroom Management System</h1>
            <p className="text-white/80 text-sm">{teacher?.first_name} {teacher?.last_name} — {myClass || teacher?.section}</p>
          </div>
          {totalUngraded > 0 && (
            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-xl backdrop-blur">
              <Bell className="w-5 h-5" />
              <div>
                <p className="text-2xl font-bold leading-none">{totalUngraded}</p>
                <p className="text-xs text-white/70">Need grading</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'My Students', value: students.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
            { label: 'Assignments', value: assignments.length, color: 'text-purple-600', bg: 'bg-purple-50', icon: ClipboardList },
            { label: 'CBT Exams', value: cbtExams.length, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: FileText },
            ...(canMarkAttendance ? [{ label: 'Present Today', value: presentToday, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: UserCheck }] : []),
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div><p className="text-xl font-bold text-slate-800">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Ungraded Alert */}
        {totalUngraded > 0 && (
          <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800">You have {totalUngraded} submission(s) awaiting grading</p>
                <p className="text-xs text-amber-600">{ungradedAssignments.length} assignment(s) · {ungradedCBT.length} CBT theory exam(s)</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="menu">
          <TabsList className="mb-4 flex-wrap h-auto bg-white shadow-sm">
            <TabsTrigger value="menu">Dashboard</TabsTrigger>
            <TabsTrigger value="submissions">
              Submissions {totalUngraded > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">{totalUngraded}</span>}
            </TabsTrigger>
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
            {canMarkAttendance && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
            <TabsTrigger value="assignments">My Assignments</TabsTrigger>
          </TabsList>

          {/* DASHBOARD MENU */}
          <TabsContent value="menu">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cmsMenuItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link key={idx} to={item.to}>
                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full overflow-hidden">
                      <CardContent className="p-0">
                        <div className={`bg-gradient-to-br ${item.color} p-4 flex items-center justify-center`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="p-3 text-center">
                          <p className="font-medium text-sm text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </TabsContent>

          {/* SUBMISSIONS / NOTIFICATIONS */}
          <TabsContent value="submissions">
            <div className="space-y-3">
              {recentSubs.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center text-slate-400">
                    <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No submissions yet. When students submit assignments or exams, they'll appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                recentSubs.map(sub => {
                  const isUngraded = sub.status === 'Submitted' || sub.status === 'Pending';
                  return (
                    <Card key={sub.id} className={`border-0 shadow-sm ${isUngraded ? 'ring-2 ring-amber-200' : ''}`}>
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sub.type === 'CBT Exam' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {sub.type === 'CBT Exam' ? <FileText className="w-5 h-5 text-purple-600" /> : <ClipboardList className="w-5 h-5 text-blue-600" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{sub.student}</p>
                            <p className="text-xs text-slate-500 truncate">{sub.title} · {sub.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {sub.score !== undefined && sub.score !== null ? (
                            <Badge variant="outline" className="text-xs">{sub.score}/{sub.total}</Badge>
                          ) : null}
                          {isUngraded ? (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">Needs grading</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 text-xs"><CheckSquare className="w-3 h-3 mr-1" />Graded</Badge>
                          )}
                          <Link to={sub.type === 'CBT Exam' ? '/ManageCBT' : '/ManageAssignments'}>
                            <Button size="sm" variant="ghost" className="text-xs h-8">Review <ChevronRight className="w-3 h-3" /></Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* STUDENTS */}
          <TabsContent value="students">
            {students.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-slate-400">No students in your class yet.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {students.map(s => (
                  <Card key={s.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      {s.passport_photo ? (
                        <img src={s.passport_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-slate-400">{s.admission_number} · {s.gender}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TODAY'S ATTENDANCE */}
          <TabsContent value="attendance">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700">Today: {new Date().toLocaleDateString()}</h3>
              <Link to="/MarkAttendance">
                <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                  <UserCheck className="w-4 h-4 mr-2" /> Mark Attendance
                </Button>
              </Link>
            </div>
            {todayAttendance.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-slate-400">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Attendance not marked today yet.</p>
                  <Link to="/MarkAttendance" className="mt-3 inline-block">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">Mark Now</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {todayAttendance.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-xl border shadow-sm">
                    <p className="text-sm font-medium">{a.student_name}</p>
                    <Badge className={`text-xs ${a.status === 'Present' ? 'bg-green-100 text-green-700' : a.status === 'Absent' ? 'bg-red-100 text-red-700' : a.status === 'Late' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ASSIGNMENTS */}
          <TabsContent value="assignments">
            <div className="flex justify-end mb-3">
              <Link to="/ManageAssignments">
                <Button className="bg-blue-600 hover:bg-blue-700" size="sm">Manage Assignments</Button>
              </Link>
            </div>
            {assignments.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-slate-400">No assignments created yet.</CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => {
                  const subCount = assignmentSubs.filter(s => s.assignment_id === a.id).length;
                  const ungradedCount = assignmentSubs.filter(s => s.assignment_id === a.id && s.status === 'Submitted').length;
                  return (
                    <Card key={a.id} className="border-0 shadow-sm">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.type === 'Assignment' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {a.type === 'Assignment' ? <BookOpen className="w-5 h-5 text-blue-600" /> : <ClipboardList className="w-5 h-5 text-green-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{a.title}</p>
                            <p className="text-xs text-slate-500">{a.type} · {a.subject_name} · Due: {a.due_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ungradedCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{ungradedCount} ungraded</Badge>}
                          <Badge variant="outline" className="text-xs">{subCount} submitted</Badge>
                          <Badge className={a.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{a.status}</Badge>
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
    </div>
  );
}
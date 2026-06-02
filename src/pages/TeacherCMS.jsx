import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Users, BookOpen, ClipboardList, Calendar, FileText, MessageSquare, CheckSquare, UserCheck, BarChart2 } from 'lucide-react';
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
    ];
    const [assgns, stds, subjs, tts, att, notes] = await Promise.all(promises);
    setAssignments(assgns);
    setStudents(stds);
    setSubjects(subjs);
    setTimetables(tts);
    setAttendance(att);
    setLessonNotes(notes);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full"></div>
    </div>
  );

  const myClass = teacher?.assigned_class || teacher?.form_teacher_class;
  const todayAttendance = attendance.filter(a => a.date === new Date().toISOString().split('T')[0]);
  const presentToday = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;

  const cmsMenuItems = [
    { icon: UserCheck, label: 'Mark Attendance', to: '/MarkAttendance', color: 'bg-emerald-500', desc: 'Record daily student attendance' },
    { icon: ClipboardList, label: 'Manage Assignments', to: '/ManageAssignments', color: 'bg-blue-500', desc: 'Create and manage assignments' },
    { icon: FileText, label: 'Manage CBT Exams', to: '/ManageCBT', color: 'bg-purple-500', desc: 'Create online exams and quizzes' },
    { icon: BarChart2, label: 'Enter Results', to: '/EnterResults', color: 'bg-green-500', desc: 'Record student scores and grades' },
    { icon: CheckSquare, label: 'Review Results', to: '/ReviewClassResults', color: 'bg-orange-500', desc: 'Review and add teacher comments' },
    { icon: Calendar, label: 'Timetable', to: '/ManageTimetable', color: 'bg-teal-500', desc: 'View class timetable' },
    { icon: Users, label: 'My Students', to: '/ManageStudents', color: 'bg-indigo-500', desc: 'View all students in your class' },
    { icon: MessageSquare, label: 'Lesson Notes', to: '/ManageTimetable', color: 'bg-pink-500', desc: 'Upload lesson plans and notes' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-pink-700 text-white px-4 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link to={backUrl}><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
          <Layers className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Classroom Management System</h1>
            <p className="text-white/80 text-sm">{teacher?.first_name} {teacher?.last_name} — {myClass || teacher?.section}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'My Students', value: students.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
            { label: 'Assignments', value: assignments.length, color: 'text-purple-600', bg: 'bg-purple-50', icon: ClipboardList },
            { label: 'My Subjects', value: subjects.length, color: 'text-green-600', bg: 'bg-green-50', icon: BookOpen },
            { label: 'Present Today', value: presentToday, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: UserCheck },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="menu">
          <TabsList className="mb-4">
            <TabsTrigger value="menu">CMS Menu</TabsTrigger>
            <TabsTrigger value="students">My Students ({students.length})</TabsTrigger>
            <TabsTrigger value="attendance">Today's Attendance</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          {/* CMS MENU */}
          <TabsContent value="menu">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cmsMenuItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link key={idx} to={item.to}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                        <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="font-medium text-sm text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </TabsContent>

          {/* STUDENTS */}
          <TabsContent value="students">
            {students.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-gray-400">No students in your class yet.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {students.map(s => (
                  <Card key={s.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                      {s.passport_photo ? (
                        <img src={s.passport_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-gray-400">{s.admission_number} · {s.gender}</p>
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
              <h3 className="font-semibold text-gray-700">Today: {new Date().toLocaleDateString()}</h3>
              <Link to="/MarkAttendance">
                <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                  <UserCheck className="w-4 h-4 mr-2" /> Mark Attendance
                </Button>
              </Link>
            </div>
            {todayAttendance.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-gray-400">
                  <p>Attendance not marked today yet.</p>
                  <Link to="/MarkAttendance" className="mt-3 inline-block">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">Mark Now</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {todayAttendance.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
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
                <CardContent className="p-8 text-center text-gray-400">No assignments created yet.</CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <Card key={a.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{a.title}</p>
                        <p className="text-xs text-gray-500">{a.type} · {a.subject_name} · Due: {a.due_date}</p>
                      </div>
                      <Badge className={a.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{a.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
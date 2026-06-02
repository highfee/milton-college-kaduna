import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, Save, Search, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Excused'];
const STATUS_COLORS = {
  Present: 'bg-green-100 text-green-700 border-green-300',
  Absent: 'bg-red-100 text-red-700 border-red-300',
  Late: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Excused: 'bg-blue-100 text-blue-700 border-blue-300',
};
const STATUS_ICONS = {
  Present: CheckCircle,
  Absent: XCircle,
  Late: Clock,
  Excused: AlertCircle,
};

export default function MarkAttendance() {
  const navigate = useNavigate();

  // Detect which portal session is active
  const teacherStaffId = sessionStorage.getItem('teacher_portal_staff_id');
  const htStaffId = sessionStorage.getItem('ht_portal_staff_id');
  const staffId = teacherStaffId || htStaffId;
  const backUrl = teacherStaffId ? '/TeacherPortal' : htStaffId ? '/HeadTeacherPortal' : '/TeacherPortal';

  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

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
    if (teacherData[0]) {
      setTeacher(teacherData[0]);
      const s = settingsData[0] || {};
      setSettings(s);
      setSelectedTerm(s.current_term || 'First Term');
      setSelectedSession(s.current_session || '');
      const cls = teacherData[0].assigned_class || teacherData[0].form_teacher_class;
      if (cls) {
        const studentsData = await base44.entities.Student.filter({ current_class: cls, status: 'Active' });
        setStudents(studentsData);
        // Pre-fill with 'Present' for all
        const map = {};
        studentsData.forEach(s => { map[s.id] = { status: 'Present', remarks: '' }; });
        setAttendance(map);
        // Load existing attendance for today
        const existing = await base44.entities.Attendance.filter({ class: cls, date: new Date().toISOString().split('T')[0] });
        if (existing.length > 0) {
          existing.forEach(a => { map[a.student_id] = { status: a.status, remarks: a.remarks || '', id: a.id }; });
          setAttendance({ ...map });
        }
      }
    }
    setLoading(false);
  };

  const loadAttendanceForDate = async (date) => {
    if (!teacher) return;
    const cls = teacher.assigned_class || teacher.form_teacher_class;
    if (!cls) return;
    const existing = await base44.entities.Attendance.filter({ class: cls, date });
    const map = {};
    students.forEach(s => { map[s.id] = { status: 'Present', remarks: '' }; });
    existing.forEach(a => { map[a.student_id] = { status: a.status, remarks: a.remarks || '', id: a.id }; });
    setAttendance(map);
  };

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    await loadAttendanceForDate(date);
  };

  const setStudentStatus = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  const setStudentRemarks = (studentId, remarks) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }));
  };

  const handleSaveAll = async () => {
    if (!teacher) return;
    const cls = teacher.assigned_class || teacher.form_teacher_class;
    if (!cls) return;
    setSaving(true);
    for (const student of students) {
      const a = attendance[student.id];
      if (!a) continue;
      const payload = {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: cls,
        section: student.section || teacher.section,
        date: selectedDate,
        term: selectedTerm,
        session: selectedSession,
        status: a.status || 'Present',
        remarks: a.remarks || '',
        marked_by: `${teacher.first_name} ${teacher.last_name}`,
      };
      if (a.id) {
        await base44.entities.Attendance.update(a.id, payload);
      } else {
        const created = await base44.entities.Attendance.create(payload);
        setAttendance(prev => ({ ...prev, [student.id]: { ...prev[student.id], id: created.id } }));
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const markAll = (status) => {
    const map = {};
    students.forEach(s => { map[s.id] = { ...(attendance[s.id] || {}), status }; });
    setAttendance(map);
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.admission_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    Present: Object.values(attendance).filter(a => a.status === 'Present').length,
    Absent: Object.values(attendance).filter(a => a.status === 'Absent').length,
    Late: Object.values(attendance).filter(a => a.status === 'Late').length,
    Excused: Object.values(attendance).filter(a => a.status === 'Excused').length,
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
    </div>
  );

  const myClass = teacher?.assigned_class || teacher?.form_teacher_class;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-700 text-white px-4 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={backUrl}><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
            <UserCheck className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Mark Attendance</h1>
              <p className="text-white/80 text-sm">{myClass || 'No class assigned'} — {teacher?.first_name} {teacher?.last_name}</p>
            </div>
          </div>
          <Button onClick={handleSaveAll} disabled={saving || !myClass} className="bg-white text-emerald-700 hover:bg-white/90">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {!myClass ? (
        <div className="max-w-xl mx-auto mt-20 text-center p-6">
          <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700">No Class Assigned</h2>
          <p className="text-gray-500 mt-2">You need an assigned class to mark attendance. Contact the admin to assign you a class.</p>
          <Link to={backUrl}><Button variant="outline" className="mt-4">← Back to Portal</Button></Link>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={selectedDate} onChange={e => handleDateChange(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Term</Label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Session</Label>
                  <Input value={selectedSession} onChange={e => setSelectedSession(e.target.value)} placeholder="2024/2025" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                    <Input className="pl-9 h-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>
              </div>
              {/* Quick mark all */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-sm text-gray-500 self-center">Mark all as:</span>
                {STATUS_OPTIONS.map(s => (
                  <Button key={s} size="sm" variant="outline" onClick={() => markAll(s)}
                    className={`text-xs h-7 ${STATUS_COLORS[s]}`}>{s}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(counts).map(([status, count]) => {
              const Icon = STATUS_ICONS[status];
              return (
                <Card key={status} className="border-0 shadow-sm">
                  <CardContent className="p-3 text-center">
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${status === 'Present' ? 'text-green-600' : status === 'Absent' ? 'text-red-500' : status === 'Late' ? 'text-yellow-600' : 'text-blue-600'}`} />
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-500">{status}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Student List */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{myClass} — {filteredStudents.length} students</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-0">{selectedDate}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredStudents.map((student, idx) => {
                  const a = attendance[student.id] || { status: 'Present', remarks: '' };
                  return (
                    <div key={student.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <span className="text-xs text-gray-400 w-6 text-center">{idx + 1}</span>
                      {student.passport_photo ? (
                        <img src={student.passport_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-gray-400">{student.admission_number}</p>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {STATUS_OPTIONS.map(s => (
                          <button key={s} onClick={() => setStudentStatus(student.id, s)}
                            className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${a.status === s ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No students found</div>
                )}
              </div>
            </CardContent>
          </Card>

          {saved && (
            <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Attendance saved successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
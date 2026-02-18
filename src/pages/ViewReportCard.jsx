import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Printer, Loader2, GraduationCap, User } from 'lucide-react';
import { formatPosition } from '@/components/GradingUtils';
import { format } from 'date-fns';

export default function ViewReportCard() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [term, setTerm] = useState('');
  const [session, setSession] = useState('');
  const [reportCard, setReportCard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [classTeacher, setClassTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isParent, setIsParent] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [settingsData] = await Promise.all([base44.entities.SchoolSettings.list()]);
      setSettings(settingsData[0] || {});

      const studentData = await base44.entities.Student.filter({ parent_email: userData.email });
      if (studentData.length > 0) {
        setStudent(studentData[0]);
        setSelectedStudent(studentData[0].id);
        setTerm(studentData[0].current_term || settingsData[0]?.current_term || '');
        setSession(studentData[0].current_session || settingsData[0]?.current_session || '');
      } else {
        const parentStudents = await base44.entities.ParentStudent.filter({ parent_email: userData.email });
        if (parentStudents.length > 0) {
          setIsParent(true);
          const childrenData = (await Promise.all(parentStudents.map(ps => base44.entities.Student.filter({ id: ps.student_id })))).flat();
          setChildren(childrenData);
          if (childrenData[0]) {
            setSelectedStudent(childrenData[0].id);
            setStudent(childrenData[0]);
            setTerm(childrenData[0].current_term || settingsData[0]?.current_term || '');
            setSession(childrenData[0].current_session || settingsData[0]?.current_session || '');
          }
        }
      }
    } catch { console.error('load failed'); }
    finally { setLoading(false); }
  };

  const loadReportCard = async () => {
    if (!selectedStudent || !term || !session) return;
    const cards = await base44.entities.ReportCard.filter({ student_id: selectedStudent, term, session, status: 'Published' });
    if (cards.length > 0) {
      setReportCard(cards[0]);
      const si = await base44.entities.Student.filter({ id: selectedStudent });
      if (si[0]) {
        setStudent(si[0]);
        // Find class teacher
        const teachers = await base44.entities.Teacher.filter({ assigned_class: si[0].current_class });
        if (teachers[0]) setClassTeacher(teachers[0]);
        else {
          const formTeachers = await base44.entities.Teacher.filter({ form_teacher_class: si[0].current_class });
          if (formTeachers[0]) setClassTeacher(formTeachers[0]);
        }
      }
    } else {
      setReportCard(null);
    }
  };

  useEffect(() => { if (selectedStudent && term && session) loadReportCard(); }, [selectedStudent, term, session]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (!student && children.length === 0) return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="max-w-md"><CardContent className="p-8 text-center"><p className="text-gray-600">No student information found.</p></CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 print:hidden">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">View Report Card</h1>
          <p className="text-gray-600">Access your academic report cards</p>
        </div>

        <Card className="mb-6 print:hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isParent && children.length > 1 && (
                <div>
                  <Label>Select Child</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger><SelectValue placeholder="Select child" /></SelectTrigger>
                    <SelectContent>
                      {children.map(child => (
                        <SelectItem key={child.id} value={child.id}>{child.first_name} {child.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Select value={session} onValueChange={setSession}>
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023/2024">2023/2024</SelectItem>
                    <SelectItem value="2024/2025">2024/2025</SelectItem>
                    <SelectItem value="2025/2026">2025/2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {reportCard && (
              <div className="mt-4">
                <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
                  <Printer className="w-4 h-4 mr-2" />Print Report Card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {reportCard ? (
          <ReportCardDocument reportCard={reportCard} student={student} settings={settings} classTeacher={classTeacher} />
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Report Card Available</h3>
              <p className="text-gray-600">No published report card found for the selected term and session.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-card, #report-card * { visibility: visible; }
          #report-card { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function ReportCardDocument({ reportCard, student, settings, classTeacher }) {
  const isSecondary = reportCard.section === 'Secondary';

  return (
    <div id="report-card" className="bg-white shadow-lg print:shadow-none">
      {/* School Header */}
      <div className="border-b-4 border-[#1e3a5f] p-6">
        <div className="flex items-center justify-between mb-4">
          {settings?.school_logo ? (
            <img src={settings.school_logo} alt="School Logo" className="w-20 h-20 object-contain" />
          ) : (
            <GraduationCap className="w-20 h-20 text-[#1e3a5f]" />
          )}
          <div className="text-center flex-1 px-4">
            <h1 className="text-2xl font-bold text-gray-900">{settings?.school_name || 'Milton College of Arts & Science'}</h1>
            <p className="text-gray-600 text-sm">{settings?.address}</p>
            <p className="text-gray-600 text-sm">Phone: {settings?.phone} | Email: {settings?.email}</p>
            <p className="text-sm italic text-gray-500 mt-1">"{settings?.motto || 'Excellence in Education'}"</p>
          </div>
          {student?.passport_photo ? (
            <img src={student.passport_photo} alt={student.first_name} className="w-24 h-28 object-cover border-2 border-gray-300" />
          ) : (
            <div className="w-24 h-28 bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>
        <div className="text-center bg-[#1e3a5f] text-white py-2 rounded">
          <h2 className="text-xl font-bold">STUDENT REPORT CARD — {reportCard.term?.toUpperCase()} {reportCard.session}</h2>
        </div>
      </div>

      {/* Student Bio Data */}
      <div className="p-6 border-b">
        <h3 className="font-bold text-[#1e3a5f] mb-3 text-sm uppercase tracking-wide">Student Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <InfoCell label="Full Name" value={`${student?.first_name || ''} ${student?.middle_name || ''} ${student?.last_name || ''}`} />
          <InfoCell label="Admission No." value={reportCard.admission_number} />
          <InfoCell label="Class" value={reportCard.class} />
          <InfoCell label="Section" value={reportCard.section} />
          <InfoCell label="Date of Birth" value={student?.date_of_birth ? format(new Date(student.date_of_birth), 'dd MMM yyyy') : '—'} />
          <InfoCell label="Gender" value={student?.gender} />
          <InfoCell label="State of Origin" value={student?.state_of_origin} />
          <InfoCell label="L.G.A." value={student?.local_government} />
          <InfoCell label="Tribe" value={student?.tribe} />
          <InfoCell label="Sport House" value={student?.sport_house} />
          {student?.blood_group && <InfoCell label="Blood Group" value={student.blood_group} />}
          {student?.genotype && <InfoCell label="Genotype" value={student.genotype} />}
          {student?.weight && <InfoCell label="Weight" value={`${student.weight} kg`} />}
          {student?.height && <InfoCell label="Height" value={`${student.height} cm`} />}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="p-6 border-b">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="bg-[#1e3a5f] text-white rounded-lg p-3 text-center">
            <p className="text-xs opacity-80">Total Score</p>
            <p className="text-2xl font-bold">{reportCard.total_score}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Average</p>
            <p className="text-2xl font-bold text-blue-700">{reportCard.average}%</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Avg. Grade</p>
            <p className="text-2xl font-bold text-green-700">{reportCard.overall_grade}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Position</p>
            <p className="text-2xl font-bold text-purple-700">{formatPosition(reportCard.position)}/{reportCard.total_students}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Subjects</p>
            <p className="text-2xl font-bold text-orange-700">{reportCard.subjects_data?.length || 0}</p>
          </div>
        </div>

        {/* Grade breakdown */}
        <div className="grid grid-cols-5 gap-2 mt-3 text-center text-xs">
          <div className="bg-green-50 border border-green-200 rounded p-2">
            <div className="text-gray-500">{isSecondary ? 'A1' : 'A'} Grades</div>
            <div className="font-bold text-green-700 text-base">{reportCard.a_grade_count ?? 0}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <div className="text-gray-500">{isSecondary ? 'B2/B3' : 'B'}</div>
            <div className="font-bold text-blue-700 text-base">{reportCard.b_grade_count ?? 0}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
            <div className="text-gray-500">Credits</div>
            <div className="font-bold text-yellow-700 text-base">{reportCard.credits_count ?? 0}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-2">
            <div className="text-gray-500">Passes</div>
            <div className="font-bold text-orange-700 text-base">{reportCard.passes_count ?? 0}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <div className="text-gray-500">Fails</div>
            <div className="font-bold text-red-700 text-base">{reportCard.fails_count ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="p-6 border-b">
        <h3 className="font-bold text-[#1e3a5f] mb-3 text-sm uppercase tracking-wide">Academic Performance</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="border border-gray-300 p-2 text-left">Subject</th>
              <th className="border border-gray-300 p-2 text-center">1st CA (20)</th>
              <th className="border border-gray-300 p-2 text-center">2nd CA (20)</th>
              <th className="border border-gray-300 p-2 text-center">Exam (60)</th>
              <th className="border border-gray-300 p-2 text-center font-bold">Total (100)</th>
              <th className="border border-gray-300 p-2 text-center">Grade</th>
              <th className="border border-gray-300 p-2 text-center">Remark</th>
            </tr>
          </thead>
          <tbody>
            {reportCard.subjects_data?.map((subject, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 p-2 font-medium">{subject.subject_name}</td>
                <td className="border border-gray-300 p-2 text-center">{subject.first_ca ?? '—'}</td>
                <td className="border border-gray-300 p-2 text-center">{subject.second_ca ?? '—'}</td>
                <td className="border border-gray-300 p-2 text-center">{subject.exam_score ?? '—'}</td>
                <td className="border border-gray-300 p-2 text-center font-bold text-[#1e3a5f]">{subject.total}</td>
                <td className="border border-gray-300 p-2 text-center font-bold">{subject.grade}</td>
                <td className="border border-gray-300 p-2 text-center text-xs">{subject.remark}</td>
              </tr>
            ))}
            <tr className="bg-[#1e3a5f]/10 font-bold">
              <td className="border border-gray-300 p-2" colSpan="4">TOTAL / AVERAGE</td>
              <td className="border border-gray-300 p-2 text-center font-bold">{reportCard.total_score}</td>
              <td className="border border-gray-300 p-2 text-center">{reportCard.overall_grade}</td>
              <td className="border border-gray-300 p-2 text-center">{reportCard.average}%</td>
            </tr>
          </tbody>
        </table>

        {/* Grading Scale */}
        <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded">
          <span className="font-semibold">Grading Scale ({isSecondary ? 'Secondary' : 'Primary/Nursery'}): </span>
          {isSecondary
            ? 'A1(75-100)=Excellent · B2(70-74)=Very Good · B3(65-69)=Good · C4(60-64)=Credit · C5(55-59)=Credit · C6(50-54)=Credit · D7(45-49)=Pass · E8(40-44)=Pass · F9(0-39)=Fail'
            : 'A(70-100)=Excellent · B(60-69)=Very Good · C(50-59)=Good · D(45-49)=Pass · E(40-44)=Weak Pass · F(0-39)=Fail'}
        </div>
      </div>

      {/* Attendance */}
      {(reportCard.attendance_present !== undefined) && (
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold text-[#1e3a5f] mb-2 text-sm">Attendance</h3>
          <p className="text-sm">Days Present: <strong>{reportCard.attendance_present}</strong> out of <strong>{reportCard.attendance_total}</strong></p>
        </div>
      )}

      {/* Comments */}
      <div className="p-6 border-b space-y-4">
        <h3 className="font-bold text-[#1e3a5f] text-sm uppercase tracking-wide">Comments</h3>
        {reportCard.class_teacher_comment && (
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs font-bold text-gray-700 mb-1">Class/Form Teacher's Comment:</p>
            <p className="text-sm text-gray-600">{reportCard.class_teacher_comment}</p>
          </div>
        )}
        {reportCard.form_teacher_comment && (
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs font-bold text-gray-700 mb-1">Form Teacher's Comment:</p>
            <p className="text-sm text-gray-600">{reportCard.form_teacher_comment}</p>
          </div>
        )}
        {reportCard.head_teacher_comment && (
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs font-bold text-blue-700 mb-1">Head Teacher's Comment:</p>
            <p className="text-sm text-gray-600">{reportCard.head_teacher_comment}</p>
          </div>
        )}
        {reportCard.principal_comment && (
          <div className="bg-[#1e3a5f]/5 rounded p-3">
            <p className="text-xs font-bold text-[#1e3a5f] mb-1">Principal's Comment:</p>
            <p className="text-sm text-gray-600">{reportCard.principal_comment}</p>
          </div>
        )}
      </div>

      {/* Footer with class teacher contact */}
      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 text-sm">
          {classTeacher && (
            <div className="bg-white border rounded-lg p-3 flex-1">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Class / Form Teacher</p>
              <p className="font-semibold text-[#1e3a5f]">{classTeacher.first_name} {classTeacher.last_name}</p>
              {classTeacher.phone && <p className="text-xs text-gray-600 mt-1">📞 {classTeacher.phone}</p>}
              {classTeacher.email && <p className="text-xs text-gray-600">✉ {classTeacher.email}</p>}
            </div>
          )}
          <div className="flex-1 text-right space-y-1">
            <p className="text-gray-600">Next Term Begins: <strong>{reportCard.next_term_begins ? format(new Date(reportCard.next_term_begins), 'MMMM dd, yyyy') : 'TBA'}</strong></p>
            <p className="text-gray-500 text-xs">Generated: {format(new Date(reportCard.created_date), 'MMMM dd, yyyy')}</p>
            <div className="mt-4 border-t pt-2">
              <p className="text-xs text-gray-500">Principal's Signature: ___________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }) {
  if (!value) return null;
  return (
    <div className="bg-gray-50 rounded p-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
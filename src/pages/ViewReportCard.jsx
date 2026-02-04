import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, Loader2, GraduationCap } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [isParent, setIsParent] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const settingsData = await base44.entities.SchoolSettings.list();
      setSettings(settingsData[0] || {});

      // Check if user is a student
      const studentData = await base44.entities.Student.filter({ parent_email: userData.email });
      
      if (studentData.length > 0) {
        // User is a student
        setStudent(studentData[0]);
        setSelectedStudent(studentData[0].id);
        setTerm(studentData[0].current_term || settingsData[0]?.current_term || '');
        setSession(studentData[0].current_session || settingsData[0]?.current_session || '');
      } else {
        // Check if user is a parent
        const parentStudents = await base44.entities.ParentStudent.filter({ parent_email: userData.email });
        
        if (parentStudents.length > 0) {
          setIsParent(true);
          const childrenData = await Promise.all(
            parentStudents.map(ps => base44.entities.Student.filter({ id: ps.student_id }))
          );
          const flatChildren = childrenData.flat();
          setChildren(flatChildren);
          
          if (flatChildren.length > 0) {
            setSelectedStudent(flatChildren[0].id);
            setStudent(flatChildren[0]);
            setTerm(flatChildren[0].current_term || settingsData[0]?.current_term || '');
            setSession(flatChildren[0].current_session || settingsData[0]?.current_session || '');
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportCard = async () => {
    if (!selectedStudent || !term || !session) return;

    try {
      const cards = await base44.entities.ReportCard.filter({
        student_id: selectedStudent,
        term: term,
        session: session,
        status: 'Published'
      });

      if (cards.length > 0) {
        setReportCard(cards[0]);
        
        // Update selected student info
        const studentInfo = await base44.entities.Student.filter({ id: selectedStudent });
        if (studentInfo.length > 0) {
          setStudent(studentInfo[0]);
        }
      } else {
        setReportCard(null);
      }
    } catch (error) {
      console.error('Error loading report card:', error);
    }
  };

  useEffect(() => {
    if (selectedStudent && term && session) {
      loadReportCard();
    }
  }, [selectedStudent, term, session]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!student && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No student information found. Please contact the school administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                    <SelectTrigger>
                      <SelectValue placeholder="Select child" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map(child => (
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
                <Select value={session} onValueChange={setSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023/2024">2023/2024</SelectItem>
                    <SelectItem value="2024/2025">2024/2025</SelectItem>
                    <SelectItem value="2025/2026">2025/2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {reportCard && (
              <div className="mt-4 flex gap-2">
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report Card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {reportCard ? (
          <div className="bg-white shadow-lg print:shadow-none" id="report-card">
            {/* Header */}
            <div className="border-b-4 border-blue-600 p-8">
              <div className="flex items-center justify-between mb-4">
                {settings?.school_logo && (
                  <img src={settings.school_logo} alt="School Logo" className="w-20 h-20 object-contain" />
                )}
                <div className="text-center flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">{settings?.school_name || 'Milton College of Arts & Science'}</h1>
                  <p className="text-gray-600">{settings?.address || 'Kaduna, Nigeria'}</p>
                  <p className="text-gray-600">Phone: {settings?.phone || '09067879088'}</p>
                  <p className="text-sm text-gray-500 mt-2">{settings?.motto || 'Excellence in Education'}</p>
                </div>
                <GraduationCap className="w-20 h-20 text-blue-600" />
              </div>
              
              <div className="text-center bg-blue-600 text-white py-2 rounded">
                <h2 className="text-xl font-bold">STUDENT REPORT CARD</h2>
              </div>
            </div>

            {/* Student Info */}
            <div className="p-8 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Student Name:</p>
                  <p className="font-semibold">{reportCard.student_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Admission Number:</p>
                  <p className="font-semibold">{reportCard.admission_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Class:</p>
                  <p className="font-semibold">{reportCard.class}</p>
                </div>
                <div>
                  <p className="text-gray-600">Section:</p>
                  <p className="font-semibold">{reportCard.section}</p>
                </div>
                <div>
                  <p className="text-gray-600">Term:</p>
                  <p className="font-semibold">{reportCard.term}</p>
                </div>
                <div>
                  <p className="text-gray-600">Session:</p>
                  <p className="font-semibold">{reportCard.session}</p>
                </div>
                <div>
                  <p className="text-gray-600">Position:</p>
                  <p className="font-semibold">{formatPosition(reportCard.position)} / {reportCard.total_students}</p>
                </div>
                <div>
                  <p className="text-gray-600">Average:</p>
                  <p className="font-semibold">{reportCard.average}%</p>
                </div>
              </div>
            </div>

            {/* Subjects Table */}
            <div className="p-8 border-b">
              <h3 className="text-lg font-bold mb-4">Academic Performance</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Subject</th>
                    <th className="border p-2 text-center">1st CA (20)</th>
                    <th className="border p-2 text-center">2nd CA (20)</th>
                    <th className="border p-2 text-center">Exam (60)</th>
                    <th className="border p-2 text-center">Total (100)</th>
                    <th className="border p-2 text-center">Grade</th>
                    <th className="border p-2 text-center">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.subjects_data.map((subject, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">{subject.subject_name}</td>
                      <td className="border p-2 text-center">{subject.first_ca}</td>
                      <td className="border p-2 text-center">{subject.second_ca}</td>
                      <td className="border p-2 text-center">{subject.exam_score}</td>
                      <td className="border p-2 text-center font-semibold">{subject.total}</td>
                      <td className="border p-2 text-center font-semibold">{subject.grade}</td>
                      <td className="border p-2 text-center text-xs">{subject.remark}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="border p-2" colSpan="4">TOTAL / AVERAGE</td>
                    <td className="border p-2 text-center">{reportCard.total_score}</td>
                    <td className="border p-2 text-center">{reportCard.overall_grade}</td>
                    <td className="border p-2 text-center">{reportCard.average}%</td>
                  </tr>
                </tbody>
              </table>

              {/* Grading Scale */}
              <div className="mt-4 text-xs text-gray-600">
                <p className="font-semibold mb-1">Grading Scale:</p>
                <div className="flex gap-4 flex-wrap">
                  <span>A (70-100) - Excellent</span>
                  <span>B (60-69) - Very Good</span>
                  <span>C (50-59) - Good</span>
                  <span>D (45-49) - Pass</span>
                  <span>E (40-44) - Weak Pass</span>
                  <span>F (0-39) - Fail</span>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="p-8 border-b space-y-4">
              {reportCard.class_teacher_comment && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Class Teacher's Comment:</p>
                  <p className="text-sm text-gray-600 mt-1">{reportCard.class_teacher_comment}</p>
                </div>
              )}
              
              {reportCard.form_teacher_comment && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Form Teacher's Comment:</p>
                  <p className="text-sm text-gray-600 mt-1">{reportCard.form_teacher_comment}</p>
                </div>
              )}

              {reportCard.head_teacher_comment && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Head Teacher's Comment:</p>
                  <p className="text-sm text-gray-600 mt-1">{reportCard.head_teacher_comment}</p>
                </div>
              )}

              {reportCard.principal_comment && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Principal's Comment:</p>
                  <p className="text-sm text-gray-600 mt-1">{reportCard.principal_comment}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 bg-gray-50">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-gray-600">Next Term Begins:</p>
                  <p className="font-semibold">
                    {reportCard.next_term_begins ? format(new Date(reportCard.next_term_begins), 'MMMM dd, yyyy') : 'TBA'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">Date Generated:</p>
                  <p className="font-semibold">{format(new Date(reportCard.created_date), 'MMMM dd, yyyy')}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <GraduationCap className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Report Card Available</h3>
              <p className="text-gray-600">
                No published report card found for the selected term and session.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-card, #report-card * {
            visibility: visible;
          }
          #report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
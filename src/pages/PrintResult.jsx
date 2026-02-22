import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { SCHOOL_CLASSES } from '@/components/GradingUtils';
import { Printer, Download, Users, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const ALL_CLASSES = Object.values(SCHOOL_CLASSES).flat();

function ResultSlip({ student, results, settings, term, session }) {
  const avg = results.length ? (results.reduce((s, r) => s + (r.total || 0), 0) / results.length).toFixed(1) : 0;
  const schoolName = settings?.school_name || 'School';
  const logo = settings?.school_logo;

  return (
    <div className="print-slip border-2 border-gray-800 p-4 mb-8 bg-white" style={{ fontFamily: 'serif', minWidth: '600px' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-3 mb-3">
        {logo && <img src={logo} alt="Logo" className="h-14 w-14 object-contain mx-auto mb-1" />}
        <h1 className="text-xl font-bold uppercase">{schoolName}</h1>
        {settings?.address && <p className="text-xs text-gray-600">{settings.address}</p>}
        <h2 className="text-base font-bold mt-1 uppercase">{term} Result — {session}</h2>
      </div>
      {/* Student Info */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3 border-b pb-3">
        <div><strong>Name:</strong> {student.first_name} {student.middle_name} {student.last_name}</div>
        <div><strong>Adm. No:</strong> {student.admission_number}</div>
        <div><strong>Class:</strong> {student.current_class}</div>
        <div><strong>Section:</strong> {student.section}</div>
        <div><strong>Average:</strong> {avg}%</div>
        <div><strong>Total Subjects:</strong> {results.length}</div>
      </div>
      {/* Results Table */}
      <table className="w-full text-sm border-collapse mb-3">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-400 p-1 text-left">Subject</th>
            <th className="border border-gray-400 p-1">1st CA</th>
            <th className="border border-gray-400 p-1">2nd CA</th>
            <th className="border border-gray-400 p-1">Exam</th>
            <th className="border border-gray-400 p-1">Total</th>
            <th className="border border-gray-400 p-1">Grade</th>
            <th className="border border-gray-400 p-1">Remark</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-400 p-1">{r.subject_name}</td>
              <td className="border border-gray-400 p-1 text-center">{r.first_ca}</td>
              <td className="border border-gray-400 p-1 text-center">{r.second_ca}</td>
              <td className="border border-gray-400 p-1 text-center">{r.exam_score}</td>
              <td className="border border-gray-400 p-1 text-center font-bold">{r.total}</td>
              <td className="border border-gray-400 p-1 text-center font-bold">{r.grade}</td>
              <td className="border border-gray-400 p-1 text-center">{r.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Comments */}
      <div className="grid grid-cols-2 gap-3 text-xs border-t pt-2">
        {results[0]?.class_teacher_comment && (
          <div className="border p-2 rounded"><strong>Class Teacher:</strong> {results[0].class_teacher_comment}</div>
        )}
        {results[0]?.head_teacher_comment && (
          <div className="border p-2 rounded"><strong>Head Teacher:</strong> {results[0].head_teacher_comment}</div>
        )}
        {results[0]?.principal_comment && (
          <div className="border p-2 rounded"><strong>Principal:</strong> {results[0].principal_comment}</div>
        )}
        {results[0]?.next_term_begins && (
          <div className="border p-2 rounded"><strong>Next Term Begins:</strong> {results[0].next_term_begins}</div>
        )}
      </div>
    </div>
  );
}

export default function PrintResult() {
  const [settings, setSettings] = useState(null);
  const [mode, setMode] = useState(''); // 'individual' | 'class'
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [admissionNo, setAdmissionNo] = useState('');
  const [printData, setPrintData] = useState([]); // [{student, results}]
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    base44.entities.SchoolSettings.list().then(s => {
      const s0 = s[0] || {};
      setSettings(s0);
      setSelectedTerm(s0.current_term || '');
      setSelectedSession(s0.current_session || '');
    });
  }, []);

  const loadIndividual = async () => {
    if (!admissionNo || !selectedTerm || !selectedSession) return alert('Fill all fields');
    setLoading(true);
    const students = await base44.entities.Student.filter({ admission_number: admissionNo.trim() });
    if (!students[0]) { alert('Student not found'); setLoading(false); return; }
    const results = await base44.entities.Result.filter({ student_id: students[0].id, term: selectedTerm, session: selectedSession });
    setPrintData([{ student: students[0], results }]);
    setLoading(false);
  };

  const loadClass = async () => {
    if (!selectedClass || !selectedTerm || !selectedSession) return alert('Fill all fields');
    setLoading(true);
    const students = await base44.entities.Student.filter({ current_class: selectedClass, status: 'Active' });
    const dataArr = await Promise.all(students.map(async (s) => {
      const results = await base44.entities.Result.filter({ student_id: s.id, term: selectedTerm, session: selectedSession });
      return { student: s, results };
    }));
    setPrintData(dataArr.filter(d => d.results.length > 0));
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <style>{`@media print { .no-print { display: none !important; } .print-slip { page-break-after: always; } }`}</style>
      <div className="max-w-5xl mx-auto">
        <div className="no-print mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Print Results</h1>
          <p className="text-gray-500">Print individual or class result slips</p>

          {/* Mode Selection */}
          {!mode && (
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <Card className="border-2 border-[#1e3a5f] cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setMode('individual')}>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 text-[#1e3a5f] mx-auto mb-3" />
                  <h2 className="text-xl font-bold mb-2">Individual Student</h2>
                  <p className="text-gray-500 text-sm">Print result slip for one student by admission number</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-green-600 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setMode('class')}>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h2 className="text-xl font-bold mb-2">Entire Class</h2>
                  <p className="text-gray-500 text-sm">Print result slips for all students in a class</p>
                </CardContent>
              </Card>
            </div>
          )}

          {mode && (
            <Card className="mt-6 border-0 shadow-sm">
              <CardHeader>
                <CardTitle>{mode === 'individual' ? 'Individual Student Result' : 'Class Result Print'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Term</Label>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
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
                    <Input value={selectedSession} onChange={e => setSelectedSession(e.target.value)} placeholder="2024/2025" />
                  </div>
                  {mode === 'individual' ? (
                    <div>
                      <Label>Admission Number</Label>
                      <Input value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} placeholder="e.g. ADM001" />
                    </div>
                  ) : (
                    <div>
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>{ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setMode(''); setPrintData([]); }}>← Back</Button>
                  <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]" onClick={mode === 'individual' ? loadIndividual : loadClass} disabled={loading}>
                    {loading ? 'Loading...' : 'Load Results'}
                  </Button>
                  {printData.length > 0 && (
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" /> Print {printData.length} Slip(s)
                    </Button>
                  )}
                </div>
                {printData.length > 0 && (
                  <p className="text-sm text-green-700 font-medium">{printData.length} result slip(s) ready to print</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Print Area */}
        <div ref={printRef}>
          {printData.map((d, i) => (
            <ResultSlip key={i} student={d.student} results={d.results} settings={settings} term={selectedTerm} session={selectedSession} />
          ))}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { SCHOOL_CLASSES } from '@/components/GradingUtils';
import ResultSlip from '@/components/ResultSlip';
import { Printer, Users, User, Send, CheckSquare, Square, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const ALL_CLASSES = Object.values(SCHOOL_CLASSES).flat();

export default function PrintResult() {
  const [settings, setSettings] = useState(null);
  const [mode, setMode] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [admissionNo, setAdmissionNo] = useState('');
  const [printData, setPrintData] = useState([]);
  const [loading, setLoading] = useState(false);
  // WhatsApp tab
  const [waStudents, setWaStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [waClass, setWaClass] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [activeTab, setActiveTab] = useState('print'); // 'print' | 'whatsapp'

  useEffect(() => {
    base44.entities.SchoolSettings.list().then(s => {
      const s0 = s[0] || {};
      setSettings(s0);
      setSelectedTerm(s0.current_term || '');
      setSelectedSession(s0.current_session || '');
      setWaMessage(`Dear Parent, please find your ward's result for ${s0.current_term || 'this term'}. Log in to the school portal to view the full result.`);
    });
  }, []);

  // ---- Helpers ----
  const resolveClassTeacher = async (classResults) => {
    const teacherId = classResults[0]?.teacher_id;
    if (!teacherId) return null;
    const teachers = await base44.entities.Teacher.filter({ id: teacherId });
    const t = teachers[0];
    if (!t) return null;
    return { name: `${t.first_name} ${t.last_name}`, phone: t.phone, email: t.email };
  };

  const loadIndividual = async () => {
    if (!admissionNo || !selectedTerm || !selectedSession) return alert('Fill all fields');
    setLoading(true);
    const students = await base44.entities.Student.filter({ admission_number: admissionNo.trim() });
    if (!students[0]) { alert('Student not found'); setLoading(false); return; }
    const student = students[0];
    const results = await base44.entities.Result.filter({ student_id: student.id, term: selectedTerm, session: selectedSession });
    const totalScore = results.reduce((sum, r) => sum + (r.total || 0), 0);

    // Get class peers for ranking
    const peers = await base44.entities.Student.filter({ current_class: student.current_class, status: 'Active' });
    const totalInClass = peers.length;
    const peerResults = await Promise.all(peers.map(async p => {
      const pr = await base44.entities.Result.filter({ student_id: p.id, term: selectedTerm, session: selectedSession });
      return { studentId: p.id, totalScore: pr.reduce((s, r) => s + (r.total || 0), 0), results: pr };
    }));
    const sortedPeers = [...peerResults].sort((a, b) => b.totalScore - a.totalScore);
    const classPosition = sortedPeers.findIndex(p => p.studentId === student.id) + 1;

    // Subject stats
    const subjectMap = {};
    peerResults.forEach(pr => {
      pr.results.forEach(r => {
        if (!subjectMap[r.subject_id]) subjectMap[r.subject_id] = [];
        subjectMap[r.subject_id].push({ studentId: pr.studentId, total: r.total || 0 });
      });
    });
    const subjectStats = {};
    Object.entries(subjectMap).forEach(([subjId, entries]) => {
      const avg = entries.reduce((s, e) => s + e.total, 0) / entries.length;
      const sr = [...entries].sort((a, b) => b.total - a.total);
      const ranks = {};
      sr.forEach((e, idx) => { ranks[e.studentId] = idx + 1; });
      subjectStats[subjId] = { avg: parseFloat(avg.toFixed(1)), ranks };
    });

    const enrichedResults = results.map(r => ({
      ...r,
      subject_position: subjectStats[r.subject_id]?.ranks[student.id] || 0,
      class_average_score: subjectStats[r.subject_id]?.avg || 0,
      class_position: classPosition,
      total_in_class: totalInClass,
      total_score_all_subjects: totalScore
    }));

    const classTeacher = await resolveClassTeacher(results);
    setPrintData([{ student, results: enrichedResults, totalScore, rankings: { classPosition }, classTeacher }]);
    setLoading(false);
  };

  const loadClass = async () => {
    if (!selectedClass || !selectedTerm || !selectedSession) return alert('Fill all fields');
    setLoading(true);
    const students = await base44.entities.Student.filter({ current_class: selectedClass, status: 'Active' });
    const totalInClass = students.length;

    // Load all results for all students
    const studentResults = await Promise.all(students.map(async (s) => {
      const results = await base44.entities.Result.filter({ student_id: s.id, term: selectedTerm, session: selectedSession });
      const totalScore = results.reduce((sum, r) => sum + (r.total || 0), 0);
      return { student: s, results, totalScore };
    }));

    // --- Compute subject positions & class averages ---
    // Collect all subjects taught in this class
    const subjectMap = {}; // subjectId -> [{studentId, total}]
    studentResults.forEach(({ student, results }) => {
      results.forEach(r => {
        if (!subjectMap[r.subject_id]) subjectMap[r.subject_id] = [];
        subjectMap[r.subject_id].push({ studentId: student.id, total: r.total || 0 });
      });
    });
    // Compute class avg and rank per subject
    const subjectStats = {}; // subjectId -> { avg, ranks: {studentId: rank} }
    Object.entries(subjectMap).forEach(([subjId, entries]) => {
      const avg = entries.reduce((s, e) => s + e.total, 0) / entries.length;
      const sorted = [...entries].sort((a, b) => b.total - a.total);
      const ranks = {};
      sorted.forEach((e, idx) => { ranks[e.studentId] = idx + 1; });
      subjectStats[subjId] = { avg: parseFloat(avg.toFixed(1)), ranks };
    });

    // Sort students by total score for class ranking
    const sorted = [...studentResults].sort((a, b) => b.totalScore - a.totalScore);

    const classTeacher = await resolveClassTeacher(studentResults[0]?.results || []);

    // Build final data with computed stats
    const dataArr = studentResults
      .filter(d => d.results.length > 0)
      .map(d => {
        const classPosition = sorted.findIndex(s => s.student.id === d.student.id) + 1;
        const enrichedResults = d.results.map(r => ({
          ...r,
          subject_position: subjectStats[r.subject_id]?.ranks[d.student.id] || 0,
          class_average_score: subjectStats[r.subject_id]?.avg || 0,
          class_position: classPosition,
          total_in_class: totalInClass,
          total_score_all_subjects: d.totalScore
        }));
        return {
          student: d.student,
          results: enrichedResults,
          totalScore: d.totalScore,
          rankings: { classPosition },
          classTeacher
        };
      });

    setPrintData(dataArr);
    setLoading(false);
  };

  // ---- WhatsApp ----
  const loadWaStudents = async () => {
    if (!waClass) return;
    const students = await base44.entities.Student.filter({ current_class: waClass, status: 'Active' });
    setWaStudents(students);
    setSelectedStudents(students.map(s => s.id));
  };

  useEffect(() => { if (waClass) loadWaStudents(); }, [waClass]);

  const toggleStudent = (id) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const sendWhatsApp = (student) => {
    const phone = student.parent_phone?.replace(/\D/g, '').replace(/^0/, '234');
    if (!phone) return alert(`No phone number for ${student.first_name} ${student.last_name}'s parent`);
    const text = encodeURIComponent(`${waMessage}\n\nStudent: ${student.first_name} ${student.last_name}\nClass: ${student.current_class}\nAdm. No: ${student.admission_number}`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const sendAllSelected = () => {
    const toSend = waStudents.filter(s => selectedStudents.includes(s.id));
    if (toSend.length === 0) return alert('No students selected');
    toSend.forEach((s, i) => setTimeout(() => sendWhatsApp(s), i * 800));
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .result-slip { page-break-after: always; width: 210mm !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div className="no-print mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Print Results / Send via WhatsApp</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            {['print', 'whatsapp'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab === 'print' ? '🖨️ Print Results' : '📱 Send via WhatsApp'}
              </button>
            ))}
          </div>

          {activeTab === 'print' && (
            <>
              {!mode && (
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <Card className="border-2 border-[#1e3a5f] cursor-pointer hover:shadow-lg" onClick={() => setMode('individual')}>
                    <CardContent className="p-8 text-center">
                      <User className="w-12 h-12 text-[#1e3a5f] mx-auto mb-3" />
                      <h2 className="text-xl font-bold mb-2">Individual Student</h2>
                      <p className="text-gray-500 text-sm">Print result for one student</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-green-600 cursor-pointer hover:shadow-lg" onClick={() => setMode('class')}>
                    <CardContent className="p-8 text-center">
                      <Users className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h2 className="text-xl font-bold mb-2">Entire Class</h2>
                      <p className="text-gray-500 text-sm">Print all results in a class</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              {mode && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>{mode === 'individual' ? 'Individual Result' : 'Class Results'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Term</Label>
                        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                          <Input value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} placeholder="ADM001" />
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
                    <div className="flex gap-3 flex-wrap">
                      <Button variant="outline" onClick={() => { setMode(''); setPrintData([]); }}>← Back</Button>
                      <Button className="bg-[#1e3a5f]" onClick={mode === 'individual' ? loadIndividual : loadClass} disabled={loading}>
                        {loading ? 'Loading...' : 'Load Results'}
                      </Button>
                      {printData.length > 0 && (
                        <Button className="bg-green-600" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" /> Print {printData.length} Result(s)
                        </Button>
                      )}
                    </div>
                    {printData.length > 0 && <p className="text-sm text-green-700 font-medium">{printData.length} result slip(s) ready</p>}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Send Result Notification via WhatsApp</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Select Class</Label>
                      <Select value={waClass} onValueChange={setWaClass}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>{ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Message to Parents</Label>
                      <Input value={waMessage} onChange={e => setWaMessage(e.target.value)} />
                    </div>
                  </div>
                  {waStudents.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{waStudents.length} students in {waClass} — {selectedStudents.length} selected</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedStudents(waStudents.map(s => s.id))}>Select All</Button>
                          <Button size="sm" variant="outline" onClick={() => setSelectedStudents([])}>Deselect All</Button>
                          <Button size="sm" className="bg-green-600" onClick={sendAllSelected}>
                            <Send className="w-4 h-4 mr-2" /> Send to Selected ({selectedStudents.length})
                          </Button>
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left w-10">Select</th>
                              <th className="p-2 text-left">Student Name</th>
                              <th className="p-2 text-left">Adm. No</th>
                              <th className="p-2 text-left">Parent Phone</th>
                              <th className="p-2 text-left">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waStudents.map(s => (
                              <tr key={s.id} className="border-t hover:bg-gray-50">
                                <td className="p-2">
                                  <button onClick={() => toggleStudent(s.id)}>
                                    {selectedStudents.includes(s.id)
                                      ? <CheckSquare className="w-5 h-5 text-green-600" />
                                      : <Square className="w-5 h-5 text-gray-400" />}
                                  </button>
                                </td>
                                <td className="p-2 font-medium">{s.first_name} {s.last_name}</td>
                                <td className="p-2 text-gray-500">{s.admission_number}</td>
                                <td className="p-2">
                                  {s.parent_phone
                                    ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.parent_phone}</span>
                                    : <Badge variant="outline" className="text-red-500 border-red-300">No phone</Badge>
                                  }
                                </td>
                                <td className="p-2">
                                  <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => sendWhatsApp(s)}>
                                    <Send className="w-3 h-3 mr-1" /> Send
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {waClass && waStudents.length === 0 && (
                    <p className="text-center text-gray-400 py-4">No students found in this class.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Print Area */}
        {printData.map((d, i) => (
          <ResultSlip
            key={i}
            student={d.student}
            results={d.results}
            settings={settings}
            term={selectedTerm}
            session={selectedSession}
            classTeacher={d.classTeacher}
            rankings={d.rankings}
          />
        ))}
      </div>
    </div>
  );
}
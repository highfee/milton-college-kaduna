import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, Printer, ShieldCheck, AlertCircle } from 'lucide-react';
import ResultSlip from '@/components/ResultSlip';

const TERMS = ['First Term', 'Second Term', 'Third Term'];

export default function CheckResult() {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [token, setToken] = useState('');
  const [term, setTerm] = useState('');
  const [session, setSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    base44.entities.SchoolSettings.list().then(s => {
      if (s[0]) {
        setSettings(s[0]);
        setSession(s[0].current_session || '');
        setTerm(s[0].current_term || '');
      }
    });
  }, []);

  const handleCheck = async () => {
    if (!admissionNumber.trim() || !token.trim() || !term || !session) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');

    // 1. Find student by admission number
    const students = await base44.entities.Student.filter({ admission_number: admissionNumber.trim() });
    if (!students[0]) {
      setError('Student with this admission number not found.');
      setLoading(false);
      return;
    }
    const student = students[0];

    // 2. Validate the result token
    const tokens = await base44.entities.ResultToken.filter({
      student_id: student.id,
      token: token.trim(),
      term,
      session,
    });
    if (!tokens[0]) {
      setError('Invalid result token/PIN for this student, term, and session.');
      setLoading(false);
      return;
    }
    if (tokens[0].status === 'Revoked' || tokens[0].status === 'Expired') {
      setError(`This token has been ${tokens[0].status.toLowerCase()}. Please contact the school.`);
      setLoading(false);
      return;
    }

    // 3. Fetch approved results
    const results = await base44.entities.Result.filter({
      student_id: student.id,
      term,
      session,
      status: 'Approved',
    });
    if (results.length === 0) {
      setError('No approved results found for this student in the selected term/session.');
      setLoading(false);
      return;
    }

    // 4. Compute rankings (class position, subject positions, averages)
    const peers = await base44.entities.Student.filter({ current_class: student.current_class, status: 'Active' });
    const totalInClass = peers.length;
    const peerResults = await Promise.all(peers.map(async p => {
      const pr = await base44.entities.Result.filter({ student_id: p.id, term, session, status: 'Approved' });
      return { studentId: p.id, totalScore: pr.reduce((s, r) => s + (r.total || 0), 0), results: pr };
    }));
    const sorted = [...peerResults].sort((a, b) => b.totalScore - a.totalScore);
    const classPosition = sorted.findIndex(p => p.studentId === student.id) + 1;

    const subjectMap = {};
    peerResults.forEach(pr => pr.results.forEach(r => {
      if (!subjectMap[r.subject_id]) subjectMap[r.subject_id] = [];
      subjectMap[r.subject_id].push({ studentId: pr.studentId, total: r.total || 0 });
    }));
    const subjectStats = {};
    Object.entries(subjectMap).forEach(([subjId, entries]) => {
      const avg = entries.reduce((s, e) => s + e.total, 0) / entries.length;
      const sr = [...entries].sort((a, b) => b.total - a.total);
      const ranks = {};
      sr.forEach((e, idx) => { ranks[e.studentId] = idx + 1; });
      subjectStats[subjId] = { avg: parseFloat(avg.toFixed(1)), ranks };
    });

    const totalScore = results.reduce((s, r) => s + (r.total || 0), 0);
    const enrichedResults = results.map(r => ({
      ...r,
      subject_position: subjectStats[r.subject_id]?.ranks[student.id] || 0,
      class_average_score: subjectStats[r.subject_id]?.avg || 0,
      class_position: classPosition,
      total_in_class: totalInClass,
      total_score_all_subjects: totalScore,
    }));

    // 5. Get class teacher
    const teachers = await base44.entities.Teacher.filter({ status: 'Active' });
    const ct = teachers.find(t =>
      (t.teacher_type === 'Class Teacher' && t.assigned_class === student.current_class) ||
      (t.teacher_type === 'Form Teacher' && t.form_teacher_class === student.current_class) ||
      (t.teacher_type === 'Head Teacher' && t.assigned_class === student.current_class)
    );

    // 6. Mark token as Used
    await base44.entities.ResultToken.update(tokens[0].id, { status: 'Used' });

    setResultData({
      student,
      results: enrichedResults,
      classTeacher: ct ? { name: `${ct.first_name} ${ct.last_name}`, phone: ct.phone, email: ct.email } : null,
      rankings: { classPosition, promoted: false },
    });
    setShowResult(true);
    setLoading(false);
  };

  if (showResult && resultData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3 no-print">
          <Button variant="outline" size="sm" onClick={() => { setShowResult(false); setToken(''); setAdmissionNumber(''); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="font-semibold text-sm">{term} — {session} Result</span>
          <Badge className="ml-2 bg-green-100 text-green-700 border-0 text-xs">
            <ShieldCheck className="w-3 h-3 mr-1" /> Official Result Slip
          </Badge>
          <Button size="sm" className="ml-auto bg-[#1e3a5f] hover:bg-[#2c4a6e] text-white" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
        <div className="p-4 overflow-auto">
          <ResultSlip
            student={resultData.student}
            results={resultData.results}
            settings={settings}
            term={term}
            session={session}
            classTeacher={resultData.classTeacher}
            rankings={resultData.rankings}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Check Result</h1>
          <p className="text-blue-200 mt-1 text-sm">Milton College of Arts & Science</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-center">Enter Your Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div>
              <Label>Admission Number</Label>
              <Input
                placeholder="e.g. MCA/2024/001"
                value={admissionNumber}
                onChange={e => setAdmissionNumber(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session</Label>
              <Input
                placeholder="e.g. 2024/2025"
                value={session}
                onChange={e => setSession(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Result Token / PIN</Label>
              <Input
                placeholder="Enter your result token/PIN"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="mt-1"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button
              className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e] h-11 text-base font-semibold"
              onClick={handleCheck}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Checking...
                </span>
              ) : (
                <><Search className="w-4 h-4 mr-2" />Check My Result</>
              )}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Your result token/PIN is issued by the school accountant. Contact the school if you need one.
            </p>

            <div className="border-t pt-3 text-center">
              <Link to="/" className="text-sm text-blue-600 hover:underline">← Back to Home</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
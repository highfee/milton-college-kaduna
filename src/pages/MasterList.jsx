import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Printer, BarChart3, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TERMS = ['First Term', 'Second Term', 'Third Term'];
const NURSERY_PRIMARY_CLASSES = [
  'Reception Class', 'Nursery 1', 'Nursery 2',
  'Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B',
  'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'
];
const SECONDARY_CLASSES = [
  'JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B',
  'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B',
  'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B',
  'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B'
];
const ALL_CLASSES = [...NURSERY_PRIMARY_CLASSES, ...SECONDARY_CLASSES];

const getGrade = (score, section) => {
  const n = parseFloat(score);
  if (section === 'Secondary') {
    if (n >= 75) return 'A1'; if (n >= 70) return 'B2'; if (n >= 65) return 'B3';
    if (n >= 60) return 'C4'; if (n >= 55) return 'C5'; if (n >= 50) return 'C6';
    if (n >= 45) return 'D7'; if (n >= 40) return 'E8'; return 'F9';
  }
  if (n >= 70) return 'A'; if (n >= 60) return 'B'; if (n >= 50) return 'C';
  if (n >= 45) return 'D'; if (n >= 40) return 'E'; return 'F';
};

const getRemark = (score) => {
  if (score >= 75) return 'Distinction'; if (score >= 65) return 'Very Good';
  if (score >= 55) return 'Good'; if (score >= 45) return 'Fair';
  if (score >= 40) return 'Pass'; return 'Fail';
};

const ordinal = (n) => {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
};

const getGradeColor = (score) => {
  const n = parseFloat(score);
  if (n >= 70) return '#006400'; if (n >= 55) return '#0000CD'; if (n >= 45) return '#FF8C00'; return '#CC0000';
};

export default function MasterList() {
  const printRef = useRef(null);
  const [settings, setSettings] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('masterlist');

  const [filterSection, setFilterSection] = useState('all');
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterSession, setFilterSession] = useState('');
  const [search, setSearch] = useState('');

  // Transcript
  const [transcriptStudent, setTranscriptStudent] = useState(null);
  const [transcriptResults, setTranscriptResults] = useState([]);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  useEffect(() => { loadInit(); }, []);

  const loadInit = async () => {
    const [subj, st, allSt] = await Promise.all([
      base44.entities.Subject.list(),
      base44.entities.SchoolSettings.list(),
      base44.entities.Student.filter({ status: 'Active' })
    ]);
    setSubjects(subj);
    if (st[0]) {
      setSettings(st[0]);
      setFilterSession(st[0].current_session || '');
      setFilterTerm(st[0].current_term || 'First Term');
    }
    setAllStudents(allSt);
    setStudents(allSt);
  };

  const loadResults = async () => {
    if (!filterClass) { alert('Please select a class'); return; }
    setLoading(true);
    const query = { class: filterClass, term: filterTerm };
    if (filterSession) query.session = filterSession;
    const data = await base44.entities.Result.filter(query, '-total', 500);
    setResults(data);
    setLoading(false);
  };

  // Group by student
  const resultsByStudent = {};
  results.forEach(r => {
    if (!resultsByStudent[r.student_id]) {
      resultsByStudent[r.student_id] = { student_name: r.student_name, admission_number: r.admission_number, subjects: {}, section: r.section };
    }
    resultsByStudent[r.student_id].subjects[r.subject_id] = r;
  });

  const subjectIds = [...new Set(results.map(r => r.subject_id))];
  const subjectList = subjectIds.map(id => {
    const r = results.find(r2 => r2.subject_id === id);
    return { id, name: r?.subject_name || id };
  });

  const studentRows = Object.entries(resultsByStudent).map(([studentId, data]) => {
    const scores = subjectList.map(s => data.subjects[s.id]?.total ?? null);
    const validScores = scores.filter(s => s !== null);
    const totalScore = validScores.reduce((a, b) => a + b, 0);
    const avg = validScores.length ? (totalScore / validScores.length) : 0;
    const section = data.section || (SECONDARY_CLASSES.includes(filterClass) ? 'Secondary' : 'Primary');
    return { studentId, ...data, scores, totalScore, avg: parseFloat(avg.toFixed(1)), section };
  }).sort((a, b) => b.totalScore - a.totalScore).map((row, idx) => ({ ...row, position: idx + 1 }));

  const filteredRows = studentRows.filter(r =>
    r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Class averages per subject
  const classSubjectAvg = subjectList.map((s, si) => {
    const vals = filteredRows.map(r => r.scores[si]).filter(v => v !== null);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  });

  // Transcript
  const loadTranscript = async (student) => {
    setTranscriptLoading(true);
    setTranscriptStudent(student);
    const data = await base44.entities.Result.filter({ student_id: student.id }, '-session', 300);
    setTranscriptResults(data);
    setTranscriptLoading(false);
  };

  const transcriptStudentList = allStudents.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
    (s.admission_number || '').toLowerCase().includes(transcriptSearch.toLowerCase())
  ).slice(0, 20);

  const transcriptGroups = {};
  transcriptResults.forEach(r => {
    const key = `${r.session}__${r.term}`;
    if (!transcriptGroups[key]) transcriptGroups[key] = { session: r.session, term: r.term, results: [] };
    transcriptGroups[key].results.push(r);
  });
  const termOrder = { 'First Term': 1, 'Second Term': 2, 'Third Term': 3 };
  const transcriptTerms = Object.values(transcriptGroups).sort((a, b) => {
    if (a.session !== b.session) return a.session.localeCompare(b.session);
    return termOrder[a.term] - termOrder[b.term];
  });

  const filteredClasses = filterSection === 'Nursery' ? ['Reception Class', 'Nursery 1', 'Nursery 2']
    : filterSection === 'Primary' ? NURSERY_PRIMARY_CLASSES.filter(c => !['Reception Class', 'Nursery 1', 'Nursery 2'].includes(c))
    : filterSection === 'Secondary' ? SECONDARY_CLASSES : ALL_CLASSES;

  const isSecondary = SECONDARY_CLASSES.includes(filterClass);

  return (
    <div className="min-h-screen bg-gray-50" ref={printRef}>
      <div className="bg-[#1e3a5f] text-white px-6 py-4 no-print">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/AdminPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70 cursor-pointer" /></Link>
            <BarChart3 className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Master List & Transcript</h1>
              <p className="text-sm text-white/70">{settings?.school_name || 'School'} — Academic Records</p>
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-white text-[#1e3a5f] hover:bg-white/90 no-print">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="no-print">
          <TabsList className="mb-4">
            <TabsTrigger value="masterlist">Class Master List</TabsTrigger>
            <TabsTrigger value="transcript">Student Transcript</TabsTrigger>
          </TabsList>

          {/* ─── MASTER LIST ─── */}
          <TabsContent value="masterlist">
            <Card className="border-0 shadow-sm mb-4 no-print">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Select value={filterSection} onValueChange={v => { setFilterSection(v); setFilterClass(''); }}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {['Nursery', 'Primary', 'Secondary'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger><SelectValue placeholder="Class *" /></SelectTrigger>
                    <SelectContent>{filteredClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterTerm} onValueChange={setFilterTerm}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={filterSession} onChange={e => setFilterSession(e.target.value)} placeholder="Session e.g 2024/2025" />
                  <Button onClick={loadResults} disabled={loading || !filterClass} className="bg-[#1e3a5f] col-span-2 md:col-span-1">
                    {loading ? 'Loading...' : 'Generate'}
                  </Button>
                </div>
                {results.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs h-8 text-sm" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PRINT HEADER */}
            <div className="hidden print:block text-center mb-4 border-b-2 border-[#1e3a5f] pb-3">
              {settings?.school_logo && <img src={settings.school_logo} alt="logo" className="h-16 mx-auto mb-2" />}
              <h1 className="text-xl font-bold uppercase">{settings?.school_name || 'School'}</h1>
              <p className="text-sm">{settings?.address}</p>
              <h2 className="text-lg font-bold mt-2">CLASS MASTER LIST / BROADSHEET</h2>
              <p className="text-sm">{filterClass} — {filterTerm}, {filterSession}</p>
              <p className="text-xs">No. of Students: {filteredRows.length}</p>
            </div>

            {results.length > 0 && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-2 no-print">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{filterClass} — {filterTerm} {filterSession}</span>
                    <Badge className="bg-[#1e3a5f]">{filteredRows.length} students</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse" style={{ minWidth: '900px' }}>
                      <thead>
                        <tr className="bg-[#1e3a5f] text-white">
                          <th className="border border-[#2c4a6e] px-2 py-2 text-center w-8">S/N</th>
                          <th className="border border-[#2c4a6e] px-2 py-2 text-left">Adm. No.</th>
                          <th className="border border-[#2c4a6e] px-2 py-2 text-left" style={{ minWidth: '140px' }}>Student Name</th>
                          {subjectList.map(s => (
                            <th key={s.id} className="border border-[#2c4a6e] px-1 py-2 text-center" style={{ minWidth: '55px', writingMode: 'vertical-rl', height: '80px', transform: 'rotate(180deg)' }}>
                              {s.name}
                            </th>
                          ))}
                          <th className="border border-[#2c4a6e] px-2 py-2 text-center">Total</th>
                          <th className="border border-[#2c4a6e] px-2 py-2 text-center">Avg %</th>
                          <th className="border border-[#2c4a6e] px-2 py-2 text-center">Grade</th>
                          <th className="border border-[#2c4a6e] px-2 py-2 text-center">Remark</th>
                          <th className="border border-[#2c4a6e] px-2 py-2 text-center">Position</th>
                          <th className="border border-[#2c4a6e] px-2 py-2 text-center">Promo.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, idx) => {
                          const promoStatus = Object.values(row.subjects)[0]?.promotion_status;
                          const grade = getGrade(row.avg, row.section);
                          const remark = getRemark(row.avg);
                          return (
                            <tr key={row.studentId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-200 px-2 py-1.5 text-center font-bold text-[#1e3a5f]">{row.position}</td>
                              <td className="border border-gray-200 px-2 py-1.5 font-mono">{row.admission_number || '—'}</td>
                              <td className="border border-gray-200 px-2 py-1.5 font-medium">{row.student_name}</td>
                              {row.scores.map((score, si) => (
                                <td key={si} className="border border-gray-200 px-1 py-1.5 text-center"
                                  style={{ color: score !== null ? getGradeColor(score) : '#999', fontWeight: score !== null ? 'bold' : 'normal' }}>
                                  {score !== null ? score : '—'}
                                </td>
                              ))}
                              <td className="border border-gray-200 px-2 py-1.5 text-center font-bold">{row.totalScore}</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center font-bold" style={{ color: getGradeColor(row.avg) }}>{row.avg}%</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center font-bold" style={{ color: getGradeColor(row.avg) }}>{grade}</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">{remark}</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center font-bold">{ordinal(row.position)}</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">
                                {promoStatus ? (
                                  <span className={`text-xs font-semibold ${promoStatus === 'Promoted' ? 'text-green-700' : promoStatus === 'Demoted' ? 'text-red-600' : 'text-amber-700'}`}>
                                    {promoStatus}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {filteredRows.length > 0 && (
                        <tfoot>
                          <tr className="bg-[#1e3a5f]/10 font-semibold">
                            <td colSpan={3} className="border border-gray-300 px-2 py-2 text-xs font-bold">CLASS AVERAGE</td>
                            {classSubjectAvg.map((avg, si) => (
                              <td key={si} className="border border-gray-300 text-center text-xs font-bold" style={{ color: avg !== '—' ? getGradeColor(avg) : '#999' }}>{avg}</td>
                            ))}
                            <td className="border border-gray-300 text-center text-xs" colSpan={5}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  {/* Grade Key */}
                  <div className="p-4 border-t bg-gray-50">
                    <p className="text-xs font-bold text-gray-600 mb-1">GRADE KEY:</p>
                    {isSecondary ? (
                      <p className="text-xs text-gray-500">A1(75-100)=Distinction · B2(70-74)=Very Good · B3(65-69)=Good · C4(60-64)=Credit · C5(55-59)=Credit · C6(50-54)=Credit · D7(45-49)=Pass · E8(40-44)=Pass · F9(0-39)=Fail</p>
                    ) : (
                      <p className="text-xs text-gray-500">A(70-100)=Distinction · B(60-69)=Very Good · C(50-59)=Good · D(45-49)=Fair · E(40-44)=Pass · F(0-39)=Fail</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {results.length === 0 && !loading && (
              <div className="text-center py-20 text-gray-400">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a class and click Generate to view the master list</p>
              </div>
            )}
          </TabsContent>

          {/* ─── TRANSCRIPT ─── */}
          <TabsContent value="transcript">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm md:col-span-1 no-print">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Search Student</CardTitle></CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input className="pl-9 h-8 text-sm" placeholder="Name or Adm. No." value={transcriptSearch} onChange={e => setTranscriptSearch(e.target.value)} />
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {transcriptStudentList.map(s => (
                      <button key={s.id} onClick={() => loadTranscript(s)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${transcriptStudent?.id === s.id ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white border-gray-200 hover:border-[#1e3a5f]'}`}>
                        <p className="font-medium">{s.first_name} {s.last_name}</p>
                        <p className={`text-xs ${transcriptStudent?.id === s.id ? 'text-white/70' : 'text-gray-400'}`}>{s.admission_number} · {s.current_class}</p>
                      </button>
                    ))}
                    {transcriptStudentList.length === 0 && <p className="text-center text-gray-400 text-xs py-4">No students found</p>}
                  </div>
                </CardContent>
              </Card>

              <div className="md:col-span-2">
                {!transcriptStudent ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center text-gray-400">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Select a student to view their transcript</p>
                    </CardContent>
                  </Card>
                ) : transcriptLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* PRINT HEADER for transcript */}
                    <div className="hidden print:block text-center mb-4 border-b-2 border-[#1e3a5f] pb-3">
                      {settings?.school_logo && <img src={settings.school_logo} alt="logo" className="h-14 mx-auto mb-1" />}
                      <h1 className="text-xl font-bold uppercase">{settings?.school_name}</h1>
                      <h2 className="font-bold text-lg">STUDENT ACADEMIC TRANSCRIPT</h2>
                    </div>

                    {/* Student Info */}
                    <Card className="border-0 shadow-sm bg-gradient-to-r from-[#1e3a5f] to-[#2c4a6e] text-white">
                      <CardContent className="p-4 flex items-center gap-4">
                        {transcriptStudent.passport_photo ? (
                          <img src={transcriptStudent.passport_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                            {transcriptStudent.first_name?.[0]}{transcriptStudent.last_name?.[0]}
                          </div>
                        )}
                        <div>
                          <h2 className="text-lg font-bold">{transcriptStudent.first_name} {transcriptStudent.middle_name} {transcriptStudent.last_name}</h2>
                          <p className="text-white/80 text-sm">Adm. No: {transcriptStudent.admission_number}</p>
                          <p className="text-white/80 text-sm">Current Class: {transcriptStudent.current_class} · {transcriptStudent.section}</p>
                          <p className="text-white/80 text-xs">Gender: {transcriptStudent.gender} · DOB: {transcriptStudent.date_of_birth}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {transcriptTerms.length === 0 ? (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-8 text-center text-gray-400">No results found for this student.</CardContent>
                      </Card>
                    ) : (
                      transcriptTerms.map((termGroup, tIdx) => {
                        const section = termGroup.results[0]?.section || 'Primary';
                        const termTotal = termGroup.results.reduce((s, r) => s + (r.total || 0), 0);
                        const termAvg = termGroup.results.length ? (termTotal / termGroup.results.length) : 0;
                        const grade = getGrade(termAvg, section);
                        const remark = getRemark(termAvg);
                        const promoStatus = termGroup.results[0]?.promotion_status;
                        const classPosition = termGroup.results[0]?.class_position;
                        const totalInClass = termGroup.results[0]?.total_in_class;
                        return (
                          <Card key={tIdx} className="border-0 shadow-sm">
                            <CardHeader className="pb-2 pt-3 px-4">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <CardTitle className="text-sm font-bold text-[#1e3a5f]">{termGroup.term}, {termGroup.session}</CardTitle>
                                  <p className="text-xs text-gray-500">
                                    Class: {termGroup.results[0]?.class} · {termGroup.results.length} Subjects ·
                                    Avg: <strong style={{ color: getGradeColor(termAvg) }}>{termAvg.toFixed(1)}%</strong>
                                    {classPosition && ` · Position: ${ordinal(classPosition)}${totalInClass ? `/${totalInClass}` : ''}`}
                                  </p>
                                </div>
                                {promoStatus && (
                                  <Badge className={`text-xs ${promoStatus === 'Promoted' ? 'bg-green-100 text-green-700' : promoStatus === 'Demoted' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {promoStatus}
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="p-0">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="text-left px-3 py-1.5 border-b">Subject</th>
                                    <th className="text-center px-2 py-1.5 border-b">1st CA</th>
                                    <th className="text-center px-2 py-1.5 border-b">2nd CA</th>
                                    <th className="text-center px-2 py-1.5 border-b">3rd CA</th>
                                    <th className="text-center px-2 py-1.5 border-b">Exam</th>
                                    <th className="text-center px-2 py-1.5 border-b font-bold">Total</th>
                                    <th className="text-center px-2 py-1.5 border-b">Grade</th>
                                    <th className="text-left px-2 py-1.5 border-b">Remark</th>
                                    <th className="text-center px-2 py-1.5 border-b">Pos.</th>
                                    <th className="text-center px-2 py-1.5 border-b">Class Avg</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {termGroup.results.map((r, rIdx) => (
                                    <tr key={r.id} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="px-3 py-1 font-medium text-gray-800">{r.subject_name}</td>
                                      <td className="text-center px-2 py-1 text-gray-600">{r.first_ca ?? '—'}</td>
                                      <td className="text-center px-2 py-1 text-gray-600">{r.second_ca ?? '—'}</td>
                                      <td className="text-center px-2 py-1 text-gray-600">{r.third_ca ?? '—'}</td>
                                      <td className="text-center px-2 py-1 text-gray-600">{r.exam_score ?? '—'}</td>
                                      <td className="text-center px-2 py-1 font-bold" style={{ color: getGradeColor(r.total) }}>{r.total ?? '—'}</td>
                                      <td className="text-center px-2 py-1 font-bold" style={{ color: getGradeColor(r.total) }}>{r.grade || '—'}</td>
                                      <td className="px-2 py-1 text-gray-500">{r.remark || '—'}</td>
                                      <td className="text-center px-2 py-1">{r.subject_position ? ordinal(r.subject_position) : '—'}</td>
                                      <td className="text-center px-2 py-1">{r.class_average_score ?? '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-[#1e3a5f]/10">
                                    <td className="px-3 py-1.5 font-bold text-xs" colSpan={5}>TERM SUMMARY</td>
                                    <td className="text-center px-2 py-1.5 font-bold" style={{ color: getGradeColor(termAvg) }}>{termAvg.toFixed(1)}%</td>
                                    <td className="text-center font-bold" style={{ color: getGradeColor(termAvg) }}>{grade}</td>
                                    <td className="px-2 py-1.5 text-xs font-medium">{remark}</td>
                                    <td colSpan={2}></td>
                                  </tr>
                                </tfoot>
                              </table>
                              {/* Teacher comments */}
                              {(termGroup.results[0]?.class_teacher_comment || termGroup.results[0]?.form_teacher_comment || termGroup.results[0]?.head_teacher_comment || termGroup.results[0]?.principal_comment) && (
                                <div className="px-4 pb-3 pt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {termGroup.results[0]?.class_teacher_comment && (
                                    <div className="bg-blue-50 rounded p-2 text-xs">
                                      <p className="font-bold text-blue-800">Class Teacher:</p>
                                      <p className="text-blue-700">{termGroup.results[0].class_teacher_comment}</p>
                                    </div>
                                  )}
                                  {termGroup.results[0]?.form_teacher_comment && (
                                    <div className="bg-green-50 rounded p-2 text-xs">
                                      <p className="font-bold text-green-800">Form Teacher:</p>
                                      <p className="text-green-700">{termGroup.results[0].form_teacher_comment}</p>
                                    </div>
                                  )}
                                  {termGroup.results[0]?.head_teacher_comment && (
                                    <div className="bg-amber-50 rounded p-2 text-xs">
                                      <p className="font-bold text-amber-800">Head Teacher:</p>
                                      <p className="text-amber-700">{termGroup.results[0].head_teacher_comment}</p>
                                    </div>
                                  )}
                                  {termGroup.results[0]?.principal_comment && (
                                    <div className="bg-purple-50 rounded p-2 text-xs">
                                      <p className="font-bold text-purple-800">Principal:</p>
                                      <p className="text-purple-700">{termGroup.results[0].principal_comment}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}

                    {/* Cumulative Summary */}
                    {transcriptTerms.length > 0 && (
                      <Card className="border-0 shadow-sm bg-[#1e3a5f] text-white">
                        <CardContent className="p-4">
                          <h3 className="font-bold mb-3 text-base">Cumulative Academic Performance Summary</h3>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold">
                                {(transcriptTerms.reduce((sum, tg) => {
                                  const avg = tg.results.length ? tg.results.reduce((s, r) => s + (r.total || 0), 0) / tg.results.length : 0;
                                  return sum + avg;
                                }, 0) / transcriptTerms.length).toFixed(1)}%
                              </p>
                              <p className="text-xs text-white/70">Overall Average</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{transcriptTerms.length}</p>
                              <p className="text-xs text-white/70">Terms Completed</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{transcriptResults.length}</p>
                              <p className="text-xs text-white/70">Total Records</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer, BarChart3, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SECTIONS = ['Nursery', 'Primary', 'Secondary'];
const TERMS = ['First Term', 'Second Term', 'Third Term'];

const NURSERY_PRIMARY_CLASSES = [
  'Reception Class', 'Nursery 1', 'Nursery 2',
  'Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B',
  'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B',
  'Primary 5A', 'Primary 5B'
];

const SECONDARY_CLASSES = [
  'JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B',
  'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B',
  'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B',
  'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B'
];

const ALL_CLASSES = [...NURSERY_PRIMARY_CLASSES, ...SECONDARY_CLASSES];

function getGradeColor(avg) {
  const n = parseFloat(avg);
  if (n >= 70) return 'text-green-700';
  if (n >= 60) return 'text-blue-700';
  if (n >= 50) return 'text-yellow-700';
  return 'text-red-600';
}

function getGradeLetter(avg) {
  const n = parseFloat(avg);
  if (n >= 70) return 'A';
  if (n >= 60) return 'B';
  if (n >= 50) return 'C';
  if (n >= 45) return 'D';
  if (n >= 40) return 'E';
  return 'F';
}

export default function MasterList() {
  const [settings, setSettings] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('masterlist');

  // Filters
  const [filterSection, setFilterSection] = useState('all');
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterSession, setFilterSession] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [search, setSearch] = useState('');

  // Transcript state
  const [transcriptStudent, setTranscriptStudent] = useState(null);
  const [transcriptResults, setTranscriptResults] = useState([]);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  useEffect(() => { loadInit(); }, []);

  const loadInit = async () => {
    const [subj, st] = await Promise.all([
      base44.entities.Subject.list(),
      base44.entities.SchoolSettings.list()
    ]);
    setSubjects(subj);
    if (st[0]) {
      setSettings(st[0]);
      setFilterSession(st[0].current_session || '');
      setFilterTerm(st[0].current_term || 'First Term');
    }
    const allSt = await base44.entities.Student.filter({ status: 'Active' });
    setAllStudents(allSt);
    setStudents(allSt);
  };

  const loadResults = async () => {
    if (!filterClass) { alert('Please select a class'); return; }
    setLoading(true);
    const query = { class: filterClass, term: filterTerm, status: 'Approved' };
    if (filterSession) query.session = filterSession;
    if (filterSubject !== 'all') query.subject_id = filterSubject;
    const data = await base44.entities.Result.filter(query, '-total', 500);
    setResults(data);
    setLoading(false);
  };

  // Build master list table: students x subjects
  const classStudents = students.filter(s => s.current_class === filterClass || !filterClass);
  const classResults = results;

  // Group results by student
  const studentResultMap = {};
  classResults.forEach(r => {
    if (!studentResultMap[r.student_id]) {
      studentResultMap[r.student_id] = { student_name: r.student_name, admission_number: r.admission_number, subjects: {} };
    }
    studentResultMap[r.student_id].subjects[r.subject_id] = r;
  });

  // Get unique subjects in this class results
  const subjectIds = [...new Set(classResults.map(r => r.subject_id))];
  const subjectNames = subjectIds.map(id => {
    const r = classResults.find(r2 => r2.subject_id === id);
    return { id, name: r?.subject_name || id };
  });

  // Build sorted student rows with totals
  const studentRows = Object.entries(studentResultMap).map(([studentId, data]) => {
    const subjectScores = subjectNames.map(s => data.subjects[s.id]?.total || 0);
    const total = subjectScores.reduce((a, b) => a + b, 0);
    const avg = subjectScores.length ? (total / subjectScores.length).toFixed(1) : 0;
    return { studentId, ...data, subjectScores, total, avg };
  }).sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg))
    .map((row, idx) => ({ ...row, position: idx + 1 }));

  // Filtered rows for search
  const filteredRows = studentRows.filter(r =>
    r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Transcript: load all results for a student across all terms/sessions
  const loadTranscript = async (student) => {
    setTranscriptLoading(true);
    setTranscriptStudent(student);
    const data = await base44.entities.Result.filter({ student_id: student.id, status: 'Approved' }, '-session', 200);
    setTranscriptResults(data);
    setTranscriptLoading(false);
  };

  const transcriptStudentList = allStudents.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
    (s.admission_number || '').toLowerCase().includes(transcriptSearch.toLowerCase())
  ).slice(0, 20);

  // Group transcript by session + term
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

  const filteredClasses = filterSection === 'all'
    ? ALL_CLASSES
    : filterSection === 'Nursery' || filterSection === 'Primary'
      ? NURSERY_PRIMARY_CLASSES
      : SECONDARY_CLASSES;

  const filteredSubjects = filterSection !== 'all'
    ? subjects.filter(s => s.section === filterSection)
    : subjects;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
            {/* Filters */}
            <Card className="border-0 shadow-sm mb-4 no-print">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Select value={filterSection} onValueChange={v => { setFilterSection(v); setFilterClass(''); }}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                  <div>
                    <Input value={filterSession} onChange={e => setFilterSession(e.target.value)} placeholder="Session e.g 2024/2025" />
                  </div>
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger><SelectValue placeholder="Subject (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={loadResults} disabled={loading || !filterClass} className="bg-[#1e3a5f]">
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

            {/* Print Header */}
            <div className="hidden print:block text-center mb-4 border-b-2 border-[#1e3a5f] pb-3">
              {settings?.school_logo && <img src={settings.school_logo} alt="logo" className="h-16 mx-auto mb-2" />}
              <h1 className="text-xl font-bold uppercase">{settings?.school_name || 'School'}</h1>
              <p className="text-sm">{settings?.address}</p>
              <h2 className="text-lg font-bold mt-2">CLASS MASTER LIST</h2>
              <p className="text-sm">{filterClass} — {filterTerm}, {filterSession}</p>
            </div>

            {/* Table */}
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
                    <table className="w-full text-xs border-collapse" style={{ minWidth: '800px' }}>
                      <thead>
                        <tr className="bg-[#1e3a5f] text-white">
                          <th className="text-center px-2 py-2 border border-[#2c4a6e] w-8">S/N</th>
                          <th className="text-left px-2 py-2 border border-[#2c4a6e]">Adm. No</th>
                          <th className="text-left px-2 py-2 border border-[#2c4a6e]" style={{ minWidth: '140px' }}>Student Name</th>
                          {subjectNames.map(s => (
                            <th key={s.id} className="text-center px-1 py-2 border border-[#2c4a6e]" style={{ minWidth: '60px', writingMode: 'vertical-rl', height: '80px', transform: 'rotate(180deg)' }}>
                              {s.name}
                            </th>
                          ))}
                          <th className="text-center px-2 py-2 border border-[#2c4a6e]">Total</th>
                          <th className="text-center px-2 py-2 border border-[#2c4a6e]">Average</th>
                          <th className="text-center px-2 py-2 border border-[#2c4a6e]">Grade</th>
                          <th className="text-center px-2 py-2 border border-[#2c4a6e]">Position</th>
                          <th className="text-center px-2 py-2 border border-[#2c4a6e]">Promo. Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, idx) => {
                          const promotionStatus = Object.values(row.subjects)[0]?.promotion_status;
                          return (
                            <tr key={row.studentId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="text-center px-2 py-1.5 border border-gray-200 font-bold text-[#1e3a5f]">{row.position}</td>
                              <td className="px-2 py-1.5 border border-gray-200 font-mono text-xs">{row.admission_number || '-'}</td>
                              <td className="px-2 py-1.5 border border-gray-200 font-medium">{row.student_name}</td>
                              {subjectNames.map((s, si) => (
                                <td key={s.id} className="text-center px-1 py-1.5 border border-gray-200">
                                  {row.subjectScores[si] || '—'}
                                </td>
                              ))}
                              <td className="text-center px-2 py-1.5 border border-gray-200 font-semibold">{row.total}</td>
                              <td className={`text-center px-2 py-1.5 border border-gray-200 font-bold ${getGradeColor(row.avg)}`}>{row.avg}%</td>
                              <td className="text-center px-2 py-1.5 border border-gray-200 font-bold">{getGradeLetter(row.avg)}</td>
                              <td className="text-center px-2 py-1.5 border border-gray-200 font-bold">{row.position}<sup>{row.position === 1 ? 'st' : row.position === 2 ? 'nd' : row.position === 3 ? 'rd' : 'th'}</sup></td>
                              <td className="text-center px-2 py-1.5 border border-gray-200">
                                {promotionStatus ? (
                                  <span className={`text-xs font-semibold px-1 rounded ${
                                    promotionStatus === 'Promoted' ? 'text-green-700' :
                                    promotionStatus === 'Demoted' ? 'text-red-600' : 'text-amber-700'
                                  }`}>{promotionStatus}</span>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Summary row */}
                      {filteredRows.length > 0 && (
                        <tfoot>
                          <tr className="bg-[#1e3a5f]/10 font-semibold">
                            <td colSpan={3} className="px-2 py-2 border border-gray-300 text-xs">Class Average</td>
                            {subjectNames.map((s, si) => {
                              const subAvg = filteredRows.length
                                ? (filteredRows.reduce((sum, r) => sum + r.subjectScores[si], 0) / filteredRows.length).toFixed(1)
                                : 0;
                              return <td key={s.id} className={`text-center border border-gray-300 text-xs font-bold ${getGradeColor(subAvg)}`}>{subAvg}</td>;
                            })}
                            <td className="text-center border border-gray-300 text-xs" colSpan={5}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
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
              {/* Student Search */}
              <Card className="border-0 shadow-sm no-print md:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Search Student</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input className="pl-9 h-8 text-sm" placeholder="Name or Adm. No." value={transcriptSearch} onChange={e => setTranscriptSearch(e.target.value)} />
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {transcriptStudentList.map(s => (
                      <button key={s.id} onClick={() => loadTranscript(s)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                          transcriptStudent?.id === s.id ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white border-gray-200 hover:border-[#1e3a5f] text-gray-700'
                        }`}>
                        <p className="font-medium">{s.first_name} {s.last_name}</p>
                        <p className={`text-xs ${transcriptStudent?.id === s.id ? 'text-white/70' : 'text-gray-400'}`}>{s.admission_number} · {s.current_class}</p>
                      </button>
                    ))}
                    {transcriptStudentList.length === 0 && <p className="text-center text-gray-400 text-xs py-4">No students found</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Transcript Display */}
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
                  <div className="space-y-3">
                    {/* Student Header */}
                    <div className="hidden print:block text-center mb-4 border-b-2 border-[#1e3a5f] pb-3">
                      {settings?.school_logo && <img src={settings.school_logo} alt="logo" className="h-14 mx-auto mb-1" />}
                      <h1 className="text-lg font-bold uppercase">{settings?.school_name}</h1>
                      <h2 className="font-bold">STUDENT ACADEMIC TRANSCRIPT</h2>
                    </div>

                    <Card className="border-0 shadow-sm bg-gradient-to-r from-[#1e3a5f] to-[#2c4a6e] text-white">
                      <CardContent className="p-4 flex items-center gap-4">
                        {transcriptStudent.passport_photo && (
                          <img src={transcriptStudent.passport_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
                        )}
                        <div>
                          <h2 className="text-lg font-bold">{transcriptStudent.first_name} {transcriptStudent.middle_name} {transcriptStudent.last_name}</h2>
                          <p className="text-white/80 text-sm">Adm. No: {transcriptStudent.admission_number}</p>
                          <p className="text-white/80 text-sm">Current Class: {transcriptStudent.current_class} · {transcriptStudent.section} Section</p>
                          <p className="text-white/80 text-xs">Gender: {transcriptStudent.gender} · DOB: {transcriptStudent.date_of_birth}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {transcriptTerms.length === 0 ? (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-8 text-center text-gray-400">
                          <p>No approved results found for this student.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      transcriptTerms.map((termGroup, tIdx) => {
                        const termTotal = termGroup.results.reduce((s, r) => s + (r.total || 0), 0);
                        const termAvg = termGroup.results.length ? (termTotal / termGroup.results.length).toFixed(1) : 0;
                        const promotionStatus = termGroup.results[0]?.promotion_status;
                        return (
                          <Card key={tIdx} className="border-0 shadow-sm">
                            <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                              <div>
                                <CardTitle className="text-sm font-bold text-[#1e3a5f]">{termGroup.term}, {termGroup.session}</CardTitle>
                                <p className="text-xs text-gray-500">
                                  {termGroup.results[0]?.class} · {termGroup.results.length} subjects ·
                                  Avg: <strong className={getGradeColor(termAvg)}>{termAvg}%</strong>
                                  {termGroup.results[0]?.class_position && ` · Position: ${termGroup.results[0].class_position}/${termGroup.results[0].total_in_class}`}
                                </p>
                              </div>
                              {promotionStatus && (
                                <Badge className={`text-xs ${
                                  promotionStatus === 'Promoted' ? 'bg-green-100 text-green-700 border-green-300' :
                                  promotionStatus === 'Demoted' ? 'bg-red-100 text-red-700 border-red-300' :
                                  'bg-amber-100 text-amber-700 border-amber-300'
                                }`}>{promotionStatus}</Badge>
                              )}
                            </CardHeader>
                            <CardContent className="p-0">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="text-left px-3 py-1.5 border-b">Subject</th>
                                    <th className="text-center px-2 py-1.5 border-b">1st CA</th>
                                    <th className="text-center px-2 py-1.5 border-b">2nd CA</th>
                                    <th className="text-center px-2 py-1.5 border-b">3rd CA</th>
                                    <th className="text-center px-2 py-1.5 border-b">Exam</th>
                                    <th className="text-center px-2 py-1.5 border-b font-bold">Total</th>
                                    <th className="text-center px-2 py-1.5 border-b">Grade</th>
                                    <th className="text-left px-2 py-1.5 border-b">Remark</th>
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
                                      <td className="text-center px-2 py-1 font-bold text-[#1e3a5f]">{r.total ?? '—'}</td>
                                      <td className="text-center px-2 py-1">
                                        <span className={`font-bold ${getGradeColor(r.total)}`}>{r.grade || '—'}</span>
                                      </td>
                                      <td className="px-2 py-1 text-gray-500">{r.remark || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-[#1e3a5f]/10">
                                    <td className="px-3 py-1 font-bold text-xs" colSpan={5}>TERM AVERAGE</td>
                                    <td className={`text-center px-2 py-1 font-bold ${getGradeColor(termAvg)}`}>{termAvg}%</td>
                                    <td className={`text-center font-bold ${getGradeColor(termAvg)}`}>{getGradeLetter(termAvg)}</td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}

                    {/* Cumulative Summary */}
                    {transcriptTerms.length > 1 && (
                      <Card className="border-0 shadow-sm bg-[#1e3a5f] text-white">
                        <CardContent className="p-4">
                          <h3 className="font-bold mb-3">Cumulative Academic Performance Summary</h3>
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
                              <p className="text-2xl font-bold">
                                {transcriptResults.length}
                              </p>
                              <p className="text-xs text-white/70">Total Subjects</p>
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
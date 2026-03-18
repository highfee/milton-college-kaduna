import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getGrade, getRemark, getPosition } from '@/components/GradingUtils';
import { TrendingUp, BookOpen, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const AFFECTIVE_TRAITS = [
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'neatness', label: 'Neatness' },
  { key: 'honesty', label: 'Honesty' },
  { key: 'politeness', label: 'Politeness' },
  { key: 'attentiveness', label: 'Attentiveness' },
  { key: 'cooperation', label: 'Cooperation' },
  { key: 'perseverance', label: 'Perseverance' },
  { key: 'leadership', label: 'Leadership' },
];
const PSYCHOMOTOR_SKILLS = [
  { key: 'handwriting', label: 'Handwriting' },
  { key: 'drawing', label: 'Drawing/Art' },
  { key: 'verbal_fluency', label: 'Verbal Fluency' },
  { key: 'sport_games', label: 'Sport & Games' },
  { key: 'music', label: 'Music' },
  { key: 'computer_skills', label: 'Computer Skills' },
];
const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

export default function ViewResult() {
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stAdm = sessionStorage.getItem('student_portal_adm');
    const parentId = sessionStorage.getItem('parent_portal_id');

    base44.entities.SchoolSettings.list().then(s => {
      const s0 = s[0] || {};
      setSettings(s0);
      setSelectedTerm(s0.current_term || '');
      setSelectedSession(s0.current_session || '');
    });

    if (stAdm) {
      base44.entities.Student.filter({ admission_number: stAdm }).then(students => {
        if (students[0]) setStudent(students[0]);
      });
    } else if (parentId) {
      base44.entities.Parent.filter({ parent_id: parentId }).then(async parents => {
        if (parents[0]) {
          const children = await base44.entities.Student.filter({ parent_email: parents[0].email });
          if (children[0]) setStudent(children[0]);
        }
      });
    }
  }, []);

  const loadResults = async () => {
    if (!student || !selectedTerm || !selectedSession) return;
    setLoading(true);
    const data = await base44.entities.Result.filter({ student_id: student.id, term: selectedTerm, session: selectedSession });
    setResults(data);
    setLoaded(true);
    setLoading(false);
  };

  const totalScore = results.reduce((s, r) => s + (r.total || 0), 0);
  const avg = results.length ? (totalScore / results.length).toFixed(1) : 0;
  const classPosition = results[0]?.class_position;
  const totalInClass = results[0]?.total_in_class;
  const passed = results.filter(r => r.grade && r.grade !== 'F' && r.grade !== 'F9').length;
  const failed = results.filter(r => r.grade === 'F' || r.grade === 'F9').length;
  const credits = results.filter(r => ['C4','C5','C6','C'].includes(r.grade || '')).length;
  const affective = results[0]?.affective_traits || {};
  const psychomotor = results[0]?.psychomotor_skills || {};

  const gradeColor = (grade) => {
    if (!grade) return 'text-gray-500';
    if (grade === 'A1' || grade === 'A') return 'text-green-600 font-bold';
    if (grade?.startsWith('B')) return 'text-blue-600 font-bold';
    if (grade?.startsWith('C')) return 'text-indigo-600';
    if (grade === 'F9' || grade === 'F') return 'text-red-600 font-bold';
    return 'text-gray-700';
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">View Results</h2>
            <p className="text-gray-500">Please log in via the Student or Parent Portal first to view results.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">My Results</h1>
        <p className="text-gray-500 mb-6">{student.first_name} {student.last_name} — {student.current_class}</p>

        {/* Student banner */}
        <Card className="border-0 shadow-md mb-6 bg-gradient-to-r from-[#1e3a5f] to-blue-700 text-white">
          <CardContent className="p-5 flex items-center gap-4">
            {student.passport_photo ? (
              <img src={student.passport_photo} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                {student.first_name?.[0]}{student.last_name?.[0]}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold">{student.first_name} {student.middle_name || ''} {student.last_name}</h2>
              <p className="text-white/80 text-sm">Adm. No: {student.admission_number} | Class: {student.current_class} | {student.section}</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2 text-xs">
                {student.date_of_birth && <div><span className="text-white/60">DOB:</span> {student.date_of_birth}</div>}
                {student.state_of_origin && <div><span className="text-white/60">State:</span> {student.state_of_origin}</div>}
                {student.blood_group && <div><span className="text-white/60">Blood:</span> {student.blood_group}</div>}
                {student.genotype && <div><span className="text-white/60">Genotype:</span> {student.genotype}</div>}
                {student.sport_house && <div><span className="text-white/60">House:</span> {student.sport_house}</div>}
                {student.gender && <div><span className="text-white/60">Gender:</span> {student.gender}</div>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label>Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Input value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className="w-36" />
              </div>
              <button className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2c4a6e] font-medium"
                onClick={loadResults} disabled={loading}>
                {loading ? 'Loading...' : 'View Results'}
              </button>
            </div>
          </CardContent>
        </Card>

        {loaded && (
          results.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3" />
                <p>No results found for {selectedTerm}, {selectedSession}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-500">Total Score</p>
                    <p className="text-2xl font-bold text-[#1e3a5f]">{totalScore}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="text-2xl font-bold text-green-600">{avg}%</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-500">Class Position</p>
                    <p className="text-2xl font-bold text-red-600">{classPosition ? getPosition(classPosition) : '—'}</p>
                    {totalInClass && <p className="text-xs text-gray-400">of {totalInClass} students</p>}
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge className={results[0]?.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {results[0]?.status || 'Submitted'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Subjects Passed</p>
                  <p className="text-xl font-bold text-green-700">{passed}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Credits Obtained</p>
                  <p className="text-xl font-bold text-blue-700">{credits}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Subjects Failed</p>
                  <p className="text-xl font-bold text-red-700">{failed}</p>
                </div>
              </div>

              {/* Results Table */}
              <Card className="border-0 shadow-sm mb-6">
                <CardHeader><CardTitle>Subject Results</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#1e3a5f]">
                          <TableHead className="text-white">Subject</TableHead>
                          <TableHead className="text-white text-center">1st CA<br/>(10)</TableHead>
                          <TableHead className="text-white text-center">2nd CA<br/>(10)</TableHead>
                          <TableHead className="text-white text-center">3rd CA<br/>(10)</TableHead>
                          <TableHead className="text-white text-center">Exam<br/>(70)</TableHead>
                          <TableHead className="text-white text-center">Total</TableHead>
                          <TableHead className="text-white text-center">Avg</TableHead>
                          <TableHead className="text-white text-center">Pos.</TableHead>
                          <TableHead className="text-white text-center">Grade</TableHead>
                          <TableHead className="text-white">Remark</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((r, i) => (
                          <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                            <TableCell className="font-medium">{r.subject_name}</TableCell>
                            <TableCell className="text-center">{r.first_ca ?? '—'}</TableCell>
                            <TableCell className="text-center">{r.second_ca ?? '—'}</TableCell>
                            <TableCell className="text-center">{r.third_ca ?? '—'}</TableCell>
                            <TableCell className="text-center">{r.exam_score ?? '—'}</TableCell>
                            <TableCell className="text-center font-bold text-lg text-[#1e3a5f]">{r.total ?? '—'}</TableCell>
                            <TableCell className="text-center text-sm text-gray-500">{r.class_average_score ? parseFloat(r.class_average_score).toFixed(1) : '—'}</TableCell>
                            <TableCell className="text-center font-medium text-purple-600">{r.subject_position ? getPosition(r.subject_position) : '—'}</TableCell>
                            <TableCell className={`text-center text-lg ${gradeColor(r.grade)}`}>{r.grade || '—'}</TableCell>
                            <TableCell className="text-sm text-gray-600">{r.remark || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Affective Traits & Psychomotor */}
              {(Object.keys(affective).length > 0 || Object.keys(psychomotor).length > 0) && (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle className="text-[#1e3a5f] text-sm">Affective Traits</CardTitle></CardHeader>
                    <CardContent>
                      {AFFECTIVE_TRAITS.map(t => (
                        <div key={t.key} className="flex justify-between items-center py-1 border-b last:border-0 text-sm">
                          <span className="text-gray-700">{t.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(n => (
                                <div key={n} className={`w-4 h-4 rounded-full border ${n <= (affective[t.key] || 0) ? 'bg-[#1e3a5f] border-[#1e3a5f]' : 'bg-gray-100 border-gray-300'}`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 w-16">{RATING_LABELS[affective[t.key]] || '—'}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle className="text-purple-700 text-sm">Psychomotor Skills</CardTitle></CardHeader>
                    <CardContent>
                      {PSYCHOMOTOR_SKILLS.map(t => (
                        <div key={t.key} className="flex justify-between items-center py-1 border-b last:border-0 text-sm">
                          <span className="text-gray-700">{t.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(n => (
                                <div key={n} className={`w-4 h-4 rounded-full border ${n <= (psychomotor[t.key] || 0) ? 'bg-purple-700 border-purple-700' : 'bg-gray-100 border-gray-300'}`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 w-16">{RATING_LABELS[psychomotor[t.key]] || '—'}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Next Term & Fees */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Next Term Begins</p>
                  <p className="font-bold text-green-700">{results[0]?.next_term_begins || '—'}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Fees Arrears</p>
                  <p className="font-bold text-red-700">₦{Number(results[0]?.school_fees_arrears || 0).toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Current School Fees</p>
                  <p className="font-bold text-blue-700">₦{Number(results[0]?.school_fees_current || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Comments */}
              {(results[0]?.teacher_comment || results[0]?.head_teacher_comment || results[0]?.principal_comment || results[0]?.form_teacher_comment) && (
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle>Teacher Comments</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {results[0]?.teacher_comment && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Class Teacher's Comment</p>
                        <p className="text-sm">{results[0].teacher_comment}</p>
                      </div>
                    )}
                    {results[0]?.form_teacher_comment && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs font-semibold text-green-700 mb-1">Form Teacher's Comment</p>
                        <p className="text-sm">{results[0].form_teacher_comment}</p>
                      </div>
                    )}
                    {results[0]?.head_teacher_comment && (
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs font-semibold text-amber-700 mb-1">Head Teacher's Comment</p>
                        <p className="text-sm">{results[0].head_teacher_comment}</p>
                      </div>
                    )}
                    {results[0]?.principal_comment && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs font-semibold text-purple-700 mb-1">Principal's Comment</p>
                        <p className="text-sm">{results[0].principal_comment}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
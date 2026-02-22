import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getGrade, getRemark } from '@/components/GradingUtils';
import { TrendingUp, BookOpen, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ViewResult() {
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Try to get student from session (student portal) or parent portal
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

  const avg = results.length ? (results.reduce((s, r) => s + (r.total || 0), 0) / results.length).toFixed(1) : 0;

  const gradeColor = (grade) => {
    if (!grade) return 'text-gray-500';
    if (grade === 'A1' || grade === 'A') return 'text-green-600 font-bold';
    if (grade?.startsWith('B')) return 'text-blue-600 font-bold';
    if (grade?.startsWith('C')) return 'text-indigo-600';
    if (grade?.startsWith('F')) return 'text-red-600 font-bold';
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
        <Card className="border-0 shadow-md mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="p-5 flex items-center gap-4">
            {student.passport_photo ? (
              <img src={student.passport_photo} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                {student.first_name?.[0]}{student.last_name?.[0]}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{student.first_name} {student.middle_name} {student.last_name}</h2>
              <p className="text-white/80">Adm. No: {student.admission_number} | Class: {student.current_class} | {student.section}</p>
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
              <button
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                onClick={loadResults}
                disabled={loading}
              >
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
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="text-3xl font-bold text-blue-600">{avg}%</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-500">Subjects</p>
                    <p className="text-3xl font-bold">{results.length}</p>
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

              {/* Results Table */}
              <Card className="border-0 shadow-sm mb-6">
                <CardHeader><CardTitle>Subject Results</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">1st CA (20)</TableHead>
                          <TableHead className="text-center">2nd CA (20)</TableHead>
                          <TableHead className="text-center">Exam (60)</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead>Remark</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{r.subject_name}</TableCell>
                            <TableCell className="text-center">{r.first_ca ?? '—'}</TableCell>
                            <TableCell className="text-center">{r.second_ca ?? '—'}</TableCell>
                            <TableCell className="text-center">{r.exam_score ?? '—'}</TableCell>
                            <TableCell className="text-center font-bold text-lg">{r.total ?? '—'}</TableCell>
                            <TableCell className={`text-center text-lg ${gradeColor(r.grade)}`}>{r.grade || '—'}</TableCell>
                            <TableCell className="text-sm text-gray-600">{r.remark || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Comments */}
              {(results[0]?.class_teacher_comment || results[0]?.head_teacher_comment || results[0]?.principal_comment) && (
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {results[0]?.class_teacher_comment && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Class Teacher's Comment</p>
                        <p className="text-sm">{results[0].class_teacher_comment}</p>
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
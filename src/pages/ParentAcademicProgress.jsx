import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, BookOpen, Calculator, Award, BarChart2,
  GraduationCap, UserCircle, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGrade, getRemark } from '@/components/GradingUtils';

export default function ParentAcademicProgress() {
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [results, setResults] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [examInputs, setExamInputs] = useState({});

  useEffect(() => {
    const init = async () => {
      const pid = sessionStorage.getItem('parent_portal_pid');
      if (!pid) { setLoading(false); return; }
      const parents = await base44.entities.Parent.filter({ parent_id: pid });
      if (!parents[0]) { setLoading(false); return; }
      const p = parents[0];
      setParent(p);

      const [settingsData, byEmail, byPhone] = await Promise.all([
        base44.entities.SchoolSettings.list(),
        p.email ? base44.entities.Student.filter({ parent_email: p.email }) : Promise.resolve([]),
        p.phone ? base44.entities.Student.filter({ parent_phone: p.phone }) : Promise.resolve([])
      ]);
      setSettings(settingsData[0] || {});
      const allChildren = [...byEmail];
      byPhone.forEach(s => { if (!allChildren.find(c => c.id === s.id)) allChildren.push(s); });
      setChildren(allChildren);
      if (allChildren[0]) setSelectedChild(allChildren[0]);
      if (settingsData[0]) {
        setSelectedTerm(settingsData[0].current_term || 'First Term');
        setSelectedSession(settingsData[0].current_session || '');
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    base44.entities.Result.filter({ student_id: selectedChild.id }).then(r => setResults(r));
  }, [selectedChild]);

  // Get all available terms/sessions from results
  const termSessionPairs = useCallback(() => {
    const pairs = {};
    results.forEach(r => {
      const key = `${r.session}__${r.term}`;
      if (!pairs[key]) pairs[key] = { term: r.term, session: r.session };
    });
    return Object.values(pairs).sort((a, b) => {
      const order = { 'First Term': 1, 'Second Term': 2, 'Third Term': 3 };
      return (b.session || '').localeCompare(a.session || '') || (order[b.term] || 0) - (order[a.term] || 0);
    });
  }, [results]);

  // Show results with any CA scores entered (not just approved)
  const currentResults = results.filter(r =>
    r.term === selectedTerm && r.session === selectedSession &&
    (r.first_ca != null || r.second_ca != null || r.third_ca != null)
  );

  const section = selectedChild?.section || 'Primary';

  // Predictor: calculate projected totals with entered exam scores
  const getProjectedTotal = (r) => {
    const ca1 = parseFloat(r.first_ca) || 0;
    const ca2 = parseFloat(r.second_ca) || 0;
    const ca3 = parseFloat(r.third_ca) || 0;
    const exam = parseFloat(examInputs[r.id]) || 0;
    return Math.min(ca1 + ca2 + ca3 + exam, 100);
  };

  const allCAPredicted = currentResults.length > 0 && currentResults.every(r =>
    r.first_ca != null && r.second_ca != null
  );

  const projectedAvg = currentResults.length > 0
    ? (currentResults.reduce((s, r) => s + getProjectedTotal(r), 0) / currentResults.length).toFixed(1)
    : 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!parent) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Please sign in to the Parent Portal first.</p>
          <Link to="/ParentPortal"><Button className="bg-purple-600 hover:bg-purple-700">Go to Parent Portal</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ParentPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
            <TrendingUp className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Academic Progress</h1>
              <p className="text-xs text-white/80">{parent?.full_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Child Selector */}
        {children.length > 1 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Label className="block mb-2">Select Child</Label>
              <Select value={selectedChild?.id} onValueChange={(id) => setSelectedChild(children.find(c => c.id === id))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {children.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.current_class}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Child Info */}
        {selectedChild && (
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center gap-4">
              {selectedChild.passport_photo ? (
                <img src={selectedChild.passport_photo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/40" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"><UserCircle className="w-8 h-8 text-white" /></div>
              )}
              <div className="text-white">
                <h2 className="text-lg font-bold">{selectedChild.first_name} {selectedChild.last_name}</h2>
                <p className="text-sm text-white/80">{selectedChild.current_class} · {selectedChild.section} Section</p>
              </div>
            </div>
          </Card>
        )}

        {/* Term/Session Selector */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-sm">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-sm">Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {termSessionPairs().map(ts => <SelectItem key={`${ts.session}-${ts.term}`} value={ts.session}>{ts.session}</SelectItem>)}
                  {!termSessionPairs().find(ts => ts.session === selectedSession) && selectedSession && <SelectItem value={selectedSession}>{selectedSession}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="progress">
          <TabsList className="w-full grid grid-cols-2 bg-white shadow-sm border rounded-xl p-1 h-auto">
            <TabsTrigger value="progress" className="py-2"><TrendingUp className="w-4 h-4 mr-1" /> C.A. Scores</TabsTrigger>
            <TabsTrigger value="predictor" className="py-2"><Calculator className="w-4 h-4 mr-1" /> Performance Predictor</TabsTrigger>
          </TabsList>

          {/* C.A. SCORES TAB */}
          <TabsContent value="progress" className="space-y-4 mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  C.A. Test Scores — {selectedTerm}, {selectedSession}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentResults.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">No C.A. scores uploaded yet for this term.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#1e3a5f] text-white">
                          <th className="text-left px-3 py-2 text-xs rounded-tl-lg">Subject</th>
                          <th className="text-center px-2 py-2 text-xs">CA1 (10)</th>
                          <th className="text-center px-2 py-2 text-xs">CA2 (10)</th>
                          <th className="text-center px-2 py-2 text-xs">CA3 (10)</th>
                          <th className="text-center px-2 py-2 text-xs rounded-tr-lg">CA Total (30)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentResults.map((r, i) => {
                          const caTotal = (parseFloat(r.first_ca) || 0) + (parseFloat(r.second_ca) || 0) + (parseFloat(r.third_ca) || 0);
                          return (
                            <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="px-3 py-2 font-medium text-gray-800">{r.subject_name}</td>
                              <td className="px-2 py-2 text-center text-gray-600">{r.first_ca ?? '—'}</td>
                              <td className="px-2 py-2 text-center text-gray-600">{r.second_ca ?? '—'}</td>
                              <td className="px-2 py-2 text-center text-gray-600">{r.third_ca ?? '—'}</td>
                              <td className="px-2 py-2 text-center font-bold text-purple-600">{caTotal || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Per-subject breakdown cards */}
            {currentResults.length > 0 && (
              <div className="grid md:grid-cols-2 gap-3">
                {currentResults.map((r, i) => {
                  const caTotal = (parseFloat(r.first_ca) || 0) + (parseFloat(r.second_ca) || 0) + (parseFloat(r.third_ca) || 0);
                  return (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-800 text-sm">{r.subject_name}</p>
                          <Badge className="bg-purple-100 text-purple-700 text-xs">{caTotal}/30</Badge>
                        </div>
                        <div className="flex gap-2">
                          {[['CA1', r.first_ca], ['CA2', r.second_ca], ['CA3', r.third_ca]].map(([label, val]) => (
                            <div key={label} className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-500">{label}</p>
                              <p className="text-lg font-bold text-gray-700">{val ?? '—'}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PREDICTOR TAB */}
          <TabsContent value="predictor" className="space-y-4 mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  Performance Predictor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!allCAPredicted ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                    <p className="font-medium">C.A. scores not yet complete</p>
                    <p className="mt-1">The predictor is available once all C.A. test scores (CA1 and CA2) have been uploaded by the teachers for this term.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter hypothetical exam scores (out of 70) for each subject to predict your child's performance:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#1e3a5f] text-white">
                            <th className="text-left px-3 py-2 text-xs rounded-tl-lg">Subject</th>
                            <th className="text-center px-2 py-2 text-xs">CA Total</th>
                            <th className="text-center px-2 py-2 text-xs">Exam (70)</th>
                            <th className="text-center px-2 py-2 text-xs font-bold">Projected</th>
                            <th className="text-center px-2 py-2 text-xs rounded-tr-lg">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentResults.map((r, i) => {
                            const caTotal = (parseFloat(r.first_ca) || 0) + (parseFloat(r.second_ca) || 0) + (parseFloat(r.third_ca) || 0);
                            const projected = getProjectedTotal(r);
                            const grade = getGrade(projected, section);
                            const remark = getRemark(projected, section);
                            return (
                              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="px-3 py-2 font-medium text-gray-800">{r.subject_name}</td>
                                <td className="px-2 py-2 text-center text-gray-600">{caTotal}</td>
                                <td className="px-2 py-2 text-center">
                                  <Input type="number" min="0" max="70" step="0.5" placeholder="0"
                                    value={examInputs[r.id] || ''} onChange={e => setExamInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                                    className="w-16 h-8 text-center mx-auto" />
                                </td>
                                <td className="px-2 py-2 text-center font-bold text-[#1e3a5f]">{projected}</td>
                                <td className="px-2 py-2 text-center">
                                  <Badge className={`text-xs border-0 ${
                                    projected >= 70 ? 'bg-green-100 text-green-700' :
                                    projected >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                  }`}>{grade}</Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {currentResults.length > 0 && (
                          <tfoot>
                            <tr className="bg-blue-50 border-t-2 border-blue-200">
                              <td className="px-3 py-2 font-bold text-blue-700" colSpan={3}>Projected Average</td>
                              <td className="px-2 py-2 text-center font-bold text-blue-700">{projectedAvg}%</td>
                              <td className="px-2 py-2 text-center">
                                <Badge className="bg-blue-200 text-blue-800">{getGrade(projectedAvg, section)}</Badge>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-600">Excellent (70+)</p>
                        <p className="text-xl font-bold text-green-700">{currentResults.filter(r => getProjectedTotal(r) >= 70).length}</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-yellow-600">Good (50-69)</p>
                        <p className="text-xl font-bold text-yellow-700">{currentResults.filter(r => { const t = getProjectedTotal(r); return t >= 50 && t < 70; }).length}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-orange-600">Pass (40-49)</p>
                        <p className="text-xl font-bold text-orange-700">{currentResults.filter(r => { const t = getProjectedTotal(r); return t >= 40 && t < 50; }).length}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-red-600">Fail (&lt;40)</p>
                        <p className="text-xl font-bold text-red-700">{currentResults.filter(r => getProjectedTotal(r) < 40).length}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
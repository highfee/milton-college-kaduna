import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Key, Printer, Plus, Search, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) token += chars[Math.floor(Math.random() * chars.length)];
    if (i < 2) token += '-';
  }
  return token;
}

export default function ResultTokens() {
  const [students, setStudents] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterSession, setFilterSession] = useState('');
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [s, t, st] = await Promise.all([
      base44.entities.Student.filter({ status: 'Active' }),
      base44.entities.ResultToken.list('-created_date', 500),
      base44.entities.SchoolSettings.list()
    ]);
    setStudents(s);
    setTokens(t);
    if (st[0]) { setSettings(st[0]); setFilterSession(st[0].current_session || ''); setFilterTerm(st[0].current_term || 'First Term'); }
    setLoading(false);
  };

  const generateForClass = async () => {
    if (!filterClass || filterClass === 'all') { toast({ title: 'Please select a class', variant: 'destructive' }); return; }
    setGenerating(true);
    const classStudents = students.filter(s => s.current_class === filterClass);
    let created = 0;
    for (const student of classStudents) {
      // Check if token already exists for this student/term/session
      const existing = tokens.find(t => t.student_id === student.id && t.term === filterTerm && t.session === filterSession);
      if (!existing) {
        const token = generateToken();
        await base44.entities.ResultToken.create({
          token,
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          admission_number: student.admission_number,
          class: student.current_class,
          section: student.section,
          term: filterTerm,
          session: filterSession,
          generated_date: new Date().toISOString().split('T')[0],
          status: 'Active'
        });
        created++;
      }
    }
    await loadData();
    setGenerating(false);
    toast({ title: `Generated ${created} tokens for ${filterClass}` });
  };

  const generateForStudent = async (student) => {
    const existing = tokens.find(t => t.student_id === student.id && t.term === filterTerm && t.session === filterSession);
    if (existing) { toast({ title: 'Token already exists for this student/term', variant: 'destructive' }); return; }
    const token = generateToken();
    await base44.entities.ResultToken.create({
      token, student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admission_number,
      class: student.current_class, section: student.section,
      term: filterTerm, session: filterSession,
      generated_date: new Date().toISOString().split('T')[0], status: 'Active'
    });
    await loadData();
    toast({ title: 'Token generated' });
  };

  const classes = [...new Set(students.map(s => s.current_class))].sort();

  const displayTokens = tokens.filter(t => {
    const matchTerm = t.term === filterTerm;
    const matchSession = !filterSession || t.session === filterSession;
    const matchClass = filterClass === 'all' || t.class === filterClass;
    const matchSearch = `${t.student_name} ${t.admission_number || ''} ${t.token}`.toLowerCase().includes(search.toLowerCase());
    return matchTerm && matchSession && matchClass && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/AdminPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
            <Key className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Result Tokens / PINs</h1>
              <p className="text-sm text-white/70">Generate and manage result access tokens</p>
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-white text-[#1e3a5f] hover:bg-white/90 no-print">
            <Printer className="w-4 h-4 mr-2" /> Print Tokens
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters & Generate */}
        <Card className="border-0 shadow-sm mb-6 no-print">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Term</label>
                <Select value={filterTerm} onValueChange={setFilterTerm}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Session</label>
                <Input value={filterSession} onChange={e => setFilterSession(e.target.value)} placeholder="e.g. 2024/2025" className="w-36" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Class</label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateForClass} disabled={generating || filterClass === 'all'} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate for Class'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative mb-4 no-print">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search student or token..." className="pl-9 max-w-md" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
          <h2 className="text-xl font-bold">Milton College of Arts & Science</h2>
          <p className="text-lg">Result Access Tokens — {filterTerm} {filterSession}</p>
          {filterClass !== 'all' && <p>Class: {filterClass}</p>}
        </div>

        {/* Tokens Table */}
        <Card className="border-0 shadow-md">
          <CardHeader className="no-print">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Tokens ({displayTokens.length})</span>
              <Badge className="bg-[#1e3a5f]">{filterTerm} {filterSession}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full mx-auto"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1e3a5f] text-white">
                    <tr>
                      <th className="text-left px-4 py-3">S/N</th>
                      <th className="text-left px-4 py-3">Student Name</th>
                      <th className="text-left px-4 py-3">Adm. No (Username)</th>
                      <th className="text-left px-4 py-3">Class</th>
                      <th className="text-center px-4 py-3">TOKEN / PIN</th>
                      <th className="text-center px-4 py-3 no-print">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayTokens.map((t, idx) => (
                      <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{t.student_name}</td>
                        <td className="px-4 py-3 font-mono text-blue-700">{t.admission_number || '-'}</td>
                        <td className="px-4 py-3">{t.class}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-mono font-bold text-[#1e3a5f] text-base bg-yellow-50 px-3 py-1 rounded border border-yellow-200">{t.token}</span>
                        </td>
                        <td className="px-4 py-3 text-center no-print">
                          <Badge variant={t.status === 'Active' ? 'default' : 'secondary'} className="text-xs">{t.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {displayTokens.length === 0 && <p className="p-8 text-center text-gray-400">No tokens generated yet for this selection</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
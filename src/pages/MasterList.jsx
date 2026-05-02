import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const SECTIONS = ['Nursery', 'Primary', 'Secondary'];
const TERMS = ['First Term', 'Second Term', 'Third Term'];
const VIEWS = ['Class by Class', 'Subject by Subject', 'Section by Section', 'Overall School'];

export default function MasterList() {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterSection, setFilterSection] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterSession, setFilterSession] = useState('');
  const [viewMode, setViewMode] = useState('Class by Class');
  const [tableData, setTableData] = useState([]);

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (results.length) buildTable(); }, [results, viewMode, filterClass, filterSubject]);

  const loadInit = async () => {
    const [s, subj, st] = await Promise.all([
      base44.entities.Student.list(),
      base44.entities.Subject.list(),
      base44.entities.SchoolSettings.list()
    ]);
    setStudents(s);
    setSubjects(subj);
    if (st[0]) { setSettings(st[0]); setFilterSession(st[0].current_session || ''); setFilterTerm(st[0].current_term || 'First Term'); }
  };

  const loadResults = async () => {
    setLoading(true);
    const query = { term: filterTerm, status: 'Approved' };
    if (filterSession) query.session = filterSession;
    if (filterSection !== 'all') query.section = filterSection;
    if (filterClass !== 'all') query.class = filterClass;
    if (filterSubject !== 'all') query.subject_id = filterSubject;
    const data = await base44.entities.Result.filter(query, '-total', 500);
    setResults(data);
    setLoading(false);
  };

  const buildTable = () => {
    if (viewMode === 'Class by Class' || viewMode === 'Section by Section') {
      // Group by student, aggregate across subjects
      const studentMap = {};
      results.forEach(r => {
        if (!studentMap[r.student_id]) {
          studentMap[r.student_id] = {
            student_name: r.student_name, admission_number: r.admission_number,
            class: r.class, section: r.section, subjects: [], total: 0, count: 0,
            class_position: r.class_position, total_in_class: r.total_in_class
          };
        }
        studentMap[r.student_id].subjects.push(r);
        studentMap[r.student_id].total += r.total || 0;
        studentMap[r.student_id].count += 1;
      });
      const rows = Object.values(studentMap).map(s => ({
        ...s, average: s.count ? (s.total / s.count).toFixed(1) : 0
      })).sort((a, b) => (b.average - a.average));
      setTableData(rows);
    } else if (viewMode === 'Subject by Subject') {
      // Group by subject
      const subjMap = {};
      results.forEach(r => {
        if (!subjMap[r.subject_id]) subjMap[r.subject_id] = { subject_name: r.subject_name, students: [], totalScore: 0 };
        subjMap[r.subject_id].students.push(r);
        subjMap[r.subject_id].totalScore += r.total || 0;
      });
      const rows = Object.values(subjMap).map(s => ({
        ...s, average: s.students.length ? (s.totalScore / s.students.length).toFixed(1) : 0,
        highest: Math.max(...s.students.map(x => x.total || 0)),
        lowest: Math.min(...s.students.map(x => x.total || 0))
      }));
      setTableData(rows);
    } else {
      // Overall
      const studentMap = {};
      results.forEach(r => {
        if (!studentMap[r.student_id]) {
          studentMap[r.student_id] = { student_name: r.student_name, admission_number: r.admission_number, class: r.class, section: r.section, total: 0, count: 0 };
        }
        studentMap[r.student_id].total += r.total || 0;
        studentMap[r.student_id].count += 1;
      });
      const rows = Object.values(studentMap).map(s => ({ ...s, average: s.count ? (s.total / s.count).toFixed(1) : 0 }))
        .sort((a, b) => b.average - a.average);
      setTableData(rows);
    }
  };

  const classes = [...new Set(students.map(s => s.current_class))].sort();
  const filteredSubjects = filterSection !== 'all' ? subjects.filter(s => s.section === filterSection) : subjects;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/AdminPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
            <BarChart3 className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Master List</h1>
              <p className="text-sm text-white/70">Academic performance overview</p>
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-white text-[#1e3a5f] hover:bg-white/90 no-print">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="border-0 shadow-sm mb-6 no-print">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VIEWS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterSection} onValueChange={v => { setFilterSection(v); setFilterClass('all'); setFilterSubject('all'); }}>
                <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTerm} onValueChange={setFilterTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={loadResults} disabled={loading} className="bg-[#1e3a5f]">
                {loading ? 'Loading...' : 'Generate'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-xl font-bold">Milton College of Arts & Science</h1>
          <h2 className="text-lg">Academic Master List — {filterTerm} {filterSession}</h2>
          <p className="text-sm">{viewMode} View {filterSection !== 'all' ? `| ${filterSection}` : ''} {filterClass !== 'all' ? `| ${filterClass}` : ''}</p>
        </div>

        {/* Results Table */}
        {tableData.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="no-print">
              <CardTitle className="flex items-center justify-between">
                <span>{viewMode} — {filterTerm} {filterSession}</span>
                <Badge className="bg-[#1e3a5f]">{tableData.length} records</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {(viewMode === 'Class by Class' || viewMode === 'Section by Section' || viewMode === 'Overall School') && (
                  <table className="w-full text-sm">
                    <thead className="bg-[#1e3a5f] text-white">
                      <tr>
                        <th className="text-left px-4 py-3">Position</th>
                        <th className="text-left px-4 py-3">Adm. No</th>
                        <th className="text-left px-4 py-3">Student Name</th>
                        <th className="text-left px-4 py-3">Class</th>
                        <th className="text-left px-4 py-3">Section</th>
                        <th className="text-center px-4 py-3">Subjects</th>
                        <th className="text-center px-4 py-3">Total</th>
                        <th className="text-center px-4 py-3">Average</th>
                        <th className="text-center px-4 py-3">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tableData.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-bold text-[#1e3a5f]">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono text-xs">{row.admission_number || '-'}</td>
                          <td className="px-4 py-3 font-medium">{row.student_name}</td>
                          <td className="px-4 py-3">{row.class}</td>
                          <td className="px-4 py-3">{row.section}</td>
                          <td className="px-4 py-3 text-center">{row.count}</td>
                          <td className="px-4 py-3 text-center font-semibold">{row.total}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${parseFloat(row.average) >= 70 ? 'text-green-600' : parseFloat(row.average) >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                              {row.average}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{row.class_position ? `${row.class_position}/${row.total_in_class || '-'}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {viewMode === 'Subject by Subject' && (
                  <table className="w-full text-sm">
                    <thead className="bg-[#1e3a5f] text-white">
                      <tr>
                        <th className="text-left px-4 py-3">Subject</th>
                        <th className="text-center px-4 py-3">Students</th>
                        <th className="text-center px-4 py-3">Class Average</th>
                        <th className="text-center px-4 py-3">Highest</th>
                        <th className="text-center px-4 py-3">Lowest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tableData.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium">{row.subject_name}</td>
                          <td className="px-4 py-3 text-center">{row.students.length}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${parseFloat(row.average) >= 70 ? 'text-green-600' : parseFloat(row.average) >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                              {row.average}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-green-700 font-semibold">{row.highest}</td>
                          <td className="px-4 py-3 text-center text-red-700 font-semibold">{row.lowest}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {results.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Select filters and click Generate to view the master list</p>
          </div>
        )}
      </div>

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
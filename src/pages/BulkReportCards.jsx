import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { generateResultPDF } from '@/lib/generateResultPDF';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, ArrowLeft, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ALL_SCHOOL_CLASSES } from '@/components/GradingUtils';

const TERMS = ['First Term', 'Second Term', 'Third Term'];

export default function BulkReportCards() {
  const [settings, setSettings] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    base44.entities.SchoolSettings.list().then(s => {
      if (s[0]) {
        setSettings(s[0]);
        setSelectedTerm(s[0].current_term || '');
        setSelectedSession(s[0].current_session || '');
      }
    });
    base44.entities.Teacher.list().then(setTeachers);
  }, []);

  const loadStudents = async () => {
    if (!selectedClass) return;
    const list = await base44.entities.Student.filter({ current_class: selectedClass, status: 'Active' });
    setStudents(list);
    setProgress([]);
    setDone(false);
  };

  useEffect(() => { loadStudents(); }, [selectedClass]);

  const handleGenerate = async () => {
    if (!selectedClass || !selectedTerm || !selectedSession || students.length === 0) return;
    setGenerating(true);
    setDone(false);
    setProgress(students.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, status: 'pending' })));

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      setProgress(prev => prev.map(p => p.id === student.id ? { ...p, status: 'processing' } : p));
      try {
        const results = await base44.entities.Result.filter({
          student_id: student.id,
          term: selectedTerm,
          session: selectedSession,
        });

        const classTeacher = teachers.find(t =>
          t.assigned_class === selectedClass || t.form_teacher_class === selectedClass
        );

        // Build rankings object
        const classPosition = results[0]?.class_position || 0;
        const totalInClass = results[0]?.total_in_class || 0;

        const url = await generateResultPDF({
          student,
          results,
          settings,
          term: selectedTerm,
          session: selectedSession,
          classTeacher,
          rankings: { classPosition, totalInClass },
        });

        setProgress(prev => prev.map(p => p.id === student.id ? { ...p, status: 'done', url } : p));
      } catch (err) {
        setProgress(prev => prev.map(p => p.id === student.id ? { ...p, status: 'error', error: err.message } : p));
      }
    }

    setGenerating(false);
    setDone(true);
  };

  const successCount = progress.filter(p => p.status === 'done').length;
  const errorCount = progress.filter(p => p.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/AdminPortal">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bulk Report Cards</h1>
            <p className="text-sm text-gray-500">Generate PDF report cards for all students in a class</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader><CardTitle>Select Parameters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {ALL_SCHOOL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Term</label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Session</label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={selectedSession}
                  onChange={e => setSelectedSession(e.target.value)}
                  placeholder="e.g. 2024/2025"
                />
              </div>
            </div>

            {selectedClass && (
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-medium">{students.length}</span> active student(s) found in <span className="font-medium">{selectedClass}</span>
              </p>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!selectedClass || !selectedTerm || !selectedSession || students.length === 0 || generating}
              className="bg-[#1e3a5f] hover:bg-[#15294a] text-white w-full md:w-auto"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" />Generate All PDFs</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Progress */}
        {progress.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Progress</CardTitle>
                {done && (
                  <div className="flex gap-2 text-sm">
                    <Badge className="bg-green-100 text-green-700">{successCount} done</Badge>
                    {errorCount > 0 && <Badge className="bg-red-100 text-red-700">{errorCount} failed</Badge>}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {progress.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
                    <span className="text-sm font-medium text-gray-700">{p.name}</span>
                    <div className="flex items-center gap-2">
                      {p.status === 'pending' && <span className="text-xs text-gray-400">Waiting...</span>}
                      {p.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                      {p.status === 'done' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <a href={p.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <Download className="w-3 h-3 mr-1" />Download
                            </Button>
                          </a>
                        </>
                      )}
                      {p.status === 'error' && (
                        <div className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs">{p.error || 'Failed'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
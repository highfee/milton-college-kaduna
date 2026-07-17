import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BookOpen, ArrowLeft, Eye, Download, FileText, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ViewLessonNotes({ student: studentProp, settings: settingsProp, onBack }) {
  const [student, setStudent] = useState(studentProp || null);
  const [settings, setSettings] = useState(settingsProp || null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');

  useEffect(() => {
    if (studentProp) { setStudent(studentProp); setSettings(settingsProp || null); setLoading(false); return; }
    const adm = sessionStorage.getItem('student_portal_adm');
    if (!adm) { setLoading(false); return; }
    (async () => {
      const students = await base44.entities.Student.filter({ admission_number: adm });
      if (students[0]) setStudent(students[0]);
      setLoading(false);
    })();
  }, [studentProp, settingsProp]);

  useEffect(() => { if (student) loadNotes(); }, [student]);

  const loadNotes = async () => {
    setLoading(true);
    const all = await base44.entities.LessonNote.filter({ class: student.current_class, status: 'Published' });
    // Only show notes for subjects the student is enrolled in (if enrollment recorded)
    const enrolled = student.subjects && student.subjects.length > 0 ? student.subjects : null;
    const visible = enrolled
      ? all.filter(n => !n.subject_id || enrolled.includes(n.subject_id))
      : all;
    setNotes(visible.sort((a, b) => new Date(b.published_date || b.created_date) - new Date(a.published_date || a.created_date)));
    setLoading(false);
  };

  const subjectsInNotes = Array.from(new Set(notes.map(n => n.subject_name).filter(Boolean)));
  const filtered = notes.filter(n => {
    const matchSubject = subjectFilter === 'All' || n.subject_name === subjectFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || `${n.title} ${n.topic} ${n.subject_name}`.toLowerCase().includes(q);
    return matchSubject && matchSearch;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!student) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md text-center p-6">
        <CardContent className="p-6">
          <BookOpen className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <p className="font-medium">Please sign in to the Student Portal first.</p>
          {onBack && <Button className="mt-4" onClick={onBack}>Go to Student Portal</Button>}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <BookOpen className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Lesson Notes</h1>
            <p className="text-sm text-white/80">{student?.first_name} {student?.last_name} — {student?.current_class}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>Published Lesson Notes ({notes.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search title or topic..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Subjects</SelectItem>
                  {subjectsInNotes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No published lesson notes for your class yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.title}</TableCell>
                        <TableCell>{n.subject_name || '—'}</TableCell>
                        <TableCell className="text-sm">{n.topic}</TableCell>
                        <TableCell className="text-sm">{n.term}</TableCell>
                        <TableCell className="text-sm">{n.week || '—'}</TableCell>
                        <TableCell className="text-sm">{n.teacher_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setSelected(n)}>
                              <Eye className="w-4 h-4 mr-1" /> Read
                            </Button>
                            {n.attachment_url && (
                              <a href={n.attachment_url} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="ghost"><Download className="w-4 h-4" /></Button>
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.title}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selected.subject_name}</Badge>
                  <Badge variant="outline">{selected.class}</Badge>
                  <Badge variant="outline">{selected.term}</Badge>
                  {selected.week && <Badge variant="outline">Week {selected.week}</Badge>}
                </div>
                <div><p className="text-xs text-gray-500">Topic</p><p className="font-medium">{selected.topic}</p></div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Content</p>
                  {/<[a-z][\s\S]*>/i.test(selected.content || '') ? (
                    <div
                      className="p-4 bg-gray-50 rounded-lg text-sm border prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selected.content }}
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm border">
                      {selected.content || '(No typed content)'}
                    </div>
                  )}
                </div>
                {selected.attachment_url && (
                  <a href={selected.attachment_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 underline">
                    <Download className="w-4 h-4" /> Download attached file
                  </a>
                )}
                <p className="text-xs text-gray-500">Prepared by {selected.teacher_name}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
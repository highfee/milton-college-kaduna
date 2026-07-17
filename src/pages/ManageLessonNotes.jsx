import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BookOpen, Plus, Edit, Trash2, Send, CheckCircle, Upload, FileText,
  ArrowLeft, Save, AlertCircle, Eye, Download, RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STATUS_COLORS = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Pending Approval': 'bg-amber-100 text-amber-800',
  'Approved': 'bg-blue-100 text-blue-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Published': 'bg-green-100 text-green-800',
};

const EMPTY = {
  title: '', subject_id: '', subject_name: '', class: '', section: '',
  term: '', session: '', week: '', topic: '', content: '', attachment_url: '',
};

export default function ManageLessonNotes({ teacher: teacherProp, settings: settingsProp, onBack }) {
  const [teacher, setTeacher] = useState(teacherProp || null);
  const [settings, setSettings] = useState(settingsProp || null);
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewNote, setViewNote] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);

  useEffect(() => {
    if (teacherProp) { setTeacher(teacherProp); setSettings(settingsProp || null); setLoading(false); return; }
    const sid = sessionStorage.getItem('teacher_portal_staff_id');
    if (!sid) { setLoading(false); return; }
    (async () => {
      const [teachers, settingsData] = await Promise.all([
        base44.entities.Teacher.filter({ staff_id: sid }),
        base44.entities.SchoolSettings.list(),
      ]);
      if (teachers[0]) { setTeacher(teachers[0]); setSettings(settingsData[0] || null); }
      setLoading(false);
    })();
  }, [teacherProp, settingsProp]);

  useEffect(() => { if (teacher) loadData(); }, [teacher]);

  const loadData = async () => {
    setLoading(true);
    const cls = teacher.assigned_class || teacher.form_teacher_class;
    const isClassOrHead = teacher.teacher_type === 'Class Teacher' || teacher.teacher_type === 'Head Teacher';
    const isForm = teacher.teacher_type === 'Form Teacher';
    let subjectsPromise;
    if (isClassOrHead && cls) {
      subjectsPromise = base44.entities.Subject.filter({ section: teacher.section, status: 'Active' })
        .then(all => all.filter(s => (s.classes || []).includes(cls)));
    } else if (isForm && cls) {
      subjectsPromise = base44.entities.Subject.filter({ section: 'Secondary', status: 'Active' })
        .then(all => all.filter(s => (s.classes || []).includes(cls)));
    } else {
      subjectsPromise = base44.entities.Subject.filter({ teacher_id: teacher.id, status: 'Active' });
    }
    const [subjectsData, allNotes] = await Promise.all([
      subjectsPromise,
      base44.entities.LessonNote.filter({ teacher_id: teacher.id })
    ]);
    setSubjects(subjectsData);
    setNotes(allNotes.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  const hasAssignedClass = !!(teacher?.assigned_class || teacher?.form_teacher_class);
  const assignedClass = teacher?.assigned_class || teacher?.form_teacher_class;

  // Classes the teacher can create notes for
  const classOptions = hasAssignedClass
    ? [assignedClass]
    : Array.from(new Set(subjects.flatMap(s => s.classes || [])));

  const handleAdd = () => {
    setForm({
      ...EMPTY,
      section: teacher.section,
      term: settings?.current_term || '',
      session: settings?.current_session || '',
      class: hasAssignedClass ? assignedClass : '',
    });
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (note) => {
    setForm({ ...note });
    setEditingId(note.id);
    setDialogOpen(true);
  };

  const handleSubjectChange = (subjectId) => {
    const subj = subjects.find(s => s.id === subjectId);
    setForm(f => ({
      ...f,
      subject_id: subjectId,
      subject_name: subj?.name || '',
      section: subj?.section || f.section,
      class: hasAssignedClass ? assignedClass : (subj?.classes?.[0] || f.class),
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, attachment_url: file_url }));
    } catch (err) {
      alert('File upload failed: ' + err.message);
    }
    setFileUploading(false);
  };

  const buildPayload = (status) => ({
    title: form.title.trim(),
    subject_id: form.subject_id,
    subject_name: form.subject_name,
    class: form.class,
    section: form.section || teacher.section,
    term: form.term,
    session: form.session,
    week: form.week ? Number(form.week) : null,
    topic: form.topic.trim(),
    content: form.content,
    attachment_url: form.attachment_url,
    teacher_id: teacher.id,
    teacher_name: `${teacher.first_name} ${teacher.last_name}`,
    status,
  });

  const handleSaveDraft = async () => {
    if (!form.title || !form.class || !form.topic) { alert('Title, class and topic are required.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await base44.entities.LessonNote.update(editingId, { ...buildPayload('Draft'), revision_count: 0 });
      } else {
        await base44.entities.LessonNote.create({ ...buildPayload('Draft'), revision_count: 0 });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) { alert('Save failed: ' + err.message); }
    setSaving(false);
  };

  // Send for approval — resets any prior approval since content may have changed
  const handleSendForApproval = async () => {
    if (!form.title || !form.class || !form.topic) { alert('Title, class and topic are required.'); return; }
    if (!form.content && !form.attachment_url) { alert('Please type or upload lesson note content before sending.'); return; }
    setSaving(true);
    try {
      const payload = buildPayload('Pending Approval');
      // Clear previous reviewer decision when (re)submitting
      payload.reviewer_id = null;
      payload.reviewer_name = null;
      payload.reviewer_role = null;
      payload.review_comment = '';
      payload.rejection_reasons = '';
      payload.reviewed_date = null;
      if (editingId) {
        await base44.entities.LessonNote.update(editingId, payload);
      } else {
        await base44.entities.LessonNote.create(payload);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) { alert('Send failed: ' + err.message); }
    setSaving(false);
  };

  const handlePublish = async (note) => {
    if (note.status !== 'Approved') { alert('Only approved lesson notes can be published.'); return; }
    if (!confirm('Publish this lesson note to your assigned class/subject? Students will be able to view and download it.')) return;
    await base44.entities.LessonNote.update(note.id, {
      status: 'Published',
      published_date: new Date().toISOString().split('T')[0],
    });
    loadData();
  };

  const handleDelete = async (note) => {
    if (!confirm('Delete this lesson note?')) return;
    await base44.entities.LessonNote.delete(note.id);
    loadData();
  };

  // When editing an Approved/Published note, editing resets it to Draft (re-approval required)
  const handleEditPublished = (note) => {
    if (note.status === 'Published' || note.status === 'Approved') {
      if (!confirm('Editing this lesson note will reset it to Draft and require re-approval before publishing. Continue?')) return;
    }
    handleEdit(note);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-[#1e3a5f] border-t-transparent rounded-full" />
    </div>
  );

  if (!teacher) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md text-center p-6">
        <CardContent className="p-6">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <p className="font-medium">Please sign in to the Teacher Portal first.</p>
          {onBack && <Button className="mt-4" onClick={onBack}>Go to Teacher Portal</Button>}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            <BookOpen className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Lesson Notes</h1>
              <p className="text-sm text-white/80">{teacher?.first_name} {teacher?.last_name} — {teacher?.section}</p>
            </div>
          </div>
          <Button className="bg-white text-[#1e3a5f] hover:bg-white/90" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" /> New Lesson Note
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="border-0 shadow-sm mb-6 bg-blue-50">
          <CardContent className="p-4 text-sm text-blue-800">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Lesson notes must be <strong>approved by the {teacher?.section === 'Secondary' ? 'Principal' : 'Head Teacher'}</strong> before they can be published to students. Editing an approved/published note resets it to Draft for re-approval.
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>My Lesson Notes ({notes.length})</CardTitle></CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No lesson notes yet. Click "New Lesson Note" to create one.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notes.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.title}</TableCell>
                        <TableCell>{n.subject_name || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{n.class}</Badge></TableCell>
                        <TableCell className="text-sm">{n.topic}</TableCell>
                        <TableCell className="text-sm">{n.term}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[n.status]}>{n.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setViewNote(n)} title="View">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {n.status === 'Approved' && (
                              <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handlePublish(n)} title="Publish">
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleEditPublished(n)} title="Edit">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(n)} title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Lesson Note' : 'New Lesson Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Introduction to Fractions" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Subject</Label>
                <Select value={form.subject_id} onValueChange={handleSubjectChange}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class <span className="text-red-500">*</span></Label>
                <Select value={form.class} onValueChange={v => setForm({ ...form, class: v })} disabled={hasAssignedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>Term</Label>
                <Select value={form.term} onValueChange={v => setForm({ ...form, term: v })}>
                  <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Input value={form.session} onChange={e => setForm({ ...form, session: e.target.value })} placeholder="2025/2026" />
              </div>
              <div>
                <Label>Week</Label>
                <Input type="number" min="1" value={form.week ?? ''} onChange={e => setForm({ ...form, week: e.target.value })} placeholder="e.g. 3" />
              </div>
              <div>
                <Label>Topic <span className="text-red-500">*</span></Label>
                <Input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Topic / sub-topic" />
              </div>
            </div>
            <div>
              <Label>Lesson Note Content (type or paste)</Label>
              <Textarea rows={10} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Type or paste your lesson note content here — objectives, content, examples, activities, evaluation..." />
            </div>
            <div>
              <Label>Upload Lesson Note File (optional)</Label>
              <div className="flex items-center gap-3">
                <Label className="cursor-pointer bg-blue-50 border border-blue-300 text-blue-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" /> {fileUploading ? 'Uploading...' : 'Choose File'}
                  <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileUpload} disabled={fileUploading} />
                </Label>
                {form.attachment_url && (
                  <a href={form.attachment_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline flex items-center gap-1">
                    <FileText className="w-4 h-4" /> View attached file
                  </a>
                )}
              </div>
            </div>

            {editingId && form.status === 'Rejected' && (form.rejection_reasons || form.review_comment) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-700 mb-1">Reviewer Feedback (please address):</p>
                {form.rejection_reasons && <p className="text-sm text-red-800"><strong>Topics/content to change:</strong> {form.rejection_reasons}</p>}
                {form.review_comment && <p className="text-sm text-red-800 mt-1"><strong>Comment:</strong> {form.review_comment}</p>}
              </div>
            )}

            <div className="flex gap-2 justify-end flex-wrap pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={handleSaveDraft} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button onClick={handleSendForApproval} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Send className="w-4 h-4 mr-2" />{saving ? 'Sending...' : 'Send for Approval'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewNote} onOpenChange={(o) => !o && setViewNote(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {viewNote && (
            <>
              <DialogHeader><DialogTitle>{viewNote.title}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{viewNote.subject_name}</Badge>
                  <Badge variant="outline">{viewNote.class}</Badge>
                  <Badge variant="outline">{viewNote.term}</Badge>
                  {viewNote.week && <Badge variant="outline">Week {viewNote.week}</Badge>}
                  <Badge className={STATUS_COLORS[viewNote.status]}>{viewNote.status}</Badge>
                </div>
                <div><p className="text-xs text-gray-500">Topic</p><p className="font-medium">{viewNote.topic}</p></div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Content</p>
                  <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
                    {viewNote.content || '(No typed content)'}
                  </div>
                </div>
                {viewNote.attachment_url && (
                  <a href={viewNote.attachment_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 underline">
                    <Download className="w-4 h-4" /> Download attached file
                  </a>
                )}
                {viewNote.rejection_reasons && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-700">Reviewer feedback:</p>
                    <p className="text-sm text-red-800 mt-1"><strong>Change:</strong> {viewNote.rejection_reasons}</p>
                    {viewNote.review_comment && <p className="text-sm text-red-800 mt-1"><strong>Comment:</strong> {viewNote.review_comment}</p>}
                  </div>
                )}
                {viewNote.reviewer_name && (
                  <p className="text-xs text-gray-500">Reviewed by {viewNote.reviewer_name} ({viewNote.reviewer_role}) on {viewNote.reviewed_date}</p>
                )}
                <div className="flex justify-end gap-2">
                  {(viewNote.status === 'Approved') && (
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => { handlePublish(viewNote); setViewNote(null); }}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Publish to Students
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { setViewNote(null); handleEditPublished(viewNote); }}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
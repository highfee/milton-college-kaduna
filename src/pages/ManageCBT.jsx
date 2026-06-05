import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Copy, Clock, BookOpen, Archive, Eye, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CLASSES = {
  'Nursery': ['Reception Class', 'Nursery 1', 'Nursery 2'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

const emptyQuestion = () => ({
  type: 'objective',
  question: '',
  image_url: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  marks: 1
});

const emptyForm = () => ({
  title: '', exam_type: 'Termly Examination', subject_id: '', subject_name: '',
  section: '', classes: [], term: 'First Term', session: '2024/2025',
  duration_minutes: 60, total_marks: 100, pass_mark: 40, instructions: '',
  questions: [], start_date: '', end_date: '', status: 'Draft'
});

export default function ManageCBT() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [exams, setExams] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [cbtResults, setCbtResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [currentQuestion, setCurrentQuestion] = useState(emptyQuestion());
  const [viewResultsExam, setViewResultsExam] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTypeFilter, setBankTypeFilter] = useState('all');
  const [bankSubjectFilter, setBankSubjectFilter] = useState('all');
  const [selectedBankQs, setSelectedBankQs] = useState([]);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const userData = await base44.auth.me();
    setUser(userData);

    const [teacherData, staffRoles, settings] = await Promise.all([
      base44.entities.Teacher.filter({ email: userData.email }),
      base44.entities.StaffRole.filter({ user_email: userData.email }),
      base44.entities.SchoolSettings.list()
    ]);

    if (settings[0]) setFormData(prev => ({ ...prev, term: settings[0].current_term, session: settings[0].current_session }));

    const isAdmin = userData.role === 'admin' || staffRoles.some(r => r.role === 'Admin');
    let subjectsData;
    if (isAdmin) {
      subjectsData = await base44.entities.Subject.filter({ status: 'Active' });
      const [examsData, resultsData] = await Promise.all([
        base44.entities.CBTExam.list('-created_date', 200),
        base44.entities.CBTResult.list('-created_date', 500)
      ]);
      setExams(examsData);
      setCbtResults(resultsData);
      // Question bank: closed exams
      setQuestionBank(examsData.filter(e => e.status === 'Closed').flatMap(e => (e.questions || []).map(q => ({ ...q, exam_title: e.title, subject: e.subject_name }))));
    } else if (teacherData[0]) {
      setTeacher(teacherData[0]);
      subjectsData = await base44.entities.Subject.filter({ teacher_id: teacherData[0].id, status: 'Active' });
      const [examsData, resultsData] = await Promise.all([
        base44.entities.CBTExam.filter({ created_by: userData.email }),
        base44.entities.CBTResult.list('-created_date', 500)
      ]);
      setExams(examsData);
      setCbtResults(resultsData);
      setQuestionBank(examsData.filter(e => e.status === 'Closed').flatMap(e => (e.questions || []).map(q => ({ ...q, exam_title: e.title, subject: e.subject_name }))));
    } else {
      subjectsData = [];
    }
    setSubjects(subjectsData || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedSubject = subjects.find(s => s.id === formData.subject_id);
    const dataToSave = { ...formData, subject_name: selectedSubject?.name, created_by: user?.email };
    if (editingExam) {
      await base44.entities.CBTExam.update(editingExam.id, dataToSave);
    } else {
      await base44.entities.CBTExam.create(dataToSave);
    }
    toast({ title: editingExam ? 'Exam updated!' : 'Exam created!' });
    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (exam) => { setEditingExam(exam); setFormData(exam); setIsDialogOpen(true); };

  const handleDelete = async (id) => {
    if (confirm('Delete this exam?')) { await base44.entities.CBTExam.delete(id); loadData(); }
  };

  const handleDuplicate = async (exam) => {
    const { id, created_date, updated_date, ...rest } = exam;
    await base44.entities.CBTExam.create({ ...rest, title: `${exam.title} (Copy)`, status: 'Draft' });
    loadData();
  };

  const handlePublish = async (exam) => {
    await base44.entities.CBTExam.update(exam.id, { status: 'Published' });
    loadData();
  };

  const handleClose = async (exam) => {
    await base44.entities.CBTExam.update(exam.id, { status: 'Closed' });
    toast({ title: 'Exam closed. Questions moved to Question Bank.' });
    loadData();
  };

  const resetForm = () => {
    setEditingExam(null);
    setFormData(emptyForm());
    setCurrentQuestion(emptyQuestion());
  };

  const handleAddQuestion = () => {
    const questionText = currentQuestion.question?.replace(/<[^>]*>/g, '').trim();
    if (!questionText) { toast({ title: 'Enter a question', variant: 'destructive' }); return; }
    if (currentQuestion.type === 'objective' && currentQuestion.options.some(opt => !opt)) {
      toast({ title: 'Fill all options for objective question', variant: 'destructive' }); return;
    }
    setFormData({ ...formData, questions: [...formData.questions, { ...currentQuestion }] });
    setCurrentQuestion(emptyQuestion());
  };

  const handleRemoveQuestion = (index) => {
    setFormData({ ...formData, questions: formData.questions.filter((_, i) => i !== index) });
  };

  const handleClassToggle = (className) => {
    const curr = formData.classes || [];
    setFormData({ ...formData, classes: curr.includes(className) ? curr.filter(c => c !== className) : [...curr, className] });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCurrentQuestion({ ...currentQuestion, image_url: file_url });
    setImageUploading(false);
  };

  const getExamResults = (examId) => cbtResults.filter(r => r.exam_id === examId);

  // Notify teacher if theory questions need grading
  const needsGrading = exams.filter(exam => {
    const hasTheory = exam.questions?.some(q => q.type === 'theory');
    if (!hasTheory) return false;
    const results = getExamResults(exam.id);
    return results.some(r => r.theory_graded === false || r.theory_graded === undefined);
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage CBT Exams</h1>
            <p className="text-gray-500">Create and manage computer-based tests, homework & assignments</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
            <Plus className="w-4 h-4 mr-2" />Create Exam / Assessment
          </Button>
        </div>

        {/* Needs grading notification */}
        {needsGrading.length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm">
            <strong>⚠️ Action Required:</strong> {needsGrading.length} exam(s) have theory questions awaiting manual grading:{' '}
            {needsGrading.map(e => e.title).join(', ')}
          </div>
        )}

        <Tabs defaultValue="exams">
          <TabsList className="mb-4">
            <TabsTrigger value="exams">Exams ({exams.length})</TabsTrigger>
            <TabsTrigger value="bank">Question Bank ({questionBank.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="exams">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">No exams yet</TableCell></TableRow>
                    ) : exams.map(exam => {
                      const hasTheory = exam.questions?.some(q => q.type === 'theory');
                      const examResults = getExamResults(exam.id);
                      const needsMark = hasTheory && examResults.some(r => !r.theory_graded);
                      return (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">
                            {exam.title}
                            {needsMark && <Badge className="ml-2 bg-amber-100 text-amber-800 text-xs">Needs Grading</Badge>}
                          </TableCell>
                          <TableCell><Badge variant="outline">{exam.exam_type}</Badge></TableCell>
                          <TableCell>{exam.subject_name}</TableCell>
                          <TableCell>
                            {exam.questions?.length || 0}
                            {hasTheory && <span className="ml-1 text-xs text-purple-600">(+theory)</span>}
                          </TableCell>
                          <TableCell><Clock className="w-3 h-3 inline mr-1" />{exam.duration_minutes}m</TableCell>
                          <TableCell>
                            <Badge className={exam.status === 'Published' ? 'bg-green-100 text-green-800' : exam.status === 'Closed' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}>
                              {exam.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {examResults.length > 0 && (
                              <Button size="sm" variant="ghost" onClick={() => setViewResultsExam(exam)}>
                                <Eye className="w-3 h-3 mr-1" />{examResults.length}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {exam.status === 'Draft' && <Button size="sm" variant="outline" onClick={() => handlePublish(exam)}>Publish</Button>}
                              {exam.status === 'Published' && <Button size="sm" variant="outline" className="text-orange-600" onClick={() => handleClose(exam)}>Close</Button>}
                              <Button variant="ghost" size="icon" onClick={() => handleDuplicate(exam)}><Copy className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(exam)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                {questionBank.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No questions in bank yet. Close an exam to move its questions here.</p>
                  </div>
                ) : (
                  <>
                    {/* Filters + Actions */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <Input className="pl-9" placeholder="Search questions..." value={bankSearch} onChange={e => setBankSearch(e.target.value)} />
                      </div>
                      <Select value={bankTypeFilter} onValueChange={setBankTypeFilter}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="objective">Objective</SelectItem>
                          <SelectItem value="theory">Theory</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={bankSubjectFilter} onValueChange={setBankSubjectFilter}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {[...new Set(questionBank.map(q => q.subject).filter(Boolean))].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedBankQs.length > 0 && (
                        <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]" onClick={() => {
                          const qs = questionBank.filter((_, i) => selectedBankQs.includes(i));
                          setFormData(prev => ({ ...prev, questions: [...(prev.questions || []), ...qs.map(q => ({ type: q.type, question: q.question, image_url: q.image_url || '', options: q.options || ['','','',''], correct_answer: q.correct_answer || 0, marks: q.marks || 1 }))] }));
                          setSelectedBankQs([]);
                          setIsDialogOpen(true);
                          toast({ title: `${qs.length} question(s) added to new exam!` });
                        }}>
                          <Plus className="w-4 h-4 mr-1" /> Use {selectedBankQs.length} Selected in New Exam
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {questionBank.filter(q => {
                        const matchSearch = !bankSearch || q.question?.toLowerCase().includes(bankSearch.toLowerCase());
                        const matchType = bankTypeFilter === 'all' || q.type === bankTypeFilter;
                        const matchSubj = bankSubjectFilter === 'all' || q.subject === bankSubjectFilter;
                        return matchSearch && matchType && matchSubj;
                      }).length} questions found · Click checkboxes to select for reuse
                    </p>
                    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                      {questionBank.map((q, i) => {
                        const matchSearch = !bankSearch || q.question?.replace(/<[^>]*>/g,'').toLowerCase().includes(bankSearch.toLowerCase());
                        const matchType = bankTypeFilter === 'all' || q.type === bankTypeFilter;
                        const matchSubj = bankSubjectFilter === 'all' || q.subject === bankSubjectFilter;
                        if (!matchSearch || !matchType || !matchSubj) return null;
                        const isSelected = selectedBankQs.includes(i);
                        return (
                          <Card key={i} className={`border cursor-pointer transition-all ${isSelected ? 'border-[#1e3a5f] bg-blue-50' : 'bg-gray-50'}`}
                            onClick={() => setSelectedBankQs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}>
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <input type="checkbox" checked={isSelected} readOnly className="mt-1 accent-[#1e3a5f]" />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-1 flex-wrap gap-1">
                                    <span className="text-xs text-gray-500">{q.exam_title} • {q.subject}</span>
                                    <div className="flex gap-1">
                                      <Badge variant="outline" className="text-xs">{q.type === 'theory' ? 'Theory' : 'Objective'}</Badge>
                                      <Badge variant="outline" className="text-xs">{q.marks} mk</Badge>
                                    </div>
                                  </div>
                                  <div className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: q.question }} />
                                  {q.image_url && <img src={q.image_url} alt="Q" className="mt-2 max-h-24 rounded border" />}
                                  {q.type === 'objective' && (
                                    <div className="grid grid-cols-2 gap-1 mt-2">
                                      {q.options?.map((opt, oi) => (
                                        <p key={oi} className={`text-xs px-2 py-0.5 rounded ${oi === q.correct_answer ? 'text-green-700 bg-green-50 font-semibold' : 'text-gray-500'}`}>
                                          {['A','B','C','D'][oi]}. {opt}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CREATE/EDIT DIALOG */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingExam ? 'Edit Exam' : 'Create New Exam / Assessment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#1e3a5f]">Basic Information</h3>
                <div>
                  <Label>Title *</Label>
                  <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select value={formData.exam_type} onValueChange={v => setFormData({ ...formData, exam_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Termly Examination', 'Mock Examination', 'Common Entrance', 'Homework', 'Assignment'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={formData.subject_id} onValueChange={v => {
                      const subject = subjects.find(s => s.id === v);
                      setFormData({ ...formData, subject_id: v, section: subject?.section });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Select Classes *</Label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-2 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                    {(() => {
                      const selSubj = subjects.find(s => s.id === formData.subject_id);
                      let avail = selSubj?.classes?.length ? selSubj.classes : (formData.section ? CLASSES[formData.section] || [] : Object.values(CLASSES).flat());
                      if (teacher && !selSubj?.classes?.length) {
                        avail = teacher.assigned_class ? [teacher.assigned_class] : teacher.form_teacher_class ? [teacher.form_teacher_class] : avail;
                      }
                      return avail.map(cls => (
                        <div key={cls} className="flex items-center space-x-2">
                          <Checkbox id={`cls-${cls}`} checked={formData.classes?.includes(cls)} onCheckedChange={() => handleClassToggle(cls)} />
                          <label htmlFor={`cls-${cls}`} className="text-xs cursor-pointer">{cls}</label>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Duration (mins) *</Label>
                    <Input type="number" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} required />
                  </div>
                  <div>
                    <Label>Total Marks *</Label>
                    <Input type="number" value={formData.total_marks} onChange={e => setFormData({ ...formData, total_marks: parseInt(e.target.value) })} required />
                  </div>
                  <div>
                    <Label>Pass Mark</Label>
                    <Input type="number" value={formData.pass_mark} onChange={e => setFormData({ ...formData, pass_mark: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Term</Label>
                    <Select value={formData.term} onValueChange={v => setFormData({ ...formData, term: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="First Term">First Term</SelectItem>
                        <SelectItem value="Second Term">Second Term</SelectItem>
                        <SelectItem value="Third Term">Third Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date/Time *</Label>
                    <Input type="datetime-local" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
                  </div>
                  <div>
                    <Label>End Date/Time *</Label>
                    <Input type="datetime-local" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <Label>Instructions</Label>
                  <Textarea value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} rows={2} placeholder="Exam instructions..." />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#1e3a5f]">Questions ({formData.questions.length})</h3>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex gap-3 items-center">
                      <Label>Question Type:</Label>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant={currentQuestion.type === 'objective' ? 'default' : 'outline'}
                          onClick={() => setCurrentQuestion({ ...currentQuestion, type: 'objective' })}>Objective</Button>
                        <Button type="button" size="sm" variant={currentQuestion.type === 'theory' ? 'default' : 'outline'}
                          onClick={() => setCurrentQuestion({ ...currentQuestion, type: 'theory' })}>Theory</Button>
                      </div>
                    </div>
                    <div>
                      <Label>Question *</Label>
                      <div className="mt-1 border rounded-md overflow-hidden bg-white">
                        <ReactQuill
                          value={currentQuestion.question}
                          onChange={val => setCurrentQuestion({ ...currentQuestion, question: val })}
                          theme="snow"
                          modules={{
                            toolbar: [
                              [{ 'header': [1, 2, false] }],
                              ['bold', 'italic', 'underline'],
                              [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                              [{ 'script': 'sub' }, { 'script': 'super' }],
                              [{ 'color': [] }],
                              ['clean']
                            ]
                          }}
                          formats={['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'script', 'color']}
                          placeholder="Type your question here..."
                          style={{ minHeight: '120px' }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Image (optional)</Label>
                      <div className="flex items-center gap-3">
                        <Input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
                        {imageUploading && <span className="text-xs text-blue-600">Uploading...</span>}
                        {currentQuestion.image_url && <img src={currentQuestion.image_url} alt="preview" className="h-14 rounded border" />}
                      </div>
                    </div>
                    {currentQuestion.type === 'objective' && (
                      <>
                        <div className="grid md:grid-cols-2 gap-3">
                          {currentQuestion.options.map((opt, idx) => (
                            <div key={idx}>
                              <Label>Option {idx + 1}</Label>
                              <Input value={opt} onChange={e => {
                                const opts = [...currentQuestion.options];
                                opts[idx] = e.target.value;
                                setCurrentQuestion({ ...currentQuestion, options: opts });
                              }} placeholder={`Option ${idx + 1}`} />
                            </div>
                          ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <Label>Correct Answer</Label>
                            <Select value={currentQuestion.correct_answer.toString()} onValueChange={v => setCurrentQuestion({ ...currentQuestion, correct_answer: parseInt(v) })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['Option 1', 'Option 2', 'Option 3', 'Option 4'].map((o, i) => <SelectItem key={i} value={i.toString()}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Marks</Label>
                            <Input type="number" value={currentQuestion.marks} onChange={e => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) })} />
                          </div>
                        </div>
                      </>
                    )}
                    {currentQuestion.type === 'theory' && (
                      <div>
                        <Label>Marks</Label>
                        <Input type="number" value={currentQuestion.marks} onChange={e => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) })} />
                      </div>
                    )}
                    <Button type="button" onClick={handleAddQuestion} size="sm" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                      <Plus className="w-4 h-4 mr-1" />Add Question
                    </Button>
                  </CardContent>
                </Card>

                {/* Questions list */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.questions.map((q, idx) => (
                    <Card key={idx} className="border">
                      <CardContent className="p-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{q.type === 'theory' ? 'Theory' : 'Objective'}</Badge>
                            <span className="text-xs text-gray-500">{q.marks} mark(s)</span>
                          </div>
                          <div className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: `Q${idx + 1}: ${q.question}` }} />
                          {q.image_url && <img src={q.image_url} alt="" className="mt-1 max-h-14 rounded" />}
                          {q.type === 'objective' && (
                            <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                              {q.options?.map((opt, oi) => <p key={oi} className={oi === q.correct_answer ? 'text-green-600 font-semibold' : 'text-gray-500'}>{oi + 1}. {opt}</p>)}
                            </div>
                          )}
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveQuestion(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">{editingExam ? 'Update' : 'Create'} Exam</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* VIEW RESULTS DIALOG */}
        <Dialog open={!!viewResultsExam} onOpenChange={() => setViewResultsExam(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Score Sheet: {viewResultsExam?.title}</DialogTitle>
            </DialogHeader>
            {viewResultsExam && (() => {
              const results = getExamResults(viewResultsExam.id);
              const hasTheory = viewResultsExam.questions?.some(q => q.type === 'theory');
              return (
                <div>
                  <div className="flex gap-4 mb-4 text-sm text-gray-600">
                    <span>Total Students: <b>{results.length}</b></span>
                    <span>Total Marks: <b>{viewResultsExam.total_marks}</b></span>
                    <span>Pass Mark: <b>{viewResultsExam.pass_mark}</b></span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#1e3a5f] text-white">
                          <th className="px-3 py-2 text-left">Student</th>
                          <th className="px-3 py-2 text-left">Adm. No</th>
                          <th className="px-3 py-2 text-left">Class</th>
                          <th className="px-3 py-2">Score</th>
                          <th className="px-3 py-2">%</th>
                          <th className="px-3 py-2">Grade</th>
                          {hasTheory && <th className="px-3 py-2">Theory Status</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-3 py-2 font-medium">{r.student_name}</td>
                            <td className="px-3 py-2 font-mono text-xs">{r.admission_number}</td>
                            <td className="px-3 py-2">{r.class}</td>
                            <td className="px-3 py-2 text-center font-bold">{r.score}/{r.total_marks}</td>
                            <td className="px-3 py-2 text-center">{r.percentage}%</td>
                            <td className="px-3 py-2 text-center">
                              <Badge className={r.grade === 'A' ? 'bg-green-100 text-green-800' : r.grade === 'F' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{r.grade}</Badge>
                            </td>
                            {hasTheory && (
                              <td className="px-3 py-2 text-center">
                                {r.theory_graded
                                  ? <Badge className="bg-green-100 text-green-800">Graded</Badge>
                                  : <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                                }
                              </td>
                            )}
                          </tr>
                        ))}
                        {results.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No results yet</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
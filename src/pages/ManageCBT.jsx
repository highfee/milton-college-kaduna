import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Eye, Copy, Clock } from 'lucide-react';
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

const CLASSES = {
  'Nursery': ['Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

export default function ManageCBT() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    exam_type: 'Termly Examination',
    subject_id: '',
    subject_name: '',
    section: '',
    classes: [],
    term: 'First Term',
    session: '2024/2025',
    duration_minutes: 60,
    total_marks: 100,
    pass_mark: 40,
    instructions: '',
    questions: [],
    start_date: '',
    end_date: '',
    status: 'Draft'
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    marks: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    const [teacherData, staffRoles, settings] = await Promise.all([
      base44.entities.Teacher.filter({ email: userData.email }),
      base44.entities.StaffRole.filter({ user_email: userData.email }),
      base44.entities.SchoolSettings.list()
    ]);

    if (settings[0]) {
      setFormData(prev => ({ ...prev, term: settings[0].current_term, session: settings[0].current_session }));
    }

    const isAdmin = userData.role === 'admin' || staffRoles.some(r => r.role === 'Admin');

    let subjectsData;
    if (isAdmin) {
      subjectsData = await base44.entities.Subject.filter({ status: 'Active' });
      const examsData = await base44.entities.CBTExam.list('-created_date', 100);
      setExams(examsData);
    } else if (teacherData[0]) {
      setTeacher(teacherData[0]);
      subjectsData = await base44.entities.Subject.filter({ teacher_id: teacherData[0].id, status: 'Active' });
      const examsData = await base44.entities.CBTExam.filter({ created_by: userData.email });
      setExams(examsData);
    } else {
      subjectsData = [];
    }

    setSubjects(subjectsData || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedSubject = subjects.find(s => s.id === formData.subject_id);
    const dataToSave = {
      ...formData,
      subject_name: selectedSubject?.name,
      created_by: user?.email
    };

    if (editingExam) {
      await base44.entities.CBTExam.update(editingExam.id, dataToSave);
    } else {
      await base44.entities.CBTExam.create(dataToSave);
    }

    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setFormData(exam);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this exam?')) {
      await base44.entities.CBTExam.delete(id);
      loadData();
    }
  };

  const handleDuplicate = async (exam) => {
    const newExam = { ...exam };
    delete newExam.id;
    delete newExam.created_date;
    delete newExam.updated_date;
    newExam.title = `${exam.title} (Copy)`;
    newExam.status = 'Draft';
    await base44.entities.CBTExam.create(newExam);
    loadData();
  };

  const resetForm = () => {
    setEditingExam(null);
    setFormData({
      title: '',
      exam_type: 'Termly Examination',
      subject_id: '',
      subject_name: '',
      section: '',
      classes: [],
      term: 'First Term',
      session: '2024/2025',
      duration_minutes: 60,
      total_marks: 100,
      pass_mark: 40,
      instructions: '',
      questions: [],
      start_date: '',
      end_date: '',
      status: 'Draft'
    });
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      marks: 1
    });
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.question || currentQuestion.options.some(opt => !opt)) {
      alert('Please fill in the question and all options');
      return;
    }
    
    setFormData({
      ...formData,
      questions: [...formData.questions, { ...currentQuestion }]
    });
    
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      marks: 1
    });
  };

  const handleRemoveQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleClassToggle = (className) => {
    const currentClasses = formData.classes || [];
    const newClasses = currentClasses.includes(className)
      ? currentClasses.filter(c => c !== className)
      : [...currentClasses, className];
    setFormData({ ...formData, classes: newClasses });
  };

  const handlePublish = async (exam) => {
    await base44.entities.CBTExam.update(exam.id, { status: 'Published' });
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage CBT Exams</h1>
            <p className="text-gray-500">Create and manage computer-based tests</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
            <Plus className="w-4 h-4 mr-2" />
            Create CBT Exam
          </Button>
        </div>

        {/* Exams List */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell><Badge variant="outline">{exam.exam_type}</Badge></TableCell>
                        <TableCell>{exam.subject_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {exam.duration_minutes} mins
                          </div>
                        </TableCell>
                        <TableCell>{exam.questions?.length || 0}</TableCell>
                        <TableCell>
                          <Badge className={
                            exam.status === 'Published' ? 'bg-green-100 text-green-800' :
                            exam.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {exam.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {exam.status === 'Draft' && (
                              <Button size="sm" variant="outline" onClick={() => handlePublish(exam)}>
                                Publish
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDuplicate(exam)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(exam)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {exams.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">No CBT exams found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingExam ? 'Edit CBT Exam' : 'Create New CBT Exam'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold">Basic Information</h3>
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Exam Type *</Label>
                    <Select value={formData.exam_type} onValueChange={(v) => setFormData({ ...formData, exam_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Termly Examination">Termly Examination</SelectItem>
                        <SelectItem value="Mock Examination">Mock Examination</SelectItem>
                        <SelectItem value="Common Entrance">Common Entrance</SelectItem>
                        <SelectItem value="Homework">Homework</SelectItem>
                        <SelectItem value="Assignment">Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject *</Label>
                    <Select value={formData.subject_id} onValueChange={(v) => {
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
                      const selectedSubjectObj = subjects.find(s => s.id === formData.subject_id);
                      const availClasses = selectedSubjectObj?.classes?.length
                        ? selectedSubjectObj.classes
                        : (formData.section ? CLASSES[formData.section] || [] : []);
                      return availClasses.map(className => (
                        <div key={className} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cls-${className}`}
                            checked={formData.classes?.includes(className)}
                            onCheckedChange={() => handleClassToggle(className)}
                          />
                          <label htmlFor={`cls-${className}`} className="text-sm cursor-pointer">
                            {className}
                          </label>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Duration (minutes) *</Label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Total Marks *</Label>
                    <Input
                      type="number"
                      value={formData.total_marks}
                      onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Pass Mark *</Label>
                    <Input
                      type="number"
                      value={formData.pass_mark}
                      onChange={(e) => setFormData({ ...formData, pass_mark: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Term</Label>
                    <Select value={formData.term} onValueChange={(v) => setFormData({ ...formData, term: v })}>
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
                    <Input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>End Date/Time *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Instructions</Label>
                  <Textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={3}
                    placeholder="Enter exam instructions..."
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <h3 className="font-semibold">Questions ({formData.questions.length})</h3>
                
                {/* Add Question Form */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <Label>Question</Label>
                      <Textarea
                        value={currentQuestion.question}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                        rows={2}
                        placeholder="Enter question..."
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-3">
                      {currentQuestion.options.map((option, idx) => (
                        <div key={idx}>
                          <Label>Option {idx + 1}</Label>
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...currentQuestion.options];
                              newOptions[idx] = e.target.value;
                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                            }}
                            placeholder={`Option ${idx + 1}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <Label>Correct Answer</Label>
                        <Select 
                          value={currentQuestion.correct_answer.toString()} 
                          onValueChange={(v) => setCurrentQuestion({ ...currentQuestion, correct_answer: parseInt(v) })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Option 1</SelectItem>
                            <SelectItem value="1">Option 2</SelectItem>
                            <SelectItem value="2">Option 3</SelectItem>
                            <SelectItem value="3">Option 4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Marks</Label>
                        <Input
                          type="number"
                          value={currentQuestion.marks}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <Button type="button" onClick={handleAddQuestion} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Question
                    </Button>
                  </CardContent>
                </Card>

                {/* Questions List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.questions.map((q, idx) => (
                    <Card key={idx} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">Q{idx + 1}: {q.question}</p>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                              {q.options.map((opt, optIdx) => (
                                <p key={optIdx} className={optIdx === q.correct_answer ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                                  {optIdx + 1}. {opt}
                                </p>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Marks: {q.marks}</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveQuestion(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                  {editingExam ? 'Update' : 'Create'} Exam
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
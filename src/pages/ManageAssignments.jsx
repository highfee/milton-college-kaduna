import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Upload, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const CLASSES = {
  'Nursery': ['Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

export default function ManageAssignments() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submissionsDialog, setSubmissionsDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'Assignment',
    subject_id: '',
    subject_name: '',
    section: '',
    class: '',
    term: '',
    session: '',
    description: '',
    content: '',
    attachment_url: '',
    due_date: '',
    total_marks: 10,
    status: 'Active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    const teacherData = await base44.entities.Teacher.filter({ email: userData.email });
    if (teacherData[0]) {
      setTeacher(teacherData[0]);
      
      const subjectsData = await base44.entities.Subject.filter({ teacher_id: teacherData[0].id });
      setSubjects(subjectsData);
      
      const assignmentsData = await base44.entities.Assignment.filter({ teacher_id: teacherData[0].id });
      setAssignments(assignmentsData);
    }

    const settings = await base44.entities.SchoolSettings.list();
    if (settings[0]) {
      setFormData(prev => ({
        ...prev,
        term: settings[0].current_term,
        session: settings[0].current_session
      }));
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedSubject = subjects.find(s => s.id === formData.subject_id);
    const dataToSave = {
      ...formData,
      subject_name: selectedSubject?.name,
      teacher_id: teacher?.id,
      teacher_name: `${teacher?.first_name} ${teacher?.last_name}`
    };

    if (editingAssignment) {
      await base44.entities.Assignment.update(editingAssignment.id, dataToSave);
    } else {
      await base44.entities.Assignment.create(dataToSave);
    }

    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setFormData(assignment);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      await base44.entities.Assignment.delete(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingAssignment(null);
    setFormData({
      title: '',
      type: 'Assignment',
      subject_id: '',
      subject_name: '',
      section: '',
      class: '',
      term: '',
      session: '',
      description: '',
      content: '',
      attachment_url: '',
      due_date: '',
      total_marks: 10,
      status: 'Active'
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, attachment_url: file_url });
    }
  };

  const handleViewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    const submissionsData = await base44.entities.AssignmentSubmission.filter({ assignment_id: assignment.id });
    setSubmissions(submissionsData);
    setSubmissionsDialog(true);
  };

  const handleGradeSubmission = async (submission, score, feedback) => {
    await base44.entities.AssignmentSubmission.update(submission.id, {
      score: parseFloat(score),
      feedback,
      graded_by: user.email,
      graded_at: new Date().toISOString(),
      status: 'Graded'
    });
    handleViewSubmissions(selectedAssignment);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Assignments</h1>
            <p className="text-gray-500">Create and manage assignments & homework</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label>Type *</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Assignment">Assignment</SelectItem>
                        <SelectItem value="Homework">Homework</SelectItem>
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Class *</Label>
                    <Select value={formData.class} onValueChange={(v) => setFormData({ ...formData, class: v })}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {(formData.section ? CLASSES[formData.section] || [] : []).map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Content/Instructions</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    placeholder="Type assignment instructions here..."
                  />
                </div>

                <div>
                  <Label>Attachment (PDF only)</Label>
                  <div className="mt-2">
                    {formData.attachment_url ? (
                      <div className="flex items-center gap-4">
                        <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          View attachment
                        </a>
                        <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, attachment_url: '' })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1e3a5f]">
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">Upload PDF (Optional)</span>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Total Marks</Label>
                  <Input
                    type="number"
                    value={formData.total_marks}
                    onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    {editingAssignment ? 'Update' : 'Create'} Assignment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Assignments List */}
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
                      <TableHead>Class</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <span className="font-medium">{assignment.title}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{assignment.type}</Badge></TableCell>
                        <TableCell>{assignment.subject_name}</TableCell>
                        <TableCell>{assignment.class}</TableCell>
                        <TableCell>{assignment.due_date}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => handleViewSubmissions(assignment)}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(assignment)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(assignment.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {assignments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">No assignments found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submissions Dialog */}
        <Dialog open={submissionsDialog} onOpenChange={setSubmissionsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submissions - {selectedAssignment?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{submission.student_name}</p>
                        <p className="text-sm text-gray-500">{submission.admission_number}</p>
                      </div>
                      <Badge className={submission.status === 'Graded' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {submission.status}
                      </Badge>
                    </div>
                    {submission.content && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600">{submission.content}</p>
                      </div>
                    )}
                    {submission.attachment_url && (
                      <a href={submission.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        View Attachment
                      </a>
                    )}
                    {submission.status !== 'Graded' && (
                      <div className="grid md:grid-cols-2 gap-2 mt-3">
                        <Input
                          type="number"
                          placeholder="Score"
                          max={selectedAssignment?.total_marks}
                          id={`score-${submission.id}`}
                        />
                        <Input
                          placeholder="Feedback"
                          id={`feedback-${submission.id}`}
                        />
                        <Button 
                          size="sm"
                          onClick={() => {
                            const score = document.getElementById(`score-${submission.id}`).value;
                            const feedback = document.getElementById(`feedback-${submission.id}`).value;
                            handleGradeSubmission(submission, score, feedback);
                          }}
                        >
                          Grade
                        </Button>
                      </div>
                    )}
                    {submission.status === 'Graded' && (
                      <div className="mt-3 p-3 bg-green-50 rounded">
                        <p className="text-sm"><strong>Score:</strong> {submission.score}/{submission.total_marks}</p>
                        {submission.feedback && <p className="text-sm"><strong>Feedback:</strong> {submission.feedback}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {submissions.length === 0 && (
                <p className="text-center py-8 text-gray-500">No submissions yet</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
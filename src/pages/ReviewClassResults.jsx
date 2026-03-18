import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, MessageSquare, CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EnterTraitsDialog from '@/components/EnterTraitsDialog';

export default function ReviewClassResults() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [traitsStudent, setTraitsStudent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (teacher && selectedTerm && selectedSession) {
      loadStudents();
    }
  }, [teacher, selectedTerm, selectedSession]);

  const loadData = async () => {
    // Support teacher portal session (staff_id) and regular auth
    const staffId = sessionStorage.getItem('teacher_portal_staff_id');
    const settings = await base44.entities.SchoolSettings.list();
    if (settings[0]) {
      setSelectedTerm(settings[0].current_term);
      setSelectedSession(settings[0].current_session);
    }

    let teacherData = [];
    if (staffId) {
      teacherData = await base44.entities.Teacher.filter({ staff_id: staffId });
    } else {
      const userData = await base44.auth.me();
      setUser(userData);
      teacherData = await base44.entities.Teacher.filter({ email: userData.email });
    }
    if (teacherData[0]) setTeacher(teacherData[0]);

    setLoading(false);
  };

  const loadStudents = async () => {
    // Support both form teachers and class teachers
    const cls = teacher?.form_teacher_class || teacher?.assigned_class;
    if (!cls) return;
    const studentsData = await base44.entities.Student.filter({ current_class: cls, status: 'Active' });
    setStudents(studentsData);
  };

  const handleReviewStudent = async (student) => {
    setSelectedStudent(student);
    
    const resultsData = await base44.entities.Result.filter({
      student_id: student.id,
      term: selectedTerm,
      session: selectedSession
    });
    setResults(resultsData);
    setComment(resultsData[0]?.form_teacher_comment || '');
    setIsDialogOpen(true);
  };

  const handleSaveComment = async () => {
    if (!comment) {
      alert('Please enter a comment');
      return;
    }

    for (const result of results) {
      await base44.entities.Result.update(result.id, {
        form_teacher_comment: comment
      });
    }

    alert('Comment saved successfully');
    setIsDialogOpen(false);
  };

  const handleApproveResults = async () => {
    for (const result of results) {
      await base44.entities.Result.update(result.id, {
        status: 'Reviewed'
      });
    }

    alert('Results reviewed successfully');
    setIsDialogOpen(false);
  };

  const calculateAverage = () => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + (r.total || 0), 0);
    return (total / results.length).toFixed(2);
  };

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Review Class Results</h1>
          <p className="text-gray-500">Review and comment on your class results</p>
          {(teacher?.form_teacher_class || teacher?.assigned_class) && (
            <p className="text-[#1e3a5f] font-medium mt-2">Class: {teacher.form_teacher_class || teacher.assigned_class}</p>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Input value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} placeholder="2024/2025" />
              </div>
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No class message */}
        {teacher && !(teacher?.form_teacher_class || teacher?.assigned_class) && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center text-gray-500">
              <p className="text-lg font-medium mb-2">No Class Assigned</p>
              <p className="text-sm">You need to have an assigned class or form teacher class to review results. Please contact the Admin.</p>
            </CardContent>
          </Card>
        )}

        {/* Students List */}
        {(teacher?.form_teacher_class || teacher?.assigned_class) && selectedTerm && selectedSession && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Adm. No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell>{student.admission_number}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">Ready for Review</Badge>
                        </TableCell>
                        <TableCell className="text-right flex gap-2 justify-end">
                          <Button size="sm" onClick={() => handleReviewStudent(student)}>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Comment
                          </Button>
                          <Button size="sm" variant="outline" className="border-amber-400 text-amber-700" onClick={() => setTraitsStudent(student)}>
                            <Star className="w-4 h-4 mr-1" />
                            Traits
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Affective Traits Dialog */}
        <EnterTraitsDialog
          open={!!traitsStudent}
          onClose={() => setTraitsStudent(null)}
          student={traitsStudent}
          term={selectedTerm}
          session={selectedSession}
        />

        {/* Review Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Review Results - {selectedStudent?.first_name} {selectedStudent?.last_name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedStudent && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Admission Number</p>
                    <p className="font-medium">{selectedStudent.admission_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Average Score</p>
                    <p className="font-medium text-2xl text-green-600">{calculateAverage()}%</p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>{result.subject_name}</TableCell>
                          <TableCell className="font-bold">{result.total}</TableCell>
                          <TableCell><Badge>{result.grade}</Badge></TableCell>
                          <TableCell>{result.remark}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <Label>Form Teacher's Comment *</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Enter your comment on the student's performance..."
                    className="mt-2"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveComment} variant="outline">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Save Comment
                  </Button>
                  <Button onClick={handleApproveResults} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Reviewed
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
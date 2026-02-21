import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, MessageSquare, CheckCircle, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const CLASSES = {
  'Nursery': ['Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

export default function ReviewResults() {
  const [user, setUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [comment, setComment] = useState('');
  const [promotion, setPromotion] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedTerm && selectedSession) {
      loadStudents();
    }
  }, [selectedClass, selectedTerm, selectedSession]);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    const roles = await base44.entities.StaffRole.filter({ user_email: userData.email });
    setStaffRole(roles[0]);

    const settings = await base44.entities.SchoolSettings.list();
    if (settings[0]) {
      setSelectedTerm(settings[0].current_term);
      setSelectedSession(settings[0].current_session);
    }

    setLoading(false);
  };

  const loadStudents = async () => {
    const studentsData = await base44.entities.Student.filter({ 
      current_class: selectedClass, 
      status: 'Active' 
    });
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

    const commentField = staffRole?.role === 'Principal' ? 'principal_comment' : 'head_teacher_comment';
    setComment(resultsData[0]?.[commentField] || '');
    setPromotion('');
    setIsDialogOpen(true);
  };

  const handleSaveComment = async () => {
    if (!comment) {
      alert('Please enter a comment');
      return;
    }

    const commentField = staffRole?.role === 'Principal' ? 'principal_comment' : 'head_teacher_comment';
    
    for (const result of results) {
      await base44.entities.Result.update(result.id, {
        [commentField]: comment,
        status: 'Reviewed'
      });
    }

    alert('Comment saved successfully');
    setIsDialogOpen(false);
    loadStudents();
  };

  const handleApproveResults = async () => {
    for (const result of results) {
      await base44.entities.Result.update(result.id, {
        status: 'Approved',
        approved_by: user.email,
        approved_date: new Date().toISOString().split('T')[0]
      });
    }

    // Handle promotion/demotion for Third Term
    if (selectedTerm === 'Third Term' && promotion) {
      await base44.entities.Student.update(selectedStudent.id, {
        current_class: promotion
      });
    }

    alert('Results approved successfully');
    setIsDialogOpen(false);
    loadStudents();
  };

  const calculateAverage = () => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + (r.total || 0), 0);
    return (total / results.length).toFixed(2);
  };

  const getNextClass = (currentClass) => {
    const allClasses = [...CLASSES.Nursery, ...CLASSES.Primary, ...CLASSES.Secondary];
    const currentIndex = allClasses.indexOf(currentClass);
    return currentIndex >= 0 ? allClasses[currentIndex + 1] : currentClass;
  };

  const getPreviousClass = (currentClass) => {
    const allClasses = [...CLASSES.Nursery, ...CLASSES.Primary, ...CLASSES.Secondary];
    const currentIndex = allClasses.indexOf(currentClass);
    return currentIndex > 0 ? allClasses[currentIndex - 1] : currentClass;
  };

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  // Show all classes for admins/principals; restrict to section for staff roles
  const section = staffRole?.section;
  const availableClasses = section && section !== 'All' ? (CLASSES[section] || []) : [...CLASSES.Nursery, ...CLASSES.Primary, ...CLASSES.Secondary];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Review Student Results</h1>
          <p className="text-gray-500">Review, comment and approve student results</p>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

        {/* Students List */}
        {selectedClass && selectedTerm && selectedSession && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Adm. No.</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell>{student.admission_number}</TableCell>
                        <TableCell><Badge variant="outline">{student.current_class}</Badge></TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">Ready for Review</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleReviewStudent(student)}>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Review
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
                {/* Student Info */}
                <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Class</p>
                    <p className="font-medium">{selectedStudent.current_class}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Admission Number</p>
                    <p className="font-medium">{selectedStudent.admission_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Average Score</p>
                    <p className="font-medium text-2xl text-green-600">{calculateAverage()}%</p>
                  </div>
                </div>

                {/* Results Table */}
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

                {/* Comment */}
                <div>
                  <Label>{staffRole?.role === 'Principal' ? 'Principal' : 'Head Teacher'}'s Comment *</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Enter your comment on the student's performance..."
                    className="mt-2"
                  />
                </div>

                {/* Promotion/Demotion for Third Term */}
                {selectedTerm === 'Third Term' && (
                  <div>
                    <Label>Promotion Decision</Label>
                    <div className="grid md:grid-cols-3 gap-4 mt-2">
                      <Button
                        variant={promotion === getNextClass(selectedStudent.current_class) ? 'default' : 'outline'}
                        onClick={() => setPromotion(getNextClass(selectedStudent.current_class))}
                        className="flex items-center gap-2"
                      >
                        <ArrowUp className="w-4 h-4" />
                        Promote to {getNextClass(selectedStudent.current_class)}
                      </Button>
                      <Button
                        variant={promotion === selectedStudent.current_class ? 'default' : 'outline'}
                        onClick={() => setPromotion(selectedStudent.current_class)}
                      >
                        Repeat Class
                      </Button>
                      <Button
                        variant={promotion === getPreviousClass(selectedStudent.current_class) ? 'default' : 'outline'}
                        onClick={() => setPromotion(getPreviousClass(selectedStudent.current_class))}
                        className="flex items-center gap-2"
                      >
                        <ArrowDown className="w-4 h-4" />
                        Demote
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveComment} variant="outline">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Save Comment
                  </Button>
                  <Button onClick={handleApproveResults} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Results
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
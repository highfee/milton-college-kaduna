import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ViewCBTResults() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    const studentData = await base44.entities.Student.filter({ parent_email: userData.email });
    if (studentData[0]) {
      setStudent(studentData[0]);
      
      const resultsData = await base44.entities.CBTResult.filter({ 
        student_id: studentData[0].id 
      });
      setResults(resultsData.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)));
      const examsData = await base44.entities.CBTExam.list('-created_date', 200);
      setExams(examsData);
    }

    setLoading(false);
  };

  const isScoreReleased = (examId) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam?.end_date) return true;
    return new Date(exam.end_date) <= new Date();
  };

  const getGradeBadgeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const calculateStats = () => {
    const visibleResults = results.filter(r => isScoreReleased(r.exam_id));
    if (visibleResults.length === 0) return { avgScore: 0, highestScore: 0, totalExams: 0, passRate: 0 };
    
    const totalScore = visibleResults.reduce((sum, r) => sum + parseFloat(r.percentage), 0);
    const avgScore = (totalScore / visibleResults.length).toFixed(1);
    const highestScore = Math.max(...visibleResults.map(r => parseFloat(r.percentage)));
    const passed = visibleResults.filter(r => parseFloat(r.percentage) >= 40).length;
    const passRate = ((passed / visibleResults.length) * 100).toFixed(1);
    
    return { avgScore, highestScore, totalExams: visibleResults.length, passRate };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My CBT Results</h1>
          <p className="text-gray-500">View your computer-based test performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Exams</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalExams}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold mt-1">{stats.avgScore}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Highest Score</p>
                  <p className="text-2xl font-bold mt-1">{stats.highestScore}%</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pass Rate</p>
                  <p className="text-2xl font-bold mt-1">{stats.passRate}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {results.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p>No CBT results yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Time Taken</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => {
                      const released = isScoreReleased(result.exam_id);
                      return (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.exam_title}</TableCell>
                        <TableCell>{new Date(result.submitted_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-bold">{released ? `${result.score}/${result.total_marks}` : '—'}</TableCell>
                        <TableCell>{released ? `${result.percentage}%` : <Badge className="bg-amber-100 text-amber-700">Pending</Badge>}</TableCell>
                        <TableCell>
                          {released ? (
                            <Badge className={getGradeBadgeColor(result.grade)}>
                              {result.grade}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {result.time_taken_minutes} mins
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {released && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedResult(result)}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{result.exam_title} - Detailed Results</DialogTitle>
                              </DialogHeader>
                              
                              {selectedResult && (
                                <div className="space-y-4">
                                  <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="text-sm text-gray-500">Score</p>
                                      <p className="text-xl font-bold">{result.score}/{result.total_marks}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">Percentage</p>
                                      <p className="text-xl font-bold">{result.percentage}%</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">Grade</p>
                                      <Badge className={`${getGradeBadgeColor(result.grade)} text-lg px-4 py-1`}>
                                        {result.grade}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <h4 className="font-semibold">Question-by-Question Analysis</h4>
                                    {result.answers?.map((ans, idx) => (
                                      <div key={idx} className={`p-3 rounded-lg border-2 ${
                                        ans.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                      }`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium">Question {idx + 1}</span>
                                          {ans.is_correct ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                          ) : (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                          Your answer: Option {ans.selected_answer + 1}
                                          {!ans.is_correct && ` (Incorrect)`}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
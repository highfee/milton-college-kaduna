import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function TakeCBT() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [availableExams, setAvailableExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (examStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examStarted, timeRemaining]);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    const studentData = await base44.entities.Student.filter({ parent_email: userData.email });
    if (studentData[0]) {
      setStudent(studentData[0]);
      await loadAvailableExams(studentData[0]);
    }

    setLoading(false);
  };

  const loadAvailableExams = async (studentData) => {
    const now = new Date().toISOString();
    const allExams = await base44.entities.CBTExam.filter({ status: 'Published' });
    
    // Filter exams that are available for this student
    const available = allExams.filter(exam => 
      exam.classes?.includes(studentData.current_class) &&
      exam.start_date <= now &&
      exam.end_date >= now
    );

    // Check if student has already taken these exams
    const results = await base44.entities.CBTResult.filter({ student_id: studentData.id });
    const takenExamIds = results.map(r => r.exam_id);
    
    const notTaken = available.filter(exam => !takenExamIds.includes(exam.id));
    setAvailableExams(notTaken);
  };

  const handleStartExam = (exam) => {
    setSelectedExam(exam);
    setTimeRemaining(exam.duration_minutes * 60);
    setExamStarted(true);
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setAnswers({ ...answers, [questionIndex]: answerIndex });
  };

  const handleSubmitExam = async () => {
    if (!confirm('Are you sure you want to submit this exam?')) return;

    // Calculate score
    let score = 0;
    const answersArray = selectedExam.questions.map((q, idx) => {
      const selectedAnswer = answers[idx];
      const isCorrect = selectedAnswer === q.correct_answer;
      if (isCorrect) score += q.marks;
      
      return {
        question_index: idx,
        selected_answer: selectedAnswer,
        is_correct: isCorrect
      };
    });

    const percentage = (score / selectedExam.total_marks) * 100;
    const grade = getGrade(percentage);

    // Save result
    await base44.entities.CBTResult.create({
      exam_id: selectedExam.id,
      exam_title: selectedExam.title,
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admission_number,
      class: student.current_class,
      answers: answersArray,
      score,
      total_marks: selectedExam.total_marks,
      percentage: percentage.toFixed(2),
      grade,
      time_taken_minutes: selectedExam.duration_minutes - Math.floor(timeRemaining / 60),
      submitted_at: new Date().toISOString(),
      status: 'Graded'
    });

    alert(`Exam submitted successfully! Your score: ${score}/${selectedExam.total_marks}`);
    setExamStarted(false);
    setSelectedExam(null);
    loadData();
  };

  const getGrade = (percentage) => {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Student record not found</p>
            <p className="text-sm text-gray-500 mt-2">Please contact the school administrator</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examStarted && selectedExam) {
    const question = selectedExam.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / selectedExam.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card className="mb-6 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedExam.title}</h2>
                  <p className="text-sm text-gray-500">{selectedExam.subject_name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <Clock className="w-5 h-5" />
                    <span className="font-bold text-lg">{formatTime(timeRemaining)}</span>
                  </div>
                </div>
              </div>
              <Progress value={progress} className="mt-4" />
              <p className="text-sm text-gray-500 mt-2">
                Question {currentQuestion + 1} of {selectedExam.questions.length}
              </p>
            </CardContent>
          </Card>

          {/* Question */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  Question {currentQuestion + 1}
                </h3>
                <p className="text-base mb-6">{question.question}</p>
              </div>

              <RadioGroup 
                value={answers[currentQuestion]?.toString()} 
                onValueChange={(v) => handleAnswerSelect(currentQuestion, parseInt(v))}
              >
                <div className="space-y-3">
                  {question.options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                      <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-base">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                
                {currentQuestion < selectedExam.questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className="bg-[#1e3a5f] hover:bg-[#2c4a6e]"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitExam}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Submit Exam
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Question Navigator */}
          <Card className="mt-6 border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Question Navigator</p>
              <div className="grid grid-cols-10 gap-2">
                {selectedExam.questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`w-10 h-10 rounded-lg font-medium text-sm ${
                      idx === currentQuestion
                        ? 'bg-[#1e3a5f] text-white'
                        : answers[idx] !== undefined
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">CBT Exams</h1>
          <p className="text-gray-500">Take your computer-based tests</p>
        </div>

        {availableExams.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">No exams available</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for upcoming exams</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {availableExams.map((exam) => (
              <Card key={exam.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <div>
                      <p className="text-lg">{exam.title}</p>
                      <p className="text-sm font-normal text-gray-500">{exam.subject_name}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Available</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {exam.duration_minutes} minutes
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Questions</p>
                      <p className="font-medium">{exam.questions?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Marks</p>
                      <p className="font-medium">{exam.total_marks}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pass Mark</p>
                      <p className="font-medium">{exam.pass_mark}</p>
                    </div>
                  </div>
                  
                  {exam.instructions && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-800">{exam.instructions}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleStartExam(exam)} 
                    className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]"
                  >
                    Start Exam
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
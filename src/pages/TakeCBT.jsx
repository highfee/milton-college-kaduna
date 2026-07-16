import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Clock, CheckCircle, AlertCircle, BookOpen, Calculator, X, ChevronLeft,
  ChevronRight, Flag, Award, Zap, TrendingUp, ArrowLeft, FileText, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function MiniCalculator({ onClose }) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [reset, setReset] = useState(false);

  const handleNum = (n) => {
    if (reset) { setDisplay(String(n)); setReset(false); }
    else setDisplay(display === '0' ? String(n) : display + n);
  };
  const handleOp = (o) => { setPrev(parseFloat(display)); setOp(o); setReset(true); };
  const handleEq = () => {
    if (prev === null || op === null) return;
    const cur = parseFloat(display);
    let result;
    if (op === '+') result = prev + cur;
    else if (op === '-') result = prev - cur;
    else if (op === '×') result = prev * cur;
    else if (op === '÷') result = cur !== 0 ? prev / cur : 'Error';
    setDisplay(String(result));
    setPrev(null); setOp(null); setReset(true);
  };
  const handleDot = () => { if (!display.includes('.')) setDisplay(display + '.'); };
  const handleClear = () => { setDisplay('0'); setPrev(null); setOp(null); setReset(false); };

  const btnClass = "w-full h-10 rounded text-sm font-medium";
  const numClass = `${btnClass} bg-slate-100 hover:bg-slate-200`;
  const opClass = `${btnClass} bg-blue-100 text-blue-700 hover:bg-blue-200`;
  const eqClass = `${btnClass} bg-indigo-600 text-white hover:bg-indigo-700`;

  return (
    <div className="fixed bottom-24 right-4 bg-white border rounded-xl shadow-2xl p-3 w-56 z-50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-600">Calculator</span>
        <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
      </div>
      <div className="bg-slate-900 text-white text-right px-3 py-2 rounded mb-2 text-lg font-mono overflow-hidden">{display}</div>
      <div className="grid grid-cols-4 gap-1">
        {['7','8','9','÷','4','5','6','×','1','2','3','-','0','.','=','+'].map(k => (
          <button key={k} className={k === '=' ? eqClass : '+-×÷'.includes(k) ? opClass : numClass}
            onClick={() => k === '=' ? handleEq() : '+-×÷'.includes(k) ? handleOp(k) : k === '.' ? handleDot() : handleNum(k)}>
            {k}
          </button>
        ))}
        <button className={`col-span-4 ${btnClass} bg-red-100 text-red-700 hover:bg-red-200`} onClick={handleClear}>C (Clear)</button>
      </div>
    </div>
  );
}

function getGrade(pct) {
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

function getGradeColor(grade) {
  if (grade === 'A' || grade === 'B') return { text: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-100 text-green-800' };
  if (grade === 'C') return { text: 'text-blue-600', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' };
  if (grade === 'D' || grade === 'E') return { text: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' };
  return { text: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' };
}

export default function TakeCBT() {
  const [student, setStudent] = useState(null);
  const [availableExams, setAvailableExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalc, setShowCalc] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [flagged, setFlagged] = useState({});
  const submittingRef = useRef(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!examStarted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!submittingRef.current) { setAutoSubmitted(true); doSubmit(true); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted]);

  const loadData = async () => {
    setLoading(true);
    const stAdm = sessionStorage.getItem('student_portal_adm');
    let studentData = null;
    if (stAdm) {
      const res = await base44.entities.Student.filter({ admission_number: stAdm });
      studentData = res[0] || null;
    } else {
      const userData = await base44.auth.me().catch(() => null);
      if (userData) {
        const res = await base44.entities.Student.filter({ parent_email: userData.email });
        studentData = res[0] || null;
      }
    }
    if (!studentData) { setLoading(false); return; }
    setStudent(studentData);

    const allExams = await base44.entities.CBTExam.filter({ status: 'Published' });
    const results = await base44.entities.CBTResult.filter({ student_id: studentData.id });
    const takenIds = results.map(r => r.exam_id);
    const available = allExams.filter(e => {
      if (!e.classes?.includes(studentData.current_class)) return false;
      if (takenIds.includes(e.id)) return false;
      return true;
    });
    setAvailableExams(available);
    setLoading(false);
  };

  const handleStartExam = (exam) => {
    setSelectedExam(exam);
    setTimeRemaining(exam.duration_minutes * 60);
    setAnswers({});
    setFlagged({});
    setCurrentQ(0);
    setExamStarted(true);
    setSubmitted(false);
    setFinalScore(null);
    setAutoSubmitted(false);
    submittingRef.current = false;
  };

  const doSubmit = useCallback(async (auto = false) => {
    if (submittingRef.current || !selectedExam) return;
    submittingRef.current = true;

    const exam = selectedExam;
    let objScore = 0;
    let objTotal = 0;
    const answersArray = exam.questions.map((q, idx) => {
      const isObjective = q.options && q.options.filter(o => o && o.trim()).length > 0;
      if (isObjective) {
        objTotal += (q.marks || 1);
        const sel = answers[idx];
        const correct = sel === q.correct_answer;
        if (correct) objScore += (q.marks || 1);
        return { question_index: idx, type: 'objective', selected_answer: sel, is_correct: correct };
      } else {
        return { question_index: idx, type: 'theory', theory_answer: answers[idx] || '', is_correct: null };
      }
    });

    const hasTheory = exam.questions.some(q => !(q.options && q.options.filter(o => o && o.trim()).length > 0));
    const totalObjectiveMarks = exam.questions.filter(q => q.type === 'objective').reduce((sum, q) => sum + (q.marks || 1), 0);
    const percentage = totalObjectiveMarks > 0 ? ((objScore / totalObjectiveMarks) * 100).toFixed(1) : '0';
    const grade = getGrade(parseFloat(percentage));
    const timeTaken = exam.duration_minutes - Math.floor(timeRemaining / 60);

    try {
      await base44.entities.CBTResult.create({
        exam_id: exam.id,
        exam_title: exam.title,
        exam_type: exam.exam_type,
        subject_name: exam.subject_name,
        teacher_email: exam.created_by,
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: student.current_class,
        answers: answersArray,
        score: objScore,
        total_marks: exam.total_marks,
        percentage: parseFloat(percentage),
        grade,
        time_taken_minutes: timeTaken,
        submitted_at: new Date().toISOString(),
        status: hasTheory ? 'Pending' : 'Graded',
        theory_graded: !hasTheory,
        auto_submitted: auto
      });

      // Notify teacher
      base44.functions.invoke('sendSubmissionNotification', {
        type: 'cbt',
        exam_id: exam.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        title: exam.title,
        class_name: student.current_class,
        score: objScore,
        total_marks: exam.total_marks,
        has_theory: hasTheory
      }).catch(() => {});
    } catch (err) {
      // Even if notification fails, show the score
    }

    setFinalScore({
      score: objScore,
      total: exam.total_marks,
      objectiveTotal: totalObjectiveMarks,
      percentage,
      grade,
      hasTheory,
      timeTaken,
      autoSubmitted: auto,
      answeredCount: Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length,
      totalQuestions: exam.questions.length
    });
    setExamStarted(false);
    setSubmitted(true);
  }, [selectedExam, answers, student, timeRemaining]);

  const handleSubmitExam = () => {
    const unanswered = selectedExam.questions.filter((_, i) => answers[i] === undefined).length;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Submit anyway?`
      : 'Submit exam now?';
    if (!confirm(msg)) return;
    doSubmit(false);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!student) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="max-w-md border-0 shadow-lg"><CardContent className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-medium">Student record not found</p>
        <p className="text-sm text-slate-500 mt-2">Please log in via the Student Portal</p>
        <Link to="/StudentPortal"><Button className="mt-4">Go to Student Portal</Button></Link>
      </CardContent></Card>
    </div>
  );

  // ===== INSTANT RESULTS SCREEN =====
  if (submitted && finalScore) {
    const examEnded = !selectedExam?.end_date || new Date(selectedExam.end_date) <= new Date();
    if (!examEnded) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-center text-white">
              <CheckCircle className="w-16 h-16 mx-auto mb-2" />
              <h2 className="text-2xl font-bold">Exam Submitted!</h2>
              <p className="text-white/80">{selectedExam?.title}</p>
            </div>
            <CardContent className="p-6">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Results Pending</p>
                  <p className="text-xs text-amber-600 mt-1">Your answers have been submitted successfully. Your score will be available after the exam window closes{selectedExam?.end_date ? ` on ${new Date(selectedExam.end_date).toLocaleString()}` : ''}.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link to="/StudentLMS" className="flex-1">
                  <Button variant="outline" className="w-full"><ArrowLeft className="w-4 h-4 mr-2" />Back to LMS</Button>
                </Link>
                <Button onClick={() => { setSubmitted(false); setSelectedExam(null); loadData(); }} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  View Other Exams
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    const gradeColors = getGradeColor(finalScore.grade);
    const passed = parseFloat(finalScore.percentage) >= (selectedExam?.pass_mark || 40);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-0 shadow-xl overflow-hidden">
          {/* Header banner */}
          <div className={`bg-gradient-to-r ${passed ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-red-500'} p-6 text-center text-white`}>
            {finalScore.autoSubmitted ? (
              <>
                <Clock className="w-16 h-16 mx-auto mb-2" />
                <h2 className="text-2xl font-bold">Time's Up!</h2>
                <p className="text-white/80">Your exam was auto-submitted</p>
              </>
            ) : (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-2" />
                <h2 className="text-2xl font-bold">Exam Submitted!</h2>
                <p className="text-white/80">{selectedExam?.title}</p>
              </>
            )}
          </div>

          <CardContent className="p-6">
            {/* Score Display */}
            <div className={`text-center mb-6 ${gradeColors.bg} rounded-2xl p-6`}>
              <p className={`text-5xl font-bold ${gradeColors.text}`}>{finalScore.percentage}%</p>
              <p className="text-slate-600 mt-1">Objective Score: {finalScore.score}/{finalScore.objectiveTotal}</p>
              <Badge className={`${gradeColors.badge} text-lg px-4 py-1 mt-3`}>Grade: {finalScore.grade}</Badge>
              {passed ? (
                <p className="text-green-600 text-sm mt-2 font-medium">✓ Passed</p>
              ) : (
                <p className="text-red-600 text-sm mt-2 font-medium">Below pass mark ({selectedExam?.pass_mark || 40}%)</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <FileText className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p className="text-lg font-bold text-slate-700">{finalScore.answeredCount}/{finalScore.totalQuestions}</p>
                <p className="text-xs text-slate-500">Answered</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Clock className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p className="text-lg font-bold text-slate-700">{finalScore.timeTaken}m</p>
                <p className="text-xs text-slate-500">Time Taken</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Target className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p className="text-lg font-bold text-slate-700">{selectedExam?.pass_mark || 40}%</p>
                <p className="text-xs text-slate-500">Pass Mark</p>
              </div>
            </div>

            {/* Theory notice */}
            {finalScore.hasTheory && (
              <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-xl p-3 mb-6">
                <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Theory questions pending</p>
                  <p className="text-xs text-purple-600">Your teacher will grade the theory section. Your final score may change after grading.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link to="/StudentLMS" className="flex-1">
                <Button variant="outline" className="w-full"><ArrowLeft className="w-4 h-4 mr-2" />Back to LMS</Button>
              </Link>
              <Button onClick={() => { setSubmitted(false); setSelectedExam(null); loadData(); }} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                View Other Exams
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== ACTIVE EXAM VIEW =====
  if (examStarted && selectedExam) {
    const q = selectedExam.questions[currentQ];
    const totalQs = selectedExam.questions.length;
    const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
    const isLastQ = currentQ === totalQs - 1;
    const timePercent = (timeRemaining / (selectedExam.duration_minutes * 60)) * 100;
    const isLowTime = timeRemaining < 300;
    const isCriticalTime = timeRemaining < 60;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selectedExam.title}</h2>
                <p className="text-sm text-slate-500">{selectedExam.subject_name} • {answeredCount}/{totalQs} answered</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg transition-all ${
                isCriticalTime ? 'bg-red-100 text-red-700 animate-pulse' :
                isLowTime ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                <Clock className="w-5 h-5" />{formatTime(timeRemaining)}
              </div>
            </div>
            <Progress value={timePercent} className={`mt-2 h-1 ${isCriticalTime ? '[&>div]:bg-red-500' : isLowTime ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`} />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Question */}
            <div className="md:col-span-2">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        {currentQ + 1}
                      </div>
                      <Badge variant="outline" className="text-xs">{(q.options && q.options.filter(o => o && o.trim()).length > 0) ? 'Objective' : 'Theory'}</Badge>
                      <span className="text-sm text-slate-500">{q.marks} mark(s)</span>
                    </div>
                    <button
                      onClick={() => setFlagged(prev => ({ ...prev, [currentQ]: !prev[currentQ] }))}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${flagged[currentQ] ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      <Flag className="w-3 h-3" />{flagged[currentQ] ? 'Flagged' : 'Flag'}
                    </button>
                  </div>

                  <div className="text-base font-semibold mb-4 text-slate-800" dangerouslySetInnerHTML={{ __html: `Q${currentQ + 1}. ${q.question}` }} />
                  {q.image_url && <img src={q.image_url} alt="question" className="mb-4 max-w-full rounded-lg border" />}

                  {(q.options && q.options.filter(o => o && o.trim()).length > 0) ? (
                    <RadioGroup value={answers[currentQ]?.toString()} onValueChange={v => setAnswers({ ...answers, [currentQ]: parseInt(v) })}>
                      <div className="space-y-3">
                        {(q.options || []).filter(o => o !== undefined).map((opt, idx) => (
                          <div key={idx} onClick={() => setAnswers({ ...answers, [currentQ]: idx })}
                            className={`flex items-center space-x-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                              answers[currentQ] === idx ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}>
                            <RadioGroupItem value={idx.toString()} id={`opt-${currentQ}-${idx}`} />
                            <Label htmlFor={`opt-${currentQ}-${idx}`} className="flex-1 cursor-pointer text-sm">
                              <span className="font-semibold mr-2 text-indigo-600">{['A', 'B', 'C', 'D'][idx]}.</span>
                              <span dangerouslySetInnerHTML={{ __html: opt }} />
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <div>
                      <Label className="text-sm text-slate-600 mb-2 block">Type your answer below:</Label>
                      <Textarea
                        rows={6}
                        placeholder="Write your answer here..."
                        value={answers[currentQ] || ''}
                        onChange={e => setAnswers({ ...answers, [currentQ]: e.target.value })}
                        className="resize-none"
                      />
                    </div>
                  )}

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                      <ChevronLeft className="w-4 h-4 mr-1" />Previous
                    </Button>
                    {isLastQ ? (
                      <Button onClick={handleSubmitExam} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />Submit Exam
                      </Button>
                    ) : (
                      <Button onClick={() => setCurrentQ(currentQ + 1)} className="bg-indigo-600 hover:bg-indigo-700">
                        Next<ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Question Navigator */}
            <div>
              <Card className="border-0 shadow-md mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">Navigator</p>
                    <Progress value={(answeredCount / totalQs) * 100} className="w-16 h-2" />
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {selectedExam.questions.map((_, idx) => {
                      const isAnswered = answers[idx] !== undefined && answers[idx] !== '';
                      const isCurrent = idx === currentQ;
                      const isFlagged = flagged[idx];
                      return (
                        <button key={idx} onClick={() => setCurrentQ(idx)}
                          className={`w-full aspect-square rounded-lg text-xs font-bold border-2 transition-all relative ${
                            isCurrent ? 'border-indigo-600 bg-indigo-600 text-white' :
                            isAnswered ? 'border-green-400 bg-green-100 text-green-700' :
                            'border-slate-200 bg-slate-50 text-slate-600'
                          }`}>
                          {idx + 1}
                          {isFlagged && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-green-100 border border-green-400 rounded" />Answered</div>
                    <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-slate-50 border border-slate-200 rounded" />Unanswered</div>
                    <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-indigo-600 rounded" />Current</div>
                    <div className="flex items-center gap-2"><Flag className="w-3 h-3 text-red-500" />Flagged for review</div>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" onClick={() => setShowCalc(!showCalc)} className="w-full mb-3">
                <Calculator className="w-4 h-4 mr-2" />{showCalc ? 'Hide' : 'Show'} Calculator
              </Button>

              <Button onClick={handleSubmitExam} className="w-full bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />Submit Exam
              </Button>
            </div>
          </div>
        </div>

        {showCalc && <MiniCalculator onClose={() => setShowCalc(false)} />}
      </div>
    );
  }

  // ===== EXAM LIST =====
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/StudentLMS"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">CBT Exams & Assessments</h1>
            <p className="text-slate-500">Welcome, {student.first_name} {student.last_name} — {student.current_class}</p>
          </div>
        </div>

        {availableExams.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-700">No exams available right now</p>
              <p className="text-sm text-slate-500 mt-2">Check back later or contact your teacher</p>
              <Link to="/StudentLMS"><Button className="mt-4" variant="outline">Back to LMS</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {availableExams.map(exam => {
              const hasTheory = exam.questions?.some(q => !(q.options && q.options.filter(o => o && o.trim()).length > 0));
              return (
                <Card key={exam.id} className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-bold">{exam.title}</p>
                        <p className="text-sm text-white/80">{exam.subject_name}</p>
                      </div>
                      <Badge className="bg-white/20 text-white">Available</Badge>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" />
                        <div><p className="text-xs text-slate-500">Duration</p><p className="font-bold text-slate-700">{exam.duration_minutes} mins</p></div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div><p className="text-xs text-slate-500">Questions</p><p className="font-bold text-slate-700">{exam.questions?.length || 0}</p></div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
                        <Award className="w-5 h-5 text-slate-400" />
                        <div><p className="text-xs text-slate-500">Total Marks</p><p className="font-bold text-slate-700">{exam.total_marks}</p></div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
                        <Target className="w-5 h-5 text-slate-400" />
                        <div><p className="text-xs text-slate-500">Pass Mark</p><p className="font-bold text-slate-700">{exam.pass_mark}%</p></div>
                      </div>
                    </div>
                    {exam.instructions && <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800">{exam.instructions}</div>}
                    {hasTheory && <div className="flex items-center gap-1.5 p-2 bg-purple-50 rounded text-xs text-purple-700"><AlertCircle className="w-3 h-3" /> Includes theory questions (manual grading)</div>}
                    <Button onClick={() => handleStartExam(exam)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                      <Zap className="w-4 h-4 mr-2" />Start Exam
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
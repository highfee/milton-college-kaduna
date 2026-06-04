import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle, AlertCircle, BookOpen, Calculator, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ---- Mini Calculator ----
function MiniCalculator({ onClose }) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [reset, setReset] = useState(false);

  const handleNum = (n) => {
    if (reset) { setDisplay(String(n)); setReset(false); }
    else setDisplay(display === '0' ? String(n) : display + n);
  };
  const handleOp = (o) => {
    setPrev(parseFloat(display)); setOp(o); setReset(true);
  };
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
  const numClass = `${btnClass} bg-gray-100 hover:bg-gray-200`;
  const opClass = `${btnClass} bg-blue-100 text-blue-700 hover:bg-blue-200`;
  const eqClass = `${btnClass} bg-[#1e3a5f] text-white hover:bg-[#2c4a6e]`;

  return (
    <div className="fixed bottom-24 right-4 bg-white border rounded-xl shadow-2xl p-3 w-56 z-50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-gray-600">Calculator</span>
        <button onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
      </div>
      <div className="bg-gray-900 text-white text-right px-3 py-2 rounded mb-2 text-lg font-mono overflow-hidden">
        {display}
      </div>
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

export default function TakeCBT() {
  const [student, setStudent] = useState(null);
  const [availableExams, setAvailableExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [answers, setAnswers] = useState({}); // objective: index | theory: string
  const [currentQ, setCurrentQ] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalc, setShowCalc] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => { loadData(); }, []);

  // Countdown timer
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

    const now = new Date().toISOString();
    const allExams = await base44.entities.CBTExam.filter({ status: 'Published' });
    const available = allExams.filter(e =>
      e.classes?.includes(studentData.current_class) &&
      e.start_date <= now && e.end_date >= now
    );
    // Remove already taken
    const results = await base44.entities.CBTResult.filter({ student_id: studentData.id });
    const takenIds = results.map(r => r.exam_id);
    setAvailableExams(available.filter(e => !takenIds.includes(e.id)));
    setLoading(false);
  };

  const handleStartExam = (exam) => {
    setSelectedExam(exam);
    setTimeRemaining(exam.duration_minutes * 60);
    setAnswers({});
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
    const answersArray = exam.questions.map((q, idx) => {
      if (q.type === 'objective') {
        const sel = answers[idx];
        const correct = sel === q.correct_answer;
        if (correct) objScore += (q.marks || 1);
        return { question_index: idx, type: 'objective', selected_answer: sel, is_correct: correct };
      } else {
        return { question_index: idx, type: 'theory', theory_answer: answers[idx] || '', is_correct: null };
      }
    });

    const hasTheory = exam.questions.some(q => q.type === 'theory');
    const percentage = exam.total_marks > 0 ? ((objScore / exam.total_marks) * 100).toFixed(1) : '0';
    const grade = getGrade(parseFloat(percentage));

    await base44.entities.CBTResult.create({
      exam_id: exam.id,
      exam_title: exam.title,
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admission_number,
      class: student.current_class,
      answers: answersArray,
      score: objScore,
      total_marks: exam.total_marks,
      percentage,
      grade,
      time_taken_minutes: exam.duration_minutes - Math.floor(timeRemaining / 60),
      submitted_at: new Date().toISOString(),
      status: hasTheory ? 'Pending' : 'Graded',
      theory_graded: !hasTheory,
      auto_submitted: auto
    });

    setFinalScore({ score: objScore, total: exam.total_marks, percentage, grade, hasTheory });
    setExamStarted(false);
    setSubmitted(true);
    loadData();
  }, [selectedExam, answers, student, timeRemaining]);

  const handleSubmitExam = () => {
    const unanswered = selectedExam.questions.filter((_, i) => answers[i] === undefined).length;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Submit anyway?`
      : 'Submit exam now?';
    if (!confirm(msg)) return;
    doSubmit(false);
  };

  const getGrade = (pct) => {
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    if (pct >= 40) return 'E';
    return 'F';
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" /></div>;

  if (!student) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md"><CardContent className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-medium">Student record not found</p>
        <p className="text-sm text-gray-500 mt-2">Please log in via the Student Portal</p>
      </CardContent></Card>
    </div>
  );

  // Post-submission view
  if (submitted && finalScore) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{autoSubmitted ? 'Time Up! Auto-Submitted' : 'Exam Submitted!'}</h2>
          <p className="text-gray-500 mb-6">{selectedExam?.title}</p>
          <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-2">
            <p className="text-4xl font-bold text-[#1e3a5f]">{finalScore.score}/{finalScore.total}</p>
            <p className="text-2xl font-semibold text-gray-600">{finalScore.percentage}%</p>
            <Badge className={finalScore.grade === 'A' || finalScore.grade === 'B' ? 'bg-green-100 text-green-800 text-lg px-4 py-1' : 'bg-blue-100 text-blue-800 text-lg px-4 py-1'}>
              Grade: {finalScore.grade}
            </Badge>
            {finalScore.hasTheory && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded p-2 mt-3">
                This exam has theory questions. Your teacher will review and add theory marks soon.
              </p>
            )}
          </div>
          <Button onClick={() => { setSubmitted(false); setSelectedExam(null); }} className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]">
            Back to Exams
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Active exam view
  if (examStarted && selectedExam) {
    const q = selectedExam.questions[currentQ];
    const totalQs = selectedExam.questions.length;
    const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
    const isLastQ = currentQ === totalQs - 1;

    return (
      <div className="min-h-screen bg-gray-50 p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card className="mb-4 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selectedExam.title}</h2>
                  <p className="text-sm text-gray-500">{selectedExam.subject_name} • {answeredCount}/{totalQs} answered</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
                  <Clock className="w-5 h-5" />{formatTime(timeRemaining)}
                </div>
              </div>
              <Progress value={(answeredCount / totalQs) * 100} className="mt-3" />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Question */}
            <div className="md:col-span-2">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-xs">{q.type === 'theory' ? 'Theory' : 'Objective'}</Badge>
                    <span className="text-sm text-gray-500">{q.marks} mark(s)</span>
                  </div>
                  <h3 className="text-base font-semibold mb-4">Q{currentQ + 1}. {q.question}</h3>
                  {q.image_url && <img src={q.image_url} alt="question" className="mb-4 max-w-full rounded-lg border" />}

                  {q.type === 'objective' ? (
                    <RadioGroup value={answers[currentQ]?.toString()} onValueChange={v => setAnswers({ ...answers, [currentQ]: parseInt(v) })}>
                      <div className="space-y-3">
                        {q.options?.map((opt, idx) => (
                          <div key={idx} className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${answers[currentQ] === idx ? 'border-[#1e3a5f] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} />
                            <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer text-sm">
                              <span className="font-semibold mr-2">{['A', 'B', 'C', 'D'][idx]}.</span>{opt}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <div>
                      <Label className="text-sm text-gray-600 mb-2 block">Type your answer below:</Label>
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
                      <Button onClick={() => setCurrentQ(currentQ + 1)} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                        Next<ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Question Navigator + Calculator btn */}
            <div>
              <Card className="border-0 shadow-sm mb-4">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3 text-gray-700">Question Navigator</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {selectedExam.questions.map((_, idx) => {
                      const isAnswered = answers[idx] !== undefined && answers[idx] !== '';
                      const isCurrent = idx === currentQ;
                      return (
                        <button key={idx} onClick={() => setCurrentQ(idx)}
                          className={`w-full aspect-square rounded-lg text-xs font-bold border-2 transition-all ${
                            isCurrent ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white' :
                            isAnswered ? 'border-green-400 bg-green-100 text-green-700' :
                            'border-gray-200 bg-gray-50 text-gray-600'
                          }`}>
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex gap-3 text-xs text-gray-500">
                    <span><span className="inline-block w-3 h-3 bg-green-100 border border-green-400 rounded mr-1"></span>Answered</span>
                    <span><span className="inline-block w-3 h-3 bg-gray-50 border border-gray-200 rounded mr-1"></span>Unanswered</span>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" onClick={() => setShowCalc(!showCalc)} className="w-full">
                <Calculator className="w-4 h-4 mr-2" />{showCalc ? 'Hide' : 'Show'} Calculator
              </Button>
            </div>
          </div>
        </div>

        {showCalc && <MiniCalculator onClose={() => setShowCalc(false)} />}
      </div>
    );
  }

  // Exam list
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">CBT Exams & Assessments</h1>
          <p className="text-gray-500">Welcome, {student.first_name} {student.last_name} — {student.current_class}</p>
        </div>

        {availableExams.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">No exams available right now</p>
              <p className="text-sm text-gray-500 mt-2">Check back later or contact your teacher</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {availableExams.map(exam => {
              const hasTheory = exam.questions?.some(q => q.type === 'theory');
              return (
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
                      <div><p className="text-gray-500">Duration</p><p className="font-medium flex items-center gap-1"><Clock className="w-4 h-4" />{exam.duration_minutes} mins</p></div>
                      <div><p className="text-gray-500">Questions</p><p className="font-medium">{exam.questions?.length || 0} {hasTheory && <span className="text-xs text-purple-600">(incl. theory)</span>}</p></div>
                      <div><p className="text-gray-500">Total Marks</p><p className="font-medium">{exam.total_marks}</p></div>
                      <div><p className="text-gray-500">Pass Mark</p><p className="font-medium">{exam.pass_mark}</p></div>
                    </div>
                    {exam.instructions && <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800">{exam.instructions}</div>}
                    {hasTheory && <div className="p-2 bg-purple-50 rounded text-xs text-purple-700">⚠️ This exam includes theory questions that will be manually graded by your teacher.</div>}
                    <Button onClick={() => handleStartExam(exam)} className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                      Start Exam
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
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Clock, CheckCircle, AlertCircle, BookOpen, Calculator, X, ChevronLeft,
  ChevronRight, Flag, Award, Zap, TrendingUp, ArrowLeft, FileText, Target,
  Camera, Mic, Eye, EyeOff, ShieldAlert, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

// ===== Mini Calculator =====
function MiniCalculator({ onClose }) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [reset, setReset] = useState(false);
  const handleNum = (n) => { if (reset) { setDisplay(String(n)); setReset(false); } else setDisplay(display === '0' ? String(n) : display + n); };
  const handleOp = (o) => { setPrev(parseFloat(display)); setOp(o); setReset(true); };
  const handleEq = () => {
    if (prev === null || op === null) return;
    const cur = parseFloat(display);
    let result;
    if (op === '+') result = prev + cur; else if (op === '-') result = prev - cur;
    else if (op === '×') result = prev * cur; else if (op === '÷') result = cur !== 0 ? prev / cur : 'Error';
    setDisplay(String(result)); setPrev(null); setOp(null); setReset(true);
  };
  const handleDot = () => { if (!display.includes('.')) setDisplay(display + '.'); };
  const handleClear = () => { setDisplay('0'); setPrev(null); setOp(null); setReset(false); };
  const btnClass = "w-full h-10 rounded text-sm font-medium";
  return (
    <div className="fixed bottom-24 right-4 bg-white border rounded-xl shadow-2xl p-3 w-56 z-50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-600">Calculator</span>
        <button onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <div className="bg-slate-900 text-white text-right px-3 py-2 rounded mb-2 text-lg font-mono overflow-hidden">{display}</div>
      <div className="grid grid-cols-4 gap-1">
        {['7','8','9','÷','4','5','6','×','1','2','3','-','0','.','=','+'].map(k => (
          <button key={k} className={`${btnClass} ${k === '=' ? 'bg-indigo-600 text-white' : '+-×÷'.includes(k) ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}
            onClick={() => k === '=' ? handleEq() : '+-×÷'.includes(k) ? handleOp(k) : k === '.' ? handleDot() : handleNum(k)}>{k}
          </button>
        ))}
        <button className={`col-span-4 ${btnClass} bg-red-100 text-red-700`} onClick={handleClear}>C (Clear)</button>
      </div>
    </div>
  );
}

function isTheoryQuestion(q) {
  if (q.type === 'theory') return true;
  return !(q.options && q.options.filter(o => o && o.trim()).length > 0);
}

function getGrade(pct) {
  if (pct >= 80) return 'A'; if (pct >= 70) return 'B'; if (pct >= 60) return 'C';
  if (pct >= 50) return 'D'; if (pct >= 40) return 'E'; return 'F';
}

function getGradeColor(grade) {
  if (grade === 'A' || grade === 'B') return { text: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-100 text-green-800' };
  if (grade === 'C') return { text: 'text-blue-600', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' };
  if (grade === 'D' || grade === 'E') return { text: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' };
  return { text: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' };
}

const RULES = [
  "You must keep your face visible to the camera throughout the exam.",
  "Do not look away from the screen for more than 2 seconds.",
  "Do not speak or make sounds — the microphone is monitoring background noise.",
  "Do not open other browser tabs or windows.",
  "Any suspicious movement or sound will trigger an alert.",
  "After 2 violations you will be logged out. Your progress is saved.",
  "After 3 logouts, you will be permanently blocked from this exam.",
  "If blocked, contact your subject teacher or principal.",
  "All exams require a unique password provided by your teacher before starting. Each student has a different password.",
];

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

  // Malpractice
  const [phase, setPhase] = useState('rules'); // rules | camera_test | password | list | exam
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [micError, setMicError] = useState('');
  const [violationCount, setViolationCount] = useState(0);
  const [logoutCount, setLogoutCount] = useState(0);
  const [malpracticeRecord, setMalpracticeRecord] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [alarmMsg, setAlarmMsg] = useState('');
  const [showAlarm, setShowAlarm] = useState(false);
  const [examPassword, setExamPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [examToStart, setExamToStart] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceCheckRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const violationRef = useRef(0);
  const logoutCountRef = useRef(0);
  const alarmAudioRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!examStarted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { clearInterval(timer); if (!submittingRef.current) { setAutoSubmitted(true); doSubmit(true); } return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted]);

  // Face detection via visibility API and focus/blur
  useEffect(() => {
    if (!examStarted) return;
    const handleBlur = () => triggerViolation('Tab switch / window focus lost detected');
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) triggerViolation('You navigated away from the exam window');
    });
    return () => { window.removeEventListener('blur', handleBlur); };
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
      if (userData) { const res = await base44.entities.Student.filter({ parent_email: userData.email }); studentData = res[0] || null; }
    }
    if (!studentData) { setLoading(false); return; }
    setStudent(studentData);
    const allExams = await base44.entities.CBTExam.filter({ status: 'Published' });
    const results = await base44.entities.CBTResult.filter({ student_id: studentData.id });
    const malpracticeRecords = await base44.entities.CBTMalpractice.filter({ student_id: studentData.id });
    const takenIds = results.map(r => r.exam_id);
    const available = allExams.filter(e => {
      if (!e.classes?.includes(studentData.current_class)) return false;
      if (takenIds.includes(e.id)) return false;
      // Check if blocked for this exam
      const mal = malpracticeRecords.find(m => m.exam_id === e.id);
      if (mal?.is_blocked) return true; // show but will display blocked state
      return true;
    });
    setAvailableExams(available);
    setLoading(false);
    setPhase('rules');
  };

  const setupCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
      setMicReady(true);
    } catch (e) {
      setCameraError('Camera/Microphone access denied. You must allow camera and mic access to take the exam.');
    }
  };

  const startMicMonitoring = () => {
    if (!streamRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(streamRef.current);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastNoise = 0;
      const check = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > 30 && Date.now() - lastNoise > 5000) {
          lastNoise = Date.now();
          triggerViolation('Sound/noise detected near you');
        }
        faceCheckRef.current = requestAnimationFrame(check);
      };
      faceCheckRef.current = requestAnimationFrame(check);
    } catch (e) {}
  };

  const triggerViolation = useCallback((reason) => {
    violationRef.current = violationRef.current + 1;
    setViolationCount(violationRef.current);
    // Play alarm sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode); gainNode.connect(ctx.destination);
      osc.frequency.value = 880;
      gainNode.gain.value = 0.3;
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}

    const msg = `⚠️ MALPRACTICE DETECTED: ${reason}`;
    setAlarmMsg(msg);
    setShowAlarm(true);

    if (violationRef.current >= 2) {
      // Log out student — save progress first
      setTimeout(() => {
        logoutCountRef.current = logoutCountRef.current + 1;
        setLogoutCount(logoutCountRef.current);
        setShowAlarm(false);
        if (logoutCountRef.current >= 3 && selectedExam && student) {
          // Ban the student
          handleBanStudent(selectedExam.id);
        } else {
          // Force re-login, retain answers
          sessionStorage.setItem('cbt_retained_answers', JSON.stringify(answers));
          sessionStorage.setItem('cbt_retained_q', currentQ);
          sessionStorage.setItem('cbt_retained_exam', selectedExam?.id || '');
          sessionStorage.setItem('cbt_retained_time', timeRemaining);
          setExamStarted(false);
          setPhase('relogin');
        }
        violationRef.current = 0;
        setViolationCount(0);
      }, 3000);
    } else {
      setTimeout(() => setShowAlarm(false), 3000);
    }
  }, [answers, currentQ, selectedExam, student, timeRemaining]);

  const handleBanStudent = async (examId) => {
    if (!student) return;
    await base44.entities.CBTMalpractice.create({
      exam_id: examId,
      exam_title: selectedExam?.title || '',
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admission_number,
      class: student.current_class,
      is_blocked: true,
      violation_count: violationRef.current,
      logout_count: logoutCountRef.current,
      block_reason: 'Repeated malpractice violations detected by the system'
    });
    setIsBlocked(true);
    setExamStarted(false);
    setPhase('blocked');
    // Stop camera
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const handleVerifyPassword = async () => {
    setPasswordError('');
    if (!examToStart) return;
    // Check if blocked
    const malRecords = await base44.entities.CBTMalpractice.filter({ exam_id: examToStart.id, student_id: student.id });
    const malRecord = malRecords[0];
    if (malRecord?.is_blocked) {
      setPasswordError('You are blocked from this exam due to malpractice. Contact your teacher or principal.');
      return;
    }
    // Verify per-student unique password
    const pwdRecords = await base44.entities.CBTExamPassword.filter({ exam_id: examToStart.id, student_id: student.id });
    const pwdRecord = pwdRecords[0];
    if (!pwdRecord) {
      setPasswordError('No exam password has been assigned to you for this exam. Please contact your subject teacher.');
      return;
    }
    if (examPassword.trim().toUpperCase() !== pwdRecord.password.toUpperCase()) {
      setPasswordError('Incorrect exam password. Please ask your teacher for your unique password.');
      return;
    }
    // Check retained answers for re-login scenario
    const retainedExamId = sessionStorage.getItem('cbt_retained_exam');
    if (retainedExamId === examToStart.id) {
      const retainedAnswers = JSON.parse(sessionStorage.getItem('cbt_retained_answers') || '{}');
      const retainedQ = parseInt(sessionStorage.getItem('cbt_retained_q') || '0');
      const retainedTime = parseInt(sessionStorage.getItem('cbt_retained_time') || '0');
      setAnswers(retainedAnswers);
      setCurrentQ(retainedQ);
      setTimeRemaining(retainedTime || examToStart.duration_minutes * 60);
      sessionStorage.removeItem('cbt_retained_answers');
      sessionStorage.removeItem('cbt_retained_q');
      sessionStorage.removeItem('cbt_retained_exam');
      sessionStorage.removeItem('cbt_retained_time');
    } else {
      setAnswers({});
      setCurrentQ(0);
      setTimeRemaining(examToStart.duration_minutes * 60);
    }
    setSelectedExam(examToStart);
    setFlagged({});
    setExamStarted(true);
    setSubmitted(false);
    setFinalScore(null);
    setAutoSubmitted(false);
    submittingRef.current = false;
    violationRef.current = 0;
    setViolationCount(0);
    setPhase('exam');
    startMicMonitoring();
    // Mark this student's password as used
    if (pwdRecord) {
      base44.entities.CBTExamPassword.update(pwdRecord.id, { used: true }).catch(() => {});
    }
    setExamPassword('');
    setPasswordError('');
  };

  const doSubmit = useCallback(async (auto = false) => {
    if (submittingRef.current || !selectedExam) return;
    submittingRef.current = true;
    const exam = selectedExam;
    let objScore = 0;
    const answersArray = exam.questions.map((q, idx) => {
      const isObjective = !isTheoryQuestion(q);
      if (isObjective) {
        const sel = answers[idx];
        const correct = sel === q.correct_answer;
        if (correct) objScore += (q.marks || 1);
        return { question_index: idx, type: 'objective', selected_answer: sel, is_correct: correct };
      }
      return { question_index: idx, type: 'theory', theory_answer: answers[idx] || '', is_correct: null };
    });
    const hasTheory = exam.questions.some(q => isTheoryQuestion(q));
    const totalObjectiveMarks = exam.questions.filter(q => !isTheoryQuestion(q)).reduce((sum, q) => sum + (q.marks || 1), 0);
    const percentage = totalObjectiveMarks > 0 ? ((objScore / totalObjectiveMarks) * 100).toFixed(1) : '0';
    const grade = getGrade(parseFloat(percentage));
    const timeTaken = exam.duration_minutes - Math.floor(timeRemaining / 60);
    try {
      await base44.entities.CBTResult.create({
        exam_id: exam.id, exam_title: exam.title, exam_type: exam.exam_type,
        subject_name: exam.subject_name, teacher_email: exam.created_by,
        student_id: student.id, student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number, class: student.current_class,
        answers: answersArray, score: objScore, total_marks: exam.total_marks,
        percentage: parseFloat(percentage), grade, time_taken_minutes: timeTaken,
        submitted_at: new Date().toISOString(), status: hasTheory ? 'Pending' : 'Graded',
        theory_graded: !hasTheory, auto_submitted: auto
      });
      base44.functions.invoke('sendSubmissionNotification', {
        type: 'cbt', exam_id: exam.id, student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number, title: exam.title,
        class_name: student.current_class, score: objScore, total_marks: exam.total_marks, has_theory: hasTheory
      }).catch(() => {});
    } catch (err) {}
    // Stop camera
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (faceCheckRef.current) { cancelAnimationFrame(faceCheckRef.current); }
    setFinalScore({ score: objScore, total: exam.total_marks, objectiveTotal: totalObjectiveMarks, percentage, grade, hasTheory, timeTaken, autoSubmitted: auto, answeredCount: Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length, totalQuestions: exam.questions.length });
    setExamStarted(false); setSubmitted(true);
  }, [selectedExam, answers, student, timeRemaining]);

  const handleSubmitExam = () => {
    const unanswered = selectedExam.questions.filter((_, i) => answers[i] === undefined).length;
    const msg = unanswered > 0 ? `You have ${unanswered} unanswered question(s). Submit anyway?` : 'Submit exam now?';
    if (!confirm(msg)) return;
    doSubmit(false);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;

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

  // ===== BLOCKED SCREEN =====
  if (phase === 'blocked' || isBlocked) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
      <Card className="max-w-md border-0 shadow-xl">
        <div className="bg-red-600 rounded-t-xl p-6 text-center text-white">
          <ShieldAlert className="w-16 h-16 mx-auto mb-2" />
          <h2 className="text-2xl font-bold">Exam Access Blocked</h2>
        </div>
        <CardContent className="p-6 text-center">
          <p className="text-gray-700 mb-4">You have been blocked from this exam due to <strong>repeated malpractice violations</strong>.</p>
          <p className="text-gray-600 text-sm mb-4">Please contact your <strong>subject teacher</strong> or <strong>principal</strong> for further instructions.</p>
          <p className="text-xs text-gray-400">Note: If you are unblocked, you will start the exam from the beginning and lose previously chosen answers.</p>
          <Link to="/StudentPortal"><Button className="mt-4 w-full bg-red-600 hover:bg-red-700">Return to Portal</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  // ===== RE-LOGIN SCREEN (after malpractice logout) =====
  if (phase === 'relogin') return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-4">
      <Card className="max-w-md border-0 shadow-xl">
        <div className="bg-orange-500 rounded-t-xl p-6 text-center text-white">
          <ShieldAlert className="w-16 h-16 mx-auto mb-2" />
          <h2 className="text-2xl font-bold">Malpractice Detected!</h2>
          <p className="text-white/80">You have been logged out of the exam.</p>
        </div>
        <CardContent className="p-6">
          <p className="text-gray-700 mb-4 text-sm">Your progress has been saved. You have <strong>{logoutCount}/2 logouts</strong>. A third logout will permanently block you from this exam.</p>
          <p className="text-gray-600 text-sm mb-4 font-medium">Re-enter the exam password to continue from where you stopped. The timer continued while you were away.</p>
          <Input type="password" value={examPassword} onChange={e => setExamPassword(e.target.value)} placeholder="Enter exam password" className="mb-3" />
          {passwordError && <p className="text-red-500 text-sm mb-3">{passwordError}</p>}
          <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleVerifyPassword}>
            <Lock className="w-4 h-4 mr-2" />Continue Exam
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ===== RULES SCREEN =====
  if (phase === 'rules') return (
    <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-6 text-center text-white">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">CBT Exam — Rules & Conditions</h1>
          <p className="text-white/80 mt-1">Read carefully before proceeding</p>
        </div>
        <CardContent className="p-6">
          <ul className="space-y-3 mb-6">
            {RULES.map((rule, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                <span className="text-sm text-gray-700">{rule}</span>
              </li>
            ))}
          </ul>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm font-semibold">⚠️ This exam system monitors camera and microphone in real-time. Any malpractice will be logged and reported to your teacher.</p>
          </div>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-3" onClick={() => { setPhase('camera_test'); setupCamera(); }}>
            <Camera className="w-5 h-5 mr-2" />I Understand — Test Camera & Microphone
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ===== CAMERA TEST SCREEN =====
  if (phase === 'camera_test') return (
    <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 to-emerald-700 p-6 text-center text-white">
          <Camera className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Camera & Microphone Test</h1>
          <p className="text-white/80 mt-1">Ensure your camera and mic are working before starting</p>
        </div>
        <CardContent className="p-6 space-y-4">
          {cameraError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{cameraError}</p>
              <Button className="mt-2 bg-red-600 hover:bg-red-700" onClick={setupCamera}>Retry</Button>
            </div>
          )}
          <div className="bg-black rounded-xl overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg text-center ${cameraReady ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
              <Camera className={`w-6 h-6 mx-auto mb-1 ${cameraReady ? 'text-green-600' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${cameraReady ? 'text-green-700' : 'text-gray-500'}`}>{cameraReady ? '✓ Camera Active' : 'Camera Not Ready'}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${micReady ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
              <Mic className={`w-6 h-6 mx-auto mb-1 ${micReady ? 'text-green-600' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${micReady ? 'text-green-700' : 'text-gray-500'}`}>{micReady ? '✓ Microphone Active' : 'Mic Not Ready'}</p>
            </div>
          </div>
          {cameraReady && micReady && (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-3" onClick={() => setPhase('list')}>
              <CheckCircle className="w-5 h-5 mr-2" />Camera & Mic Working — View Available Exams
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ===== EXAM LIST =====
  if (phase === 'list' || (!examStarted && !submitted && phase !== 'password')) {
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

          {/* Camera live indicator */}
          {cameraReady && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-700 font-medium">Camera & Microphone active — Malpractice monitoring is ON</span>
              <video ref={videoRef} autoPlay muted playsInline className="w-16 h-12 object-cover rounded ml-auto" />
            </div>
          )}

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
                const hasTheory = exam.questions?.some(q => isTheoryQuestion(q));
                return (
                  <Card key={exam.id} className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
                      <div className="flex items-start justify-between">
                        <div><p className="text-lg font-bold">{exam.title}</p><p className="text-sm text-white/80">{exam.subject_name}</p></div>
                        <Badge className="bg-white/20 text-white">Available</Badge>
                      </div>
                    </div>
                    <CardContent className="p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-500">Duration</p><p className="font-bold text-slate-700">{exam.duration_minutes} mins</p></div></div>
                        <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-500">Questions</p><p className="font-bold text-slate-700">{exam.questions?.length || 0}</p></div></div>
                        <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2"><Award className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-500">Total Marks</p><p className="font-bold text-slate-700">{exam.total_marks}</p></div></div>
                        <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2"><Target className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-500">Pass Mark</p><p className="font-bold text-slate-700">{exam.pass_mark}%</p></div></div>
                      </div>
                      {exam.instructions && <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800" dangerouslySetInnerHTML={{ __html: exam.instructions }} />}
                      {hasTheory && <div className="flex items-center gap-1.5 p-2 bg-purple-50 rounded text-xs text-purple-700"><AlertCircle className="w-3 h-3" />Includes theory questions (manual grading)</div>}
                      <div className="flex items-center gap-1.5 p-2 bg-yellow-50 rounded text-xs text-yellow-700"><Lock className="w-3 h-3" />Unique password required — ask your teacher</div>
                      <Button onClick={() => { setExamToStart(exam); setPhase('password'); }} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
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

  // ===== PASSWORD ENTRY =====
  if (phase === 'password' && examToStart) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full border-0 shadow-xl">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-center text-white">
          <Lock className="w-12 h-12 mx-auto mb-2" />
          <h2 className="text-xl font-bold">Enter Exam Password</h2>
          <p className="text-white/80 text-sm mt-1">{examToStart.title}</p>
        </div>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Your teacher will provide your <strong>unique exam password</strong> after you are seated and ready. Each student has a different password — do not share yours.</p>
          <div>
            <Label>Exam Password *</Label>
            <Input type="password" value={examPassword} onChange={e => setExamPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} placeholder="Enter password" className="mt-1" />
          </div>
          {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleVerifyPassword}>
            <CheckCircle className="w-4 h-4 mr-2" />Start Exam
          </Button>
          <Button variant="outline" className="w-full" onClick={() => { setPhase('list'); setExamToStart(null); setExamPassword(''); setPasswordError(''); }}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ===== INSTANT RESULTS SCREEN =====
  if (submitted && finalScore) {
    const examEnded = !selectedExam?.end_date || new Date(selectedExam.end_date) <= new Date();
    const hasTheory = selectedExam?.questions?.some(q => isTheoryQuestion(q));
    if (!examEnded || hasTheory) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-center text-white">
              <CheckCircle className="w-16 h-16 mx-auto mb-2" /><h2 className="text-2xl font-bold">Exam Submitted!</h2><p className="text-white/80">{selectedExam?.title}</p>
            </div>
            <CardContent className="p-6">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Results Pending</p>
                  <p className="text-xs text-amber-600 mt-1">{hasTheory ? 'This exam contains theory questions that require manual grading by your teacher.' : 'Your results will be available once the exam window closes.'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link to="/StudentLMS" className="flex-1"><Button variant="outline" className="w-full"><ArrowLeft className="w-4 h-4 mr-2" />Back to LMS</Button></Link>
                <Button onClick={() => { setSubmitted(false); setSelectedExam(null); setPhase('list'); loadData(); }} className="flex-1 bg-indigo-600 hover:bg-indigo-700">View Other Exams</Button>
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
          <div className={`bg-gradient-to-r ${passed ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-red-500'} p-6 text-center text-white`}>
            {finalScore.autoSubmitted ? <><Clock className="w-16 h-16 mx-auto mb-2" /><h2 className="text-2xl font-bold">Time's Up!</h2><p className="text-white/80">Your exam was auto-submitted</p></> : <><CheckCircle className="w-16 h-16 mx-auto mb-2" /><h2 className="text-2xl font-bold">Exam Submitted!</h2><p className="text-white/80">{selectedExam?.title}</p></>}
          </div>
          <CardContent className="p-6">
            <div className={`text-center mb-6 ${gradeColors.bg} rounded-2xl p-6`}>
              <p className={`text-5xl font-bold ${gradeColors.text}`}>{finalScore.percentage}%</p>
              <p className="text-slate-600 mt-1">Score: {finalScore.score}/{finalScore.objectiveTotal}</p>
              <Badge className={`${gradeColors.badge} text-lg px-4 py-1 mt-3`}>Grade: {finalScore.grade}</Badge>
              {passed ? <p className="text-green-600 text-sm mt-2 font-medium">✓ Passed</p> : <p className="text-red-600 text-sm mt-2 font-medium">Below pass mark ({selectedExam?.pass_mark || 40}%)</p>}
            </div>
            <div className="flex gap-3">
              <Link to="/StudentLMS" className="flex-1"><Button variant="outline" className="w-full"><ArrowLeft className="w-4 h-4 mr-2" />Back to LMS</Button></Link>
              <Button onClick={() => { setSubmitted(false); setSelectedExam(null); setPhase('list'); loadData(); }} className="flex-1 bg-indigo-600 hover:bg-indigo-700">View Other Exams</Button>
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
        {/* Malpractice Alarm */}
        {showAlarm && (
          <div className="fixed inset-0 z-50 bg-red-500/90 flex items-center justify-center p-4 animate-pulse">
            <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
              <ShieldAlert className="w-20 h-20 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-700 mb-2">MALPRACTICE ALERT!</h2>
              <p className="text-gray-700">{alarmMsg}</p>
              <p className="text-sm text-gray-500 mt-3">Violation {violationRef.current} of 2. Third violation = logout.</p>
            </div>
          </div>
        )}

        {/* Camera indicator */}
        <div className="fixed top-2 right-2 z-40">
          {videoRef.current && cameraReady && <video ref={videoRef} autoPlay muted playsInline className="w-20 h-16 rounded-lg border-2 border-green-500 shadow-lg object-cover" />}
          <div className={`mt-1 text-xs text-center px-2 py-0.5 rounded-full ${violationCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {violationCount > 0 ? `⚠ ${violationCount} violation(s)` : '● Monitored'}
          </div>
        </div>

        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div><h2 className="text-lg font-bold text-slate-800">{selectedExam.title}</h2><p className="text-sm text-slate-500">{selectedExam.subject_name} • {answeredCount}/{totalQs} answered</p></div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg transition-all ${isCriticalTime ? 'bg-red-100 text-red-700 animate-pulse' : isLowTime ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                <Clock className="w-5 h-5" />{formatTime(timeRemaining)}
              </div>
            </div>
            <Progress value={timePercent} className={`mt-2 h-1 ${isCriticalTime ? '[&>div]:bg-red-500' : isLowTime ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`} />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">{currentQ + 1}</div>
                      <Badge variant="outline" className="text-xs">{isTheoryQuestion(q) ? 'Theory' : 'Objective'}</Badge>
                      <span className="text-sm text-slate-500">{q.marks} mark(s)</span>
                    </div>
                    <button onClick={() => setFlagged(prev => ({ ...prev, [currentQ]: !prev[currentQ] }))} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${flagged[currentQ] ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                      <Flag className="w-3 h-3" />{flagged[currentQ] ? 'Flagged' : 'Flag'}
                    </button>
                  </div>
                  <div className="text-base font-semibold mb-4 text-slate-800" dangerouslySetInnerHTML={{ __html: `Q${currentQ + 1}. ${q.question}` }} />
                  {q.image_url && <img src={q.image_url} alt="question" className="mb-4 max-w-full rounded-lg border" />}
                  {!isTheoryQuestion(q) ? (
                    <RadioGroup value={answers[currentQ]?.toString()} onValueChange={v => setAnswers({ ...answers, [currentQ]: parseInt(v) })}>
                      <div className="space-y-3">
                        {(q.options || []).filter(o => o !== undefined).map((opt, idx) => (
                          <div key={idx} onClick={() => setAnswers({ ...answers, [currentQ]: idx })} className={`flex items-center space-x-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${answers[currentQ] === idx ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
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
                      <Textarea rows={6} placeholder="Write your answer here..." value={answers[currentQ] || ''} onChange={e => setAnswers({ ...answers, [currentQ]: e.target.value })} className="resize-none" />
                    </div>
                  )}
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}><ChevronLeft className="w-4 h-4 mr-1" />Previous</Button>
                    {isLastQ ? (
                      <Button onClick={handleSubmitExam} className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />Submit Exam</Button>
                    ) : (
                      <Button onClick={() => setCurrentQ(currentQ + 1)} className="bg-indigo-600 hover:bg-indigo-700">Next<ChevronRight className="w-4 h-4 ml-1" /></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                        <button key={idx} onClick={() => setCurrentQ(idx)} className={`w-full aspect-square rounded-lg text-xs font-bold border-2 transition-all relative ${isCurrent ? 'border-indigo-600 bg-indigo-600 text-white' : isAnswered ? 'border-green-400 bg-green-100 text-green-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {idx + 1}
                          {isFlagged && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Button variant="outline" onClick={() => setShowCalc(!showCalc)} className="w-full mb-3"><Calculator className="w-4 h-4 mr-2" />{showCalc ? 'Hide' : 'Show'} Calculator</Button>
              <Button onClick={handleSubmitExam} className="w-full bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />Submit Exam</Button>
            </div>
          </div>
        </div>
        {showCalc && <MiniCalculator onClose={() => setShowCalc(false)} />}
      </div>
    );
  }

  return null;
}
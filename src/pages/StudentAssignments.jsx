import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, BookOpen, Send, CheckCircle, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StudentAssignments() {
  const navigate = useNavigate();
  const admNo = sessionStorage.getItem('student_portal_adm');

  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'Assignment', 'Homework'

  useEffect(() => {
    if (!admNo) { navigate('/StudentPortal'); return; }
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const studentData = await base44.entities.Student.filter({ admission_number: admNo });
    if (!studentData[0]) { navigate('/StudentPortal'); return; }
    setStudent(studentData[0]);
    const [allAssgns, subs] = await Promise.all([
      base44.entities.Assignment.filter({ class: studentData[0].current_class }),
      base44.entities.AssignmentSubmission.filter({ student_id: studentData[0].id })
    ]);
    // Show Active assignments or those without an explicit status set
    setAssignments(allAssgns.filter(a => !a.status || a.status === 'Active'));
    const subMap = {};
    subs.forEach(s => { subMap[s.assignment_id] = s; });
    setSubmissions(subMap);
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    await base44.entities.AssignmentSubmission.create({
      assignment_id: selected.id,
      assignment_title: selected.title,
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admission_number,
      class: student.current_class,
      submission_text: answer,
      file_url: fileUrl,
      submitted_date: new Date().toISOString().split('T')[0],
      status: 'Submitted'
    });
    setSubmissions(prev => ({ ...prev, [selected.id]: { status: 'Submitted' } }));
    setSubmitting(false);
    setSubmitted(true);
    setAnswer(''); setFileUrl('');
    // Notify teacher of submission
    base44.functions.invoke('sendSubmissionNotification', {
      type: 'assignment',
      assignment_id: selected.id,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admission_number,
      title: selected.title,
      class_name: student.current_class
    }).catch(() => {});
    setTimeout(() => { setSubmitted(false); setSelected(null); }, 2000);
  };

  const filtered = assignments.filter(a => filter === 'all' || a.type === filter);
  const isOverdue = (a) => a.due_date && new Date(a.due_date) < new Date();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full"></div>
    </div>
  );

  if (selected) return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" onClick={() => { setSelected(null); setAnswer(''); setFileUrl(''); }}>← Back</Button>
          <h2 className="text-xl font-bold">{selected.title}</h2>
          <Badge className={selected.type === 'Assignment' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>{selected.type}</Badge>
        </div>

        {submissions[selected.id] ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-700">Already Submitted!</h3>
              <p className="text-gray-500 mt-2">You have already submitted this {selected.type.toLowerCase()}.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Due: {selected.due_date || 'No deadline'}</span>
                {isOverdue(selected) && <Badge className="bg-red-100 text-red-700 text-xs">Overdue</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected.content && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 mb-1">Instructions:</p>
                  <p className="text-sm text-blue-700">{selected.content}</p>
                </div>
              )}
              {selected.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{selected.description}</p>
                </div>
              )}
              {selected.attachment_url && (
                <a href={selected.attachment_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><BookOpen className="w-4 h-4 mr-2" /> View Attachment</Button>
                </a>
              )}
              <div>
                <Label>Your Answer / Response</Label>
                <Textarea rows={6} placeholder="Type your answer here..." value={answer} onChange={e => setAnswer(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Upload File (optional)</Label>
                <input type="file" className="mt-1 block text-sm text-gray-600" onChange={handleFileUpload} />
                {uploading && <p className="text-xs text-blue-600 mt-1">Uploading...</p>}
                {fileUrl && <p className="text-xs text-green-600 mt-1">✓ File uploaded</p>}
              </div>
              {submitted && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-green-600" /><p className="text-green-700 text-sm">Submitted successfully!</p>
                </div>
              )}
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSubmit}
                disabled={submitting || (!answer.trim() && !fileUrl) || submitted}>
                <Send className="w-4 h-4 mr-2" />{submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 text-white px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/StudentPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
          <ClipboardList className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Assignments & Homework</h1>
            <p className="text-white/80 text-sm">{student?.first_name} — {student?.current_class}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-4">
          {['all', 'Assignment', 'Homework'].map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm"
              onClick={() => setFilter(f)} className={filter === f ? 'bg-green-600' : ''}>
              {f === 'all' ? 'All' : f}
            </Button>
          ))}
          <span className="ml-auto text-sm text-gray-500 self-center">{filtered.length} items</span>
        </div>

        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No {filter === 'all' ? 'assignments or homework' : filter.toLowerCase()} available for your class.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const done = !!submissions[a.id];
              const overdue = isOverdue(a);
              return (
                <Card key={a.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.type === 'Assignment' ? 'bg-blue-100' : 'bg-green-100'}`}>
                      {a.type === 'Assignment' ? <BookOpen className="w-5 h-5 text-blue-600" /> : <ClipboardList className="w-5 h-5 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800">{a.title}</p>
                        <Badge className={a.type === 'Assignment' ? 'bg-blue-100 text-blue-700 text-xs' : 'bg-green-100 text-green-700 text-xs'}>{a.type}</Badge>
                        {done && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Submitted</Badge>}
                        {!done && overdue && <Badge className="bg-red-100 text-red-700 text-xs">Overdue</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{a.subject_name} · Due: {a.due_date || 'No deadline'} · Marks: {a.total_marks || 'N/A'}</p>
                      {a.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.description}</p>}
                    </div>
                    <Button size="sm" variant={done ? 'outline' : 'default'}
                      className={done ? '' : 'bg-green-600 hover:bg-green-700'}
                      onClick={() => setSelected(a)}>
                      {done ? 'View' : 'Take'}
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
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Video, Plus, Radio, CheckCircle, Clock, Play, Download,
  VideoOff, Calendar, Users, X, Mic, MicOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function OnlineMeeting() {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [inMeeting, setInMeeting] = useState(null);

  // Create form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [meetingPasscode, setMeetingPasscode] = useState('');
  const [targetAudience, setTargetAudience] = useState('All');
  const [creating, setCreating] = useState(false);

  // Recording form
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingMeetingId, setRecordingMeetingId] = useState(null);

  const detectUser = useCallback(async () => {
    const pid = sessionStorage.getItem('parent_portal_pid');
    if (pid) {
      const parents = await base44.entities.Parent.filter({ parent_id: pid });
      if (parents[0]) return { name: parents[0].full_name, role: 'parent' };
    }
    const staffId = sessionStorage.getItem('teacher_portal_staff_id') || sessionStorage.getItem('ht_portal_staff_id') || sessionStorage.getItem('principal_portal_staff_id');
    if (staffId) {
      const teachers = await base44.entities.Teacher.filter({ staff_id: staffId });
      if (teachers[0]) return { name: `${teachers[0].first_name} ${teachers[0].last_name}`, role: teachers[0].teacher_type === 'Principal' ? 'principal' : 'staff' };
    }
    if (sessionStorage.getItem('accountant_portal_logged_in') === 'true') {
      const accData = JSON.parse(sessionStorage.getItem('accountant_data') || '{}');
      return { name: `${accData.first_name} ${accData.last_name}`, role: 'accountant' };
    }
    try {
      const userData = await base44.auth.me();
      if (userData) { setIsAdmin(userData.role === 'admin'); return { name: userData.full_name, role: 'admin' }; }
    } catch (e) {}
    return null;
  }, []);

  const loadMeetings = useCallback(async () => {
    const data = await base44.entities.Meeting.list('-created_date', 100);
    setMeetings(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      const u = await detectUser();
      setUser(u);
      await loadMeetings();
      setLoading(false);
    };
    init();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !meetingUrl.trim()) return;
    setCreating(true);
    await base44.entities.Meeting.create({
      title: title.trim(), description: description.trim(),
      meeting_url: meetingUrl.trim(), meeting_id: meetingId.trim(), meeting_passcode: meetingPasscode.trim(),
      created_by: user?.name, created_name: user?.name,
      start_time: new Date().toISOString(), status: 'Live', target_audience: targetAudience
    });
    setTitle(''); setDescription(''); setMeetingUrl(''); setMeetingId(''); setMeetingPasscode(''); setTargetAudience('All');
    setCreating(false); setShowCreate(false);
    loadMeetings();
  };

  const handleEndMeeting = async (meeting) => {
    await base44.entities.Meeting.update(meeting.id, { status: 'Ended', end_time: new Date().toISOString() });
    loadMeetings();
  };

  const handleSaveRecording = async () => {
    if (!recordingUrl.trim() || !recordingMeetingId) return;
    await base44.entities.Meeting.update(recordingMeetingId, { recording_url: recordingUrl.trim() });
    setRecordingUrl(''); setRecordingMeetingId(null);
    loadMeetings();
  };

  const liveMeetings = meetings.filter(m => m.status === 'Live');
  const scheduledMeetings = meetings.filter(m => m.status === 'Scheduled');
  const endedMeetings = meetings.filter(m => m.status === 'Ended');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (inMeeting) {
    return <MeetingRoom meeting={inMeeting} user={user} onExit={() => setInMeeting(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-blue-700 to-cyan-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
            <Video className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">PTA Online Meeting</h1>
              <p className="text-xs text-white/80">{user?.name} · {user?.role}</p>
            </div>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Initiate Meeting</span>
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Live Meetings Banner */}
        {liveMeetings.length > 0 && (
          <Card className="border-0 shadow-md bg-gradient-to-r from-red-500 to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Radio className="w-6 h-6 animate-pulse" />
                <h2 className="text-lg font-bold">Live Meeting In Progress!</h2>
              </div>
              {liveMeetings.map(m => (
                <div key={m.id} className="bg-white/10 rounded-lg p-4 mt-2">
                  <p className="font-bold text-lg">{m.title}</p>
                  {m.description && <p className="text-sm text-white/90 mt-1">{m.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <Badge className="bg-white/20 text-white border-0">{m.target_audience}</Badge>
                    {m.meeting_id && <span className="text-sm text-white/90">Meeting ID: {m.meeting_id}</span>}
                    {m.meeting_passcode && <span className="text-sm text-white/90">Passcode: {m.meeting_passcode}</span>}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <a href={m.meeting_url} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-white text-red-600 hover:bg-gray-100 font-bold">
                        <Play className="w-4 h-4 mr-2" /> Join Meeting
                      </Button>
                    </a>
                    <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => setInMeeting(m)}>
                      <Video className="w-4 h-4 mr-2" /> In-App View
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" className="text-white hover:bg-white/20 ml-auto" onClick={() => handleEndMeeting(m)}>
                        <VideoOff className="w-4 h-4 mr-2" /> End Meeting
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Scheduled */}
        {scheduledMeetings.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /> Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scheduledMeetings.map(m => (
                <div key={m.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.start_time ? new Date(m.start_time).toLocaleString() : 'Date TBA'} · {m.target_audience}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Past Meetings with Recordings */}
        {endedMeetings.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Past Meetings & Recordings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {endedMeetings.map(m => (
                <div key={m.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-800">{m.title}</p>
                      <p className="text-xs text-gray-500">{m.created_name} · {m.start_time ? new Date(m.start_time).toLocaleDateString() : ''}</p>
                    </div>
                    <Badge className="bg-gray-100 text-gray-600">Ended</Badge>
                  </div>
                  {m.recording_url ? (
                    <div className="flex items-center gap-2 mt-2">
                      <a href={m.recording_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300">
                          <Play className="w-4 h-4 mr-1" /> Watch Recording
                        </Button>
                      </a>
                      <a href={m.recording_url} download target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost"><Download className="w-4 h-4 mr-1" /> Download</Button>
                      </a>
                    </div>
                  ) : isAdmin ? (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => { setRecordingMeetingId(m.id); setRecordingUrl(''); }}>
                      <Plus className="w-3 h-3 mr-1" /> Add Recording URL
                    </Button>
                  ) : (
                    <p className="text-xs text-gray-400 mt-2">Recording will be available soon.</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {meetings.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center text-gray-400">
              <Video className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>No meetings scheduled. {isAdmin && 'Click "Initiate Meeting" to start a PTA meeting.'}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Meeting Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Video className="w-5 h-5 text-blue-600" /> Initiate PTA Meeting</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label>Meeting Title *</Label>
                <Input placeholder="e.g. PTA General Meeting" value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Meeting agenda..." value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Zoom Meeting Link *</Label>
                <Input placeholder="https://zoom.us/j/..." value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Meeting ID</Label>
                  <Input placeholder="123 456 7890" value={meetingId} onChange={e => setMeetingId(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Passcode</Label>
                  <Input placeholder="Meeting passcode" value={meetingPasscode} onChange={e => setMeetingPasscode(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All (Parents & Staff)</SelectItem>
                    <SelectItem value="Parents">Parents Only</SelectItem>
                    <SelectItem value="Staff">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-medium">Note:</p>
                <p>Create the meeting in Zoom first, then paste the link here. All {targetAudience.toLowerCase()} will see a "Join Meeting" button on their portal.</p>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreate} disabled={creating || !title.trim() || !meetingUrl.trim()}>
                {creating ? 'Creating...' : 'Start Live Meeting'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recording URL Dialog */}
      {recordingMeetingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRecordingMeetingId(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Add Meeting Recording</h3>
              <Button variant="ghost" size="icon" onClick={() => setRecordingMeetingId(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-4 space-y-3">
              <Label>Recording Video URL</Label>
              <Input placeholder="https://... (Zoom cloud recording link)" value={recordingUrl} onChange={e => setRecordingUrl(e.target.value)} />
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSaveRecording} disabled={!recordingUrl.trim()}>
                Save Recording
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// In-app meeting view with chat
function MeetingRoom({ meeting, user, onExit }) {
  const [muted, setMuted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const msgs = await base44.entities.ChatMessage.filter({ conversation_id: `MEETING_${meeting.id}` });
      setChatMessages(msgs);
    };
    load();
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data.conversation_id === `MEETING_${meeting.id}`) {
        setChatMessages(prev => [...prev, event.data]);
      }
    });
    return unsubscribe;
  }, [meeting.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || !user) return;
    await base44.entities.ChatMessage.create({
      conversation_id: `MEETING_${meeting.id}`,
      sender_id: user.name, sender_name: user.name, sender_role: user.role,
      content: chatInput.trim(), message_type: 'text', is_broadcast: false, read: false
    });
    setChatInput('');
  };

  const toggleMute = () => {
    setMuted(!muted);
    // Note: actual microphone control is in the external Zoom meeting
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={onExit}><ArrowLeft className="w-4 h-4 mr-1" /> Leave</Button>
          <Radio className="w-5 h-5 text-red-500 animate-pulse" />
          <span className="font-semibold">{meeting.title}</span>
        </div>
        <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-green-600 hover:bg-green-700"><Play className="w-4 h-4 mr-1" /> Open in Zoom</Button>
        </a>
      </div>

      <div className="flex-1 flex">
        {/* Video area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <Video className="w-24 h-24 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold mb-2">{meeting.title}</p>
            <p className="text-sm text-slate-400 mb-4">Click "Open in Zoom" to join the video meeting</p>
            {meeting.meeting_id && <p className="text-sm text-slate-300">Meeting ID: {meeting.meeting_id}</p>}
            {meeting.meeting_passcode && <p className="text-sm text-slate-300">Passcode: {meeting.meeting_passcode}</p>}
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant={muted ? "destructive" : "secondary"} size="icon" className="rounded-full h-12 w-12" onClick={toggleMute}>
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="w-80 bg-slate-800 flex flex-col border-l border-slate-700">
          <div className="p-3 border-b border-slate-700">
            <p className="text-white font-semibold text-sm">In-Meeting Chat</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No messages yet.</p>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender_name === user?.name ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.sender_name === user?.name ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-100'}`}>
                    {msg.sender_name !== user?.name && <p className="text-xs font-semibold text-blue-400 mb-0.5">{msg.sender_name}</p>}
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-slate-700 flex gap-2">
            <Input
              placeholder="Type message..." value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
              className="bg-slate-700 border-slate-600 text-white text-sm"
            />
            <Button size="icon" className="bg-blue-600 hover:bg-blue-700 h-9 w-9" onClick={sendChat}><ArrowLeft className="w-4 h-4 rotate-180" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
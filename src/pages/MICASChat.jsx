import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, Users, Circle, Megaphone, MessageCircle, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';

const playSound = (isSent) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = isSent ? 600 : 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
};

const getConversationId = (id1, id2) => [id1, id2].sort().join('_');

export default function MICASChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [presence, setPresence] = useState({});
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('All');
  const [view, setView] = useState('contacts');
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef(null);
  const heartbeatRef = useRef(null);
  const currentUserRef = useRef(null);
  const selectedContactRef = useRef(null);

  // Detect current user from portal sessions
  const detectUser = useCallback(async () => {
    // Parent
    const parentPid = sessionStorage.getItem('parent_portal_pid');
    if (parentPid) {
      const parents = await base44.entities.Parent.filter({ parent_id: parentPid });
      if (parents[0]) return { id: parents[0].id, name: parents[0].full_name, role: 'parent', record: parents[0] };
    }

    // Teacher / Head Teacher / Principal
    const staffId = sessionStorage.getItem('teacher_portal_staff_id') || sessionStorage.getItem('ht_portal_staff_id') || sessionStorage.getItem('principal_portal_staff_id');
    if (staffId) {
      const teachers = await base44.entities.Teacher.filter({ staff_id: staffId });
      if (teachers[0]) {
        const t = teachers[0];
        const role = t.teacher_type === 'Principal' ? 'principal' : t.teacher_type === 'Head Teacher' ? 'headteacher' : 'teacher';
        return { id: t.id, name: `${t.first_name} ${t.last_name}`, role, record: t };
      }
    }

    // Accountant
    if (sessionStorage.getItem('accountant_portal_logged_in') === 'true') {
      const accData = JSON.parse(sessionStorage.getItem('accountant_data') || '{}');
      if (accData.id) return { id: accData.id, name: `${accData.first_name} ${accData.last_name}`, role: 'accountant', record: accData };
    }

    // Admin via base44 auth
    try {
      const userData = await base44.auth.me();
      if (userData) {
        const role = userData.role === 'admin' ? 'admin' : 'staff';
        return { id: userData.id, name: userData.full_name || userData.email, role, record: userData };
      }
    } catch (e) {}

    return null;
  }, []);

  // Load contacts based on user role
  const loadContacts = useCallback(async (user) => {
    let standardContacts = [];

    if (user.role === 'parent') {
      // Find children, then their class teachers
      const parent = user.record;
      const byEmail = parent.email ? await base44.entities.Student.filter({ parent_email: parent.email }) : [];
      const byPhone = parent.phone ? await base44.entities.Student.filter({ parent_phone: parent.phone }) : [];
      const allChildren = [...byEmail];
      byPhone.forEach(s => { if (!allChildren.find(c => c.id === s.id)) allChildren.push(s); });

      const allTeachers = await base44.entities.Teacher.filter({ status: 'Active' });
      for (const child of allChildren) {
        const ct = allTeachers.find(t =>
          (t.teacher_type === 'Class Teacher' && t.assigned_class === child.current_class) ||
          (t.teacher_type === 'Form Teacher' && t.form_teacher_class === child.current_class) ||
          (t.teacher_type === 'Head Teacher' && t.assigned_class === child.current_class)
        );
        if (ct && !standardContacts.find(c => c.id === ct.id)) {
          standardContacts.push({
            id: ct.id, name: `${ct.first_name} ${ct.last_name}`, role: ct.teacher_type,
            subtitle: `${child.first_name} ${child.last_name} — ${child.current_class}`
          });
        }
      }
    } else {
      // Staff: load all teachers + non-academic staff
      const [teachers, nonAcademic] = await Promise.all([
        base44.entities.Teacher.filter({ status: 'Active' }),
        base44.entities.NonAcademicStaff.filter({ status: 'Active' })
      ]);
      standardContacts = [
        ...teachers.map(t => ({
          id: t.id, name: `${t.first_name} ${t.last_name}`, role: t.teacher_type || 'Teacher',
          subtitle: t.section ? `${t.section} Section` : ''
        })),
        ...nonAcademic.map(s => ({
          id: s.id, name: `${s.first_name} ${s.last_name}`, role: s.role || 'Staff',
          subtitle: s.department || ''
        }))
      ].filter(c => c.id !== user.id);
    }

    // For class/form/head teachers, add parents of students in their class
    if (user.record && ['Class Teacher', 'Form Teacher', 'Head Teacher'].includes(user.record.teacher_type)) {
      const teacher = user.record;
      const myClass = teacher.assigned_class || teacher.form_teacher_class;
      if (myClass) {
        const [students, allParents] = await Promise.all([
          base44.entities.Student.filter({ current_class: myClass, status: 'Active' }),
          base44.entities.Parent.filter({ status: 'Active' })
        ]);
        students.forEach(s => {
          const parent = allParents.find(p =>
            (s.parent_email && p.email === s.parent_email) ||
            (s.parent_phone && p.phone === s.parent_phone)
          );
          if (parent && !standardContacts.find(c => c.id === parent.id)) {
            standardContacts.push({
              id: parent.id, name: parent.full_name, role: 'parent',
              subtitle: `Parent of ${s.first_name} ${s.last_name}`
            });
          }
        });
      }
    }

    // Also find contacts from existing conversations
    const allMsgs = await base44.entities.ChatMessage.list('-created_date', 500);
    const myMsgs = allMsgs.filter(m => m.sender_id === user.id || m.recipient_id === user.id);
    const extraContacts = [];
    myMsgs.forEach(m => {
      const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const otherName = m.sender_id === user.id ? m.recipient_name : m.sender_name;
      if (otherId && otherName && !standardContacts.find(c => c.id === otherId) && !extraContacts.find(c => c.id === otherId)) {
        extraContacts.push({ id: otherId, name: otherName, role: 'staff', subtitle: '' });
      }
    });

    // Always add a Broadcast Announcements channel at the top
    const broadcastChannel = { id: '__broadcast__', name: 'Broadcast Announcements', role: 'channel', subtitle: 'Director & Admin notices', isBroadcast: true };
    return [broadcastChannel, ...standardContacts, ...extraContacts];
  }, []);

  // Presence management
  const updatePresence = useCallback(async (user, online) => {
    const existing = await base44.entities.ChatPresence.filter({ user_id: user.id });
    const data = {
      user_id: user.id, user_name: user.name, user_role: user.role,
      is_online: online, last_seen: new Date().toISOString()
    };
    if (existing[0]) {
      await base44.entities.ChatPresence.update(existing[0].id, data);
    } else {
      await base44.entities.ChatPresence.create(data);
    }
  }, []);

  const loadPresence = useCallback(async () => {
    const records = await base44.entities.ChatPresence.list('-last_seen', 200);
    const map = {};
    const now = Date.now();
    records.forEach(r => {
      const lastSeen = r.last_seen ? new Date(r.last_seen).getTime() : 0;
      map[r.user_id] = (now - lastSeen) < 60000 ? true : r.is_online;
    });
    setPresence(map);
  }, []);

  // Load messages for a conversation (includes broadcasts).
  // MERGE by ID instead of replacing — prevents messages from disappearing
  // when polling, subscription, or send-optimistic-update overlap.
  const loadMessages = useCallback(async (contact) => {
    if (!contact || !currentUser) return;
    // Broadcast channel: show ONLY broadcast messages (no DMs)
    if (contact.isBroadcast) {
      const allBroadcasts = await base44.entities.ChatMessage.filter({ is_broadcast: true }, '-created_date', 500);
      const isParent = currentUser.role === 'parent';
      const broadcasts = allBroadcasts.filter(m => {
        if (m.sender_id === currentUser.id) return true;
        const target = m.target_audience || 'All';
        return target === 'All' || (isParent ? target === 'Parents' : target === 'Staff');
      });
      if (selectedContactRef.current?.id !== contact.id) return;
      setMessages(prev => {
        const map = new Map();
        prev.forEach(m => map.set(m.id, m));
        broadcasts.forEach(m => map.set(m.id, m));
        return Array.from(map.values()).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      return;
    }
    const convId = getConversationId(currentUser.id, contact.id);
    const [dmMsgs, allBroadcasts] = await Promise.all([
      base44.entities.ChatMessage.filter({ conversation_id: convId }, '-created_date', 500),
      base44.entities.ChatMessage.filter({ is_broadcast: true }, '-created_date', 500)
    ]);
    // Filter broadcasts by target audience (senders always see their own)
    const isParent = currentUser.role === 'parent';
    const broadcasts = allBroadcasts.filter(m => {
      if (m.sender_id === currentUser.id) return true;
      const target = m.target_audience || 'All';
      return target === 'All' || (isParent ? target === 'Parents' : target === 'Staff');
    });
    // Ignore if user switched to a different contact while fetching
    if (selectedContactRef.current?.id !== contact.id) return;
    const serverMsgs = [...dmMsgs, ...broadcasts];
    setMessages(prev => {
      const map = new Map();
      // Preserve existing messages first (optimistic sends, etc.)
      prev.forEach(m => map.set(m.id, m));
      // Merge in server data — server values take precedence for existing IDs
      serverMsgs.forEach(m => map.set(m.id, m));
      return Array.from(map.values()).sort((a, b) =>
        new Date(a.created_date) - new Date(b.created_date)
      );
    });
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [currentUser]);

  // Send text message
  const sendText = async () => {
    if (!textInput.trim() || !selectedContact || !currentUser) return;
    if (selectedContact.isBroadcast) return; // Broadcast channel is read-only for DMs
    setSending(true);
    const convId = getConversationId(currentUser.id, selectedContact.id);
    const newMsg = await base44.entities.ChatMessage.create({
      conversation_id: convId,
      sender_id: currentUser.id, sender_name: currentUser.name, sender_role: currentUser.role,
      recipient_id: selectedContact.id, recipient_name: selectedContact.name,
      content: textInput.trim(), message_type: 'text', is_broadcast: false, read: false
    });
    setMessages(prev => [...prev, newMsg]);
    playSound(true);
    setTextInput('');
    setSending(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Send voice note
  const sendVoice = async (file, duration) => {
    if (!selectedContact || !currentUser) return;
    setSending(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const convId = getConversationId(currentUser.id, selectedContact.id);
    const newMsg = await base44.entities.ChatMessage.create({
      conversation_id: convId,
      sender_id: currentUser.id, sender_name: currentUser.name, sender_role: currentUser.role,
      recipient_id: selectedContact.id, recipient_name: selectedContact.name,
      content: '[voice note]', message_type: 'voice', file_url, voice_duration: duration, is_broadcast: false, read: false
    });
    setMessages(prev => [...prev, newMsg]);
    playSound(true);
    setSending(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Send image
  const sendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedContact || !currentUser) return;
    setSending(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const convId = getConversationId(currentUser.id, selectedContact.id);
    const newMsg = await base44.entities.ChatMessage.create({
      conversation_id: convId,
      sender_id: currentUser.id, sender_name: currentUser.name, sender_role: currentUser.role,
      recipient_id: selectedContact.id, recipient_name: selectedContact.name,
      content: '[image]', message_type: 'image', file_url, is_broadcast: false, read: false
    });
    setMessages(prev => [...prev, newMsg]);
    playSound(true);
    setSending(false);
    e.target.value = '';
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Send broadcast
  const sendBroadcast = async () => {
    if (!broadcastText.trim() || !currentUser) return;
    setSending(true);
    const newBroadcast = await base44.entities.ChatMessage.create({
      conversation_id: 'BROADCAST',
      sender_id: currentUser.id, sender_name: currentUser.name, sender_role: currentUser.role,
      content: broadcastText.trim(), message_type: 'text', is_broadcast: true, target_audience: broadcastTarget, read: false
    });
    setMessages(prev => [...prev, newBroadcast]);
    playSound(true);
    setBroadcastText('');
    setBroadcastTarget('All');
    setSending(false);
    setShowBroadcast(false);
  };

  // Send broadcast voice
  const sendBroadcastVoice = async (file, duration) => {
    if (!currentUser) return;
    setSending(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newBroadcast = await base44.entities.ChatMessage.create({
      conversation_id: 'BROADCAST',
      sender_id: currentUser.id, sender_name: currentUser.name, sender_role: currentUser.role,
      content: '[voice note]', message_type: 'voice', file_url, voice_duration: duration, is_broadcast: true, target_audience: broadcastTarget, read: false
    });
    setMessages(prev => [...prev, newBroadcast]);
    playSound(true);
    setSending(false);
  };

  // Init
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const user = await detectUser();
      if (!user) { setLoading(false); return; }
      currentUserRef.current = user;
      setCurrentUser(user);
      const canBroadcast = ['admin', 'accountant', 'principal'].includes(user.role);
      setIsAdmin(canBroadcast);
      const [contactsList] = await Promise.all([loadContacts(user), updatePresence(user, true)]);
      setContacts(contactsList);
      // Auto-select the broadcast channel so staff see announcements immediately
      if (contactsList[0]?.isBroadcast) {
        setSelectedContact(contactsList[0]);
        selectedContactRef.current = contactsList[0];
        loadMessages(contactsList[0]);
      }
      loadPresence();
      setLoading(false);

      // Heartbeat
      heartbeatRef.current = setInterval(() => {
        updatePresence(user, true);
        loadPresence();
      }, 30000);
    };
    init();

    // Cleanup (defined outside async so useEffect captures it)
    const handleUnload = () => { if (currentUserRef.current) updatePresence(currentUserRef.current, false); };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (currentUserRef.current) updatePresence(currentUserRef.current, false);
    };
  }, []);

  // Subscribe to new messages — reload on any relevant event
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        const isRelevant = msg.is_broadcast || msg.recipient_id === currentUser.id || msg.sender_id === currentUser.id;
        if (!isRelevant) return;
        // Reload messages so both sent and received messages appear
        if (selectedContact) {
          loadMessages(selectedContact);
        }
        if (msg.sender_id !== currentUser.id) {
          playSound(false);
        }
      }
    });
    return unsubscribe;
  }, [currentUser, selectedContact, loadMessages]);

  // Polling fallback — refresh messages every 5 seconds in case realtime misses events
  useEffect(() => {
    if (!selectedContact || !currentUser) return;
    const interval = setInterval(() => loadMessages(selectedContact), 5000);
    return () => clearInterval(interval);
  }, [selectedContact, currentUser, loadMessages]);

  // Reload messages when contact changes
  useEffect(() => {
    if (selectedContact) {
      selectedContactRef.current = selectedContact;
      setMessages([]); // Clear previous contact's messages
      loadMessages(selectedContact);
      setView('chat');
    }
  }, [selectedContact]);

  const canBroadcast = ['admin', 'accountant', 'principal'].includes(currentUser?.role);
  const broadcastMessages = messages.filter(m => m.is_broadcast);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to your portal to access MICAS Chat.</p>
          <Link to="/"><Button className="bg-blue-600 hover:bg-blue-700">Go to Portals</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view === 'chat' && (
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 md:hidden" onClick={() => setView('contacts')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">MICAS Chat</h1>
              <p className="text-xs text-white/80">{currentUser.name} · {currentUser.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canBroadcast && (
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setShowBroadcast(true)}>
                <Megaphone className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Broadcast</span>
              </Button>
            )}
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <LogOut className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Exit</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 flex gap-4">
        {/* Contacts Sidebar */}
        <div className={`flex-col ${view === 'contacts' ? 'flex' : 'hidden'} md:flex md:w-80 lg:w-96 bg-white rounded-xl shadow-sm border`}>
          <div className="p-3 border-b">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Users className="w-4 h-4" /> Contacts
              <Badge className="ml-auto bg-gray-100 text-gray-600 text-xs">{contacts.length}</Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No contacts available.</p>
            ) : (
              contacts.map(c => {
                const isOnline = presence[c.id];
                return (
                  <button key={c.id} onClick={() => setSelectedContact(c)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b text-left transition-colors">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {c.name?.charAt(0)?.toUpperCase()}
                      </div>
                      {isOnline && <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">{c.subtitle || c.role}</p>
                    </div>
                    {isOnline && <span className="text-[10px] text-green-600 font-medium">Online</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex-col ${view === 'chat' ? 'flex' : 'hidden'} md:flex bg-white rounded-xl shadow-sm border`}>
          {selectedContact ? (
            <>
              <div className="p-3 border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setView('contacts')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {selectedContact.name?.charAt(0)?.toUpperCase()}
                  </div>
                  {presence[selectedContact.id] && <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-green-500" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{selectedContact.name}</p>
                  <p className="text-xs text-gray-500">
                    {presence[selectedContact.id] ? 'Online' : 'Offline'} · {selectedContact.role}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: '300px', maxHeight: 'calc(100vh - 280px)' }}>
                {messages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No messages yet. Start a conversation!</p>
                ) : (
                  messages.map(msg => (
                    <ChatMessageBubble key={msg.id} message={msg} isOwn={msg.sender_id === currentUser.id} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t">
                {selectedContact.isBroadcast && !isAdmin ? (
                  <div className="text-center py-3 text-sm text-gray-400">
                    <Megaphone className="w-5 h-5 inline mr-1" />
                    This is a read-only broadcast channel. Only administrators can post here.
                  </div>
                ) : selectedContact.isBroadcast && isAdmin ? (
                  <div className="text-center py-3 text-sm text-blue-500">
                    <Megaphone className="w-5 h-5 inline mr-1" />
                    Use the "Broadcast" button to send announcements to this channel.
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <VoiceRecorder onSend={sendVoice} disabled={sending} />
                    <label className="cursor-pointer p-2 text-gray-500 hover:text-blue-600">
                      <ImageIcon className="w-5 h-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={sendImage} />
                    </label>
                    <Textarea
                      placeholder="Type a message..." value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
                      rows={1} className="flex-1 resize-none min-h-[40px] max-h-32"
                    />
                    <Button size="icon" className="bg-blue-600 hover:bg-blue-700 h-10 w-10" onClick={sendText} disabled={sending || !textInput.trim()}>
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>Select a contact to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Dialog */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBroadcast(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-600" /> Broadcast Message
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowBroadcast(false)}><ArrowLeft className="w-4 h-4" /></Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Send To</Label>
                <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Parents and Staff</SelectItem>
                    <SelectItem value="Parents">Parents Only</SelectItem>
                    <SelectItem value="Staff">Staff/Teachers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Type your broadcast message..." value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)} rows={4}
              />
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">Or send a voice note broadcast:</p>
                <VoiceRecorder onSend={async (file, dur) => { await sendBroadcastVoice(file, dur); setShowBroadcast(false); }} disabled={sending} />
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={sendBroadcast} disabled={sending || !broadcastText.trim()}>
                <Megaphone className="w-4 h-4 mr-2" /> Send Broadcast
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
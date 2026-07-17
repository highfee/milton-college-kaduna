import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceRecorder({ onSend, disabled }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      alert('Microphone access denied or not available. Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    setAudioBlob(null);
    setAudioUrl('');
    setDuration(0);
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    await onSend(file, duration);
    cancelRecording();
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(1, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
        <audio src={audioUrl} controls className="h-8 flex-1" />
        <span className="text-xs text-gray-500">{fmtTime(duration)}</span>
        <Button size="icon" className="bg-red-500 hover:bg-red-600 h-8 w-8" onClick={cancelRecording}>
          <X className="w-4 h-4" />
        </Button>
        <Button size="icon" className="bg-green-600 hover:bg-green-700 h-8 w-8" onClick={handleSend} disabled={disabled}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 bg-red-50 rounded-lg p-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm text-red-600 font-medium">Recording... {fmtTime(duration)}</span>
        <Button size="icon" className="bg-red-500 hover:bg-red-600 h-8 w-8 ml-auto" onClick={stopRecording}>
          <Square className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button size="icon" variant="ghost" className="h-9 w-9 text-gray-500 hover:text-red-600" onClick={startRecording} disabled={disabled}>
      <Mic className="w-5 h-5" />
    </Button>
  );
}
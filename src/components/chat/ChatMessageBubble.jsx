import React, { useState } from 'react';
import { Download, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmtTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

function fmtDuration(s) {
  if (!s) return '0:00';
  return `${String(Math.floor(s / 60)).padStart(1, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function ChatMessageBubble({ message, isOwn }) {
  const [imgOpen, setImgOpen] = useState(false);

  const isVoice = message.message_type === 'voice';
  const isImage = message.message_type === 'image';
  const isBroadcast = message.is_broadcast;

  return (
    <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
      <div className={cn('max-w-[75%] rounded-lg px-3 py-2', isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800')}>
        {!isOwn && (
          <p className="text-xs font-semibold mb-0.5 text-blue-600">
            {message.sender_name}
            {isBroadcast && <span className="ml-2 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">BROADCAST</span>}
          </p>
        )}
        {isOwn && isBroadcast && (
          <p className="text-[10px] mb-0.5 text-blue-200">BROADCAST</p>
        )}

        {message.message_type === 'text' || (!isVoice && !isImage) ? (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        ) : isVoice ? (
          <div className="flex items-center gap-2">
            <audio src={message.file_url} controls className="h-8 max-w-[200px]" />
            <span className="text-xs opacity-70">{fmtDuration(message.voice_duration)}</span>
          </div>
        ) : isImage ? (
          <div>
            <img src={message.file_url} alt="Shared" className="rounded-lg max-w-[250px] max-h-[250px] cursor-pointer" onClick={() => setImgOpen(true)} />
            {message.content && message.content !== '[image]' && <p className="text-sm mt-1">{message.content}</p>}
          </div>
        ) : null}

        <p className={cn('text-[10px] mt-1', isOwn ? 'text-blue-200' : 'text-gray-400')}>{fmtTime(message.created_date)}</p>
      </div>

      {imgOpen && isImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setImgOpen(false)}>
          <img src={message.file_url} alt="Full size" className="max-w-full max-h-full rounded-lg" />
          <a href={message.file_url} download target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
            <Download className="w-8 h-8 text-white absolute bottom-8 right-8" />
          </a>
        </div>
      )}
    </div>
  );
}
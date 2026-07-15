import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Trash2, CheckCheck, RefreshCw, Inbox } from 'lucide-react';

export default function PublicMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Message.filter(
        { message_type: 'Public-Admin' },
        '-created_date',
        100
      );
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleMarkRead = async (msg) => {
    try {
      await base44.entities.Message.update(msg.id, { read: true });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
      setSelected(prev => prev?.id === msg.id ? { ...prev, read: true } : prev);
    } catch (error) {
      console.error('Error marking message:', error);
    }
  };

  const handleDelete = async (msg) => {
    if (!confirm('Delete this message?')) return;
    try {
      await base44.entities.Message.delete(msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      setSelected(prev => prev?.id === msg.id ? null : prev);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>Public Messages</CardTitle>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount} unread</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={loadMessages} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Message list */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => { setSelected(msg); if (!msg.read) handleMarkRead(msg); }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected?.id === msg.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'
                  } ${!msg.read ? 'font-semibold' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!msg.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                        <p className="text-sm truncate">{msg.from_name}</p>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{msg.subject}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(msg.created_date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message detail */}
            <div className="border rounded-lg p-4 bg-gray-50 max-h-[500px] overflow-y-auto">
              {selected ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{selected.subject}</h3>
                      <p className="text-sm text-gray-600">From: {selected.from_name}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(selected)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {selected.from_email && (
                      <a href={`mailto:${selected.from_email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Mail className="w-4 h-4" /> {selected.from_email}
                      </a>
                    )}
                    {selected.from_phone && (
                      <a href={`tel:${selected.from_phone}`} className="flex items-center gap-1 text-green-600 hover:underline">
                        <Phone className="w-4 h-4" /> {selected.from_phone}
                      </a>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.content}</p>
                  </div>
                  <p className="text-xs text-gray-400">Received: {formatDate(selected.created_date)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkRead(selected)}
                    disabled={selected.read}
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    {selected.read ? 'Read' : 'Mark as Read'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a message to view</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
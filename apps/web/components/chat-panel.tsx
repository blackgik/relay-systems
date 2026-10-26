'use client';

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button, Typography } from '@/ui/elements';
import { api, apiBase, ApiError } from '@/lib/api';
import { ChatMessage, Conversation } from '@/lib/types';

export function ChatPanel({
  legId,
  token,
  currentUserId,
}: {
  legId: string;
  token: string;
  currentUserId: string;
}) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: Socket | null = null;
    (async () => {
      try {
        const convo = await api<Conversation>(`/conversations/by-leg/${legId}`, { token });
        if (cancelled) return;
        setConversation(convo);
        const history = await api<ChatMessage[]>(`/conversations/${convo.id}/messages`, { token });
        if (cancelled) return;
        setMessages(history);
        socket = io(`${apiBase()}/chat`, { transports: ['websocket'] });
        socketRef.current = socket;
        socket.emit('join', { conversationId: convo.id, token });
        socket.on('message', (msg: ChatMessage) => {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Chat unavailable');
      }
    })();
    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [legId, token]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !conversation) return;
    setDraft('');
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('send', { body });
      return;
    }
    try {
      const message = await api<ChatMessage>(`/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: { body },
        token,
      });
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Send failed');
    }
  };

  if (error) {
    return (
      <Typography size="body-m" color="secondary" as="p">
        {error}
      </Typography>
    );
  }
  if (!conversation) {
    return (
      <Typography size="body-m" color="secondary" as="p">
        Opening chat…
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-lg border border-border p-3">
        {messages.length === 0 && (
          <Typography size="body-s" color="secondary" as="p">
            No messages yet. Say hello — phone numbers and emails are masked.
          </Typography>
        )}
        {messages.map((msg) => {
          const mine = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-body-s ${
                  mine ? 'bg-brand text-white' : 'bg-muted text-text-primary'
                }`}
              >
                {msg.body}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send();
          }}
          placeholder="Message the carrier…"
          className="h-10 flex-1 rounded-lg border border-input-border bg-background px-3 text-body-m text-text-primary placeholder:text-text-tertiary"
        />
        <Button label="Send" size="sm" onClick={() => void send()} />
      </div>
    </div>
  );
}

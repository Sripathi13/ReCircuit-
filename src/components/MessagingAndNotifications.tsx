import React, { useState, useEffect, useCallback } from 'react';
import { Send, Flag, CheckCheck, Paperclip, MessageSquare, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConversationItem, MessageItem, NotificationItem } from '../types';

export const MessagingPanel: React.FC<{
  onOpenDevice?: (deviceId: number) => void;
}> = ({ onOpenDevice }) => {
  const { user, apiFetch } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiFetch<ConversationItem[]>('/api/conversations');
      setConversations(data);
      if (data.length > 0 && !selectedConvId) {
        setSelectedConvId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedConvId]);

  const loadMessages = useCallback(
    async (convId: number) => {
      try {
        const msgs = await apiFetch<MessageItem[]>(`/api/conversations/${convId}/messages`);
        setMessages(msgs);
        await apiFetch(`/api/conversations/${convId}/read`, { method: 'POST' });
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 6000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
    }
  }, [selectedConvId, loadMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setReportFeedback('Only valid image files (.jpg, .png, .webp) are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setReportFeedback('Image attachment must be smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || (!newMessage.trim() && !attachmentPreview)) return;
    setSending(true);
    try {
      await apiFetch(`/api/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messageText: newMessage.trim() || 'Shared an image attachment',
          attachmentKey: attachmentPreview,
        }),
      });
      setNewMessage('');
      setAttachmentPreview(null);
      await loadMessages(selectedConvId);
      await loadConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleReportConversation = async (conv: ConversationItem) => {
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: conv.otherParticipant.id,
          deviceId: conv.device?.id || null,
          reportType: 'HARASSMENT',
          description: `Reported conversation #${conv.id} with ${conv.otherParticipant.displayName}.`,
        }),
      });
      setReportFeedback('Conversation reported to administrators.');
    } catch (err: any) {
      setReportFeedback(err.message || 'Could not submit report.');
    }
  };

  const activeConv = conversations.find((c) => c.id === selectedConvId) || null;

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 h-96 animate-pulse p-6" />;
  }

  return (
    <div className="space-y-4">
      {reportFeedback && (
        <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-center justify-between">
          <span>{reportFeedback}</span>
          <button type="button" onClick={() => setReportFeedback(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Left: Conversation List */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
            Conversations ({conversations.length})
          </div>
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-6 h-6 text-slate-400 mx-auto" />
              <p>No active conversations yet. Conversations start automatically when a verified shop submits an interest request or offer.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[460px]">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    selectedConvId === conv.id ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {conv.otherParticipant.displayName}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="text-[11px] font-mono font-bold text-[#137C5A]">
                        {conv.unreadCount} new
                      </span>
                    )}
                  </div>
                  {conv.device && (
                    <div className="text-[11px] text-[#137C5A] font-mono truncate mt-0.5">
                      {conv.device.listingCode} · {conv.device.title}
                    </div>
                  )}
                  {conv.lastMessage && (
                    <p className="text-xs text-slate-500 truncate mt-1">{conv.lastMessage.messageText}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Active Thread */}
        <div className="md:col-span-8 flex flex-col justify-between bg-[#F8FAF8]">
          {activeConv ? (
            <>
              <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {activeConv.otherParticipant.displayName}{' '}
                    {activeConv.otherParticipant.isVerifiedShop && (
                      <span className="text-xs font-medium text-[#137C5A]">· Verified Partner Shop</span>
                    )}
                  </div>
                  {activeConv.device && (
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>
                        Listing: <strong>{activeConv.device.title}</strong> ({activeConv.device.listingCode})
                      </span>
                      {onOpenDevice && (
                        <button
                          type="button"
                          onClick={() => onOpenDevice(activeConv.device!.id)}
                          className="text-[#137C5A] underline cursor-pointer"
                        >
                          Open Listing
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleReportConversation(activeConv)}
                  className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Thread</span>
                </button>
              </div>

              <div className="p-5 space-y-3 overflow-y-auto max-h-[340px] flex-1">
                {messages.map((m) => {
                  const isMine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-md rounded-xl p-3.5 text-xs space-y-1.5 ${
                          isMine
                            ? 'bg-[#137C5A] text-white'
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{m.messageText}</p>
                        {m.attachmentKey && (
                          <img
                            src={m.attachmentKey}
                            alt="Message attachment"
                            referrerPolicy="no-referrer"
                            className="rounded-lg max-h-40 w-auto border border-white/20 mt-2"
                          />
                        )}
                        <div
                          className={`text-[10px] font-mono ${
                            isMine ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 space-y-2">
                {attachmentPreview && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                    <span>Image attached</span>
                    <button
                      type="button"
                      onClick={() => setAttachmentPreview(null)}
                      className="text-red-600 underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer">
                    <Paperclip className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write a message (your phone number remains hidden unless permitted)..."
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#137C5A]"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 my-auto">
              Select a conversation on the left to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NotificationsPanel: React.FC<{
  onOpenDevice?: (deviceId: number) => void;
  onOpenTransactions?: () => void;
}> = ({ onOpenDevice, onOpenTransactions }) => {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiFetch<NotificationItem[]>('/api/notifications');
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = async (id: number) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 h-64 animate-pulse p-6" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
          <p className="text-xs text-slate-500">
            Real-time alerts for shop interest, purchase offers, counteroffers, collection dates, and verification updates.
          </p>
        </div>
        {items.some((i) => !i.isRead) && (
          <button
            type="button"
            onClick={markAllRead}
            className="px-3 py-1.5 text-xs font-semibold text-[#137C5A] bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-500 space-y-2">
          <Bell className="w-6 h-6 text-slate-400 mx-auto" />
          <p>You have no notifications yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((n) => (
            <div
              key={n.id}
              className={`py-4 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg ${
                !n.isRead ? 'bg-emerald-50/40' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900">{n.title}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-600">{n.message}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs">
                {n.relatedDeviceId && onOpenDevice && (
                  <button
                    type="button"
                    onClick={() => onOpenDevice(n.relatedDeviceId!)}
                    className="font-semibold text-[#137C5A] hover:underline cursor-pointer"
                  >
                    View Device
                  </button>
                )}
                {n.relatedTransactionId && onOpenTransactions && (
                  <button
                    type="button"
                    onClick={onOpenTransactions}
                    className="font-semibold text-[#172B4D] hover:underline cursor-pointer"
                  >
                    Open Transaction
                  </button>
                )}
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="text-slate-500 hover:text-slate-900 underline cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

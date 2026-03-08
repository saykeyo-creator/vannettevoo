"use client";

import { useState, useEffect } from "react";

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/messages")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load messages");
        return r.json();
      })
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleRead = async (msg: Message) => {
    const newRead = !msg.read;
    const res = await fetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msg.id, read: newRead }),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read: newRead } : m))
      );
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-12">Loading…</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-sm text-slate-500 mt-1">
            {messages.length} total · {unreadCount} unread
          </p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <p className="text-sm text-slate-400">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-xl border transition-colors ${
                !msg.read ? "border-teal-200 bg-teal-50/30" : "border-slate-200"
              }`}
            >
              <button
                onClick={() => setSelected(selected === msg.id ? null : msg.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 min-h-[56px]"
              >
                {/* Unread dot */}
                <div className="pt-1.5 shrink-0">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      !msg.read ? "bg-teal-500" : "bg-transparent"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm truncate ${!msg.read ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                      {msg.name}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(msg.createdAt).toLocaleDateString("en-AU")}
                    </span>
                  </div>
                  {msg.subject && (
                    <p className="text-xs text-slate-500 truncate">{msg.subject}</p>
                  )}
                  <p className="text-xs text-slate-400 truncate">{msg.message}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 shrink-0 mt-1.5 transition-transform ${
                    selected === msg.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {selected === msg.id && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
                    <span>Email: {msg.email}</span>
                    {msg.phone && <span>Phone: {msg.phone}</span>}
                    <span>{new Date(msg.createdAt).toLocaleString("en-AU")}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                  <button
                    onClick={() => toggleRead(msg)}
                    className="mt-3 text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Mark as {msg.read ? "unread" : "read"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMessageTime } from "@/lib/time";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

export function ChatApp() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [atBottom, setAtBottom] = useState(true);

  const upsert = useMutation(api.users.upsertFromClerk);
  const setOnline = useMutation(api.users.setOnline);
  const searchUsers = useQuery(api.users.search, user ? { clerkId: user.id, q: search } : "skip");
  const conversations = useQuery(api.conversations.listForCurrentUser, user ? { clerkId: user.id } : "skip");
  const openDirect = useMutation(api.conversations.openDirectConversation);
  const messages = useQuery(
    api.messages.list,
    activeConversationId ? { conversationId: activeConversationId as any } : "skip"
  );
  const send = useMutation(api.messages.send);
  const markAsRead = useMutation(api.conversations.markAsRead);
  const touchTyping = useMutation(api.typing.touch);
  const typers = useQuery(
    api.typing.list,
    activeConversationId && user ? { conversationId: activeConversationId as any, clerkId: user.id } : "skip"
  );
  const softDelete = useMutation(api.messages.softDelete);
  const toggleReaction = useMutation(api.messages.toggleReaction);

  useEffect(() => {
    if (!user) return;
    upsert({
      clerkId: user.id,
      name: user.fullName ?? user.username ?? "User",
      imageUrl: user.imageUrl,
      email: user.primaryEmailAddress?.emailAddress
    });
    setOnline({ clerkId: user.id, isOnline: true });

    return () => {
      setOnline({ clerkId: user.id, isOnline: false });
    };
  }, [user, upsert, setOnline]);

  useEffect(() => {
    if (activeConversationId && user) {
      markAsRead({ clerkId: user.id, conversationId: activeConversationId as any });
    }
  }, [activeConversationId, user, markAsRead, messages]);

  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!messages || !listRef.current) return;
    if (atBottom) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, atBottom]);

  const groupedReactions = useMemo(() => {
    return (msg: any) => {
      const grouped = new Map<string, number>();
      for (const r of msg.reactions ?? []) {
        grouped.set(r.emoji, (grouped.get(r.emoji) ?? 0) + 1);
      }
      return [...grouped.entries()];
    };
  }, []);

  const activeConversation = conversations?.find((c: any) => c._id === activeConversationId);

  const openConversation = async (otherUserId: string) => {
    if (!user) return;
    const id = await openDirect({ clerkId: user.id, otherUserId: otherUserId as any });
    setActiveConversationId(id);
    setSearch("");
  };

  const onSend = async () => {
    if (!user || !activeConversationId || !draft.trim()) return;
    await send({ clerkId: user.id, conversationId: activeConversationId as any, content: draft });
    setDraft("");
  };

  return (
    <div className="mx-auto flex h-screen max-w-7xl flex-col bg-white md:flex-row md:rounded-xl md:shadow">
      <aside className={`w-full border-r md:w-96 ${activeConversationId ? "hidden md:block" : "block"}`}>
        <div className="flex items-center justify-between border-b p-4">
          <h1 className="text-xl font-semibold">Tars Chat</h1>
          <UserButton />
        </div>

        <div className="border-b p-3">
          <input
            className="w-full rounded-lg border p-2"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-44 overflow-y-auto border-b p-2">
          {searchUsers?.length ? (
            searchUsers.map((u: any) => (
              <button
                key={u._id}
                className="mb-1 flex w-full items-center justify-between rounded p-2 text-left hover:bg-slate-100"
                onClick={() => openConversation(u._id)}
              >
                <span>{u.name}</span>
                <span className={`h-2 w-2 rounded-full ${u.isOnline ? "bg-green-500" : "bg-slate-300"}`} />
              </button>
            ))
          ) : (
            <p className="p-2 text-sm text-slate-500">No users found.</p>
          )}
        </div>

        <div className="overflow-y-auto p-2">
          {!conversations?.length ? (
            <p className="p-2 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            conversations.map((c: any) => (
              <button
                key={c._id}
                className={`mb-1 w-full rounded p-3 text-left hover:bg-slate-100 ${
                  c._id === activeConversationId ? "bg-slate-100" : ""
                }`}
                onClick={() => setActiveConversationId(c._id)}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.title}</p>
                  {!!c.unread && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{c.unread}</span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-500">{c.lastMessagePreview ?? "No messages yet"}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className={`flex-1 ${activeConversationId ? "flex" : "hidden md:flex"} flex-col`}>
        {activeConversation ? (
          <>
            <header className="flex items-center gap-2 border-b p-4">
              <button className="rounded border px-2 py-1 md:hidden" onClick={() => setActiveConversationId(null)}>
                Back
              </button>
              <h2 className="font-semibold">{activeConversation.title}</h2>
            </header>

            <div
              className="flex-1 overflow-y-auto p-4"
              ref={listRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 40);
              }}
            >
              {!messages?.length ? (
                <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
              ) : (
                messages.map((m: any) => (
                  <div key={m._id} className="mb-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{m.sender?.name ?? "Unknown"}</span>
                      <span>{formatMessageTime(m.createdAt)}</span>
                    </div>
                    <div className={`inline-block rounded-lg px-3 py-2 ${m.deletedAt ? "italic text-slate-500" : "bg-slate-100"}`}>
                      {m.content}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          className="rounded border px-1 text-xs"
                          onClick={() => user && toggleReaction({ clerkId: user.id, messageId: m._id, emoji })}
                        >
                          {emoji}
                        </button>
                      ))}
                      {groupedReactions(m).map(([emoji, count]: [string, number]) => (
                        <span key={emoji} className="rounded-full bg-slate-200 px-2 text-xs">
                          {emoji} {count}
                        </span>
                      ))}
                      {m.sender?.clerkId === user?.id && !m.deletedAt ? (
                        <button
                          className="rounded border px-2 text-xs text-red-600"
                          onClick={() => user && softDelete({ clerkId: user.id, messageId: m._id })}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
              {!atBottom && <div className="sticky bottom-2 text-center text-xs">↓ New messages</div>}
            </div>

            {!!typers?.length && (
              <p className="px-4 pb-1 text-xs text-slate-500">{typers[0]?.name ?? "Someone"} is typing...</p>
            )}

            <div className="flex gap-2 border-t p-3">
              <input
                className="flex-1 rounded border p-2"
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (user && activeConversationId) {
                    touchTyping({ clerkId: user.id, conversationId: activeConversationId as any });
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && onSend()}
              />
              <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={onSend}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-slate-500">Select a conversation to start chatting.</div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { ViewTransition } from "react";
import { sendChatbotTest } from "@/lib/api";
import { useAccess } from "@/lib/session";

type Message = { id: number; from: "me" | "bot" | "error"; text: string };

const CONTACT_KEY = "chatbot-test:contact";

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink placeholder:text-placeholder focus:outline-none";

const newSessionId = () => crypto.randomUUID();

function readContact(): { name: string; phone: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? "null");
    if (saved && typeof saved.phone === "string") return { name: String(saved.name ?? ""), phone: saved.phone };
  } catch { /* Storage can be disabled. */ }
  return { name: "", phone: "" };
}

export default function ChatbotTestPage() {
  const access = useAccess();
  const [sessionId, setSessionId] = useState(newSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  // The page renders nothing until access loads on the client, so reading storage here can't mismatch hydration.
  const [name, setName] = useState(() => readContact().name);
  const [phone, setPhone] = useState(() => readContact().phone);
  const [sending, setSending] = useState(false);
  const nextId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name, phone })); } catch { /* Storage can be disabled. */ }
  }, [name, phone]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const add = (from: Message["from"], text: string) =>
    setMessages((list) => [...list, { id: nextId.current++, from, text }]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!phone.trim()) {
      add("error", "Enter a test phone number first — the test lead is saved under it.");
      return;
    }
    setDraft("");
    add("me", text);
    setSending(true);
    try {
      const { replies } = await sendChatbotTest({
        message: text,
        session_id: sessionId,
        phone: phone.trim(),
        name: name.trim() || undefined,
      });
      if (replies.length === 0) add("error", "The bot didn't reply to this message.");
      for (const reply of replies) add("bot", reply);
    } catch (error) {
      add("error", error instanceof Error ? error.message : "Couldn't reach the chatbot");
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }

  function startOver() {
    setSessionId(newSessionId());
    setMessages([]);
    input.current?.focus();
  }

  if (!access) return null;
  if (!access.permissions["settings.manage"]) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8">
        <p className="text-sm text-muted">Only admins can use the chatbot test.</p>
      </div>
    );
  }

  return (
    <ViewTransition>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <div>
          <h1
            className="font-serif text-[28px] font-semibold text-ink sm:text-[34px]"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Chatbot Test
          </h1>
          <p className="mt-1 text-sm text-muted">
            Chat with the WhatsApp property bot here. It searches your inventory and creates a real lead (source &ldquo;Chatbot test&rdquo;).
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-white p-4 shadow-sm sm:p-6 lg:col-span-4">
            <h2 className="text-xs font-bold uppercase tracking-[1px] text-muted">Test client</h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="test-name" className="text-sm text-muted">Name</label>
              <input
                id="test-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Test Customer"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="test-phone" className="text-sm text-muted">
                Phone number<span className="text-hot"> *</span>
              </label>
              <input
                id="test-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className={inputClass}
              />
              <p className="text-xs text-muted">The lead is filed under this number. An existing client with it gets the lead.</p>
            </div>
            <button
              type="button"
              onClick={startOver}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-dash-bg"
            >
              New chat
            </button>
          </section>

          <section className="flex h-[70dvh] min-h-[420px] flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm lg:col-span-8">
            <div ref={scroller} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-cream/40 p-4 sm:p-6">
              {messages.length === 0 && !sending && (
                <p className="m-auto text-center text-sm text-muted">Say &ldquo;salam&rdquo; to start, as a customer would on WhatsApp.</p>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm ${
                    message.from === "me"
                      ? "self-end rounded-br-sm bg-ink text-white"
                      : message.from === "bot"
                        ? "self-start rounded-bl-sm border border-border bg-white text-ink"
                        : "self-center bg-hot/10 text-hot"
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {sending && (
                <div className="self-start rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-2.5 text-sm text-muted">
                  Typing…
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3 sm:p-4">
              <input
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message"
                maxLength={1000}
                autoFocus
                className={inputClass}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </section>
        </div>
      </div>
    </ViewTransition>
  );
}

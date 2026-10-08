"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, ViewTransition } from "react";
import type { ReactNode, SubmitEvent } from "react";
import { ContextHeading, Panel, bodyTextClass, outlineButtonClass, solidButtonClass } from "@/components/help/ui";
import { Icon } from "@/components/ui/Icon";
import { Listbox, type ListboxOption } from "@/components/ui/Listbox";
import {
  createSupportTicket,
  getHelpArticles,
  type HelpArticleSummary,
  type HelpTopicId,
  type SupportTicketReceipt,
} from "@/lib/api";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_FILES,
  ATTACHMENT_TYPES,
  HELP_TOPICS,
  OTHER_TOPIC,
  SUPPORT_HOURS,
  TICKET_CONTACTS,
  TICKET_IMPACTS,
  topicName,
} from "@/lib/help";
import { useSessionEmail, useSessionFullName } from "@/lib/session";

type Article = HelpArticleSummary & { intro: string };

const controlClass =
  "w-full min-w-0 bg-transparent text-xs leading-[1.7] text-ink placeholder:text-placeholder focus:outline-none";

const ticketRef = (ticketNo: number) => `SUP-${String(ticketNo).padStart(4, "0")}`;

function LabeledField({
  label,
  required,
  tall,
  children,
}: {
  label: string;
  required?: boolean;
  tall?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div
      className={`flex min-w-0 flex-col rounded-[4px] border border-border p-3 focus-within:border-primary ${
        tall ? "min-h-[108px]" : "min-h-[66px]"
      }`}
    >
      <label htmlFor={id} className="text-[10px] leading-[1.7] text-muted">
        {label}
        {required && " *"}
      </label>
      {children(id)}
    </div>
  );
}

function FieldSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: ListboxOption[];
}) {
  return (
    <Listbox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      className={`${controlClass} flex cursor-pointer items-center justify-between gap-2 text-left`}
    >
      {(isOpen) => (
        <>
          <span className="min-w-0 truncate">{options.find((option) => option.id === value)?.name ?? value}</span>
          <Icon name="chevron-down" className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </>
      )}
    </Listbox>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="leading-[1.5]">
      <span className="text-[11px] text-muted">{label}  ·  </span>
      <span className="text-xs text-ink">{value}</span>
    </p>
  );
}

export function SupportTicketForm({ articleSlug }: { articleSlug?: string }) {
  const sessionName = useSessionFullName();
  const sessionEmail = useSessionEmail();

  const [articles, setArticles] = useState<Article[]>([]);
  const [category, setCategory] = useState<HelpTopicId>(HELP_TOPICS[0].id);
  const [topic, setTopic] = useState("");
  // Null until edited, so the signed-in user's details show through.
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [relatedRecord, setRelatedRecord] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");
  const [impact, setImpact] = useState(TICKET_IMPACTS[0].id);
  const [contact, setContact] = useState(TICKET_CONTACTS[0].id);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SupportTicketReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHelpArticles()
      .then((res) => {
        if (cancelled) return;
        setArticles(res);
        const from = res.find((article) => article.slug === articleSlug);
        if (from) {
          setCategory(from.topic);
          setTopic(from.short_title);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [articleSlug]);

  const topicOptions = [
    ...articles.filter((article) => article.topic === category).map((article) => article.short_title),
    OTHER_TOPIC,
  ];
  const activeTopic = topicOptions.includes(topic) ? topic : topicOptions[0];
  const suggested = articles.find((article) => article.topic === category && article.short_title === activeTopic);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const accepted: File[] = [];
    for (const file of Array.from(incoming)) {
      if (!ATTACHMENT_TYPES.includes(file.type)) {
        setError(`${file.name} is not a PDF, JPG or PNG file.`);
        return;
      }
      if (file.size > ATTACHMENT_MAX_BYTES) {
        setError(`${file.name} is larger than 10 MB.`);
        return;
      }
      accepted.push(file);
    }
    if (files.length + accepted.length > ATTACHMENT_MAX_FILES) {
      setError(`You can attach up to ${ATTACHMENT_MAX_FILES} files.`);
      return;
    }
    setError(null);
    setFiles([...files, ...accepted]);
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      setReceipt(
        await createSupportTicket(
          {
            category,
            topic: activeTopic,
            contact_name: name ?? sessionName,
            reply_email: email ?? sessionEmail,
            subject,
            details,
            related_record: relatedRecord || undefined,
            steps: steps || undefined,
            impact,
            preferred_contact: contact,
          },
          files,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <ContextHeading
          crumbs={[{ label: "Help Center", href: "/help" }, { label: "Contact support" }]}
          title="Submit support ticket"
          caption={`Workspace support · ${SUPPORT_HOURS}`}
        />

        <div className="grid grid-cols-1 items-start gap-6 px-4 pb-7 sm:px-8 lg:grid-cols-[minmax(0,860fr)_minmax(0,396fr)]">
          {receipt ? (
            <Panel title={`Ticket ${ticketRef(receipt.ticket_no)} submitted`}>
              <p className={bodyTextClass}>
                Workspace support has your request and will reply to {email ?? sessionEmail}. Quote{" "}
                {ticketRef(receipt.ticket_no)} if you follow up.
              </p>
              <Link href="/help" className={`${outlineButtonClass} self-start`}>
                Back to Help Center
              </Link>
            </Panel>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-5">
              <Panel title="Topic & contact">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <LabeledField label="Category" required>
                    {(id) => (
                      <FieldSelect id={id} value={category} onChange={(next) => setCategory(next as HelpTopicId)} options={HELP_TOPICS} />
                    )}
                  </LabeledField>
                  <LabeledField label="Topic" required>
                    {(id) => (
                      <FieldSelect id={id} value={activeTopic} onChange={setTopic} options={topicOptions.map((option) => ({ id: option, name: option }))} />
                    )}
                  </LabeledField>
                  <LabeledField label="Your name" required>
                    {(id) => (
                      <input
                        id={id}
                        type="text"
                        required
                        value={name ?? sessionName}
                        onChange={(e) => setName(e.target.value)}
                        className={controlClass}
                      />
                    )}
                  </LabeledField>
                  <LabeledField label="Reply email" required>
                    {(id) => (
                      <input
                        id={id}
                        type="email"
                        required
                        value={email ?? sessionEmail}
                        onChange={(e) => setEmail(e.target.value)}
                        className={controlClass}
                      />
                    )}
                  </LabeledField>
                </div>
              </Panel>

              <Panel title="Request details">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <LabeledField label="Subject" required>
                    {(id) => (
                      <input
                        id={id}
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Unable to update lead allocation"
                        className={controlClass}
                      />
                    )}
                  </LabeledField>
                  <LabeledField label="Related record">
                    {(id) => (
                      <input
                        id={id}
                        type="text"
                        value={relatedRecord}
                        onChange={(e) => setRelatedRecord(e.target.value)}
                        placeholder="Lead, unit or receipt reference"
                        className={controlClass}
                      />
                    )}
                  </LabeledField>
                  <LabeledField label="Details" required tall>
                    {(id) => (
                      <textarea
                        id={id}
                        required
                        rows={3}
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="What happened, and what did you expect?"
                        className={`${controlClass} flex-1 resize-none`}
                      />
                    )}
                  </LabeledField>
                  <LabeledField label="Steps to reproduce" tall>
                    {(id) => (
                      <textarea
                        id={id}
                        rows={3}
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                        placeholder="Open … → … → Save"
                        className={`${controlClass} flex-1 resize-none`}
                      />
                    )}
                  </LabeledField>
                  <LabeledField label="Impact">
                    {(id) => (
                      <FieldSelect id={id} value={impact} onChange={setImpact} options={TICKET_IMPACTS} />
                    )}
                  </LabeledField>
                  <LabeledField label="Preferred contact">
                    {(id) => (
                      <FieldSelect id={id} value={contact} onChange={setContact} options={TICKET_CONTACTS} />
                    )}
                  </LabeledField>
                </div>
              </Panel>

              <Panel title="Attachments">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className={`flex w-full flex-col items-center gap-2 rounded-[4px] border border-dashed bg-cream p-5 transition-colors ${
                    isDragging ? "border-primary" : "border-border"
                  }`}
                >
                  <Icon name="upload" className="size-4 text-primary" />
                  <span className="text-xs leading-[1.4] text-primary">Add screenshots or supporting documents</span>
                  <span className="text-[10px] leading-[1.4] text-muted">PDF, JPG or PNG · Up to 10 MB per file</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ATTACHMENT_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {files.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-4">
                        <span className="flex min-w-0 items-center gap-2.5 text-xs leading-[1.4] text-primary">
                          <Icon name="file" className="size-4" />
                          <span className="truncate">{file.name}</span>
                          <span className="shrink-0 text-[10px] text-muted">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, at) => at !== index))}
                          className="shrink-0 text-[10px] leading-[1.4] text-muted hover:text-hot"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={bodyTextClass}>
                  Do not include passwords, full identity numbers or payment card details.
                </p>
                {error && <p className="text-xs text-hot">{error}</p>}
                <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
                  <p className="text-[10px] leading-[1.4] text-muted">* Required fields</p>
                  <div className="flex gap-3">
                    <Link href="/help" className={outlineButtonClass}>
                      Cancel
                    </Link>
                    <button type="submit" disabled={isSubmitting} className={solidButtonClass}>
                      {isSubmitting ? "Submitting..." : "Submit ticket"}
                    </button>
                  </div>
                </div>
              </Panel>
            </form>
          )}

          <div className="flex min-w-0 flex-col gap-5">
            <Panel title="Support hours">
              <p className={bodyTextClass}>{SUPPORT_HOURS}</p>
              <p className={bodyTextClass}>
                A ticket reference will be issued after submission. Include the exact lead, unit or receipt reference
                to help the support team investigate.
              </p>
            </Panel>

            {suggested && (
              <Panel title="Suggested article">
                <Link href={`/help/${suggested.slug}`} className={`${bodyTextClass} hover:underline`}>
                  {suggested.title} →
                </Link>
                <p className={bodyTextClass}>{suggested.intro}</p>
              </Panel>
            )}

            <Panel title="Request summary">
              <div className="flex flex-col gap-[15px] whitespace-pre-wrap">
                <SummaryRow label="Workspace" value="Sales" />
                <SummaryRow label="Category" value={topicName(category)} />
                <SummaryRow label="Record" value={relatedRecord || "—"} />
                <SummaryRow
                  label="Status"
                  value={receipt ? `Submitted · ${ticketRef(receipt.ticket_no)}` : "Not submitted"}
                />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}

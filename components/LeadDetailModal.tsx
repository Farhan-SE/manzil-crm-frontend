"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { PhoneIcon, TrashIcon } from "@/components/icons/DashboardIcons";
import {
  createFollowUp,
  deleteLead,
  getAgents,
  getCategories,
  getInterests,
  isAdmin,
  setFollowUpCompleted,
  updateLead,
  getFollowUps,
  type FollowUp,
  type Lead,
  type LeadTemperature,
} from "@/lib/api";

type StageId = "inquiry" | "contacted" | "site_visit" | "negotiation" | "booked" | "sold" | "lost";

const STAGES: { id: StageId; label: string }[] = [
  { id: "inquiry", label: "Inquiry" },
  { id: "contacted", label: "Contacted" },
  { id: "site_visit", label: "Site Visit" },
  { id: "negotiation", label: "Negotiation" },
  { id: "booked", label: "Booked" },
  { id: "sold", label: "Sold" },
  { id: "lost", label: "Lost" },
];

const TEMP_STYLES: Record<LeadTemperature, string> = {
  HOT: "border-hot text-hot",
  WARM: "border-warm text-warm",
  COLD: "border-cold text-cold",
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

function formatBudget(budget: number | null) {
  if (budget == null) return "Not set";
  return `PKR ${budget.toLocaleString()}`;
}

function formatDueAt(dueDate: string, dueTime: string) {
  const date = new Date(`${dueDate}T${dueTime}`);
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${dueTime}`;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-dash-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

type LeadDetailModalProps = {
  lead: Lead | null;
  onClose: () => void;
  onChanged: () => void;
};

export function LeadDetailModal({ lead, onClose, onChanged }: LeadDetailModalProps) {
  const admin = isAdmin();
  const [currentLead, setCurrentLead] = useState(lead);

  const [draftStage, setDraftStage] = useState(lead?.stage ?? "");
  const [draftInterestId, setDraftInterestId] = useState(lead?.interest_id ?? "");
  const [draftCategoryId, setDraftCategoryId] = useState(lead?.category_id ?? "");
  const [draftTemperature, setDraftTemperature] = useState<LeadTemperature>(lead?.temperature ?? "WARM");
  const [draftAssignedTo, setDraftAssignedTo] = useState(lead?.assigned_to ? String(lead.assigned_to.id) : "");

  const [interests, setInterests] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<SelectOption[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);

  useEffect(() => {
    if (!lead) return;
    Promise.all([getInterests(), getCategories()])
      .then(([interestList, categoryList]) => {
        setInterests(interestList);
        setCategories(categoryList);
      })
      .catch(() => {});
  }, [lead]);

  useEffect(() => {
    if (!lead || !admin) return;
    getAgents()
      .then((list) =>
        setAgents(list.map((a) => ({ id: String(a.id), name: `${a.first_name} ${a.last_name}` }))),
      )
      .catch(() => {});
  }, [lead, admin]);

  async function loadFollowUps(leadId: string) {
    try {
      setFollowUps(await getFollowUps({ lead_id: leadId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load follow-ups.");
    }
  }

  useEffect(() => {
    if (!lead) return;
    const leadId = lead.id;
    async function load() {
      await loadFollowUps(leadId);
    }
    void load();
  }, [lead]);

  if (!currentLead) return null;

  const isDirty =
    draftStage !== currentLead.stage ||
    draftInterestId !== (currentLead.interest_id ?? "") ||
    draftCategoryId !== (currentLead.category_id ?? "") ||
    draftTemperature !== currentLead.temperature ||
    draftAssignedTo !== (currentLead.assigned_to ? String(currentLead.assigned_to.id) : "");

  async function handleSave() {
    if (!currentLead) return;
    setIsSaving(true);
    setError(null);
    try {
      const fresh = await updateLead(currentLead.id, {
        stage: draftStage,
        interest_id: draftInterestId || undefined,
        category_id: draftCategoryId || undefined,
        temperature: draftTemperature,
        assigned_to_id: draftAssignedTo ? Number(draftAssignedTo) : undefined,
      });
      setCurrentLead(fresh);
      setDraftStage(fresh.stage);
      setDraftInterestId(fresh.interest_id ?? "");
      setDraftCategoryId(fresh.category_id ?? "");
      setDraftTemperature(fresh.temperature);
      setDraftAssignedTo(fresh.assigned_to ? String(fresh.assigned_to.id) : "");
      onChanged();
      setIsSaved(true);
      setTimeout(onClose, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleFollowUp(followUp: FollowUp) {
    setFollowUps((prev) => prev.map((f) => (f.id === followUp.id ? { ...f, completed: !f.completed } : f)));
    try {
      await setFollowUpCompleted(followUp.id, !followUp.completed);
    } catch (err) {
      setFollowUps((prev) => prev.map((f) => (f.id === followUp.id ? { ...f, completed: followUp.completed } : f)));
      setError(err instanceof Error ? err.message : "Failed to update follow-up.");
    }
  }

  async function handleAddFollowUp() {
    if (!currentLead || !newText || !newDate || !newTime) return;
    setIsAddingFollowUp(true);
    setError(null);
    try {
      await createFollowUp({ lead_id: currentLead.id, text: newText, due_date: newDate, due_time: newTime });
      setNewText("");
      setNewDate("");
      setNewTime("");
      await loadFollowUps(currentLead.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add follow-up.");
    } finally {
      setIsAddingFollowUp(false);
    }
  }

  async function handleDelete() {
    if (!currentLead) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteLead(currentLead.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lead.");
      setIsDeleting(false);
    }
  }

  const assignedName = currentLead.assigned_to
    ? `${currentLead.assigned_to.first_name} ${currentLead.assigned_to.last_name}`
    : "Unassigned";
  const interestName = interests.find((i) => i.id === currentLead.interest_id)?.name ?? "—";
  const categoryName = categories.find((c) => c.id === currentLead.category_id)?.name ?? "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-sidebar shadow-lg" onClick={(e) => e.stopPropagation()}>
        {isSaved ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 animate-[fade-in_300ms_ease-out]">
            <DotLottieReact
              src="/login/success.lottie"
              autoplay
              loop={false}
              style={{ width: 160, height: 160 }}
            />
            <p
              className="font-serif text-xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Changes saved
            </p>
            <p className="text-sm text-dash-muted">{currentLead.client_name} has been updated.</p>
          </div>
        ) : (
        <>
        <div className="flex items-center justify-between gap-4 border-b border-dash-border px-6 py-4">
          <div className="min-w-0">
            <h2
              className="truncate font-serif text-2xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {currentLead.client_name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-dash-muted">
              <PhoneIcon className="size-3" />
              {currentLead.client_number}
              {(currentLead.city || currentLead.area) && (
                <>
                  <span>·</span>
                  <span>{[currentLead.area, currentLead.city].filter(Boolean).join(", ")}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-dash-muted transition-colors hover:text-dash-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stage" htmlFor="stage">
              <Select
                id="stage"
                value={draftStage}
                onChange={setDraftStage}
                options={STAGES.map((s) => ({ id: s.id, name: s.label }))}
              />
            </Field>
            <Field label="Interest" htmlFor="interest">
              {admin ? (
                <Select
                  id="interest"
                  value={draftInterestId}
                  onChange={setDraftInterestId}
                  options={interests}
                  placeholder="Select interest"
                />
              ) : (
                <p className={inputClass}>{interestName}</p>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" htmlFor="category">
              {admin ? (
                <Select
                  id="category"
                  value={draftCategoryId}
                  onChange={setDraftCategoryId}
                  options={categories}
                  placeholder="Select category"
                />
              ) : (
                <p className={inputClass}>{categoryName}</p>
              )}
            </Field>
            <Field label="Assigned to" htmlFor="assigned-to">
              {admin ? (
                <Select
                  id="assigned-to"
                  value={draftAssignedTo}
                  onChange={setDraftAssignedTo}
                  options={agents}
                  placeholder="Unassigned"
                />
              ) : (
                <p className={inputClass}>{assignedName}</p>
              )}
            </Field>
          </div>

          <Field label="Temperature">
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(TEMP_STYLES) as LeadTemperature[]).map((temp) => (
                <button
                  key={temp}
                  type="button"
                  onClick={() => setDraftTemperature(temp)}
                  className={`rounded-xl border bg-white py-2 text-sm font-bold capitalize ${
                    draftTemperature === temp ? TEMP_STYLES[temp] : "border-dash-border text-dash-ink"
                  }`}
                >
                  {temp.charAt(0) + temp.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex items-center justify-between border-t border-dash-border pt-4">
            <p className="text-sm text-dash-muted">Budget</p>
            <p className="text-base font-bold text-dash-ink">{formatBudget(currentLead.budget)}</p>
          </div>

          <div className="flex flex-col gap-3 border-t border-dash-border pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">Follow-ups</p>

            {followUps.length === 0 && <p className="text-sm text-dash-placeholder">No follow-ups yet.</p>}

            <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
              {followUps.map((followUp) => (
                <label key={followUp.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={followUp.completed}
                    onChange={() => handleToggleFollowUp(followUp)}
                    className="size-4 shrink-0 accent-warm"
                  />
                  <span
                    className={`min-w-0 flex-1 break-words ${
                      followUp.completed ? "text-dash-muted line-through" : "text-dash-ink"
                    }`}
                  >
                    {followUp.text}
                  </span>
                  <span className="shrink-0 text-xs text-dash-muted">
                    {formatDueAt(followUp.due_date, followUp.due_time)}
                  </span>
                </label>
              ))}
            </div>

            {admin && (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Add a follow-up..."
                  className={inputClass}
                />
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleAddFollowUp}
                    disabled={isAddingFollowUp || !newText || !newDate || !newTime}
                    className="rounded-xl border border-dash-border px-5 text-sm font-bold text-dash-ink transition-colors hover:bg-dash-bg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-4 pt-2">
            {admin ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex shrink-0 items-center gap-2 text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-60"
              >
                <TrashIcon className="size-3.5" />
                {isDeleting ? "Deleting…" : "Delete lead"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-dash-ink"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

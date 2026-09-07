"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { createLead, getAgents, getCategories, getInterests, getSources } from "@/lib/api";

type Temperature = "HOT" | "WARM" | "COLD";
type Option = SelectOption;

type NewLeadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const UNASSIGNED_ID = "unassigned";

const TEMP_STYLES: Record<Temperature, string> = {
  HOT: "border-hot text-hot",
  WARM: "border-warm text-warm",
  COLD: "border-cold text-cold",
};

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

export function NewLeadModal({ isOpen, onClose }: NewLeadModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [interestId, setInterestId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [temperature, setTemperature] = useState<Temperature>("WARM");
  const [assignTo, setAssignTo] = useState(UNASSIGNED_ID);

  const [interests, setInterests] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [sources, setSources] = useState<Option[]>([]);
  const [agents, setAgents] = useState<Option[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const assigneeOptions: Option[] = [{ id: UNASSIGNED_ID, name: "Unassigned" }, ...agents];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadOptions() {
      setIsLoadingOptions(true);
      setError(null);
      try {
        const [interestList, categoryList, sourceList, agentList] = await Promise.all([
          getInterests(),
          getCategories(),
          getSources(),
          getAgents(),
        ]);
        setInterests(interestList);
        setCategories(categoryList);
        setSources(sourceList);
        setAgents(agentList.map((agent) => ({ id: String(agent.id), name: `${agent.first_name} ${agent.last_name}` })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load form options.");
      } finally {
        setIsLoadingOptions(false);
      }
    }
    void loadOptions();
  }, [isOpen]);

  if (!isOpen) return null;

  function resetForm() {
    setClientName("");
    setClientNumber("");
    setInterestId("");
    setCategoryId("");
    setCity("");
    setArea("");
    setBudget("");
    setSourceId("");
    setTemperature("WARM");
    setAssignTo(UNASSIGNED_ID);
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createLead({
        client_name: clientName,
        client_number: clientNumber,
        interest_id: interestId || undefined,
        category_id: categoryId || undefined,
        city: city || undefined,
        area: area || undefined,
        budget: budget ? Number(budget) : undefined,
        source_id: sourceId || undefined,
        temperature,
        assigned_to_id: assignTo !== UNASSIGNED_ID ? Number(assignTo) : undefined,
      });
      window.dispatchEvent(new CustomEvent("leads:changed"));
      setIsSuccess(true);
      setTimeout(handleClose, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    resetForm();
    setError(null);
    setIsSuccess(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="w-full max-w-xl rounded-xl bg-sidebar shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {isSuccess ? (
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
              Lead added
            </p>
            <p className="text-sm text-dash-muted">{clientName} is now in your pipeline.</p>
          </div>
        ) : (
        <>
        <div className="flex items-center justify-between border-b border-dash-border px-6 py-4">
          <h2
            className="font-serif text-2xl font-bold text-dash-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            New lead
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-dash-muted transition-colors hover:text-dash-ink"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-name" className="text-sm text-dash-muted">
                Client name
              </label>
              <input
                id="client-name"
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Full name"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-number" className="text-sm text-dash-muted">
                Client number
              </label>
              <input
                id="client-number"
                type="tel"
                required
                value={clientNumber}
                onChange={(e) => setClientNumber(e.target.value)}
                placeholder="03xx-xxxxxxx"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="interest" className="text-sm text-dash-muted">
                Interest
              </label>
              <Select
                id="interest"
                value={interestId}
                onChange={setInterestId}
                options={interests}
                placeholder={isLoadingOptions ? "Loading..." : "Select interest"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm text-dash-muted">
                Category
              </label>
              <Select
                id="category"
                value={categoryId}
                onChange={setCategoryId}
                options={categories}
                placeholder={isLoadingOptions ? "Loading..." : "Select category"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="city" className="text-sm text-dash-muted">
                City
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Karachi"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="area" className="text-sm text-dash-muted">
                Area
              </label>
              <input
                id="area"
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. DHA Phase 6"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="budget" className="text-sm text-dash-muted">
                Budget (PKR, optional)
              </label>
              <input
                id="budget"
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="source" className="text-sm text-dash-muted">
                Source
              </label>
              <Select
                id="source"
                value={sourceId}
                onChange={setSourceId}
                options={sources}
                placeholder={isLoadingOptions ? "Loading..." : "Select source"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-dash-muted">Temperature</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(TEMP_STYLES) as Temperature[]).map((temp) => (
                <button
                  key={temp}
                  type="button"
                  onClick={() => setTemperature(temp)}
                  className={`rounded-xl border bg-white py-2 text-sm font-bold capitalize ${
                    temperature === temp ? TEMP_STYLES[temp] : "border-dash-border text-dash-ink"
                  }`}
                >
                  {temp.charAt(0) + temp.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="assign-to" className="text-sm text-dash-muted">
              Assign to
            </label>
            <Select
              id="assign-to"
              value={assignTo}
              onChange={setAssignTo}
              options={assigneeOptions}
              placeholder={isLoadingOptions ? "Loading..." : "Select agent"}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-dash-ink"
            >
              {isSubmitting ? "Adding..." : "Add lead"}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}

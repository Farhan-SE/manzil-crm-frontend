"use client";

import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { PlusIcon, TrashIcon } from "@/components/icons/DashboardIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createTaxonomyItem,
  deleteTaxonomyItem,
  getCategories,
  getInterests,
  getSources,
  renameTaxonomyItem,
  type TaxonomyKind,
} from "@/lib/api";

const inputClass =
  "w-full min-w-0 rounded-lg border border-dash-border bg-white px-3 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

type TaxonomyItem = { id: string; name: string };

const FETCHERS = {
  interests: getInterests,
  sources: getSources,
  categories: getCategories,
};

export function TaxonomyModal({
  title,
  kind,
  hint,
  onClose,
  onChanged,
}: {
  title: string;
  kind: TaxonomyKind;
  hint: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await FETCHERS[kind]();
      setItems(list);
      setDrafts(Object.fromEntries(list.map((i) => [i.id, i.name])));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setIsLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setIsAdding(true);
    setError(null);
    try {
      await createTaxonomyItem(kind, name);
      setNewName("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleSave(item: TaxonomyItem) {
    const name = (drafts[item.id] ?? "").trim();
    if (!name || name === item.name) return;
    setBusyId(item.id);
    setError(null);
    try {
      await renameTaxonomyItem(kind, item.id, name);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't rename that.");
      setDrafts((prev) => ({ ...prev, [item.id]: item.name }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await deleteTaxonomyItem(kind, id);
      setPendingDeleteId(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-sidebar shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-4">
          <div className="min-w-0">
            <h2
              className="font-serif text-2xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-dash-muted">{hint}</p>
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

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
          {error && <p className="rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}

          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}

          {!isLoading && items.length === 0 && (
            <p className="rounded-lg border border-dashed border-dash-border py-8 text-center text-sm text-dash-placeholder">
              Nothing here yet. Add the first one below.
            </p>
          )}

          {!isLoading &&
            items.map((item) => {
              const draft = drafts[item.id] ?? "";
              const isDirty = draft.trim() !== item.name && draft.trim() !== "";
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft}
                    disabled={busyId === item.id}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSave(item);
                      if (e.key === "Escape") {
                        setDrafts((prev) => ({ ...prev, [item.id]: item.name }));
                      }
                    }}
                    className={inputClass}
                  />

                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => void handleSave(item)}
                      disabled={busyId === item.id}
                      className="shrink-0 rounded-lg bg-dash-ink px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:opacity-50"
                    >
                      Save
                    </button>
                  )}

                  {pendingDeleteId === item.id ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={busyId === item.id}
                        className="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="text-xs font-medium text-dash-muted transition-colors hover:text-dash-ink"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(item.id)}
                      aria-label={`Delete ${item.name}`}
                      className="shrink-0 rounded-lg border border-dash-border p-2 text-dash-muted transition-colors hover:border-red-200 hover:text-red-600"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
        </div>

        <form
          onSubmit={handleAdd}
          className="flex items-center gap-2 border-t border-dash-border px-6 py-4"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Add a new ${title.toLowerCase().replace(/e?s$/, "")}…`}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={isAdding || !newName.trim()}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-dash-ink px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon className="size-3" />
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

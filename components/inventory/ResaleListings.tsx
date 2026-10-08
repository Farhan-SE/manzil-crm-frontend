"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LockIcon, MapPinIcon, PlusIcon } from "@/components/icons/DashboardIcons";
import { ListingDetailModal } from "@/components/inventory/ListingDetailModal";
import { ListingFormModal, type ListingDraft } from "@/components/inventory/ListingFormModal";
import { FilterBar, FilterField, FilterInput } from "@/components/list/FilterBar";
import type { SelectOption } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createListing,
  deleteListing,
  getAgents,
  getCategories,
  getInterests,
  getListings,
  updateListing,
  type Listing,
} from "@/lib/api";
import { useIsAdmin } from "@/lib/session";

const cardClass =
  "flex cursor-pointer flex-col gap-3 rounded-[4px] border border-border bg-white p-4 text-left transition-colors hover:bg-sidebar";

const headerActionClass =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-dash-border bg-white px-3 text-xs text-primary transition-colors hover:bg-sidebar";

function formatPrice(price: number | null) {
  return price == null ? "—" : `PKR ${price.toLocaleString()}`;
}

/** Client-owned listings up for resale — the part of inventory that isn't a project's own units. */
export function ResaleListings({ onBack }: { onBack: () => void }) {
  const admin = useIsAdmin();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [interests, setInterests] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<SelectOption[]>([]);

  const [openListing, setOpenListing] = useState<Listing | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categoryNames = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const interestNames = useMemo(() => Object.fromEntries(interests.map((i) => [i.id, i.name])), [interests]);

  function categoryNameFor(id: string | null) {
    return (id && categoryNames[id]) || "Uncategorised";
  }

  function interestNameFor(id: string | null) {
    return (id && interestNames[id]) || "Any type";
  }

  useEffect(() => {
    Promise.all([getCategories(), getInterests()])
      .then(([categoryList, interestList]) => {
        setCategories(categoryList);
        setInterests(interestList);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!admin) return;
    getAgents()
      .then((list) =>
        setAgents(list.map((a) => ({ id: String(a.id), name: `${a.first_name} ${a.last_name}` }))),
      )
      .catch(() => {});
  }, [admin]);

  const load = useCallback(() => {
    getListings({ search: search || undefined })
      .then(setListings)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(draft: ListingDraft) {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingListing) {
        await updateListing(editingListing.id, draft);
      } else {
        await createListing(draft);
      }
      setIsFormOpen(false);
      setEditingListing(null);
      setOpenListing(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that listing.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(listing: Listing) {
    try {
      await deleteListing(listing.id);
      setOpenListing(null);
      load();
    } catch {
      /* the detail modal stays open so the row isn't silently lost */
    }
  }

  return (
    <>
      <FilterBar onSearch={() => setSearch(searchDraft.trim())}>
        <FilterField label="Resale listing">
          <FilterInput
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search area or city"
          />
        </FilterField>
      </FilterBar>

      <div className="flex min-h-[50px] flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 py-1.5 sm:px-8">
        <p className="mr-auto rounded-md bg-nav-active px-2.5 py-[5px] text-sm font-bold leading-[1.4] text-nav-active-fg">
          Resale (Client Listings)
        </p>
        {admin && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setEditingListing(null);
              setIsFormOpen(true);
            }}
            className={headerActionClass}
          >
            <PlusIcon className="size-2.5" />
            Seller lead
          </button>
        )}
        <button type="button" onClick={onBack} className={headerActionClass}>
          Project units
        </button>
      </div>

      <div className="px-4 py-6 sm:px-8">
        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-[4px] border border-border bg-white p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <p className="py-10 text-center text-xs text-dash-placeholder">
            {search ? "No listings match that search." : "No client listings yet."}
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {listings.map((listing) => (
              <button key={listing.id} type="button" onClick={() => setOpenListing(listing)} className={cardClass}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-bold text-ink">{listing.area_name}</p>
                  <span className="shrink-0 rounded-[20px] bg-badge-neutral px-2.5 py-0.5 text-[10px] text-primary">
                    {categoryNameFor(listing.category_id)}
                  </span>
                </div>

                <p className="truncate text-xs text-muted">{interestNameFor(listing.interest_id)}</p>

                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <MapPinIcon className="size-3 shrink-0" />
                  <span className="truncate">
                    {[listing.location, listing.city].filter(Boolean).join(", ") || "—"}
                  </span>
                </p>

                <p className="text-xs font-bold text-ink">{formatPrice(listing.price)}</p>

                <p className="flex items-center gap-1.5 border-t border-border pt-3 text-[10px] text-muted">
                  {listing.can_see_contact ? (
                    <span className="truncate">{listing.client_name}</span>
                  ) : (
                    <>
                      <LockIcon className="size-3 shrink-0" />
                      <span className="truncate">Contact hidden</span>
                    </>
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {isFormOpen && (
        <ListingFormModal
          key={editingListing?.id ?? "new-listing"}
          initial={editingListing}
          categories={categories}
          interests={interests}
          agents={agents}
          showAssignee={admin}
          isSaving={isSaving}
          error={formError}
          onClose={() => {
            setIsFormOpen(false);
            setEditingListing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {openListing && !isFormOpen && (
        <ListingDetailModal
          listing={openListing}
          categoryName={categoryNameFor(openListing.category_id)}
          interestName={interestNameFor(openListing.interest_id)}
          canManage={admin}
          onClose={() => setOpenListing(null)}
          onEdit={() => {
            setFormError(null);
            setEditingListing(openListing);
            setIsFormOpen(true);
          }}
          onDelete={() => handleDelete(openListing)}
        />
      )}
    </>
  );
}

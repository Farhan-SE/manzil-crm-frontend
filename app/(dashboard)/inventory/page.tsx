"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewTransition } from "react";
import { LockIcon, MapPinIcon, PlusIcon, SearchIcon } from "@/components/icons/DashboardIcons";
import { ListingDetailModal } from "@/components/inventory/ListingDetailModal";
import { ListingFormModal, type ListingDraft } from "@/components/inventory/ListingFormModal";
import { PartnerDetailModal } from "@/components/inventory/PartnerDetailModal";
import { PartnerFormModal, type PartnerDraft } from "@/components/inventory/PartnerFormModal";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SelectOption } from "@/components/ui/Select";
import {
  createListing,
  createPartnerProject,
  deleteListing,
  deletePartnerProject,
  getAgents,
  getCategories,
  getInterests,
  getListings,
  getPartnerProjects,
  updateListing,
  updatePartnerProject,
  type Listing,
  type PartnerProject,
} from "@/lib/api";
import { useIsAdmin } from "@/lib/session";

type View = "client" | "partner";

function formatPrice(price: number | null) {
  return price == null ? "—" : `PKR ${price.toLocaleString()}`;
}

const cardClass =
  "flex cursor-pointer flex-col gap-3 rounded-lg border border-dash-border bg-white p-4 text-left shadow-sm transition-colors hover:border-dash-muted/40 hover:bg-dash-bg/40";

export default function InventoryPage() {
  const admin = useIsAdmin();

  const [view, setView] = useState<View>("client");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [listings, setListings] = useState<Listing[]>([]);
  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [interests, setInterests] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<SelectOption[]>([]);

  const [openListing, setOpenListing] = useState<Listing | null>(null);
  const [openProject, setOpenProject] = useState<PartnerProject | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editingProject, setEditingProject] = useState<PartnerProject | null>(null);
  const [isListingFormOpen, setIsListingFormOpen] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );
  const interestNames = useMemo(
    () => Object.fromEntries(interests.map((i) => [i.id, i.name])),
    [interests],
  );

  function categoryNameFor(id: string | null) {
    return (id && categoryNames[id]) || "Uncategorised";
  }

  function interestNameFor(id: string | null) {
    return (id && interestNames[id]) || "Any type";
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

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
    const params = { search: debouncedSearch || undefined };
    Promise.all([getListings(params), getPartnerProjects(params)])
      .then(([listingList, projectList]) => {
        setListings(listingList);
        setProjects(projectList);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleListingSubmit(draft: ListingDraft) {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingListing) {
        await updateListing(editingListing.id, draft);
      } else {
        await createListing(draft);
      }
      setIsListingFormOpen(false);
      setEditingListing(null);
      setOpenListing(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that listing.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProjectSubmit(draft: PartnerDraft) {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingProject) {
        await updatePartnerProject(editingProject.id, draft);
      } else {
        await createPartnerProject(draft);
      }
      setIsProjectFormOpen(false);
      setEditingProject(null);
      setOpenProject(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that project.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteListing(listing: Listing) {
    try {
      await deleteListing(listing.id);
      setOpenListing(null);
      load();
    } catch {
      /* the detail modal stays open so the row isn't silently lost */
    }
  }

  async function handleDeleteProject(project: PartnerProject) {
    try {
      await deletePartnerProject(project.id);
      setOpenProject(null);
      load();
    } catch {
      /* same as above */
    }
  }

  const isClientView = view === "client";

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="font-serif text-[28px] font-semibold text-dash-ink sm:text-[34px]"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Inventory
        </h1>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isClientView ? "Search area, city..." : "Search project, developer..."}
              className="w-full rounded-lg border border-dash-border bg-sidebar py-2.5 pl-10 pr-3 text-sm text-dash-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          {admin && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                if (isClientView) {
                  setEditingListing(null);
                  setIsListingFormOpen(true);
                } else {
                  setEditingProject(null);
                  setIsProjectFormOpen(true);
                }
              }}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
            >
              <PlusIcon className="size-3" />
              {isClientView ? "Seller lead" : "Add project"}
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative grid w-full grid-cols-2 rounded-xl bg-badge-neutral p-1 sm:w-auto">
          {/* Sliding thumb: same width as one cell, so translate-x-full lands it exactly on the other. */}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out ${
              isClientView ? "translate-x-0" : "translate-x-full"
            }`}
          />
          {([
            ["client", "Client Listings", "Client Listings"],
            ["partner", "Sales Partner Inventory", "Partner Inventory"],
          ] as const).map(([id, label, shortLabel]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`relative z-10 whitespace-nowrap px-3 py-1.5 text-sm font-semibold transition-colors sm:px-5 ${
                view === id ? "text-dash-ink" : "text-dash-muted hover:text-dash-ink"
              }`}
            >
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-dash-border bg-white p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : isClientView ? (
        listings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-dash-border py-16 text-center text-sm text-dash-placeholder">
            {debouncedSearch ? "No listings match that search." : "No client listings yet."}
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {listings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => setOpenListing(listing)}
                className={cardClass}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-dash-ink">
                    {listing.area_name}
                  </p>
                  <span className="shrink-0 rounded-full bg-badge-neutral px-2 py-0.5 text-[11px] text-dash-ink">
                    {categoryNameFor(listing.category_id)}
                  </span>
                </div>

                <p className="truncate text-[13px] text-dash-muted">
                  {interestNameFor(listing.interest_id)}
                </p>

                <p className="flex items-center gap-1.5 text-[13px] text-dash-muted">
                  <MapPinIcon className="size-3 shrink-0" />
                  <span className="truncate">
                    {[listing.location, listing.city].filter(Boolean).join(", ") || "—"}
                  </span>
                </p>

                <p className="text-[15px] font-bold text-dash-ink">{formatPrice(listing.price)}</p>

                <p className="flex items-center gap-1.5 border-t border-dash-border pt-3 text-xs text-dash-muted">
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
        )
      ) : projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-dash-border py-16 text-center text-sm text-dash-placeholder">
          {debouncedSearch ? "No projects match that search." : "No partner projects yet."}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setOpenProject(project)}
              className={cardClass}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-dash-ink">
                  {project.project_name}
                </p>
                <span className="shrink-0 rounded-full bg-badge-neutral px-2 py-0.5 text-[11px] text-dash-ink">
                  {categoryNameFor(project.category_id)}
                </span>
              </div>

              <p className="truncate text-[13px] text-dash-muted">
                {interestNameFor(project.interest_id)}
                {project.developer ? ` · by ${project.developer}` : ""}
              </p>

              <p className="flex items-center gap-1.5 text-[13px] text-dash-muted">
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">
                  {[project.location, project.city].filter(Boolean).join(", ") || "—"}
                </span>
              </p>

              <p className="text-[15px] font-bold text-dash-ink">{formatPrice(project.price)}</p>
            </button>
          ))}
        </div>
      )}
    </div>

    {isListingFormOpen && (
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
          setIsListingFormOpen(false);
          setEditingListing(null);
        }}
        onSubmit={handleListingSubmit}
      />
    )}

    {isProjectFormOpen && (
      <PartnerFormModal
        key={editingProject?.id ?? "new-project"}
        initial={editingProject}
        categories={categories}
        interests={interests}
        isSaving={isSaving}
        error={formError}
        onClose={() => {
          setIsProjectFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleProjectSubmit}
      />
    )}

    {openListing && !isListingFormOpen && (
      <ListingDetailModal
        listing={openListing}
        categoryName={categoryNameFor(openListing.category_id)}
        interestName={interestNameFor(openListing.interest_id)}
        canManage={admin}
        onClose={() => setOpenListing(null)}
        onEdit={() => {
          setFormError(null);
          setEditingListing(openListing);
          setIsListingFormOpen(true);
        }}
        onDelete={() => handleDeleteListing(openListing)}
      />
    )}

    {openProject && !isProjectFormOpen && (
      <PartnerDetailModal
        project={openProject}
        categoryName={categoryNameFor(openProject.category_id)}
        interestName={interestNameFor(openProject.interest_id)}
        canManage={admin}
        onClose={() => setOpenProject(null)}
        onEdit={() => {
          setFormError(null);
          setEditingProject(openProject);
          setIsProjectFormOpen(true);
        }}
        onDelete={() => handleDeleteProject(openProject)}
      />
    )}
    </ViewTransition>
  );
}

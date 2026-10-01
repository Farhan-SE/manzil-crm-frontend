"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ViewTransition } from "react";
import {
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  UnitsIcon,
} from "@/components/icons/DashboardIcons";
import { PartnerDetailModal } from "@/components/inventory/PartnerDetailModal";
import { PartnerFormModal, type PartnerDraft } from "@/components/inventory/PartnerFormModal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createPartnerProject,
  deletePartnerProject,
  getCategories,
  getInterests,
  getPartnerProjects,
  setProjectStarred,
  updatePartnerProject,
  type PartnerProject,
} from "@/lib/api";
import { formatCompact, PROJECT_TYPES } from "@/lib/inventory";
import { useIsAdmin } from "@/lib/session";

// Spans only apply to the lg grid; below lg each row collapses into a card.
const COLS = {
  project: "lg:col-span-3",
  type: "lg:col-span-1",
  units: "lg:col-span-2",
  booking: "lg:col-span-2",
  price: "lg:col-span-2",
  developer: "lg:col-span-2",
  actions: "lg:col-span-1",
};

const headerCell = "text-xs font-bold uppercase tracking-[0.6px] text-dash-muted";

const actionButton =
  "flex size-8 items-center justify-center rounded-lg border border-dash-border text-dash-muted transition-colors hover:bg-dash-bg";

const NEW_FOR_DAYS = 30;

function isNew(project: PartnerProject) {
  return Date.now() - new Date(project.created_at).getTime() < NEW_FOR_DAYS * 86_400_000;
}

/** The range across the project's units; falls back to its starting price until units exist. */
function priceRange(project: PartnerProject) {
  if (project.price_min != null && project.price_max != null) {
    return project.price_min === project.price_max
      ? `PKR ${formatCompact(project.price_min)}`
      : `PKR ${formatCompact(project.price_min)} – ${formatCompact(project.price_max)}`;
  }
  return project.price != null ? `From PKR ${formatCompact(project.price)}` : "—";
}

function distinct(values: (string | null)[]): SelectOption[] {
  const unique = [...new Set(values.filter((v): v is string => Boolean(v?.trim())))].sort();
  return [{ id: "", name: "All" }, ...unique.map((v) => ({ id: v, name: v }))];
}

export default function ProjectsPage() {
  const admin = useIsAdmin();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [unitType, setUnitType] = useState("");

  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [interests, setInterests] = useState<SelectOption[]>([]);

  const [openProject, setOpenProject] = useState<PartnerProject | null>(null);
  const [editingProject, setEditingProject] = useState<PartnerProject | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categoryNames = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const interestNames = useMemo(() => Object.fromEntries(interests.map((i) => [i.id, i.name])), [interests]);

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

  // Projects are few enough to fetch in one go; tabs and the dropdown filters then work on that list.
  const load = useCallback(() => {
    getPartnerProjects({ search: debouncedSearch || undefined, limit: 500 })
      .then((list) => {
        setProjects(list);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects."))
      .finally(() => setIsLoading(false));
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const cityOptions = useMemo(() => distinct(projects.map((p) => p.city)), [projects]);
  const locationOptions = useMemo(() => distinct(projects.map((p) => p.location)), [projects]);
  const unitTypeOptions = useMemo(() => distinct(projects.flatMap((p) => p.unit_types)), [projects]);

  const filtered = projects.filter(
    (p) =>
      (!city || p.city === city) &&
      (!location || p.location === location) &&
      (!unitType || p.unit_types.includes(unitType)),
  );
  const activeCount = filtered.filter((p) => p.is_active).length;
  const visible = filtered.filter((p) => p.is_active === (tab === "active"));

  async function handleStarToggle(project: PartnerProject) {
    const next = !project.is_starred;
    const apply = (value: boolean) =>
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, is_starred: value } : p)));
    apply(next);
    try {
      await setProjectStarred(project.id, next);
    } catch (err) {
      apply(!next);
      setError(err instanceof Error ? err.message : "Couldn't update that project.");
    }
  }

  async function handleSubmit(draft: PartnerDraft) {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingProject) {
        await updatePartnerProject(editingProject.id, draft);
      } else {
        await createPartnerProject(draft);
      }
      setIsFormOpen(false);
      setEditingProject(null);
      setOpenProject(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that project.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(project: PartnerProject) {
    try {
      await deletePartnerProject(project.id);
      setOpenProject(null);
      load();
    } catch {
      /* the detail modal stays open so the row isn't silently lost */
    }
  }

  function openForm(project: PartnerProject | null) {
    setFormError(null);
    setEditingProject(project);
    setIsFormOpen(true);
  }

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="font-serif text-[28px] font-semibold text-dash-ink sm:text-[34px]"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Projects
        </h1>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project, developer..."
              className="w-full rounded-lg border border-dash-border bg-sidebar py-2.5 pl-10 pr-3 text-sm text-dash-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          {admin && (
            <button
              type="button"
              onClick={() => openForm(null)}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
            >
              <PlusIcon className="size-3" />
              Add project
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ["project-city", "City", city, setCity, cityOptions],
            ["project-location", "Location", location, setLocation, locationOptions],
            ["project-unit-type", "Unit type", unitType, setUnitType, unitTypeOptions],
          ] as const
        ).map(([id, label, value, onChange, options]) => (
          <div key={id} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-xs text-dash-muted">
              {label}
            </label>
            <Select id={id} value={value} onChange={onChange} options={options} />
          </div>
        ))}
      </div>

      <div className="border-b border-dash-border">
        <div className="-mb-px flex gap-1">
          {(
            [
              ["active", "Active", activeCount],
              ["inactive", "Inactive", filtered.length - activeCount],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border-b-2 px-3 py-2.5 text-sm transition-colors ${
                tab === id
                  ? "border-dash-ink font-semibold text-dash-ink"
                  : "border-transparent text-dash-muted hover:text-dash-ink"
              }`}
            >
              {label}
              {!isLoading && <span className="ml-1 text-xs font-normal text-dash-muted">({count})</span>}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-dash-border">
        <div className="hidden gap-4 border-b border-dash-border bg-dash-bg/50 px-6 py-4 lg:grid lg:grid-cols-13">
          <p className={`${COLS.project} ${headerCell} pl-7`}>Project</p>
          <p className={`${COLS.type} ${headerCell}`}>Type</p>
          <p className={`${COLS.units} ${headerCell}`}>Unit types</p>
          <p className={`${COLS.booking} ${headerCell}`}>Booking info</p>
          <p className={`${COLS.price} ${headerCell}`}>Price range</p>
          <p className={`${COLS.developer} ${headerCell}`}>Developer</p>
          <p className={`${COLS.actions} ${headerCell}`}>Actions</p>
        </div>

        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex flex-wrap items-center gap-3 bg-white px-4 py-4 lg:grid lg:grid-cols-13 lg:gap-4 lg:px-6 ${
                i > 0 ? "border-t border-dash-border" : ""
              }`}
            >
              <Skeleton className={`${COLS.project} h-4 w-40`} />
              <Skeleton className={`${COLS.type} hidden h-4 w-14 lg:block`} />
              <Skeleton className={`${COLS.units} hidden h-4 w-24 lg:block`} />
              <Skeleton className={`${COLS.booking} hidden h-4 w-24 lg:block`} />
              <Skeleton className={`${COLS.price} h-4 w-24`} />
              <Skeleton className={`${COLS.developer} hidden h-4 w-24 lg:block`} />
              <Skeleton className={`${COLS.actions} hidden h-8 w-16 lg:block`} />
            </div>
          ))}

        {!isLoading && visible.length === 0 && (
          <p className="bg-white px-4 py-10 text-center text-sm text-dash-placeholder lg:px-6">
            {projects.length === 0 && !debouncedSearch
              ? "No projects yet."
              : `No ${tab} projects match those filters.`}
          </p>
        )}

        {!isLoading &&
          visible.map((project, i) => {
            const typeName = PROJECT_TYPES.find((t) => t.id === project.project_type)?.name ?? project.project_type;
            return (
              <div
                key={project.id}
                onClick={() => setOpenProject(project)}
                className={`flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 bg-white px-4 py-4 transition-colors hover:bg-dash-bg/40 lg:grid lg:grid-cols-13 lg:gap-4 lg:px-6 ${
                  i > 0 ? "border-t border-dash-border" : ""
                }`}
              >
                <div className={`${COLS.project} flex min-w-0 flex-1 items-center gap-3 lg:flex-none`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleStarToggle(project);
                    }}
                    aria-label={project.is_starred ? "Remove star" : "Add star"}
                    aria-pressed={project.is_starred}
                    className={`shrink-0 transition-colors ${
                      project.is_starred ? "text-warm" : "text-dash-muted hover:text-dash-ink"
                    }`}
                  >
                    <StarIcon className="size-4" filled={project.is_starred} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stage-inquiry">{project.project_name}</p>
                    <div className="flex items-center gap-1.5">
                      {isNew(project) && (
                        <span className="rounded bg-stage-sold/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.45px] text-stage-sold">
                          New
                        </span>
                      )}
                      {project.grade && (
                        <span className="rounded bg-badge-neutral px-1.5 py-0.5 text-[9px] font-bold text-dash-muted">
                          {project.grade}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className={`${COLS.type} hidden truncate text-sm text-dash-ink lg:block`}>{typeName}</p>

                <div className={`${COLS.units} hidden min-w-0 lg:block`}>
                  <p className="truncate text-sm text-dash-ink" title={project.unit_types.join(", ")}>
                    {project.unit_types.join(", ") || "—"}
                  </p>
                  <p className="truncate text-[11px] text-dash-muted">
                    Available units: {project.available_units}
                  </p>
                </div>

                <div className={`${COLS.booking} hidden min-w-0 text-[11px] text-dash-muted lg:block`}>
                  <p className="truncate text-sm text-dash-ink">
                    Token: {project.token_amount != null ? `PKR ${formatCompact(project.token_amount)}` : "—"}
                  </p>
                  <p className="truncate">
                    PDP: {project.pdp_percent != null ? `${project.pdp_percent}%` : "—"} · CDP:{" "}
                    {project.cdp_percent != null ? `${project.cdp_percent}%` : "—"}
                  </p>
                </div>

                <p className={`${COLS.price} truncate text-sm text-dash-ink`}>{priceRange(project)}</p>

                <div className={`${COLS.developer} hidden min-w-0 lg:block`}>
                  <p className="truncate text-sm text-dash-ink">{project.developer || "—"}</p>
                  <p className="truncate text-[11px] text-dash-muted">
                    {[project.location, project.city].filter(Boolean).join(", ")}
                  </p>
                </div>

                {/* Below lg the desktop-only columns fold into one summary line. */}
                <p className="w-full truncate text-xs text-dash-muted lg:hidden">
                  {[typeName, project.developer, project.city, `${project.available_units} available`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <div className={`${COLS.actions} flex items-center gap-1.5`}>
                  <Link
                    href={`/inventory?project=${project.id}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`View units of ${project.project_name}`}
                    title="View units"
                    className={actionButton}
                  >
                    <UnitsIcon className="size-3.5" />
                  </Link>
                  {admin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openForm(project);
                      }}
                      aria-label={`Edit ${project.project_name}`}
                      title="Edit"
                      className={actionButton}
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>

    {isFormOpen && (
      <PartnerFormModal
        key={editingProject?.id ?? "new-project"}
        initial={editingProject}
        categories={categories}
        interests={interests}
        isSaving={isSaving}
        error={formError}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleSubmit}
      />
    )}

    {openProject && !isFormOpen && (
      <PartnerDetailModal
        project={openProject}
        categoryName={(openProject.category_id && categoryNames[openProject.category_id]) || "Uncategorised"}
        interestName={(openProject.interest_id && interestNames[openProject.interest_id]) || "Any type"}
        canManage={admin}
        onClose={() => setOpenProject(null)}
        onEdit={() => openForm(openProject)}
        onDelete={() => handleDelete(openProject)}
      />
    )}
    </ViewTransition>
  );
}

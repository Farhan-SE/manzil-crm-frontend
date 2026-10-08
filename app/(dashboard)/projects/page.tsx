"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewTransition } from "react";
import { PlusIcon, StarIcon } from "@/components/icons/DashboardIcons";
import { PartnerDetailModal } from "@/components/inventory/PartnerDetailModal";
import { PartnerFormModal, type PartnerDraft } from "@/components/inventory/PartnerFormModal";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/list/FilterBar";
import { RowMenu } from "@/components/list/RowMenu";
import { FavouritesButton, SortButton, StatusTabs } from "@/components/list/StatusTabs";
import { TablePagination } from "@/components/list/TablePagination";
import { headCellClass, headRowClass, rowClass, subTextClass, tableClass } from "@/components/list/tableStyles";
import type { SelectOption } from "@/components/ui/Select";
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
import { formatCompact, isNewProject, PROJECT_TYPES } from "@/lib/inventory";
import { useIsAdmin } from "@/lib/session";

type Tab = "active" | "inactive";
type Filters = { search: string; city: string; location: string; unitType: string };

const EMPTY_FILTERS: Filters = { search: "", city: "", location: "", unitType: "" };

const COLUMN_COUNT = 7;

const headerActionClass =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-border bg-white px-3 text-xs text-primary transition-colors hover:bg-sidebar";

/** The range across the project's units; falls back to its starting price until units exist. */
function priceRange(project: PartnerProject) {
  if (project.price_min != null && project.price_max != null) {
    return project.price_min === project.price_max
      ? `PKR ${formatCompact(project.price_min)}`
      : `PKR ${formatCompact(project.price_min)} – ${formatCompact(project.price_max)}`;
  }
  return project.price != null ? `From PKR ${formatCompact(project.price)}` : "—";
}

function distinct(values: (string | null)[]) {
  return [...new Set(values.filter((v): v is string => Boolean(v?.trim())))].sort();
}

export default function ProjectsPage() {
  const admin = useIsAdmin();

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<Tab>("active");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    Promise.all([getCategories(), getInterests()])
      .then(([categoryList, interestList]) => {
        setCategories(categoryList);
        setInterests(interestList);
      })
      .catch(() => {});
  }, []);

  // Projects are few enough to fetch in one go; tabs, filters, sorting and paging then work on that list.
  const load = useCallback(() => {
    getPartnerProjects({ limit: 500 })
      .then((list) => {
        setProjects(list);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cityOptions = useMemo(() => distinct(projects.map((p) => p.city)), [projects]);
  const locationOptions = useMemo(() => distinct(projects.map((p) => p.location)), [projects]);
  const unitTypeOptions = useMemo(() => distinct(projects.flatMap((p) => p.unit_types)), [projects]);

  const search = filters.search.trim().toLowerCase();
  const filtered = projects.filter(
    (p) =>
      (!search ||
        [p.project_name, p.developer, p.city, p.location].some((value) => value?.toLowerCase().includes(search))) &&
      (!filters.city || p.city === filters.city) &&
      (!filters.location || p.location === filters.location) &&
      (!filters.unitType || p.unit_types.includes(filters.unitType)) &&
      (!favouritesOnly || p.is_starred),
  );
  const counts = { active: filtered.filter((p) => p.is_active).length, inactive: 0 };
  counts.inactive = filtered.length - counts.active;
  const visible = filtered
    .filter((p) => p.is_active === (tab === "active"))
    .sort((a, b) => (sort === "desc" ? 1 : -1) * b.created_at.localeCompare(a.created_at));
  const pageRows = visible.slice((page - 1) * pageSize, page * pageSize);
  const isFiltered = Object.values(filters).some(Boolean) || favouritesOnly;

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

  async function handleSubmit(projectDraft: PartnerDraft) {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingProject) {
        await updatePartnerProject(editingProject.id, projectDraft);
      } else {
        await createPartnerProject(projectDraft);
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
      <div className="flex w-full flex-col">
        <h1 className="sr-only">Projects</h1>
        <FilterBar
          onSearch={() => {
            setFilters(draft);
            setPage(1);
          }}
        >
          <FilterField label="Project">
            <FilterInput
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              placeholder="Search Project"
            />
          </FilterField>
          <FilterField label="City">
            <FilterSelect
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              placeholder="Select City"
            >
              {cityOptions.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Location">
            <FilterSelect
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Select Location"
            >
              {locationOptions.map((location) => (
                <option key={location}>{location}</option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Unit Types">
            <FilterSelect
              value={draft.unitType}
              onChange={(e) => setDraft({ ...draft, unitType: e.target.value })}
              placeholder="Select Unit Types"
            >
              {unitTypeOptions.map((unitType) => (
                <option key={unitType}>{unitType}</option>
              ))}
            </FilterSelect>
          </FilterField>
        </FilterBar>

        <StatusTabs
          tabs={[
            { id: "active" as const, label: "Active", count: isLoading ? null : counts.active },
            { id: "inactive" as const, label: "Inactive", count: isLoading ? null : counts.inactive },
          ]}
          active={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
        >
          {admin && (
            <button type="button" onClick={() => openForm(null)} className={headerActionClass}>
              <PlusIcon className="size-2.5" />
              Add project
            </button>
          )}
          <FavouritesButton
            active={favouritesOnly}
            onChange={(next) => {
              setFavouritesOnly(next);
              setPage(1);
            }}
          />
          <SortButton sort={sort} onChange={setSort} />
        </StatusTabs>

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        <div className="px-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th scope="col" className="w-8" />
                <th scope="col" className={headCellClass}>Project</th>
                <th scope="col" className={`${headCellClass} hidden w-[14%] lg:table-cell`}>Type</th>
                <th scope="col" className={`${headCellClass} hidden w-[18%] lg:table-cell`}>Unit types</th>
                <th scope="col" className={`${headCellClass} hidden w-[13%] lg:table-cell`}>Booking info</th>
                <th scope="col" className={`${headCellClass} w-[34%] lg:w-[15%]`}>Price range</th>
                <th scope="col" className="w-[40px] lg:w-[4%]" />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className={`${rowClass} !h-[162px]`}>
                    <td colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-placeholder">
                    {isFiltered ? `No ${tab} projects match those filters.` : `No ${tab} projects yet.`}
                  </td>
                </tr>
              )}

              {!isLoading &&
                pageRows.map((project) => {
                  const typeName =
                    PROJECT_TYPES.find((t) => t.id === project.project_type)?.name ?? project.project_type;
                  return (
                    <tr
                      key={project.id}
                      onClick={() => setOpenProject(project)}
                      className={`${rowClass} !h-[162px] cursor-pointer hover:bg-white/60`}
                    >
                      <td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleStarToggle(project);
                          }}
                          aria-label={project.is_starred ? "Remove from favourites" : "Add to favourites"}
                          aria-pressed={project.is_starred}
                          className="block text-warm-ink"
                        >
                          <StarIcon className="size-4" filled={project.is_starred} />
                        </button>
                      </td>
                      <td className="pr-3">
                        <p className="truncate">
                          {project.project_name}
                          {isNewProject(project.created_at) && (
                            <span className="ml-2.5 text-[11px] text-primary">New</span>
                          )}
                        </p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{typeName}</p>
                        <p className={subTextClass}>
                          {(project.category_id && categoryNames[project.category_id]) || "—"}
                        </p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        {project.unit_types.length > 0 ? (
                          <>
                            <p className="truncate" title={project.unit_types.join(", ")}>
                              {project.unit_types.join(", ")}
                            </p>
                            <p className={subTextClass}>Available units: {project.available_units}</p>
                          </>
                        ) : (
                          <p className="text-[11px] text-muted">Available Units: 0</p>
                        )}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate text-[11px]">
                          Token: {project.token_amount != null ? `PKR ${formatCompact(project.token_amount)}` : "—"}
                        </p>
                        <p className={subTextClass}>
                          PDP: {project.pdp_percent != null ? `${project.pdp_percent}%` : "—"}
                        </p>
                        <p className={subTextClass}>
                          CDP: {project.cdp_percent != null ? `${project.cdp_percent}%` : "—"}
                        </p>
                      </td>
                      <td className="truncate pr-3">{priceRange(project)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          label={`More actions for ${project.project_name}`}
                          items={[
                            { label: "View project", onClick: () => setOpenProject(project) },
                            { label: "View units", href: `/inventory?project=${project.id}` },
                            ...(admin ? [{ label: "Edit project", onClick: () => openForm(project) }] : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={visible.length}
          noun={`${tab} projects`}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
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

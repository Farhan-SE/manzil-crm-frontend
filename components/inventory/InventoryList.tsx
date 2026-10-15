"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ViewTransition } from "react";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { UnitFormModal } from "@/components/inventory/UnitFormModal";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/list/FilterBar";
import { RowMenu } from "@/components/list/RowMenu";
import { FavouritesButton, SortButton, StatusTabs, type StatusTab } from "@/components/list/StatusTabs";
import { TablePagination } from "@/components/list/TablePagination";
import {
  headCellClass,
  headRowClass,
  rowClass,
  subTextClass,
  tableClass,
} from "@/components/list/tableStyles";
import type { SelectOption } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createUnit,
  deleteUnit,
  getPartnerProjects,
  getUnits,
  setUnitStarred,
  updateUnit,
  type Unit,
  type UnitInput,
  type UnitStatus,
  type InventoryType,
} from "@/lib/api";
import { UNIT_STATUSES } from "@/lib/inventory";
import { useCan } from "@/lib/session";

type Filters = { projectId: string; unitType: string; search: string };

const COLUMN_COUNT = 10;

const headerActionClass =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-border bg-white px-3 text-xs text-primary transition-colors hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-50";

const TITLES: Record<InventoryType, string> = { direct: "Direct inventory", partner: "Sales partner inventory" };

/** The units of one inventory. The direct and sales partner pages differ only in which they list. */
export function InventoryList({ inventoryType }: { inventoryType: InventoryType }) {
  return (
    <Suspense fallback={null}>
      <Inventory inventoryType={inventoryType} />
    </Suspense>
  );
}

function Inventory({ inventoryType }: { inventoryType: InventoryType }) {
  const canManage = useCan("inventory.manage");
  const canApprove = useCan("inventory.approve");
  // Seeded from ?project= so the projects page can link straight to one project's units.
  const initialProject = useSearchParams().get("project") ?? "";

  const [draft, setDraft] = useState<Filters>({ projectId: initialProject, unitType: "", search: "" });
  const [filters, setFilters] = useState<Filters>({ projectId: initialProject, unitType: "", search: "" });
  const [status, setStatus] = useState<UnitStatus | "all">("all");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [units, setUnits] = useState<Unit[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<UnitStatus, number> | null>(null);
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<SelectOption[]>([]);
  const [owners, setOwners] = useState<Record<string, { name: string | null; phone: string | null }>>({});
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getPartnerProjects({ limit: 500 })
      .then((list) => {
        setProjects(list.map((p) => ({ id: p.id, name: p.project_name })));
        setOwners(Object.fromEntries(list.map((p) => [p.id, { name: p.owner_name ?? null, phone: p.owner_phone ?? null }])));
      })
      .catch(() => {});
  }, []);

  const loadUnits = useCallback(() => {
    getUnits({
      inventory_type: inventoryType,
      project_id: filters.projectId || undefined,
      unit_type: filters.unitType || undefined,
      search: filters.search.trim() || undefined,
      status: status === "all" ? undefined : status,
      starred: favouritesOnly ? "true" : undefined,
      sort,
      page,
      limit: pageSize,
    })
      .then((res) => {
        // Deleting the last row on a page would otherwise strand you on an empty one.
        if (res.data.length === 0 && page > 1) setPage((p) => p - 1);
        setUnits(res.data);
        setTotal(res.total);
        setStatusCounts(res.status_counts);
        setUnitTypes(res.unit_types);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load units."))
      .finally(() => setIsLoading(false));
  }, [inventoryType, filters, status, favouritesOnly, sort, page, pageSize]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  function resetPaging() {
    setPage(1);
  }

  function changeStatus(next: UnitStatus | "all") {
    setStatus(next);
    resetPaging();
  }

  async function handleUnitSubmit(unitDraft: UnitInput) {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, unitDraft);
      } else {
        await createUnit(unitDraft);
      }
      setIsUnitFormOpen(false);
      setEditingUnit(null);
      loadUnits();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that unit.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteUnit(unit: Unit) {
    if (!window.confirm(`Delete unit ${unit.unit_number}? This can't be undone.`)) return;
    try {
      await deleteUnit(unit.id);
      loadUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that unit.");
    }
  }

  async function handleStarToggle(unit: Unit) {
    try {
      await setUnitStarred(unit.id, !unit.is_starred);
      loadUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that unit.");
    }
  }

  function openUnitForm(unit: Unit | null) {
    setFormError(null);
    setEditingUnit(unit);
    setIsUnitFormOpen(true);
  }

  const allCount = statusCounts ? Object.values(statusCounts).reduce((sum, n) => sum + n, 0) : null;
  const tabs: StatusTab<UnitStatus | "all">[] = [
    { id: "all", label: "All", count: allCount },
    ...UNIT_STATUSES.map((s) => ({ id: s.id, label: s.tab, count: statusCounts?.[s.id] ?? null })),
  ];
  const isFiltered = Object.values(filters).some(Boolean) || favouritesOnly || status !== "all";
  const selectedProjectName = projects.find((p) => p.id === filters.projectId)?.name;

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <h1 className="sr-only">{TITLES[inventoryType]}</h1>
        <FilterBar
          onSearch={() => {
            setFilters(draft);
            resetPaging();
          }}
        >
          <FilterField label="Project">
            <FilterSelect
              value={draft.projectId}
              onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}
              placeholder="Search Project"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Unit Types">
            <FilterSelect
              value={draft.unitType}
              onChange={(e) => setDraft({ ...draft, unitType: e.target.value })}
              placeholder="Select Unit Types"
            >
              {unitTypes.map((unitType) => (
                <option key={unitType}>{unitType}</option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Unit Number">
            <FilterInput
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              placeholder="Search Unit Number"
            />
          </FilterField>
          <FilterField label="Status">
            <FilterSelect
              value={status === "all" ? "" : status}
              onChange={(e) => changeStatus((e.target.value || "all") as UnitStatus | "all")}
              placeholder="Select Status"
            >
              {UNIT_STATUSES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
        </FilterBar>

        <StatusTabs tabs={tabs} active={status} onChange={changeStatus}>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              disabled={!filters.projectId}
              title={filters.projectId ? undefined : "Filter by a project first"}
              className={headerActionClass}
            >
              Import
            </button>
          )}
          <button type="button" onClick={() => openUnitForm(null)} className={headerActionClass}>
            <PlusIcon className="size-2.5" />
            Add unit
          </button>
          <FavouritesButton
            active={favouritesOnly}
            onChange={(next) => {
              setFavouritesOnly(next);
              resetPaging();
            }}
          />
          <SortButton
            sort={sort}
            onChange={(next) => {
              setSort(next);
              setPage(1);
            }}
          />
        </StatusTabs>

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        <div className="px-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th scope="col" className={`${headCellClass} w-[30%] lg:w-[12%]`}>Unit</th>
                <th scope="col" className={headCellClass}>Project</th>
                <th scope="col" className={`${headCellClass} hidden w-[5%] lg:table-cell`}>Feat</th>
                <th scope="col" className={`${headCellClass} hidden w-[11%] lg:table-cell`}>Type</th>
                <th scope="col" className={`${headCellClass} hidden w-[10%] lg:table-cell`}>Location</th>
                <th scope="col" className={`${headCellClass} hidden w-[6%] lg:table-cell`}>Beds</th>
                <th scope="col" className={`${headCellClass} hidden w-[11%] sm:table-cell`}>Price (PKR)</th>
                <th scope="col" className={`${headCellClass} hidden w-[9%] lg:table-cell`}>Area (sqft)</th>
                <th scope="col" className={`${headCellClass} w-[96px] lg:w-[13%]`}>Status</th>
                <th scope="col" className="w-[40px] lg:w-[8%]" />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={`${rowClass} !h-[100px]`}>
                    <td colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && units.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-placeholder">
                    {isFiltered
                      ? "No units match those filters."
                      : "No units yet. Add a unit, or filter by a project and import a CSV."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                units.map((unit) => {
                  const unitStatus = UNIT_STATUSES.find((entry) => entry.id === unit.status);
                  return (
                    <tr key={unit.id} className={`${rowClass} !h-[100px]`}>
                      <td className="truncate pr-3">{unit.unit_number}</td>
                      <td className="pr-3">
                        <p className="line-clamp-2">{unit.project?.name ?? "—"}</p>
                      </td>
                      <td className="hidden truncate pr-3 lg:table-cell" title={unit.features ?? undefined}>
                        {unit.features || "-"}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="line-clamp-2">{unit.unit_type || "-"}</p>
                      </td>
                      <td className="hidden truncate pr-3 lg:table-cell" title={unit.floor ?? undefined}>
                        {unit.floor || "-"}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">{unit.beds != null ? `Beds ${unit.beds}` : "-"}</td>
                      <td className="hidden truncate pr-3 sm:table-cell">
                        {unit.price != null ? unit.price.toLocaleString() : "-"}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        {unit.area_sqft != null ? unit.area_sqft.toLocaleString() : "-"}
                      </td>
                      <td className="pr-3">
                        <p className="truncate">
                          {unit.approval_status === "approved"
                            ? (unitStatus?.label ?? unit.status)
                            : unit.approval_status === "pending"
                              ? "Awaiting approval"
                              : "Not approved"}
                        </p>
                        <p className={subTextClass}>
                          {unit.lead ? `Lead ${unit.lead.lead_no} · ${unit.lead.client_name}` : "Payment Plan"}
                        </p>
                      </td>
                      <td>
                        <RowMenu
                          label={`More actions for unit ${unit.unit_number}`}
                          items={[
                            {
                              label: unit.is_starred ? "Remove from favourites" : "Add to favourites",
                              onClick: () => void handleStarToggle(unit),
                            },
                            ...(canManage
                              ? [
                                  { label: "Edit unit", onClick: () => openUnitForm(unit) },
                                  { label: "Delete unit", onClick: () => void handleDeleteUnit(unit) },
                                ]
                              : []),
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
          total={total}
          noun="units"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isUnitFormOpen && (
        <UnitFormModal
          key={editingUnit?.id ?? "new-unit"}
          initial={editingUnit}
          defaultProjectId={filters.projectId}
          projects={projects}
          owners={canManage ? owners : undefined}
          inventoryType={inventoryType}
          needsApproval={!canApprove}
          unitTypes={unitTypes}
          isSaving={isSaving}
          error={formError}
          onClose={() => {
            setIsUnitFormOpen(false);
            setEditingUnit(null);
          }}
          onSubmit={handleUnitSubmit}
        />
      )}

      {isImportOpen && (
        <ImportCsvModal
          kind="units"
          projectId={filters.projectId}
          projectName={selectedProjectName}
          onClose={() => setIsImportOpen(false)}
          onImported={loadUnits}
        />
      )}
    </ViewTransition>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/list/FilterBar";
import { RowMenu } from "@/components/list/RowMenu";
import { StatusBadge } from "@/components/list/StatusBadge";
import { FavouritesButton, SortButton, StatusTabs } from "@/components/list/StatusTabs";
import { TablePagination } from "@/components/list/TablePagination";
import {
  checkboxClass,
  headCellClass,
  headRowClass,
  rowClass,
  subTextClass,
  tableClass,
} from "@/components/list/tableStyles";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getLocations,
  getPartnerProjects,
  setLocationStarred,
  updateLocation,
  type Location,
  type LocationsQuery,
  type LocationTab,
  type PartnerProject,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useIsAdmin } from "@/lib/session";

type Filters = { search: string; city: string; projectId: string; region: string };

const EMPTY_FILTERS: Filters = { search: "", city: "", projectId: "", region: "" };

const TABS: { id: LocationTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const EXPORT_LIMIT = 1000;

const COLUMN_COUNT = 9;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

function locationCode(location: Location) {
  return `LOC-${String(location.location_no).padStart(3, "0")}`;
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export default function LocationsPage() {
  const admin = useIsAdmin();

  const [locations, setLocations] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<LocationTab, number> | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<LocationTab>("all");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<PartnerProject[]>([]);

  useEffect(() => {
    getPartnerProjects({ limit: 500 }).then(setProjects).catch(() => {});
  }, []);

  const buildQuery = useCallback(
    (): LocationsQuery => ({
      status: tab,
      search: filters.search.trim() || undefined,
      city: filters.city || undefined,
      project_id: filters.projectId || undefined,
      region: filters.region || undefined,
      starred: favouritesOnly ? "true" : undefined,
      sort,
    }),
    [tab, filters, favouritesOnly, sort],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getLocations({ ...buildQuery(), page, limit: pageSize });
      setLocations(res.data);
      setTotal(res.total);
      setStatusCounts(res.status_counts);
      setCities(res.cities);
      setRegions(res.regions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations.");
      setLocations([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: Promise<unknown>) {
    try {
      await action;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that location.");
    }
    void load();
  }

  async function exportLocations() {
    try {
      const res = await getLocations({ ...buildQuery(), page: 1, limit: EXPORT_LIMIT });
      downloadCsv(`locations-${new Date().toLocaleDateString("en-CA")}.csv`, [
        ["Location ID", "Location", "City", "Project coverage", "Region", "Department", "Projects", "Available units", "Status"],
        ...res.data.map((location) => [
          locationCode(location),
          location.name,
          location.city ?? "",
          location.coverage_project ?? "",
          location.region ?? "",
          location.department ?? "",
          String(location.project_count),
          String(location.available_units),
          location.is_active ? "Active" : "Inactive",
        ]),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export locations.");
    }
  }

  function resetPaging() {
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const isFiltered = Object.values(filters).some(Boolean) || favouritesOnly || tab !== "all";
  const allSelected = locations.length > 0 && locations.every((location) => selected.has(location.id));

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-dash-ink" style={headingStyle}>
              Locations
            </h1>
            <p className="text-[10px] text-dash-muted">Location coverage · Project and inventory register</p>
          </div>
          <button
            type="button"
            onClick={() => void exportLocations()}
            disabled={total === 0}
            className="flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-dash-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60"
          >
            <Icon name="download" className="size-4" />
            Export
          </button>
        </div>

        <FilterBar
          onSearch={() => {
            setFilters(draft);
            resetPaging();
          }}
        >
          <FilterField label="Location">
            <FilterInput
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              placeholder="Search Location"
            />
          </FilterField>
          <FilterField label="City">
            <FilterSelect
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              placeholder="Select City"
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Project">
            <FilterSelect
              value={draft.projectId}
              onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}
              placeholder="Search Project"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Region">
            <FilterSelect
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              placeholder="Select Region"
            >
              {regions.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </FilterSelect>
          </FilterField>
        </FilterBar>

        <StatusTabs
          tabs={TABS.map((entry) => ({ ...entry, count: statusCounts?.[entry.id] ?? null }))}
          active={tab}
          onChange={(next) => {
            setTab(next);
            resetPaging();
          }}
        >
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
                <th className="hidden w-8 lg:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all locations"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(locations.map((location) => location.id)))
                    }
                    className={checkboxClass}
                  />
                </th>
                <th className={headCellClass}>Location</th>
                <th className={`${headCellClass} w-[24%] lg:w-[10%]`}>City</th>
                <th className={`${headCellClass} hidden w-[21%] lg:table-cell`}>Project coverage</th>
                <th className={`${headCellClass} hidden w-[16%] lg:table-cell`}>Region / Department</th>
                <th className={`${headCellClass} hidden w-[9%] lg:table-cell`}>Projects</th>
                <th className={`${headCellClass} hidden w-[13%] sm:table-cell`}>Available inventory</th>
                <th className={`${headCellClass} w-[84px] lg:w-[9%]`}>Status</th>
                <th className={`${headCellClass} w-[40px] text-[9px] lg:w-[5%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={`${rowClass} !h-[74px]`}>
                    <td colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && locations.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    {isFiltered
                      ? "No locations match those filters."
                      : "No locations yet. They appear as projects are given a location."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                locations.map((location) => (
                  <tr key={location.id} className={`${rowClass} !h-[74px]`}>
                    <td className="hidden lg:table-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${locationCode(location)}`}
                        checked={selected.has(location.id)}
                        onChange={() => toggleSelected(location.id)}
                        className={checkboxClass}
                      />
                    </td>
                    <td className="pr-3">
                      <p>{locationCode(location)}</p>
                      <p className={subTextClass}>{location.name}</p>
                    </td>
                    <td className="truncate pr-3">{location.city ?? "—"}</td>
                    <td className="hidden pr-3 lg:table-cell">
                      <p className="truncate">{location.coverage_project ?? "—"}</p>
                      {location.coverage_unit_types && (
                        <p className={subTextClass}>{location.coverage_unit_types}</p>
                      )}
                    </td>
                    <td className="hidden pr-3 lg:table-cell">
                      <p className="truncate">{location.region ?? "—"}</p>
                      {location.department && <p className={subTextClass}>{location.department}</p>}
                    </td>
                    <td className="hidden pr-3 lg:table-cell">{plural(location.project_count, "project")}</td>
                    <td className="hidden pr-3 sm:table-cell">{plural(location.available_units, "unit")}</td>
                    <td className="pr-3">
                      <StatusBadge tone={location.is_active ? "success" : "warning"}>
                        {location.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td>
                      <RowMenu
                        label={`More actions for ${locationCode(location)}`}
                        items={[
                          {
                            label: location.is_starred ? "Remove from favourites" : "Add to favourites",
                            onClick: () => void run(setLocationStarred(location.id, !location.is_starred)),
                          },
                          ...(admin
                            ? [
                                {
                                  label: location.is_active ? "Mark inactive" : "Mark active",
                                  onClick: () =>
                                    void run(updateLocation(location.id, { is_active: !location.is_active })),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          noun="locations"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </ViewTransition>
  );
}

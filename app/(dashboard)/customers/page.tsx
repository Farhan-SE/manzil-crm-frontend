"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ViewTransition } from "react";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { StageSelect } from "@/components/customers/StageSelect";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import {
  FilterBar,
  FilterDate,
  FilterField,
  FilterInput,
  FilterSelect,
  MoreFilters,
} from "@/components/list/FilterBar";
import { RowMenu } from "@/components/list/RowMenu";
import { FavouritesButton, SortButton, StatusTabs, type StatusTab } from "@/components/list/StatusTabs";
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
  getAgents,
  getCustomers,
  getPartnerProjects,
  getSessionUser,
  getSources,
  setCustomerStarred,
  updateCustomer,
  type Agent,
  type Customer,
  type CustomersQuery,
  type CustomerStage,
  type PartnerProject,
  type Source,
} from "@/lib/api";
import { CUSTOMER_STAGES, whatsappUrl } from "@/lib/customers";
import { useIsAdmin } from "@/lib/session";
import { formatClock, formatDay, genderLabel } from "@/lib/time";

type SearchField = NonNullable<CustomersQuery["search_by"]>;

type Filters = {
  search: string;
  searchBy: SearchField;
  assignedToId: string;
  createdDate: string;
  projectId: string;
  city: string;
  sourceId: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  searchBy: "cell",
  assignedToId: "",
  createdDate: "",
  projectId: "",
  city: "",
  sourceId: "",
};

const SEARCH_FIELDS: { id: SearchField; name: string }[] = [
  { id: "cell", name: "Cell No" },
  { id: "name", name: "Name" },
  { id: "client_id", name: "Client ID" },
  { id: "cnic", name: "CNIC" },
];

const COLUMN_COUNT = 8;

const headerActionClass =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-dash-border bg-white px-3 text-xs text-primary transition-colors hover:bg-sidebar";

export default function CustomersPage() {
  const admin = useIsAdmin();

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [stageFilter, setStageFilter] = useState<CustomerStage | "all">("all");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [stageCounts, setStageCounts] = useState<Record<CustomerStage, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [agents, setAgents] = useState<Agent[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [projects, setProjects] = useState<PartnerProject[]>([]);

  useEffect(() => {
    getAgents().then(setAgents).catch(() => {});
    getSources().then(setSources).catch(() => {});
    getPartnerProjects({ limit: 500 }).then(setProjects).catch(() => {});
  }, []);

  // `silent` refreshes rows and tab counts in place, without flashing the skeleton.
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const search = filters.search.trim();
        const res = await getCustomers({
          search: search || undefined,
          search_by: search ? filters.searchBy : undefined,
          assigned_to_id: filters.assignedToId ? Number(filters.assignedToId) : undefined,
          created_date: filters.createdDate || undefined,
          project_id: filters.projectId || undefined,
          city: filters.city.trim() || undefined,
          source_id: filters.sourceId || undefined,
          starred: favouritesOnly ? "true" : undefined,
          stage: stageFilter === "all" ? undefined : stageFilter,
          sort,
          page,
          limit: pageSize,
        });
        setCustomers(res.data);
        setTotal(res.total);
        setStageCounts(res.stage_counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clients.");
        if (!silent) {
          setCustomers([]);
          setTotal(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [filters, stageFilter, favouritesOnly, sort, page, pageSize],
  );

  useEffect(() => {
    void load();
  }, [load]);

  function resetPaging() {
    setPage(1);
    setSelected(new Set());
  }

  async function handleStarToggle(customer: Customer) {
    try {
      await setCustomerStarred(customer.id, !customer.is_starred);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that client.");
    }
  }

  async function handleStageChange(customer: Customer, stage: CustomerStage) {
    if (stage === customer.stage) return;
    try {
      await updateCustomer(customer.id, { stage });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change that stage.");
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const sessionUserId = getSessionUser()?.id;
  const allCount = stageCounts ? Object.values(stageCounts).reduce((sum, n) => sum + n, 0) : null;
  const tabs: StatusTab<CustomerStage | "all">[] = [
    { id: "all", label: "All", count: allCount },
    ...CUSTOMER_STAGES.map((s) => ({ id: s.id, label: s.label, count: stageCounts?.[s.id] ?? null })),
  ];
  const isFiltered = Object.values({ ...filters, searchBy: "" }).some(Boolean) || favouritesOnly || stageFilter !== "all";
  const allSelected = customers.length > 0 && customers.every((c) => selected.has(c.id));

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <FilterBar
          onSearch={() => {
            setFilters(draft);
            resetPaging();
          }}
        >
          <FilterField label="Search by">
            <FilterInput
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              placeholder="Search"
              aria-label="Search clients"
            />
            <FilterSelect
              value={draft.searchBy}
              onChange={(e) => setDraft({ ...draft, searchBy: e.target.value as SearchField })}
              aria-label="Search field"
              className="w-[72px] shrink-0"
            >
              {SEARCH_FIELDS.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Allocated To">
            <FilterSelect
              value={draft.assignedToId}
              onChange={(e) => setDraft({ ...draft, assignedToId: e.target.value })}
              placeholder="Search by Staff Allocation"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.first_name} {agent.last_name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Date">
            <FilterDate
              value={draft.createdDate}
              onChange={(e) => setDraft({ ...draft, createdDate: e.target.value })}
              placeholder="Created Date"
            />
          </FilterField>
          <FilterField label="Interested Project">
            <FilterSelect
              value={draft.projectId}
              onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}
              placeholder="Search by Project"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <MoreFilters activeCount={[filters.city, filters.sourceId].filter(Boolean).length}>
            <FilterField label="City">
              <FilterInput
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="Search by City"
              />
            </FilterField>
            <FilterField label="Source">
              <FilterSelect
                value={draft.sourceId}
                onChange={(e) => setDraft({ ...draft, sourceId: e.target.value })}
                placeholder="Search by Source"
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>
          </MoreFilters>
        </FilterBar>

        <StatusTabs
          tabs={tabs}
          active={stageFilter}
          onChange={(next) => {
            setStageFilter(next);
            resetPaging();
          }}
        >
          {admin && (
            <>
              <button type="button" onClick={() => setIsImportOpen(true)} className={headerActionClass}>
                Import
              </button>
              <Link href="/customers/new" className={headerActionClass}>
                <PlusIcon className="size-2.5" />
                Add client
              </Link>
            </>
          )}
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
                    aria-label="Select all clients"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(customers.map((c) => c.id)))}
                    className={checkboxClass}
                  />
                </th>
                <th className={`${headCellClass} w-[92px] lg:w-[12%]`}>Lead ID</th>
                <th className={headCellClass}>Cell name</th>
                <th className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Location</th>
                <th className={`${headCellClass} hidden w-[15%] lg:table-cell`}>Source</th>
                <th className={`${headCellClass} hidden w-[18%] lg:table-cell`}>Allocation</th>
                <th className={`${headCellClass} w-[104px] lg:w-[12%]`}>Stage</th>
                <th className={`${headCellClass} w-[60px] lg:w-[12%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={rowClass}>
                    <td colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    {isFiltered ? "No clients match those filters." : "No clients yet."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                customers.map((customer) => {
                  const stage = CUSTOMER_STAGES.find((s) => s.id === customer.stage);
                  const agentName = customer.assigned_to
                    ? `${customer.assigned_to.first_name} ${customer.assigned_to.last_name}`
                    : "Unassigned";
                  // Mirrors the server rule: admins edit anyone, agents only their own customers.
                  const canEdit = admin || customer.assigned_to?.id === sessionUserId;
                  const href = `/customers/${customer.id}`;

                  return (
                    <tr key={customer.id} className={rowClass}>
                      <td className="hidden lg:table-cell">
                        <input
                          type="checkbox"
                          aria-label={`Select ${customer.customer_name}`}
                          checked={selected.has(customer.id)}
                          onChange={() => toggleSelected(customer.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="pr-3">
                        <Link href={href} className="text-primary hover:underline">
                          {customer.customer_no}
                        </Link>
                        <p className={subTextClass}>▣&nbsp; {formatDay(customer.created_at)}</p>
                        <p className="hidden truncate pl-[17px] text-[10px] text-muted lg:block">
                          {formatClock(customer.created_at)}
                        </p>
                      </td>
                      <td className="pr-3">
                        <Link href={href} className="block truncate hover:underline">
                          {customer.customer_name}
                        </Link>
                        <p className={subTextClass}>▣&nbsp; {genderLabel(customer.gender)}</p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <div className="flex items-center gap-[5px]">
                          <Icon name="location" className="size-4" />
                          <p className="truncate">{customer.city || "—"}</p>
                        </div>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{customer.source?.name ?? "—"}</p>
                        {customer.sub_source && <p className={subTextClass}>{customer.sub_source}</p>}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{agentName}</p>
                        {customer.assigned_to?.team && <p className={subTextClass}>{customer.assigned_to.team}</p>}
                      </td>
                      <td className="pr-3">
                        {canEdit ? (
                          <StageSelect
                            value={customer.stage}
                            onChange={(next) => void handleStageChange(customer, next)}
                            label={`Stage for ${customer.customer_name}`}
                          />
                        ) : (
                          <span
                            className={`inline-block whitespace-nowrap rounded-[20px] px-4 py-[5px] text-[11px] leading-[1.4] ${
                              stage?.className ?? "bg-badge-neutral text-dash-muted"
                            }`}
                          >
                            {stage?.label ?? customer.stage}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-primary lg:gap-[19px]">
                          <Link
                            href={href}
                            aria-label={`Open ${customer.customer_name}`}
                            className="hidden lg:block"
                          >
                            <Icon name="link" className="block size-4" />
                          </Link>
                          <a
                            href={whatsappUrl(customer.contact_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp ${customer.customer_name}`}
                          >
                            <Icon name="whatsapp" className="block size-4" />
                          </a>
                          <RowMenu
                            label={`More actions for ${customer.customer_name}`}
                            items={[
                              { label: "View client", href },
                              ...(canEdit ? [{ label: "Edit client", href: `${href}/edit` }] : []),
                              {
                                label: customer.is_starred ? "Remove from favourites" : "Add to favourites",
                                onClick: () => void handleStarToggle(customer),
                              },
                              { label: "Call client", href: `tel:${customer.contact_number}`, external: true },
                            ]}
                          />
                        </div>
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
          noun="leads"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isImportOpen && (
        <ImportCsvModal kind="customers" onClose={() => setIsImportOpen(false)} onImported={() => void load()} />
      )}
    </ViewTransition>
  );
}

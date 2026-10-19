"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ViewTransition } from "react";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { StageSelect } from "@/components/customers/StageSelect";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { StagePaymentModal } from "@/components/leads/StagePayment";
import { ClientLeads } from "@/components/customers/ClientLeads";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import {
  FilterBar,
  FilterDate,
  FilterField,
  FilterInput,
  FilterSelect,
  MoreFilters,
} from "@/components/list/FilterBar";
import { StatusTabs, type StatusTab } from "@/components/list/StatusTabs";
import { BulkBar } from "@/components/list/BulkBar";
import { downloadCsv } from "@/lib/csv";
import { onCustomerImportFinished } from "@/lib/customer-import";
import { TablePagination } from "@/components/list/TablePagination";
import { checkboxClass, headCellClass, subTextClass, tableClass } from "@/components/list/tableStyles";
import { Icon } from "@/components/ui/Icon";
import { Listbox } from "@/components/ui/Listbox";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getAgents,
  getCustomers,
  getProjectOptions,
  getSessionUser,
  getSources,
  setCustomerStarred,
  bulkAssignCustomers,
  updateCustomer,
  updateLead,
  type Agent,
  type Customer,
  type Lead,
  type CustomersQuery,
  type CustomerStage,
  type ProjectOption,
  type Source,
} from "@/lib/api";
import { COUNTRIES, CUSTOMER_STAGES, flagUrl, whatsappUrl } from "@/lib/customers";
import { reaches, useCan, useScope } from "@/lib/session";
import { needsPayment } from "@/lib/leads";
import { formatDay } from "@/lib/time";

type SearchField = NonNullable<CustomersQuery["search_by"]>;

type Filters = {
  search: string;
  searchBy: SearchField;
  assignedToId: string;
  createdDate: string;
  projectId: string;
  city: string;
  sourceId: string;
  leadCount: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  searchBy: "cell",
  assignedToId: "",
  createdDate: "",
  projectId: "",
  city: "",
  sourceId: "",
  leadCount: "",
};

const SEARCH_FIELDS: { id: SearchField; name: string }[] = [
  { id: "cell", name: "Cell No" },
  { id: "name", name: "Name" },
  { id: "client_id", name: "Client ID" },
  { id: "cnic", name: "CNIC" },
  { id: "project", name: "Project" },
];

const COLUMN_COUNT = 10;

const SORT_OPTIONS = [
  { id: "desc", name: "Client ID Descending" },
  { id: "asc", name: "Client ID Ascending" },
];

const clientRowClass = "h-[78px] text-xs leading-[1.4] text-ink odd:bg-white even:bg-sidebar";

const actionClass = "size-8 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110";

const headerActionClass =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-border bg-white px-3 text-xs text-primary transition-colors hover:bg-sidebar";

export default function CustomersPage() {
  const canCreate = useCan("customers.create");
  const canImport = useCan("customers.import");
  const canAssign = useCan("customers.assign");
  const editScope = useScope("customers.edit");

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  // Bumped after a lead is edited, so open lead panels fetch again.
  const [leadsVersion, setLeadsVersion] = useState(0);
  const [paymentMove, setPaymentMove] = useState<{ customer: Customer; stage: CustomerStage } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [agents, setAgents] = useState<Agent[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    getAgents().then(setAgents).catch(() => {});
    getSources().then(setSources).catch(() => {});
    getProjectOptions().then(setProjects).catch(() => {});
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
          lead_count: filters.leadCount.trim() ? Number(filters.leadCount) : undefined,
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

  useEffect(() => onCustomerImportFinished(() => void load(true)), [load]);

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
    if (needsPayment(customer.stage, stage)) {
      if (!customer.latest_lead_id) return setError(`${customer.customer_name} has no lead yet. Add a lead before moving them forward.`);
      return setPaymentMove({ customer, stage });
    }
    try {
      await updateCustomer(customer.id, { stage });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change that stage.");
    }
  }

  function exportSelected(rows: Customer[]) {
    downloadCsv(`clients-${new Date().toLocaleDateString("en-CA")}.csv`, [
      ["Client ID", "Name", "Phone", "CNIC", "City", "Project", "Leads", "Stage", "Source", "Allocated to", "Created"],
      ...rows.map((c) => [
        String(c.customer_no),
        c.customer_name,
        c.contact_number,
        c.cnic_number ?? "",
        c.city ?? "",
        c.project?.name ?? "",
        String(c.lead_count),
        CUSTOMER_STAGES.find((s) => s.id === c.stage)?.label ?? c.stage,
        c.source?.name ?? "",
        c.assigned_to ? `${c.assigned_to.first_name} ${c.assigned_to.last_name}` : "",
        c.created_at.slice(0, 10),
      ]),
    ]);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
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
        <h1 className="sr-only">Clients</h1>
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
          <MoreFilters activeCount={[filters.city, filters.sourceId, filters.leadCount].filter(Boolean).length}>
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
            <FilterField label="Number of Leads">
              <FilterInput
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={draft.leadCount}
                onChange={(e) => setDraft({ ...draft, leadCount: e.target.value.replace(/\D/g, "") })}
                placeholder="e.g. 3"
                aria-label="Clients with exactly this many leads"
              />
            </FilterField>
          </MoreFilters>
        </FilterBar>

        <StatusTabs
          variant="underline"
          tabs={tabs}
          active={stageFilter}
          onChange={(next) => {
            setStageFilter(next);
            resetPaging();
          }}
        >
          {canImport && (
            <button type="button" onClick={() => setIsImportOpen(true)} className={headerActionClass}>
              Import
            </button>
          )}
          {canCreate && (
            <Link href="/customers/new" className={headerActionClass}>
              <PlusIcon className="size-2.5" />
              Add client
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setFavouritesOnly(!favouritesOnly);
              resetPaging();
            }}
            aria-pressed={favouritesOnly}
            className={`flex shrink-0 items-center gap-1.5 text-xs leading-[1.4] text-warm-ink ${
              favouritesOnly ? "font-bold" : ""
            }`}
          >
            <span className="text-base leading-none">{favouritesOnly ? "★" : "☆"}</span>
            Favourites
          </button>
          <div className="flex shrink-0 items-center gap-2 text-xs leading-[1.4] text-muted">
            Sort By
            <Listbox
              value={sort}
              onChange={(next) => {
                setSort(next as "asc" | "desc");
                setPage(1);
              }}
              options={SORT_OPTIONS}
              label="Sort clients"
              className="flex items-center gap-1.5 font-bold text-success"
            >
              {(isOpen) => (
                <>
                  <Icon name="sort" className={`size-4 ${sort === "asc" ? "-scale-y-100" : ""}`} />
                  {SORT_OPTIONS.find((option) => option.id === sort)?.name}
                  <Icon name="chevron-down" className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </>
              )}
            </Listbox>
          </div>
        </StatusTabs>

        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            noun="client"
            canAssign={canAssign}
            onAssign={async (userId) => {
              await bulkAssignCustomers([...selected], userId);
              setSelected(new Set());
              setLeadsVersion((version) => version + 1);
              await load(true);
            }}
            onFavourite={async () => {
              await Promise.all(
                customers.filter((c) => selected.has(c.id) && !c.is_starred).map((c) => setCustomerStarred(c.id, true)),
              );
              setSelected(new Set());
              await load(true);
            }}
            onExport={() => exportSelected(customers.filter((c) => selected.has(c.id)))}
            onClear={() => setSelected(new Set())}
          />
        )}

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        <div className="px-4 pt-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className="h-10 bg-cream text-[11px] uppercase text-muted">
                <th scope="col" className="hidden w-10 pl-3 lg:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all clients"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(customers.map((c) => c.id)))}
                    className={checkboxClass}
                  />
                </th>
                <th scope="col" className="w-9" aria-label="Favourite" />
                <th scope="col" className={`${headCellClass} hidden w-[96px] font-bold sm:table-cell lg:w-[8%]`}>Client ID</th>
                <th scope="col" className={`${headCellClass} font-bold`}>Full name</th>
                <th scope="col" className={`${headCellClass} hidden w-[12%] font-bold xl:table-cell`}>Project</th>
                <th scope="col" className={`${headCellClass} hidden w-[9%] font-bold lg:table-cell`}>Location</th>
                <th scope="col" className={`${headCellClass} hidden w-[12%] font-bold lg:table-cell`}>Source</th>
                <th scope="col" className={`${headCellClass} hidden w-[13%] font-bold lg:table-cell`}>Allocation</th>
                <th scope="col" className={`${headCellClass} w-[108px] font-bold lg:w-[10%]`}>Stage</th>
                <th scope="col" className={`${headCellClass} w-[84px] font-bold lg:w-[188px]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={clientRowClass}>
                    <td colSpan={COLUMN_COUNT} className="px-3">
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-placeholder">
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
                  const canEdit = reaches(editScope, customer.assigned_to?.id, sessionUserId);
                  const href = `/customers/${customer.id}`;
                  const country = COUNTRIES.find((c) => c.id === customer.country)?.name ?? customer.country;

                  const isExpanded = expanded.has(customer.id);
                  return (
                    <Fragment key={customer.id}>
                    <tr className={clientRowClass}>
                      <td className="hidden pl-3 lg:table-cell">
                        <input
                          type="checkbox"
                          aria-label={`Select ${customer.customer_name}`}
                          checked={selected.has(customer.id)}
                          onChange={() => toggleSelected(customer.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="pl-2 lg:pl-0">
                        <button
                          type="button"
                          onClick={() => void handleStarToggle(customer)}
                          aria-pressed={customer.is_starred}
                          aria-label={`${customer.is_starred ? "Remove" : "Add"} ${customer.customer_name} ${
                            customer.is_starred ? "from" : "to"
                          } favourites`}
                          className="flex size-6 items-center justify-center text-lg leading-none text-warm-ink transition-transform hover:scale-110"
                        >
                          {customer.is_starred ? "★" : "☆"}
                        </button>
                      </td>
                      <td className="hidden pr-3 sm:table-cell">
                        <Link href={href} className="-my-1.5 inline-block py-1.5 text-cold hover:underline">
                          {customer.customer_no}
                        </Link>
                        <p className={`${subTextClass} flex items-center gap-1.5 text-[11px]`}>
                          <Icon name="calendar" className="size-3" />
                          {formatDay(customer.created_at)}
                        </p>
                      </td>
                      <td className="pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="hidden size-7 shrink-0 items-center justify-center rounded-full bg-cold/10 text-cold sm:flex">
                            <Icon name="clients" className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <Link href={href} className="block truncate hover:underline">
                              {customer.customer_name || "No Name"}
                            </Link>
                            <p className={`${subTextClass} text-[11px]`}>
                              {/* On phones the ID column is dropped to give the name room. */}
                              <span className="sm:hidden">#{customer.customer_no} · </span>
                              {customer.lead_count > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(customer.id)}
                                  aria-expanded={isExpanded}
                                  aria-controls={`client-leads-${customer.id}`}
                                  className="-my-1 inline-flex items-center gap-1 py-1 text-cold hover:underline"
                                >
                                  {customer.lead_count} {customer.lead_count === 1 ? "Lead" : "Leads"}
                                  <Icon
                                    name="chevron-down"
                                    className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </button>
                              ) : (
                                "No leads"
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden pr-3 xl:table-cell">
                        <p className="truncate">{customer.project?.name ?? "—"}</p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={flagUrl(customer.country)} alt={country} title={country} className="h-3 w-[18px] shrink-0" />
                          <p className="truncate">{customer.city || "—"}</p>
                        </div>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{customer.source?.name ?? "—"}</p>
                        {customer.sub_source && <p className={`${subTextClass} text-[11px]`}>{customer.sub_source}</p>}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="flex items-center gap-1.5">
                          <span className="truncate">{agentName}</span>
                          {customer.assigned_to && (
                            <span
                              title={`Allocated to ${agentName}${customer.assigned_to.team ? ` · ${customer.assigned_to.team}` : ""}`}
                              className="flex size-3.5 shrink-0 cursor-help items-center justify-center rounded-full bg-muted text-[11px] font-bold leading-none text-white"
                            >
                              i
                            </span>
                          )}
                        </p>
                        {customer.assigned_to?.team && (
                          <p className={`${subTextClass} text-[11px]`}>{customer.assigned_to.team}</p>
                        )}
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
                              stage?.className ?? "bg-badge-neutral text-muted"
                            }`}
                          >
                            {stage?.label ?? customer.stage}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={href}
                            aria-label={`Open ${customer.customer_name}`}
                            title="Open client"
                            className={`${actionClass} hidden bg-cold/10 text-cold lg:flex`}
                          >
                            <Icon name="link" className="size-3.5" />
                          </Link>
                          <a
                            href={whatsappUrl(customer.contact_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp ${customer.customer_name}`}
                            title="WhatsApp"
                            className={`${actionClass} flex bg-success/15 text-success`}
                          >
                            <Icon name="whatsapp" className="size-3.5" />
                          </a>
                          {customer.email && (
                            <a
                              href={`mailto:${customer.email}`}
                              aria-label={`Email ${customer.customer_name}`}
                              title={customer.email}
                              className={`${actionClass} hidden bg-success/10 text-success lg:flex`}
                            >
                              <Icon name="mail" className="size-3.5" />
                            </a>
                          )}
                          {canEdit && (
                            <Link
                              href={`${href}/edit`}
                              aria-label={`Edit ${customer.customer_name}`}
                              title="Edit client"
                              className={`${actionClass} hidden bg-badge-neutral text-primary lg:flex`}
                            >
                              <Icon name="file" className="size-3.5" />
                            </Link>
                          )}
                          <a
                            href={`tel:${customer.contact_number}`}
                            aria-label={`Call ${customer.customer_name}`}
                            title={`Call ${customer.contact_number}`}
                            className={`${actionClass} flex bg-attention/15 text-attention`}
                          >
                            <Icon name="phone" className="size-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr id={`client-leads-${customer.id}`} className="bg-sidebar">
                        <td colSpan={COLUMN_COUNT} className="px-3 pb-4 pt-1">
                          <ClientLeads
                            key={leadsVersion}
                            customerId={customer.id}
                            onOpen={(lead) => setOpenLead(lead)}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          noun="clients"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isImportOpen && (
        <ImportCsvModal kind="customers" onClose={() => setIsImportOpen(false)} />
      )}

      {openLead && (
        <LeadDetailModal
          lead={openLead}
          onClose={() => setOpenLead(null)}
          onChanged={() => {
            setLeadsVersion((version) => version + 1);
            void load(true);
          }}
        />
      )}

      {paymentMove && (
        <StagePaymentModal
          clientName={paymentMove.customer.customer_name}
          customerId={paymentMove.customer.id}
          stage={paymentMove.stage}
          onClose={() => setPaymentMove(null)}
          onSubmit={async (payment) => {
            // The lead carries the payment; the client's stage follows it on the server.
            await updateLead(paymentMove.customer.latest_lead_id!, { stage: paymentMove.stage, payment });
            setPaymentMove(null);
            await load(true);
          }}
        />
      )}
    </ViewTransition>
  );
}

"use client";

import { useNavigationScroll, useNavigationState } from "@/lib/use-navigation-state";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { FilterBar, FilterField, FilterInput } from "@/components/list/FilterBar";
import { RowMenu } from "@/components/list/RowMenu";
import { StatusBadge } from "@/components/list/StatusBadge";
import { StatusTabs } from "@/components/list/StatusTabs";
import { TablePagination } from "@/components/list/TablePagination";
import { headCellClass, headRowClass, rowClass, subTextClass, tableClass } from "@/components/list/tableStyles";
import { AddCompanyModal } from "@/components/platform/AddCompanyModal";
import { EditCompanyModal } from "@/components/platform/EditCompanyModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { SpanCell } from "@/components/list/SpanCell";
import { apiAssetUrl, getCompanies, updateCompany, type Company, type CompanyStatus } from "@/lib/api";

type Tab = "all" | CompanyStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
];

const COLUMN_COUNT = 7;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const headerActionClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  useNavigationScroll(!isLoading);
  const [error, setError] = useState<string | null>(null);

  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useNavigationState<Tab>("tab", "all");
  const [page, setPage] = useNavigationState("page", 1);
  const [pageSize, setPageSize] = useNavigationState("pageSize", 20);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getCompanies({
        search: search.trim() || undefined,
        status: tab === "all" ? undefined : tab,
        page,
        limit: pageSize,
      });
      setCompanies(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies.");
      setCompanies([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [search, tab, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(company: Company, status: CompanyStatus) {
    if (
      status === "suspended" &&
      !window.confirm(`Suspend ${company.name}? Its ${company.user_count} staff are signed out and can't sign in until you reactivate it.`)
    ) {
      return;
    }
    try {
      await updateCompany(company.id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that company.");
    }
    void load();
  }

  const tabNoun = tab === "all" ? "companies" : `${tab} companies`;

  return (
    <ViewTransition>
      <div className="flex w-full flex-col pb-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-ink" style={headingStyle}>
              Companies
            </h1>
            <p className="text-[11px] text-muted">Platform · Every company using the CRM</p>
          </div>
          <button type="button" onClick={() => setIsAddOpen(true)} className={headerActionClass}>
            <PlusIcon className="size-2.5" />
            Add company
          </button>
        </div>

        <FilterBar
          onSearch={() => {
            setSearch(draftSearch);
            setPage(1);
          }}
        >
          <FilterField label="Company">
            <FilterInput
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Name or short name"
            />
          </FilterField>
        </FilterBar>

        <StatusTabs
          tabs={TABS}
          active={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
        />

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        <div className="px-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th scope="col" className={headCellClass}>Company</th>
                <th scope="col" className={`${headCellClass} hidden w-[22%] sm:table-cell`}>Admin</th>
                <th scope="col" className={`${headCellClass} w-[18%] lg:w-[10%]`}>Staff</th>
                <th scope="col" className={`${headCellClass} hidden w-[14%] lg:table-cell`}>Leads · Clients</th>
                <th scope="col" className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Last activity</th>
                <th scope="col" className={`${headCellClass} w-[90px] lg:w-[9%]`}>Status</th>
                <th scope="col" className={`${headCellClass} w-[40px] text-[11px] lg:w-[5%]`}><span className="sr-only lg:not-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className={rowClass}>
                    <SpanCell colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </SpanCell>
                  </tr>
                ))}

              {!isLoading && companies.length === 0 && (
                <tr>
                  <SpanCell colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-placeholder">
                    {search ? `No ${tabNoun} match "${search}".` : `No ${tabNoun} yet.`}
                  </SpanCell>
                </tr>
              )}

              {!isLoading &&
                companies.map((company) => (
                  <tr key={company.id} className={rowClass}>
                    <td className="pr-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="hidden h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-border bg-white px-1.5 sm:flex">
                          {company.logo_url ? (
                            <img src={apiAssetUrl(company.logo_url)} alt="" className="max-h-7 w-auto max-w-full object-contain" />
                          ) : (
                            <span className="text-[11px] font-bold text-placeholder">{company.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate">{company.name}</p>
                          <p className={subTextClass}>
                            {company.slug} · Since {formatDate(company.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden pr-3 sm:table-cell">
                      {company.admin ? (
                        <>
                          <p className="truncate">
                            {company.admin.first_name} {company.admin.last_name}
                          </p>
                          <p className={subTextClass}>{company.admin.email}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="pr-3">
                      <p>{company.active_user_count} active</p>
                      <p className={subTextClass}>{company.user_count} total</p>
                    </td>
                    <td className="hidden pr-3 lg:table-cell">
                      <p>{company.lead_count.toLocaleString()} leads</p>
                      <p className={subTextClass}>{company.customer_count.toLocaleString()} clients</p>
                    </td>
                    <td className="hidden pr-3 lg:table-cell">{formatDate(company.last_activity_at)}</td>
                    <td className="pr-3">
                      <StatusBadge tone={company.status === "active" ? "success" : "danger"}>
                        {company.status === "active" ? "Active" : "Suspended"}
                      </StatusBadge>
                    </td>
                    <td>
                      <RowMenu
                        label={`More actions for ${company.name}`}
                        items={[
                          { label: "Edit company", onClick: () => setEditing(company) },
                          company.status === "active"
                            ? { label: "Suspend company", onClick: () => void setStatus(company, "suspended") }
                            : { label: "Reactivate company", onClick: () => void setStatus(company, "active") },
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
          noun={tabNoun}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isAddOpen && <AddCompanyModal onClose={() => setIsAddOpen(false)} onCreated={() => void load()} />}
      {editing && <EditCompanyModal company={editing} onClose={() => setEditing(null)} onSaved={() => void load()} />}
    </ViewTransition>
  );
}

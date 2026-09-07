"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewTransition } from "react";
import { ArrowRightIcon, PhoneIcon, SearchIcon } from "@/components/icons/DashboardIcons";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { getActiveLeads, getFollowUps, getLeads, type FollowUp, type Lead } from "@/lib/api";
import { useSessionFullName } from "@/lib/session";

const STATS = [
  { label: "MY OPEN LEADS", value: "24" },
  { label: "PIPELINE VALUE", value: "PKR 8.45M" },
  { label: "CLOSED VOLUME", value: "PKR 42.0M" },
  { label: "OVERDUE FOLLOW-UPS", value: "3", tone: "hot" as const },
];

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  contacted: "Contacted",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  booked: "Booked",
  sold: "Sold",
  lost: "Lost",
};

function isDueToday(followUp: FollowUp) {
  return followUp.due_date === new Date().toLocaleDateString("en-CA");
}

function formatDueAt(followUp: FollowUp) {
  const date = new Date(`${followUp.due_date}T${followUp.due_time}`);
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${followUp.due_time}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const fullName = useSessionFullName();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(true);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const term = search.trim();
    // Nothing to clear on an empty box — the dropdown only renders when there's a term.
    if (!term) return;
    const timer = setTimeout(() => {
      getLeads({ search: term, limit: 5 })
        .then((res) => setResults(res.data))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function openLeadsFor(lead: Lead) {
    setIsSearchOpen(false);
    setSearch("");
    router.push(`/leads?search=${encodeURIComponent(lead.client_name)}`);
  }

  function refresh() {
    getActiveLeads(5)
      .then(setLeads)
      .catch(() => {})
      .finally(() => setIsLoadingLeads(false));
    getFollowUps({ limit: 5 })
      .then(setFollowUps)
      .catch(() => {})
      .finally(() => setIsLoadingFollowUps(false));
  }

  useEffect(() => {
    refresh();
    window.addEventListener("leads:changed", refresh);
    return () => window.removeEventListener("leads:changed", refresh);
  }, []);

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 py-12">
      <div className="flex items-end justify-between border-b border-dash-border pb-[25px]">
        <h1
          className="font-serif text-[32px] font-bold tracking-[-0.64px] text-dash-ink"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Welcome back,{fullName && <span className="ml-2 capitalize">{fullName}</span>}
        </h1>
        <div ref={searchRef} className="relative w-64">
          <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-dash-placeholder" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search leads by name, number, city..."
            className="w-full rounded-md border border-dash-border bg-white py-2 pl-10 pr-3 text-sm text-dash-ink shadow-sm placeholder:text-dash-placeholder focus:outline-none"
          />

          {isSearchOpen && search.trim() && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-dash-border bg-white py-1 shadow-lg">
              {results.length === 0 && (
                <p className="px-4 py-2 text-sm text-dash-placeholder">No matching leads.</p>
              )}
              {results.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => openLeadsFor(lead)}
                  className="block w-full px-4 py-2 text-left transition-colors hover:bg-dash-bg"
                >
                  <span className="block text-sm text-dash-ink">{lead.client_name}</span>
                  <span className="block text-xs text-dash-muted">
                    {[lead.area, lead.city].filter(Boolean).join(", ") || lead.client_number}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-1 flex-col gap-3 rounded-lg border border-dash-border bg-white p-[21px] shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">
              {stat.label}
            </p>
            <p
              className={`text-xl font-bold tracking-[-0.525px] ${
                stat.tone === "hot" ? "text-hot" : "text-dash-ink"
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2">
            <h2 className="border-b-2 border-dash-ink pb-1.5 text-xs font-bold uppercase tracking-[1.2px] text-dash-ink">
              Active Leads
            </h2>
            <Link href="/leads" className="flex items-center gap-1 text-sm text-dash-muted">
              View all
              <ArrowRightIcon className="size-[10.667px]" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-dash-border bg-sidebar shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dash-border bg-dash-bg">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.55px] text-dash-muted">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.55px] text-dash-muted">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.55px] text-dash-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.55px] text-dash-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {isLoadingLeads &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className={i > 0 ? "border-t border-dash-border" : ""}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-2 rounded-full" />
                          <Skeleton className="h-3.5 w-32" />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-3.5 w-28" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end">
                          <Skeleton className="size-4" />
                        </div>
                      </td>
                    </tr>
                  ))}

                {!isLoadingLeads && leads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-dash-placeholder">
                      No active leads.
                    </td>
                  </tr>
                )}
                {leads.map((lead, i) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`cursor-pointer hover:bg-dash-bg ${i > 0 ? "border-t border-dash-border" : ""}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`size-2 rounded-full ${
                            lead.temperature === "HOT"
                              ? "bg-hot"
                              : lead.temperature === "WARM"
                                ? "bg-warm"
                                : "bg-cold"
                          }`}
                        />
                        <span className="text-base text-dash-ink">{lead.client_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-base text-dash-muted">
                      {[lead.area, lead.city].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <span
                          className={`rounded-sm border px-[9px] py-[3px] text-[10px] uppercase tracking-[0.5px] ${
                            lead.temperature === "HOT"
                              ? "border-hot/20 bg-hot/10 text-hot"
                              : lead.temperature === "WARM"
                                ? "border-warm/30 bg-warm/20 text-warm"
                                : "border-cold/30 bg-cold/20 text-cold"
                          }`}
                        >
                          {lead.temperature}
                        </span>
                        <span className="rounded-sm bg-badge-neutral px-2 py-[2px] text-[10px] uppercase tracking-[0.5px] text-dash-muted">
                          {STAGE_LABELS[lead.stage] ?? lead.stage}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={`tel:${lead.client_number}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted"
                          aria-label={`Call ${lead.client_name}`}
                        >
                          <PhoneIcon className="size-[15px]" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-3">
          <div className="pb-2">
            <h2 className="border-b-2 border-dash-ink pb-1.5 text-xs font-bold uppercase tracking-[1.2px] text-dash-ink">
               Follow-ups
            </h2>
          </div>

          <div className="flex flex-col gap-6 rounded-lg border-l-2 border-dash-border bg-sidebar py-3 pl-[18px] pr-3">
            {isLoadingFollowUps &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[64px_16px_1fr] items-start">
                  <div className="flex justify-end pt-0.5">
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <div className="flex justify-center pt-1.5">
                    <Skeleton className="size-2 rounded-full" />
                  </div>
                  <div className="flex flex-col gap-2 border-b border-dashed border-dash-border pb-4">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
              ))}

            {!isLoadingFollowUps && followUps.length === 0 && (
              <p className="text-sm text-dash-placeholder">No follow-ups due.</p>
            )}
            {followUps.map((followUp) => (
              <div key={followUp.id} className="grid grid-cols-[64px_16px_1fr] items-start">
                <p
                  className={`pt-0.5 text-right text-xs font-medium ${
                    isDueToday(followUp) ? "text-hot" : "text-dash-muted"
                  }`}
                >
                  {formatDueAt(followUp)}
                </p>
                <div className="flex justify-center pt-1.5">
                  <span
                    className={`size-2 rounded-full border-2 border-sidebar ${
                      isDueToday(followUp) ? "bg-hot" : "bg-dash-muted"
                    }`}
                  />
                </div>
                <div className="border-b border-dashed border-dash-border pb-4">
                  <p className="text-sm font-semibold tracking-[-0.14px] text-dash-ink">
                    {followUp.text}
                  </p>
                  <p className="mt-1 text-xs text-dash-muted">{followUp.lead.client_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <LeadDetailModal
      key={selectedLead?.id}
      lead={selectedLead}
      onClose={() => setSelectedLead(null)}
      onChanged={refresh}
    />
    </ViewTransition>
  );
}

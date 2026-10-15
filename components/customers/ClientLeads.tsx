"use client";

import { useEffect, useState } from "react";
import { StagePill } from "@/components/leads/StagePill";
import { Skeleton } from "@/components/ui/Skeleton";
import { getLeads, type Lead } from "@/lib/api";
import { taskLabel } from "@/lib/tasks";
import { formatDay, timeAgo } from "@/lib/time";

const cellClass = "px-3 py-2.5 text-left align-top";

/** The leads of one client, shown under their row in the Clients list. Clicking a lead opens it. */
export function ClientLeads({ customerId, onOpen }: { customerId: string; onOpen: (lead: Lead) => void }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLeads({ customer_id: customerId, limit: 50 })
      .then((res) => {
        if (!cancelled) setLeads(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load leads.");
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (error) return <p className="px-4 py-3 text-xs text-hot">{error}</p>;
  if (!leads) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    );
  }
  if (leads.length === 0) return <p className="px-4 py-3 text-xs text-muted">This client has no leads yet.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full min-w-[720px] text-xs leading-[1.4] text-ink">
        <thead className="bg-cream text-[11px] uppercase text-muted">
          <tr>
            <th scope="col" className={`${cellClass} font-bold`}>Lead ID</th>
            <th scope="col" className={`${cellClass} font-bold`}>Project</th>
            <th scope="col" className={`${cellClass} font-bold`}>Stage</th>
            <th scope="col" className={`${cellClass} font-bold`}>Last task</th>
            <th scope="col" className={`${cellClass} font-bold`}>Allocated to</th>
            <th scope="col" className={`${cellClass} font-bold`}>Budget (PKR)</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onOpen(lead)}
              className="cursor-pointer border-t border-border transition-colors hover:bg-sidebar"
            >
              <td className={cellClass}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(lead);
                  }}
                  className="text-cold hover:underline"
                >
                  {lead.lead_no}
                </button>
                <p className="mt-0.5 text-[11px] text-muted">{formatDay(lead.created_at)}</p>
              </td>
              <td className={cellClass}>
                <p>{lead.project?.name ?? "—"}</p>
                {lead.interest && <p className="mt-0.5 text-[11px] text-muted">{lead.interest.name}</p>}
              </td>
              <td className={cellClass}>
                <StagePill stage={lead.stage} />
              </td>
              <td className={cellClass}>
                {lead.last_task ? (
                  <>
                    <p>{taskLabel(lead.last_task)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{timeAgo(lead.last_task.at)}</p>
                  </>
                ) : (
                  <p className="text-muted">No task yet</p>
                )}
              </td>
              <td className={cellClass}>
                {lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : "Unassigned"}
              </td>
              <td className={cellClass}>{lead.budget != null ? Number(lead.budget).toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

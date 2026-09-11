"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Skeleton } from "@/components/ui/Skeleton";
import { updateLead, type Lead, type LeadTemperature } from "@/lib/api";

type StageId = "inquiry" | "contacted" | "site_visit" | "negotiation" | "booked" | "sold" | "lost";

const STAGES: { id: StageId; label: string; colorClass: string }[] = [
  { id: "inquiry", label: "Inquiry", colorClass: "text-stage-inquiry border-stage-inquiry" },
  { id: "contacted", label: "Contacted", colorClass: "text-stage-contacted border-stage-contacted" },
  { id: "site_visit", label: "Site Visit", colorClass: "text-stage-site-visit border-stage-site-visit" },
  { id: "negotiation", label: "Negotiation", colorClass: "text-stage-negotiation border-stage-negotiation" },
  { id: "booked", label: "Booked", colorClass: "text-stage-booked border-stage-booked" },
  { id: "sold", label: "Sold", colorClass: "text-stage-sold border-stage-sold" },
  { id: "lost", label: "Lost", colorClass: "text-stage-lost border-stage-lost" },
];

const TEMP_STYLES: Record<LeadTemperature, string> = {
  HOT: "bg-hot/10 text-hot",
  WARM: "bg-warm/20 text-warm",
  COLD: "bg-cold/10 text-cold",
};

function formatBudget(budget: number | null) {
  if (budget == null) return "—";
  if (budget >= 1_000_000) return `PKR ${(budget / 1_000_000).toFixed(1)}M`;
  return `PKR ${budget.toLocaleString()}`;
}

function LeadCardContent({ lead, subtitle }: { lead: Lead; subtitle: string }) {
  return (
    <div className="rounded-lg border border-dash-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[15px] font-bold text-dash-ink">{lead.client_name}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${TEMP_STYLES[lead.temperature]}`}>
          {lead.temperature}
        </span>
      </div>
      <p className="mt-3 truncate text-[13px] text-dash-ink">{subtitle || "—"}</p>
      <p className="mt-4 text-[13px] font-bold text-dash-ink">{formatBudget(lead.budget)}</p>
    </div>
  );
}

function SortableLeadCard({
  lead,
  subtitle,
  canDrag,
  onOpen,
}: {
  lead: Lead;
  subtitle: string;
  canDrag: boolean;
  onOpen: (lead: Lead) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        // iOS otherwise opens its long-press menu over the card during the hold.
        WebkitTouchCallout: "none",
      }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead)}
      className={`touch-manipulation select-none ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
    >
      <LeadCardContent lead={lead} subtitle={subtitle} />
    </div>
  );
}

function Column({
  stage,
  leads,
  subtitleFor,
  canDrag,
  onOpen,
}: {
  stage: { id: StageId; label: string; colorClass: string };
  leads: Lead[];
  subtitleFor: (lead: Lead) => string;
  canDrag: boolean;
  onOpen: (lead: Lead) => void;
}) {
  const { setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div className="flex h-full w-[210px] shrink-0 flex-col gap-3 border-l border-dash-border pl-4 first:border-l-0 first:pl-0">
      <div className={`flex shrink-0 items-center gap-2 border-b-2 pb-2 ${stage.colorClass}`}>
        <p className="text-xs font-bold uppercase tracking-[0.6px]">{stage.label}</p>
        <span className="text-xs">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className="hide-scrollbar flex min-h-20 flex-1 flex-col gap-3 overflow-y-auto rounded-lg bg-column-bg p-2"
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              subtitle={subtitleFor(lead)}
              canDrag={canDrag}
              onOpen={onOpen}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

type PipelineBoardProps = {
  leads: Lead[];
  isLoading: boolean;
  canDrag: boolean;
  interestNames: Record<string, string>;
  onOpenLead: (lead: Lead) => void;
  onError: (message: string) => void;
};

export function PipelineBoard({
  leads,
  isLoading,
  canDrag,
  interestNames,
  onOpenLead,
  onError,
}: PipelineBoardProps) {
  const [board, setBoard] = useState<Lead[]>(leads);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  // Touch needs press-and-hold: with a distance trigger the browser claims the swipe as a scroll
  // and cancels the gesture, so cards never pick up on a phone.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  // The parent owns the fetched list; re-sync whenever it reloads.
  const [syncedFrom, setSyncedFrom] = useState(leads);
  if (syncedFrom !== leads) {
    setSyncedFrom(leads);
    setBoard(leads);
  }

  function subtitleFor(lead: Lead) {
    const interest = lead.interest_id ? interestNames[lead.interest_id] : "";
    const place = lead.city ?? lead.area ?? "";
    return [interest, place].filter(Boolean).join(" · ");
  }

  function findStage(id: string): StageId | undefined {
    if (STAGES.some((s) => s.id === id)) return id as StageId;
    return board.find((l) => l.id === id)?.stage as StageId | undefined;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(board.find((l) => l.id === event.active.id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeStage = findStage(String(active.id));
    const overStage = findStage(String(over.id));
    if (!activeStage || !overStage || activeStage === overStage) return;

    setBoard((prev) => prev.map((lead) => (lead.id === active.id ? { ...lead, stage: overStage } : lead)));
  }

  async function persistStage(lead: Lead, stage: StageId, previousStage: string) {
    try {
      await updateLead(lead.id, { stage });
    } catch (err) {
      setBoard((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: previousStage } : l)));
      onError(err instanceof Error ? err.message : "Could not move that lead.");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const dragged = activeLead;
    setActiveLead(null);
    if (!over || !dragged) return;

    const overStage = findStage(String(over.id));
    if (!overStage) return;

    if (overStage !== dragged.stage) {
      void persistStage(dragged, overStage, dragged.stage);
      return;
    }

    if (active.id === over.id) return;
    setBoard((prev) => {
      const stageLeads = prev.filter((l) => l.stage === overStage);
      const oldIndex = stageLeads.findIndex((l) => l.id === active.id);
      const newIndex = stageLeads.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(stageLeads, oldIndex, newIndex);
      const others = prev.filter((l) => l.stage !== overStage);
      return [...others, ...reordered];
    });
  }

  if (isLoading) {
    return (
      <div className="kanban-scroll flex h-full gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex h-full w-[210px] shrink-0 flex-col gap-3 border-l border-dash-border pl-4 first:border-l-0 first:pl-0"
          >
            <div className={`flex shrink-0 items-center gap-2 border-b-2 pb-2 ${stage.colorClass}`}>
              <p className="text-xs font-bold uppercase tracking-[0.6px]">{stage.label}</p>
            </div>
            <div className="flex flex-1 flex-col gap-3 rounded-lg bg-column-bg p-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[104px] w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-scroll flex h-full gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            leads={board.filter((l) => l.stage === stage.id)}
            subtitleFor={subtitleFor}
            canDrag={canDrag}
            onOpen={onOpenLead}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? <LeadCardContent lead={activeLead} subtitle={subtitleFor(activeLead)} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

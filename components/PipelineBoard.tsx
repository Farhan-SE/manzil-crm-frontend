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
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { RowMenu } from "@/components/list/RowMenu";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { updateLead, type PipelineLead, type PipelineStage } from "@/lib/api";
import { whatsappUrl } from "@/lib/customers";
import { PIPELINE_STAGES, type PipelineStageId } from "@/lib/leads";
import { formatMoney } from "@/lib/money";
import { taskLabel } from "@/lib/tasks";
import { formatClock } from "@/lib/time";

type StageMeta = (typeof PIPELINE_STAGES)[number];

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function nextStep(lead: PipelineLead): { icon: string; text: string } {
  if (lead.stage === "sold") {
    return { icon: "check-circle", text: `Closed · ${shortDate(new Date(lead.sold_at ?? lead.updated_at))}` };
  }
  if (!lead.next_task) return { icon: "clock", text: "No next step" };

  const due = new Date(`${lead.next_task.due_date}T${lead.next_task.due_time}`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const when =
    due.toDateString() === new Date().toDateString()
      ? `Today, ${formatClock(due)}`
      : due.toDateString() === tomorrow.toDateString()
        ? "Tomorrow"
        : shortDate(due);
  return { icon: "clock", text: `${taskLabel({ ...lead.next_task, sub_task: null })} · ${when}` };
}

function DealCard({ lead, menu }: { lead: PipelineLead; menu?: React.ReactNode }) {
  const step = nextStep(lead);
  const agent = lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : "Unassigned";
  return (
    <div className="flex w-full flex-col gap-2 rounded-[4px] border border-border bg-column-bg p-3 leading-[1.4]">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs font-bold text-ink">{lead.client_name}</p>
        {menu}
      </div>
      <p className="truncate text-xs text-primary">{lead.project?.name ?? "—"}</p>
      <p className="text-xs font-bold text-ink">{lead.budget != null ? formatMoney(lead.budget) : "—"}</p>
      <p className="truncate text-[10px] text-muted">
        Lead {lead.lead_no} · {agent}
      </p>
      <div className="flex items-center gap-1.5 text-ink">
        <Icon name={step.icon} className="size-4" />
        <p className="truncate text-[10px]">{step.text}</p>
      </div>
    </div>
  );
}

function SortableDealCard({
  lead,
  canDrag,
  onOpen,
  onMove,
}: {
  lead: PipelineLead;
  canDrag: boolean;
  onOpen: (lead: PipelineLead) => void;
  onMove: (lead: PipelineLead, stage: PipelineStageId) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    disabled: !canDrag,
  });
  const stageIndex = PIPELINE_STAGES.findIndex((stage) => stage.id === lead.stage);
  const nextStage = PIPELINE_STAGES[stageIndex + 1];

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
      className={`w-full touch-manipulation select-none ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
    >
      <DealCard
        lead={lead}
        menu={
          // Kept out of the card's click and drag handling, or opening the menu would open or lift the card.
          <span
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="-my-1 shrink-0"
          >
            <RowMenu
              label={`More actions for ${lead.client_name}`}
              items={[
                { label: "View lead", onClick: () => onOpen(lead) },
                ...(canDrag && nextStage
                  ? [{ label: `Move to ${nextStage.label}`, onClick: () => onMove(lead, nextStage.id) }]
                  : []),
                { label: "WhatsApp client", href: whatsappUrl(lead.client_number), external: true },
                { label: "Call client", href: `tel:${lead.client_number}`, external: true },
              ]}
            />
          </span>
        }
      />
    </div>
  );
}

function StageHeading({ meta, count, total }: { meta: StageMeta; count?: number; total?: number }) {
  return (
    <div className={`flex w-full flex-col gap-2 rounded-[4px] border bg-cream p-3.5 leading-[1.4] ${meta.headingClass}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold">{meta.label}</p>
        {count !== undefined && (
          <span className="rounded-[20px] bg-badge-neutral px-3 py-1 text-[10px]">{count}</span>
        )}
      </div>
      <p className="text-[11px] text-muted">{total !== undefined ? formatMoney(total) : " "}</p>
    </div>
  );
}

function Column({
  meta,
  stage,
  leads,
  canDrag,
  onOpen,
  onMove,
  onViewAll,
}: {
  meta: StageMeta;
  stage: PipelineStage | undefined;
  leads: PipelineLead[];
  canDrag: boolean;
  onOpen: (lead: PipelineLead) => void;
  onMove: (lead: PipelineLead, stage: PipelineStageId) => void;
  onViewAll: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: meta.id });
  const count = stage?.count ?? 0;

  return (
    <div
      ref={setNodeRef}
      className="flex min-h-40 min-w-[200px] flex-1 flex-col items-start gap-3 bg-column-bg"
    >
      <StageHeading meta={meta} count={count} total={stage?.total ?? 0} />
      <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
        {leads.map((lead) => (
          <SortableDealCard key={lead.id} lead={lead} canDrag={canDrag} onOpen={onOpen} onMove={onMove} />
        ))}
      </SortableContext>
      {count > leads.length && (
        <button type="button" onClick={onViewAll} className="text-[11px] leading-[1.4] text-primary hover:underline">
          View all {count} deals →
        </button>
      )}
    </div>
  );
}

type PipelineBoardProps = {
  stages: PipelineStage[];
  isLoading: boolean;
  canDrag: boolean;
  onOpenLead: (lead: PipelineLead) => void;
  /** Called after a deal changes stage, so the parent can refresh counts and totals. */
  onMoved: () => void;
  onViewAll: () => void;
  onError: (message: string) => void;
};

export function PipelineBoard({
  stages,
  isLoading,
  canDrag,
  onOpenLead,
  onMoved,
  onViewAll,
  onError,
}: PipelineBoardProps) {
  const [board, setBoard] = useState<PipelineLead[]>(() => stages.flatMap((stage) => stage.leads));
  const [activeLead, setActiveLead] = useState<PipelineLead | null>(null);
  // Touch needs press-and-hold: with a distance trigger the browser claims the swipe as a scroll
  // and cancels the gesture, so cards never pick up on a phone.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  // The parent owns the fetched stages; re-sync whenever it reloads.
  const [syncedFrom, setSyncedFrom] = useState(stages);
  if (syncedFrom !== stages) {
    setSyncedFrom(stages);
    setBoard(stages.flatMap((stage) => stage.leads));
  }

  function findStage(id: string): PipelineStageId | undefined {
    if (PIPELINE_STAGES.some((stage) => stage.id === id)) return id as PipelineStageId;
    return board.find((lead) => lead.id === id)?.stage as PipelineStageId | undefined;
  }

  async function moveLead(lead: PipelineLead, stage: PipelineStageId) {
    const previousStage = lead.stage;
    setBoard((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage } : l)));
    try {
      await updateLead(lead.id, { stage });
      onMoved();
    } catch (err) {
      setBoard((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: previousStage } : l)));
      onError(err instanceof Error ? err.message : "Could not move that lead.");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(board.find((lead) => lead.id === event.active.id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeStage = findStage(String(active.id));
    const overStage = findStage(String(over.id));
    if (!activeStage || !overStage || activeStage === overStage) return;

    setBoard((prev) => prev.map((lead) => (lead.id === active.id ? { ...lead, stage: overStage } : lead)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const dragged = activeLead;
    setActiveLead(null);
    if (!event.over || !dragged) return;

    const overStage = findStage(String(event.over.id));
    // `dragged` still holds the stage the card was picked up from; the board already shows the new one.
    if (overStage && overStage !== dragged.stage) void moveLead(dragged, overStage);
  }

  if (isLoading) {
    return (
      <div className="kanban-scroll flex gap-4 overflow-x-auto px-4 py-6 sm:px-8">
        {PIPELINE_STAGES.map((meta) => (
          <div key={meta.id} className="flex min-w-[200px] flex-1 flex-col gap-3 bg-column-bg">
            <StageHeading meta={meta} />
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[126px] w-full rounded-[4px]" />
            ))}
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
      <div className="kanban-scroll flex items-start gap-4 overflow-x-auto px-4 py-6 sm:px-8">
        {PIPELINE_STAGES.map((meta) => (
          <Column
            key={meta.id}
            meta={meta}
            stage={stages.find((stage) => stage.id === meta.id)}
            leads={board.filter((lead) => lead.stage === meta.id)}
            canDrag={canDrag}
            onOpen={onOpenLead}
            onMove={(lead, stage) => void moveLead(lead, stage)}
            onViewAll={onViewAll}
          />
        ))}
      </div>
      <DragOverlay>{activeLead ? <DealCard lead={activeLead} /> : null}</DragOverlay>
    </DndContext>
  );
}

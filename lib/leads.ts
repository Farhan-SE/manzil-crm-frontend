export type PipelineStageId = "inquiry" | "prospect" | "mature" | "pre_closure" | "sold";

export type LeadStageId = PipelineStageId | "lost";

/** The pipeline, in board order. `headingClass` tints the two stages the design calls out. */
export const PIPELINE_STAGES: { id: PipelineStageId; label: string; headingClass: string }[] = [
  { id: "inquiry", label: "Inquiry", headingClass: "border-stage-inquiry text-stage-inquiry" },
  { id: "prospect", label: "Prospect", headingClass: "border-border text-ink" },
  { id: "mature", label: "Mature", headingClass: "border-border text-ink" },
  { id: "pre_closure", label: "Pre-Closure", headingClass: "border-border text-ink" },
  { id: "sold", label: "Sold", headingClass: "border-stage-sold text-stage-sold" },
];

/** Every stage a lead can hold. A lost lead has left the pipeline, so it has no board column. */
export const LEAD_STAGES: { id: LeadStageId; label: string }[] = [
  ...PIPELINE_STAGES.map(({ id, label }) => ({ id, label })),
  { id: "lost", label: "Lost" },
];

export function leadStageLabel(stage: string) {
  return LEAD_STAGES.find((entry) => entry.id === stage)?.label ?? stage;
}

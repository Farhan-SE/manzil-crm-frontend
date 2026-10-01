import type { SelectOption } from "@/components/ui/Select";
import type { UnitStatus } from "@/lib/api";

// These ids mirror the lists the server validates against in log-task.dto.ts.
export const TASK_TYPES: SelectOption[] = [
  { id: "call", name: "Call" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "meeting", name: "Meeting" },
  { id: "site_visit", name: "Site Visit" },
  { id: "receive_token_payment", name: "Receive Token Payment" },
  { id: "receive_partial_down_payment", name: "Receive Partial Down Payment" },
  { id: "receive_complete_down_payment", name: "Receive Complete Down Payment" },
];

/** Completing one of these as "Received" moves the lead's unit to the mapped status. */
export const PAYMENT_TASKS: Record<string, UnitStatus> = {
  receive_token_payment: "token",
  receive_partial_down_payment: "pdp",
  receive_complete_down_payment: "cdp",
};

export const PAYMENT_SUB_TASKS: SelectOption[] = [
  { id: "received", name: "Received" },
  { id: "not_received", name: "Not Received" },
];

export const SUB_TASKS: SelectOption[] = [
  { id: "followed_up", name: "Followed Up" },
  { id: "not_answered", name: "Not Answered" },
  { id: "interested", name: "Interested" },
  { id: "not_interested", name: "Not Interested" },
];

export const NEXT_TASKS: SelectOption[] = [
  { id: "do_nothing", name: "Do Nothing" },
  { id: "follow_up", name: "Follow Up" },
  { id: "contact_client", name: "Contact Client" },
  { id: "arrange_meeting", name: "Arrange Meeting" },
  { id: "meet_client", name: "Meet Client" },
  { id: "receive_token_payment", name: "Receive Token Payment" },
  { id: "receive_partial_down_payment", name: "Receive Partial Down Payment" },
  { id: "receive_complete_down_payment", name: "Receive Complete Down Payment" },
  { id: "sign_sale_agreement", name: "Sign Sale Agreement" },
  { id: "closed_won", name: "Closed (Won)" },
];

/** Next tasks that end the conversation, so no deadline is asked for. */
export const TERMINAL_NEXT_TASKS = ["do_nothing", "closed_won"];

export const SUGGESTED_COMMENTS = ["Will call back", "Not answering", "Interested", "Not interested"];

const LABELS = Object.fromEntries(
  [...TASK_TYPES, ...SUB_TASKS, ...PAYMENT_SUB_TASKS, ...NEXT_TASKS].map((o) => [o.id, o.name]),
);

/** "Call (Followed Up)" for a typed task; the free text for follow-ups written before tasks had types. */
export function taskLabel(task: { text: string; task_type: string | null; sub_task: string | null }) {
  if (!task.task_type) return task.text;
  const type = LABELS[task.task_type] ?? task.task_type;
  return task.sub_task ? `${type} (${LABELS[task.sub_task] ?? task.sub_task})` : type;
}

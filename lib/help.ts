import type { HelpTopicId } from "@/lib/api";

export const HELP_TOPICS: { id: HelpTopicId; name: string; description: string; icon: string; iconClass: string }[] = [
  {
    id: "clients_leads",
    name: "Clients & Leads",
    description: "Search clients, allocate leads and track stages",
    icon: "topic-clients",
    iconClass: "size-[18px]",
  },
  {
    id: "tasks",
    name: "Tasks & follow-ups",
    description: "Manage due dates, calls and site visits",
    icon: "topic-tasks",
    iconClass: "size-[18px]",
  },
  {
    id: "projects_inventory",
    name: "Projects & Inventory",
    description: "Find projects, units and payment plans",
    icon: "topic-inventory",
    iconClass: "size-[18px]",
  },
  {
    id: "staff_teams",
    name: "Staff & Teams",
    description: "Understand staff allocation and team coverage",
    icon: "topic-staff",
    iconClass: "size-[18px]",
  },
  {
    id: "accounts_payments",
    name: "Accounts & Payments",
    description: "Track receipts, instalments and balances",
    icon: "wallet",
    iconClass: "size-4",
  },
  {
    id: "reports_management",
    name: "Reports & Management",
    description: "Export reports and review approval queues",
    icon: "topic-reports",
    iconClass: "size-[18px]",
  },
];

export const topicName = (id: string) => HELP_TOPICS.find((topic) => topic.id === id)?.name ?? id;

export const POPULAR_SEARCHES = ["lead allocation", "payment plan", "overdue tasks", "report export"];

export const SUPPORT_HOURS = "Mon–Fri, 9:00 am–6:00 pm PKT";

export const TICKET_IMPACTS = [
  { id: "one_record", name: "One record affected" },
  { id: "several_records", name: "Several records affected" },
  { id: "team_blocked", name: "My team is blocked" },
  { id: "workspace_blocked", name: "Whole workspace is blocked" },
];

export const TICKET_CONTACTS = [
  { id: "email", name: "Email" },
  { id: "phone", name: "Phone" },
  { id: "whatsapp", name: "WhatsApp" },
];

/** The topic a ticket can be filed under when no article covers it. */
export const OTHER_TOPIC = "Other";

export const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_FILES = 5;

export type ArticleBlock = { kind: "heading" | "paragraph"; text: string };

/** Article bodies are plain text: blank lines split blocks and "## " opens a section. */
export function parseArticleBody(body: string): ArticleBlock[] {
  return body
    .split(/\n\s*\n/)
    .flatMap((chunk) => {
      const lines = chunk.trim().split("\n");
      const blocks: ArticleBlock[] = [];
      if (lines[0]?.startsWith("## ")) {
        blocks.push({ kind: "heading", text: lines.shift()!.slice(3).trim() });
      }
      const text = lines.join(" ").trim();
      if (text) blocks.push({ kind: "paragraph", text });
      return blocks;
    });
}

/** "2. Choose the new allocation" → "Choose the new allocation", for the contents list. */
export const stripStepNumber = (heading: string) => heading.replace(/^\d+\.\s*/, "");

export const headingAnchor = (heading: string) =>
  stripStepNumber(heading)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

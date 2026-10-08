import { SupportTicketForm } from "@/components/help/SupportTicketForm";

export default async function SupportTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { article } = await searchParams;
  return <SupportTicketForm articleSlug={typeof article === "string" ? article : undefined} />;
}

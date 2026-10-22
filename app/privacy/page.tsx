import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Manzil CRM",
  description: "How Manzil CRM collects, uses and protects personal information.",
};

const CONTACT_EMAIL = "support@manzil.com";
const LAST_UPDATED = "October 22, 2026";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Who we are",
    body: (
      <p>
        Manzil CRM is software that real estate agencies use to manage their clients, leads, property inventory and
        sales. Each agency that uses Manzil CRM controls the information about its own clients; we process it on their
        behalf.
      </p>
    ),
  },
  {
    title: "Information we collect",
    body: (
      <ul>
        <li>
          <strong>Agency staff accounts:</strong> name, email address, role and activity within the CRM.
        </li>
        <li>
          <strong>Client and lead details</strong> entered by an agency or imported by it: name, phone numbers, email,
          CNIC, city, address, property interests, budget and notes.
        </li>
        <li>
          <strong>WhatsApp messages:</strong> when someone messages an agency&apos;s WhatsApp Business number, we
          receive their WhatsApp phone number, profile name and the content of the messages they send, so the agency
          can reply and record the enquiry as a lead.
        </li>
      </ul>
    ),
  },
  {
    title: "How we use it",
    body: (
      <ul>
        <li>To reply to enquiries sent over WhatsApp, including automated replies that ask about the property sought.</li>
        <li>To create and update clients and leads so the agency&apos;s staff can follow them up.</li>
        <li>To run the CRM: sign-in, permissions, reports, reminders and notifications.</li>
      </ul>
    ),
  },
  {
    title: "Who we share it with",
    body: (
      <>
        <p>We do not sell personal information. It is shared only with:</p>
        <ul>
          <li>The agency the client contacted, and that agency&apos;s staff.</li>
          <li>Meta Platforms, which delivers WhatsApp messages.</li>
          <li>
            Service providers that host or process data for us, such as cloud hosting and AI language services used to
            understand and answer messages, under terms that limit their use of it to providing that service.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "How long we keep it",
    body: (
      <p>
        Client, lead and message records are kept while the agency uses Manzil CRM, or until the agency deletes them.
        Conversation state used to answer WhatsApp messages is kept for a limited time and then removed.
      </p>
    ),
  },
  {
    title: "Security",
    body: (
      <p>
        Data is stored on access-controlled cloud servers and sent over encrypted connections. Staff only see the
        records their role allows.
      </p>
    ),
  },
  {
    title: "Your choices",
    body: (
      <p>
        You can ask for a copy of your information, ask for it to be corrected or deleted, or ask to stop receiving
        messages, by contacting the agency or us at the address below. Deleting your data from WhatsApp itself is
        governed by WhatsApp&apos;s own privacy policy.
      </p>
    ),
  },
  {
    title: "Changes",
    body: <p>We will update this page when our practices change, and the date at the top will change with it.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-cream px-4 py-12 sm:px-8 sm:py-16">
      <article className="mx-auto flex max-w-[720px] flex-col gap-8 text-sm leading-relaxed text-ink">
        <header className="flex flex-col gap-2">
          <h1
            className="font-serif text-3xl font-semibold tracking-[-1px] sm:text-4xl"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Privacy Policy
          </h1>
          <p className="text-xs text-muted">Last updated {LAST_UPDATED}</p>
        </header>

        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="flex flex-col gap-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2"
          >
            <h2 className="font-serif text-xl font-semibold">{section.title}</h2>
            {section.body}
          </section>
        ))}

        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-xl font-semibold">Contact</h2>
          <p>
            Questions or requests about your data:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-xs text-muted">
          <Link href="/" className="underline hover:text-ink">
            Manzil CRM
          </Link>
        </footer>
      </article>
    </main>
  );
}

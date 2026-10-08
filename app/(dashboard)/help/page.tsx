"use client";

import Link from "next/link";
import { useEffect, useState, ViewTransition } from "react";
import { headingStyle, outlineButtonClass, solidButtonClass } from "@/components/help/ui";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { getHelpOverview, type HelpArticleSummary, type HelpOverview, type HelpTopicId } from "@/lib/api";
import { HELP_TOPICS, POPULAR_SEARCHES, SUPPORT_HOURS, topicName } from "@/lib/help";

type Query = { search: string; topic: HelpTopicId | "" };

const panelClass = "flex flex-col gap-4 rounded-[4px] border border-border p-4";

const sectionTitleClass = "font-serif text-sm font-bold leading-[1.4] text-ink";

function ArticleRow({ article }: { article: HelpArticleSummary }) {
  return (
    <Link href={`/help/${article.slug}`} className="group flex items-center justify-between gap-4">
      <span className="flex min-w-0 items-center gap-2.5 text-xs leading-[1.4] text-primary">
        <Icon name="file" className="size-4" />
        <span className="truncate group-hover:underline">{article.title}</span>
      </span>
      <span className="shrink-0 text-[11px] leading-[1.4] text-muted">{article.read_minutes} min read →</span>
    </Link>
  );
}

export default function HelpCenterPage() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState<Query>({ search: "", topic: "" });
  const [overview, setOverview] = useState<HelpOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHelpOverview({ search: query.search || undefined, topic: query.topic || undefined })
      .then((res) => {
        if (cancelled) return;
        setOverview(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the Help Center.");
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  function runSearch(search: string) {
    setDraft(search);
    setQuery({ search: search.trim(), topic: "" });
  }

  const isFiltered = Boolean(query.search || query.topic);
  const resultsTitle = query.search ? `Results for “${query.search}”` : topicName(query.topic);

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-ink" style={headingStyle}>
              Help Center
            </h1>
            <p className="text-[11px] text-muted">Practical guides for your Sales workspace</p>
          </div>
          <Link href="/help/support" className={outlineButtonClass}>
            <Icon name="message" className="size-4" />
            Contact support
          </Link>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(draft);
          }}
          className="flex flex-col gap-4 bg-cream px-4 py-6 sm:px-8"
        >
          <h2 className="font-serif text-lg font-bold leading-[1.4] text-ink" style={headingStyle}>
            How can we help you?
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-11 w-full max-w-[680px] items-center gap-2.5 rounded-[4px] border border-border bg-white px-4 text-placeholder">
              <Icon name="search" className="size-4" />
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search topics, articles or a question"
                aria-label="Search help articles"
                className="min-w-0 flex-1 bg-transparent text-xs leading-[1.4] text-ink placeholder:text-placeholder focus:outline-none"
              />
            </label>
            <button type="submit" className={solidButtonClass}>
              <Icon name="search" className="size-4" />
              Search
            </button>
          </div>
          <p className="flex flex-wrap items-center gap-x-1 text-[11px] leading-[1.4] text-muted">
            Popular searches:
            {POPULAR_SEARCHES.map((term, index) => (
              <span key={term} className="flex items-center gap-x-1">
                {index > 0 && <span aria-hidden="true">·</span>}
                <button type="button" onClick={() => runSearch(term)} className="hover:text-ink hover:underline">
                  {term}
                </button>
              </span>
            ))}
          </p>
        </form>

        {error && <p className="px-4 pt-6 text-sm text-hot sm:px-8">{error}</p>}

        {isFiltered && (
          <div className="px-4 pt-6 sm:px-8">
            <section className={panelClass}>
              <div className="flex items-center justify-between gap-4">
                <h2 className={sectionTitleClass} style={headingStyle}>
                  {resultsTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setDraft("");
                    setQuery({ search: "", topic: "" });
                  }}
                  className="text-[11px] leading-[1.4] text-muted hover:text-ink hover:underline"
                >
                  Clear
                </button>
              </div>
              {overview?.results == null ? (
                <Skeleton className="h-4 w-64" />
              ) : overview.results.length === 0 ? (
                <p className="text-[11px] leading-[1.4] text-muted">
                  No articles match. Try different words, or{" "}
                  <Link href="/help/support" className="text-primary underline">
                    start a support request
                  </Link>
                  .
                </p>
              ) : (
                overview.results.map((article) => <ArticleRow key={article.slug} article={article} />)
              )}
            </section>
          </div>
        )}

        <div className="flex flex-col gap-4 px-4 py-6 sm:px-8">
          <h2 className={sectionTitleClass} style={headingStyle}>
            Browse help topics
          </h2>
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {HELP_TOPICS.map((topic) => {
              const count = overview?.topics.find((entry) => entry.id === topic.id)?.article_count;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setDraft("");
                    setQuery({ search: "", topic: topic.id });
                  }}
                  aria-pressed={query.topic === topic.id}
                  className={`flex flex-col items-start gap-2.5 rounded-[4px] border p-[18px] text-left transition-colors hover:bg-sidebar ${
                    query.topic === topic.id ? "border-primary" : "border-border"
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-ink">
                    <span className="flex size-[18px] items-start">
                      <Icon name={topic.icon} className={topic.iconClass} />
                    </span>
                    <span className="text-xs font-bold leading-[1.4]">{topic.name}</span>
                  </span>
                  <span className="text-[11px] leading-[1.4] text-muted">{topic.description}</span>
                  <span className="text-[11px] leading-[1.4] text-primary">
                    {count == null ? "…" : `${count} ${count === 1 ? "article" : "articles"} →`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 px-4 pb-6 sm:px-8 lg:grid-cols-[minmax(0,820fr)_minmax(0,436fr)]">
          <section className={panelClass}>
            <h2 className={sectionTitleClass} style={headingStyle}>
              Frequently used articles
            </h2>
            {overview ? (
              overview.featured.map((article) => <ArticleRow key={article.slug} article={article} />)
            ) : (
              <>
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-80" />
              </>
            )}
          </section>

          <section className={panelClass}>
            <h2 className={sectionTitleClass} style={headingStyle}>
              Need more help?
            </h2>
            <p className="text-[11px] leading-[1.4] text-muted">
              Contact workspace support with your lead, unit or receipt reference. Never include passwords or payment
              card details.
            </p>
            <Link href="/help/support" className={`${solidButtonClass} self-start`}>
              <Icon name="message" className="size-4" />
              Start a support request
            </Link>
            <p className="text-[11px] leading-[1.4] text-muted">Support hours: {SUPPORT_HOURS}</p>
          </section>
        </div>
      </div>
    </ViewTransition>
  );
}

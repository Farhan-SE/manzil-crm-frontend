"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, ViewTransition } from "react";
import {
  ContextHeading,
  Panel,
  bodyTextClass,
  headingStyle,
  outlineButtonClass,
  solidButtonClass,
} from "@/components/help/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { getHelpArticle, sendHelpArticleFeedback, type HelpArticle } from "@/lib/api";
import { SUPPORT_HOURS, headingAnchor, parseArticleBody, stripStepNumber, topicName } from "@/lib/help";
import { formatDay } from "@/lib/time";

export default function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHelpArticle(slug)
      .then((res) => {
        if (cancelled) return;
        setArticle(res);
        setFeedback(res.my_feedback);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the article.");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function answer(helpful: boolean) {
    const previous = feedback;
    setFeedback(helpful);
    setFeedbackError(null);
    try {
      await sendHelpArticleFeedback(slug, helpful);
    } catch (err) {
      setFeedback(previous);
      setFeedbackError(err instanceof Error ? err.message : "Could not save your answer.");
    }
  }

  if (error) {
    return (
      <div className="flex w-full flex-col">
        <ContextHeading
          crumbs={[{ label: "Help Center", href: "/help" }]}
          title="Article unavailable"
          caption="Help article"
        />
        <p className="px-4 text-sm text-hot sm:px-8">{error}</p>
      </div>
    );
  }

  const blocks = article ? parseArticleBody(article.body) : [];
  const sections = blocks.filter((block) => block.kind === "heading");
  const supportHref = `/help/support?article=${slug}`;

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <ContextHeading
          crumbs={[
            { label: "Help Center", href: "/help" },
            ...(article ? [{ label: topicName(article.topic) }, { label: article.short_title }] : []),
          ]}
          title={article?.title ?? "Loading…"}
          caption={article ? `Help article · ${topicName(article.topic)}` : "Help article"}
          action={
            <Link href={supportHref} className={outlineButtonClass}>
              Contact support
            </Link>
          }
        />

        <div className="grid grid-cols-1 items-start gap-6 px-4 pb-7 sm:px-8 lg:grid-cols-[minmax(0,860fr)_minmax(0,396fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <Panel title={article ? `${article.short_title} guide` : "Guide"}>
              {article ? (
                <>
                  <p className="text-[11px] leading-[1.4] text-muted">
                    {article.read_minutes} min read · Updated {formatDay(article.updated_at)} · Sales workspace
                  </p>
                  {blocks.map((block, index) =>
                    block.kind === "heading" ? (
                      <h3
                        key={index}
                        id={headingAnchor(block.text)}
                        className="scroll-mt-4 font-serif text-sm font-bold leading-[1.4] text-ink"
                        style={headingStyle}
                      >
                        {block.text}
                      </h3>
                    ) : (
                      <p key={index} className={bodyTextClass}>
                        {block.text}
                      </p>
                    ),
                  )}
                </>
              ) : (
                <>
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              )}
            </Panel>

            <Panel title="Was this article helpful?">
              <div className="flex flex-wrap gap-3">
                {[
                  { value: true, label: "Yes, helpful" },
                  { value: false, label: "Not helpful" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => answer(option.value)}
                    disabled={!article}
                    aria-pressed={feedback === option.value}
                    className={feedback === option.value ? solidButtonClass : outlineButtonClass}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {feedback === false && (
                <p className={bodyTextClass}>
                  Sorry about that.{" "}
                  <Link href={supportHref} className="underline">
                    Tell support what was missing →
                  </Link>
                </p>
              )}
              {feedbackError && <p className="text-xs text-hot">{feedbackError}</p>}
            </Panel>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            {sections.length > 0 && (
              <Panel title="In this article">
                {sections.map((section) => (
                  <a
                    key={section.text}
                    href={`#${headingAnchor(section.text)}`}
                    className={`${bodyTextClass} hover:underline`}
                  >
                    {stripStepNumber(section.text)}
                  </a>
                ))}
              </Panel>
            )}

            {article && article.related.length > 0 && (
              <Panel title="Related articles">
                {article.related.map((related) => (
                  <Link key={related.slug} href={`/help/${related.slug}`} className={`${bodyTextClass} hover:underline`}>
                    {related.title} →
                  </Link>
                ))}
              </Panel>
            )}

            <Panel title="Need more help?">
              <p className={bodyTextClass}>
                Include your lead reference and a brief explanation of the issue when contacting support.
              </p>
              <Link href={supportHref} className={`${solidButtonClass} self-start`}>
                Submit support ticket
              </Link>
              <p className={bodyTextClass}>{SUPPORT_HOURS}</p>
            </Panel>
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}

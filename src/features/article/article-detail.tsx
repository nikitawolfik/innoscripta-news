import { format, parseISO } from "date-fns";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ArticleBody } from "~/features/article/article-body";
import type { Article } from "~/types/article";

const PUBLISHED_FORMAT = "d MMMM yyyy, HH:mm";

interface Props {
  article: Article;
}

export function ArticleDetail({ article }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  // React Router marks the first entry of a session "default". Anything else
  // means the reader arrived from the feed, so stepping back through history
  // returns them to it with their filters and scroll position intact —
  // navigating to "/" would silently discard both.
  const arrivedFromApp = location.key !== "default";

  function handleBack(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!arrivedFromApp) {
      return;
    }

    event.preventDefault();
    navigate(-1);
  }

  return (
    <article className="mx-auto max-w-prose">
      {/* Still a real link with an href, so a cold deep link, middle-click and
          open-in-new-tab all behave; the handler only intercepts the in-app
          case. */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/" onClick={handleBack}>
          <ArrowLeft aria-hidden="true" />
          Back to the feed
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{article.sourceLabel}</Badge>
        {article.category ? <span>{article.category}</span> : null}
        <time dateTime={article.publishedAt}>
          {format(parseISO(article.publishedAt), PUBLISHED_FORMAT)}
        </time>
      </div>

      <h1 className="mt-3 text-2xl font-semibold text-balance">
        {article.title}
      </h1>

      {article.author ? (
        <p className="mt-2 text-sm text-muted-foreground">{article.author}</p>
      ) : null}

      {article.imageUrl ? (
        <img
          src={article.imageUrl}
          alt=""
          className="mt-6 w-full rounded-lg object-cover"
        />
      ) : null}

      {article.description ? (
        <p className="mt-6 text-base text-foreground">{article.description}</p>
      ) : null}

      {article.body ? (
        <ArticleBody html={article.body} />
      ) : (
        // Only Guardian licenses full text through its API. For the others a
        // summary plus a link out is all we are entitled to show, so say that
        // rather than leaving the page looking truncated.
        <p className="mt-6 text-sm text-muted-foreground">
          {article.sourceLabel} provides a summary through its API rather than
          the full text. Continue reading at the source.
        </p>
      )}

      <Button className="mt-8" asChild>
        <a href={article.url} target="_blank" rel="noreferrer">
          Read at {article.sourceLabel}
          <ExternalLink aria-hidden="true" />
        </a>
      </Button>
    </article>
  );
}

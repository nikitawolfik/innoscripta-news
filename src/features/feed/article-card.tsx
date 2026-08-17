import { formatDistanceToNow, parseISO } from "date-fns";
import { ImageOff } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "~/components/ui/badge";
import {
  ROW_HEIGHT_CLASS,
  TITLE_CLAMP_CLASS,
} from "~/features/feed/row-height";
import { cn } from "~/lib/utils";
import { encodeArticleId } from "~/lib/article-id";
import type { Article } from "~/types/article";

interface Props {
  article: Article;
}

export function ArticleCard({ article }: Props) {
  const publishedAgo = formatDistanceToNow(parseISO(article.publishedAt), {
    addSuffix: true,
  });

  return (
    <Link
      to={`/post/${article.source}/${encodeArticleId(article.id)}`}
      className="block focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <article
        className={cn(
          "flex flex-col gap-2 border-b border-border p-3 transition-colors hover:bg-muted/50 md:flex-row md:gap-4 md:p-4",
          ROW_HEIGHT_CLASS,
        )}
      >
        <div className="h-36 w-full shrink-0 overflow-hidden rounded-lg bg-muted md:h-full md:w-44">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div
              className="flex size-full items-center justify-center text-muted-foreground"
              data-testid="article-image-placeholder"
            >
              <ImageOff className="size-6" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{article.sourceLabel}</Badge>
            <span>{publishedAgo}</span>
          </div>

          <h2
            className={cn(
              "text-sm font-semibold text-foreground md:text-base",
              TITLE_CLAMP_CLASS,
            )}
          >
            {article.title}
          </h2>

          {article.description ? (
            <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
              {article.description}
            </p>
          ) : null}

          {article.author ? (
            <p className="mt-auto truncate text-xs text-muted-foreground">
              {article.author}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

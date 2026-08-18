import { useParams } from "react-router-dom";

import { getSourceLabel } from "~/api/sources/registry";
import { ArticleDetail } from "~/features/article/article-detail";
import { ArticleDetailSkeleton } from "~/features/article/article-detail-skeleton";
import { ArticleNotFound } from "~/features/article/article-not-found";
import { ArticleUnavailable } from "~/features/article/article-unavailable";
import { useArticle } from "~/hooks/use-article";
import { decodeArticleId } from "~/lib/article-id";
import { isSourceId } from "~/types/source";

const TITLE_SEPARATOR = " | ";

export function ArticleRoute() {
  const { source, id } = useParams();
  // Ids are base64url in the URL so Guardian's slashes and NYT's `nyt://`
  // scheme survive a path segment. An undecodable id is a bad link, not an
  // error worth retrying.
  const articleId = id ? decodeArticleId(id) : null;
  const query = useArticle(source, articleId);
  const headline =
    query.data?.status === "found" ? query.data.article.title : null;

  let content: React.ReactNode;

  if (query.isPending) {
    content = <ArticleDetailSkeleton />;
  } else if (query.isError) {
    content = (
      <ArticleNotFound
        message={query.error.message}
        onRetry={() => query.refetch()}
      />
    );
  } else if (query.data.status === "unresolvable") {
    content = <ArticleUnavailable source={query.data.source} />;
  } else if (query.data.status === "not-found") {
    content = <ArticleNotFound />;
  } else {
    content = <ArticleDetail article={query.data.article} />;
  }

  return (
    <>
      {/* Owned by the route rather than the detail component, so loading and
          degraded states are titled too — React 19 hoists it into <head>. */}
      <title>{articleDocumentTitle(source, headline)}</title>
      {content}
    </>
  );
}

function articleDocumentTitle(
  source: string | undefined,
  headline: string | null,
): string {
  // An unknown source is a bad link, so name no publisher rather than echoing
  // whatever arbitrary string the URL carried into the tab.
  const prefix =
    source && isSourceId(source)
      ? `${getSourceLabel(source)} Article`
      : "Article";

  return headline ? `${prefix}${TITLE_SEPARATOR}${headline}` : prefix;
}

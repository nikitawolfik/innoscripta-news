import { useParams } from "react-router-dom";

import { ArticleDetail } from "~/features/article/article-detail";
import { ArticleDetailSkeleton } from "~/features/article/article-detail-skeleton";
import { ArticleNotFound } from "~/features/article/article-not-found";
import { ArticleUnavailable } from "~/features/article/article-unavailable";
import { useArticle } from "~/hooks/use-article";
import { decodeArticleId } from "~/lib/article-id";

export function ArticleRoute() {
  const { source, id } = useParams();
  // Ids are base64url in the URL so Guardian's slashes and NYT's `nyt://`
  // scheme survive a path segment. An undecodable id is a bad link, not an
  // error worth retrying.
  const articleId = id ? decodeArticleId(id) : null;
  const query = useArticle(source, articleId);

  if (query.isPending) {
    return <ArticleDetailSkeleton />;
  }

  if (query.isError) {
    return (
      <ArticleNotFound
        message={query.error.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (query.data.status === "unresolvable") {
    return <ArticleUnavailable source={query.data.source} />;
  }

  if (query.data.status === "not-found") {
    return <ArticleNotFound />;
  }

  return <ArticleDetail article={query.data.article} />;
}

import { useParams } from "react-router-dom";

export function ArticleRoute() {
  const { source, id } = useParams();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Article</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        source: {source} · id: {id}
      </p>
    </section>
  );
}

import { Link } from "react-router-dom";

import { Button } from "~/components/ui/button";

export function NotFoundRoute() {
  return (
    <section className="text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That page doesn&apos;t exist.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to Discover</Link>
      </Button>
    </section>
  );
}

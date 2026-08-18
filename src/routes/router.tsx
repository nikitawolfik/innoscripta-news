import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "~/routes/app-layout";
import { DiscoverRoute } from "~/routes/discover-route";
import { FeedRoute } from "~/routes/feed-route";
import { NotFoundRoute } from "~/routes/not-found-route";
import { RouteError } from "~/routes/route-error";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    // On the layout too, for a throw in the shell itself — that one has no
    // header left to render inside, so it stands alone.
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DiscoverRoute />, errorElement: <RouteError /> },
      { path: "feed", element: <FeedRoute />, errorElement: <RouteError /> },
      {
        // Split out: the detail page is rarely the entry point and drags in an
        // HTML sanitizer the feed never needs. React Router waits for the chunk
        // before rendering, so there is no flash of a half-built page.
        path: "post/:source/:id",
        errorElement: <RouteError />,
        lazy: async () => {
          const { ArticleRoute } = await import("~/routes/article-route");

          return { Component: ArticleRoute };
        },
      },
      { path: "*", element: <NotFoundRoute /> },
    ],
  },
]);

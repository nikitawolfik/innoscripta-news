import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "~/routes/app-layout";
import { DiscoverRoute } from "~/routes/discover-route";
import { FeedRoute } from "~/routes/feed-route";
import { NotFoundRoute } from "~/routes/not-found-route";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DiscoverRoute /> },
      { path: "feed", element: <FeedRoute /> },
      {
        // Split out: the detail page is rarely the entry point and drags in an
        // HTML sanitizer the feed never needs. React Router waits for the chunk
        // before rendering, so there is no flash of a half-built page.
        path: "post/:source/:id",
        lazy: async () => {
          const { ArticleRoute } = await import("~/routes/article-route");

          return { Component: ArticleRoute };
        },
      },
      { path: "*", element: <NotFoundRoute /> },
    ],
  },
]);

import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "~/routes/app-layout";
import { ArticleRoute } from "~/routes/article-route";
import { DiscoverRoute } from "~/routes/discover-route";
import { FeedRoute } from "~/routes/feed-route";
import { NotFoundRoute } from "~/routes/not-found-route";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DiscoverRoute /> },
      { path: "feed", element: <FeedRoute /> },
      { path: "post/:source/:id", element: <ArticleRoute /> },
      { path: "*", element: <NotFoundRoute /> },
    ],
  },
]);

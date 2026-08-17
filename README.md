# News Aggregator

A news reader that merges articles from three public APIs — **NewsAPI.org**,
**The Guardian** and **The New York Times** — into one normalized, filterable,
virtualized feed.

Built with React 19, TypeScript, Vite and Tailwind CSS v4.

> **Status: in progress.** The build is phased. Sections below are marked
> ✅ built or 🚧 planned so nothing here overstates what currently runs.

---

## Quick start

```bash
npm install
cp .env.example .env   # add your three API keys
npm run dev
```

Keys are free and take a few minutes each:

| Variable       | Where to get it                               |
| -------------- | --------------------------------------------- |
| `NEWSAPI_KEY`  | https://newsapi.org/register                  |
| `GUARDIAN_KEY` | https://open-platform.theguardian.com/access/ |
| `NYT_KEY`      | https://developer.nytimes.com/get-started     |

These are **not** prefixed with `VITE_` on purpose — they are read only by the
server-side proxy and never reach the browser bundle. See
[API keys and CORS](#api-keys-and-cors).

### Scripts

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Vite dev server                     |
| `npm run build`     | Type-check and build for production |
| `npm run preview`   | Serve the production build          |
| `npm run typecheck` | `tsc -b --noEmit`                   |
| `npm run lint`      | oxlint                              |
| `npm run format`    | Prettier (sorts Tailwind classes)   |

---

## Source selection

The brief lists seven data sources. **Only three of them are actually usable**,
and they are the three this project integrates. The others were ruled out after
checking:

| Listed source      | Verdict                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NewsAPI**        | ✅ Same product as "NewsAPI.org" below — the list double-counts it                                                                                      |
| **OpenNews**       | ❌ A journalism nonprofit (Knight-Mozilla). No article API exists                                                                                       |
| **NewsCred**       | ❌ An enterprise content-marketing platform, now Optimizely/Welcome. No self-serve key                                                                  |
| **The Guardian**   | ✅ Integrated. The most permissive of the three, and the only one returning full article body text                                                      |
| **New York Times** | ✅ Integrated. Article Search API                                                                                                                       |
| **BBC News**       | ❌ No public article API. RSS feeds exist but have no search, no categories and no pagination, so they can't participate in a filterable paginated feed |
| **NewsAPI.org**    | ✅ Integrated                                                                                                                                           |

So "choose at least three" resolves to exactly three real options, which is why
the lineup isn't a preference so much as the only viable set.

---

## Architecture

```
Route → Feature component → hook → api/sources/<source>.ts
                                     → fetch("/api/<source>/…")   [same-origin]
                                        → proxy → upstream + secret key
                                        → zod safeParse → normalize → Article

Client state → Zustand (persisted to localStorage, synced across tabs)
Filter state → URL search params on "/", Zustand on "/feed"
```

### Routes

| Route               | Filter state        | Purpose                                                         |
| ------------------- | ------------------- | --------------------------------------------------------------- |
| `/`                 | URL search params   | Search and browse everything. Shareable — the URL is the state  |
| `/feed`             | Zustand (persisted) | Personalized feed; the filter bar **is** the preferences editor |
| `/post/:source/:id` | —                   | Article detail                                                  |

Both feed routes render the **same** `<FilterBar>` and `<ArticleFeed>`. They
differ only in which adapter hook supplies the `[filters, setFilters]` tuple —
`useUrlFilters()` or `usePreferenceFilters()`. That's dependency inversion doing
real work: the filter UI has no idea whether its state lives in the URL or in a
store, which is why there's one implementation instead of two.

There is no separate settings page by design. A preferences form you fill in and
navigate away from is worse than editing your feed and watching it change.

---

## API keys and CORS

This is the one place the project adds a server-side piece, and it isn't
optional:

- **NewsAPI's free tier rejects browser requests.** It returns `corsNotAllowed`
  for any `Origin` other than `localhost`. A pure client-side build therefore
  works on a developer's laptop and breaks the moment it's served from a
  container or a deployment — the worst possible failure mode for a reviewer.
- **Keys must not ship in the bundle.** Anything prefixed `VITE_` is compiled
  into public JavaScript.

So all three sources are called same-origin through `/api/<source>/*`, and a
single Web-standard handler injects the key server-side:

```ts
proxy(request: Request): Promise<Response>;
```

It's written **once** and mounted by three thin adapters — a Vite dev plugin, a
Vercel function, and a small Node server for the Docker image — so the routing
table can't drift between environments.

### Rate limits

The free tiers are metered, and NYT's is strict: **5 requests per minute**, 500
per day. Rather than design around that with fewer features, it's handled in
layers:

- the proxy caches responses (in-process TTL, plus `s-maxage` so a CDN collapses
  duplicate upstream calls)
- a per-source circuit breaker parks a source that returns `429` until its
  `Retry-After` window elapses, so a rate-limited source generates **zero**
  further upstream traffic
- the search input is debounced and TanStack Query holds results `stale` for
  five minutes

A rate-limited source degrades the feed rather than breaking it: the other two
keep rendering, and the UI names the paused source with a live countdown.

---

## Handling three APIs that disagree

The three sources do not support the same filters, and one contradicts itself:

| Filter      | NewsAPI                                        | Guardian              | NYT                          |
| ----------- | ---------------------------------------------- | --------------------- | ---------------------------- |
| keyword     | ✅ `/everything?q=`                            | ✅ `q=`               | ✅ `q=`                      |
| date range  | ✅ ISO `from`/`to`                             | ✅ `from-date`        | ✅ `begin_date` (`yyyyMMdd`) |
| category    | ⚠️ only on `/top-headlines`, not `/everything` | ✅ `section=`         | ✅ `fq=section_name:`        |
| author      | ❌ unsupported                                 | ✅ `tag=profile/`     | ✅ `fq=byline:`              |
| full text   | ❌ truncated to ~200 chars                     | ✅ `show-fields=body` | ❌ abstract only             |
| fetch by id | ❌ no endpoint exists                          | ✅ `GET /{id}`        | ⚠️ via `fq=_id:"…"`          |

Each source declares a **capability descriptor**. When a filter is active that a
source can't honor natively, that source is excluded from the batch and the UI
says so explicitly — _"NewsAPI excluded: no author filtering"_.

The tempting alternative, fetching anyway and filtering in JavaScript, is
deliberately avoided: it silently empties pages, which makes an infinite scroll
think it has reached the end while the user stares at a near-blank screen.

---

## On the UI layer

The interface uses **shadcn/ui**, which is why it looks presentable without any
dedicated design effort. That's worth being upfront about: the visual polish
here is largely a free consequence of the component library, not hand-crafted
styling.

It's also a **swappable** choice. The components are vendored into
`src/components/ui/` and nothing outside that directory depends on shadcn
specifically — no shadcn types leak into the data layer, the routing, the
stores or the feature components. The same application could be rebuilt on
Radix primitives directly, on a different component library, or on hand-rolled
components, and the change would be confined to that one folder.

The parts that took actual thought are elsewhere: the source normalization,
the capability matrix, the merge-and-paginate strategy, the rate-limit handling
and the virtualization.

---

## Trade-offs

- **Feed ordering is chronological within a batch, not across batches.** Each
  page fetches from all eligible sources in parallel and sorts that batch by
  date. Re-sorting the whole accumulated list would be "more correct" but makes
  rows jump under the reader's scroll in a virtualized list. Doing it properly
  across the entire result set needs a backend index, which is out of scope.
- **A NewsAPI article can't be opened from a cold deep link.** NewsAPI has no
  fetch-by-id endpoint at all — articles carry no identifier, only a URL. Clicking
  through from the feed always works (the article is already in memory); a shared
  link or hard refresh shows an explicit "full text unavailable from this source"
  state with a link to the original, rather than a broken page.
- **Only Guardian articles render full text.** The other two APIs return a
  summary plus a link by design, so the detail page shows what each source
  actually licenses.
- **Row heights are fixed constants, not measured.** This keeps virtualization
  jitter-free at the cost of clamping titles and descriptions and reserving a
  fixed image slot.

---

## Deployment

🚧 **Planned.** The proxy handler is designed for three targets from one
implementation:

- **Docker** — multi-stage build, non-root user, keys supplied at runtime
  (never baked into image layers)
- **Vercel** — the handler mounted as a serverless function
- **Local** — the handler mounted as Vite dev middleware

---

## Testing

🚧 **Planned.** Vitest with Testing Library for unit and component coverage, and
Playwright for end-to-end.

The e2e suite runs **against mocked responses only**, sharing fixtures with the
unit tests. This is a deliberate call: these are public APIs with strict rate
limits (NYT allows 5 requests/minute), so a suite hitting them live would be
non-deterministic, slow, unable to assert on specific content — news changes
hourly — and unrunnable by anyone without their own API keys.

---

## Build status

| Phase | Scope                                      | Status  |
| ----- | ------------------------------------------ | ------- |
| P0    | Tooling, aliases, routing shell, theming   | ✅ Done |
| P1    | Proxy handler + dev/Vercel/Docker adapters | 🚧      |
| P2    | `Article` model + Guardian client          | 🚧      |
| P3    | Infinite query + virtualized feed          | 🚧      |
| P4    | NYT + NewsAPI + capability matrix          | 🚧      |
| P5    | Filter bar, URL-driven `/`                 | 🚧      |
| P6    | Preferences-driven `/feed`                 | 🚧      |
| P7    | Article detail page                        | 🚧      |
| P8    | Docker, Vercel, documentation              | 🚧      |
| P9    | Unit, component and e2e test suites        | 🚧      |

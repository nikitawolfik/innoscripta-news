# News Aggregator

A news reader that merges **NewsAPI.org**, **The Guardian** and **The New York
Times** into one normalized, filterable, virtualized feed.

React 19 · TypeScript · Vite · Tailwind CSS v4 · TanStack Query · Playwright

**Live preview:** https://innoscripta-news-rose.vercel.app/

---

## Run it

```bash
cp .env.example .env    # add the three keys below
npm install
npm run dev             # http://localhost:5173
```

Or in Docker, which is how the brief asks for it to run:

```bash
cp .env.example .env
docker compose up --build    # http://localhost:8080
```

| Variable       | Free key from                                 |
| -------------- | --------------------------------------------- |
| `NEWSAPI_KEY`  | https://newsapi.org/register                  |
| `GUARDIAN_KEY` | https://open-platform.theguardian.com/access/ |
| `NYT_KEY`      | https://developer.nytimes.com/get-started     |

The keys are **not** `VITE_`-prefixed on purpose: they are read only by the
server-side proxy and never reach the browser bundle.

### Verify it

```bash
npm run lint          # oxlint
npm run typecheck     # tsc -b --noEmit
npm run test          # 144 unit + component tests
npm run e2e           # 36 Playwright specs, desktop + phone
```

**None of the tests need API keys** — every upstream is mocked, so the suite is
runnable before you sign up for anything and cannot be made flaky by an API
metered at five requests a minute.

---

## Read this before reviewing

Four things about this codebase are deliberate and would otherwise look like
mistakes.

### 1. There is server-side code in a frontend project

`src/server/` holds a ~125-line proxy. It is not scope creep — it is the
smallest thing that makes a client-only app work:

- **NewsAPI's free tier refuses browser origins** (`corsNotAllowed`). A pure SPA
  works on localhost and breaks the moment it is served from a container or a
  deployment.
- **Keys must not ship in the bundle.** Anything `VITE_`-prefixed is compiled
  into public JavaScript.

It is written once and mounted by three thin adapters — Vite middleware, a
Vercel function, a Node server for the container — so the routing table cannot
drift between environments. It holds no state and carries no unit tests, both
deliberately; see [the proxy section](#this-proxy-is-a-workaround-not-an-architecture).

### 2. Sources decline filters instead of returning empty results

The three APIs disagree about what they support, and each disagreement was
verified against the live API rather than taken from documentation. Where a
source cannot honour a filter, it **opts out with a reason shown in the UI**
rather than issuing a query that quietly returns nothing.

| Limitation                                               | Consequence                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| NewsAPI has no author parameter                          | Excluded from author searches                                   |
| NewsAPI `/everything` requires a keyword                 | Sits out the unfiltered feed                                    |
| NewsAPI caps at 100 results and ~30 days of history      | Pagination stops at the ceiling rather than erroring mid-scroll |
| NYT returns zero for **any** `fq` query on the free tier | Category, author and by-id lookup declared unsupported          |
| Only Guardian licenses full body text                    | Others show a summary and link out                              |

The detail is in [Handling three APIs that disagree](#handling-three-apis-that-disagree).

### 3. Known limitations

- **NYT Article Search is intermittently empty.** The same request alternates
  between ~10,000 hits and `docs: null`, with no error and no `429`. Not quota —
  Most Popular returned 20 articles while Article Search returned zero on the
  same key in the same run. The feed degrades per source and names what dropped
  out.
- **NYT category and author filters are unavailable** on this API tier, because
  every `fq` query returns nothing. Guardian covers both; NewsAPI covers
  categories.
- **A NewsAPI article cannot be opened from a cold deep link.** Its articles
  carry no identifier, only a URL. Clicking through from the feed always works;
  a shared link explains itself rather than failing.
- **Feed ordering is chronological within a batch, not across batches.**
  Re-sorting the whole accumulated list would make rows jump under the reader in
  a virtualized list. Doing it properly needs a backend index.
- **The e2e suite is mocked only.** Deliberate: see [Testing](#testing).

### 4. What was deliberately removed

Judgement here is as much about what is absent as what is present:

- **An in-process cache and circuit breaker** in the proxy — real caching and
  quota management belong in a backend, shared across users and surviving
  restarts. Half-solving it per process behaved differently on Vercel than in
  Docker.
- **A duplicated exclusion-reason table** in the registry, which had already
  drifted from the clients it described.
- **Three copies of the feed row height**, which had drifted far enough to clip
  card titles.

---

## Scope

Required by the brief and implemented: keyword search; filtering by date,
category and source; a personalized feed of preferred sources, categories and
authors; mobile-responsive layout; React with TypeScript; at least three of the
listed data sources; Docker with documentation; DRY/KISS/SOLID.

Added beyond the brief, and flagged so required work is distinguishable from
extra: the article detail page, both test suites, Vercel deployment and dark
mode.

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

| Route               | Filter state        | Purpose                                                                             |
| ------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| `/`                 | URL search params   | Search and browse everything. Shareable — the URL is the state                      |
| `/feed`             | Zustand (persisted) | Personalized feed; the filter bar **is** the preferences editor, committed by Apply |
| `/post/:source/:id` | —                   | Article detail; `id` is base64url-encoded (see below)                               |

Both feed routes render the **same** `<FilterBar>` and `<ArticleFeed>`. They
differ only in which adapter hook supplies the `[filters, setFilters]` tuple —
`useUrlFilters()` or `usePreferenceFilters()`. That's dependency inversion doing
real work: the filter UI has no idea whether its state lives in the URL or in a
store, which is why there's one implementation instead of two.

There is no separate settings page by design. A preferences form you fill in and
navigate away from is worse than editing your feed and watching it change.

### Where the SOLID principles actually live

The brief names all five, so rather than assert them, here is the file each one
points at.

| Principle                 | Where to look                                                                                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single responsibility** | `src/server/` moves bytes and attaches secrets, `src/api/sources/` turns one API's shape into an `Article`, `src/features/` renders. A source client contains no React; a component never builds a URL                                                                        |
| **Open–closed**           | Adding a fourth source is one file plus one entry in `src/api/sources/registry.ts`. The feed iterates whatever the registry says is eligible, so no feed, filter or virtualizer code changes — that is how NYT and NewsAPI were added                                         |
| **Liskov substitution**   | Every `SourceClient` is interchangeable in the batch fetch. Differences between APIs are declared as data (`capabilities`, `unsupportedReason`), never as `if (source === "nyt")` branching in the feed                                                                       |
| **Interface segregation** | `fetchById` is explicitly `null` for NewsAPI rather than a stub that throws, so callers can test for the capability instead of catching. `unsupportedReason` lets a source decline a filter it cannot honour without implementing it badly                                    |
| **Dependency inversion**  | `<FilterBar>` depends on a `[filters, setFilters]` tuple, not on a router or a store. `useUrlFilters` and `usePreferenceFilters` are swappable implementations, which is why `/` and `/feed` share one component. One test suite runs against both to keep them substitutable |

DRY and KISS show up mostly as things that were **removed**: an in-process cache
and circuit breaker deleted from the proxy, a duplicated exclusion-reason table
deleted from the registry, and three copies of the feed row height collapsed
into one module after they drifted apart.

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

The handler does exactly four things: route `/api/<source>/*` to an upstream,
attach the secret, pass errors through without leaking anything, and set cache
headers. It holds no state and has no logic worth unit-testing on its own —
deliberately, see below.

### This proxy is a workaround, not an architecture

It exists because these three APIs are awkward in specific ways: one refuses
browser origins outright, all three need secrets attached server-side, each
meters requests differently, and each returns a different shape. A production
system would put a proper backend here instead — one service owning the upstream
integrations, with a shared persistent cache so a given query is fetched once for
all users rather than once per process. That alone would largely dissolve the
rate-limit problem, since quota would be consumed against a warm shared cache
rather than per browser session, and it would let normalization happen once
server-side instead of in every client. That service is out of scope for a
frontend take-home, so what's here is the minimum server-side surface that makes
a client-only app viable.

An earlier iteration went further — an in-process response cache and a
per-source circuit breaker that parked a rate-limited source until its
`Retry-After` window elapsed. Both were removed. They were an overreach: real
caching and quota management belong in the backend described above, where they'd
be shared across users and survive restarts, rather than half-solved per process
in a frontend project. Server-side state that only works on one long-lived
instance is a liability, not a feature — it behaves differently on Vercel than in
Docker, and it invites you to trust a guarantee it can't actually make.

### Rate limits

The free tiers are metered, and NYT's is strict: **5 requests per minute**, 500
per day. That's handled where it belongs for this project — on the client, which
is the part being built:

- upstream `429`s are passed through verbatim, `Retry-After` included, so the
  feed can pause, count down and resume on its own
- rate limits are never retried; exponential backoff against a quota makes the
  problem worse, and the server already said when to come back
- pagination stops requesting while a source is cooling down, so an infinite
  scroll can't turn one `429` into a request storm
- the search input is debounced and TanStack Query holds results `stale` for
  five minutes
- successful responses carry `s-maxage`, so a CDN in front of the deployment
  collapses duplicate upstream calls across users

A rate-limited source degrades the feed rather than breaking it: the other two
keep rendering, and the UI names the paused source with a live countdown.

---

## Handling three APIs that disagree

The three sources do not support the same filters, and one contradicts itself:

| Filter      | NewsAPI                                        | Guardian              | NYT                          |
| ----------- | ---------------------------------------------- | --------------------- | ---------------------------- |
| keyword     | ✅ `/everything?q=`                            | ✅ `q=`               | ✅ `q=`                      |
| date range  | ✅ ISO `from`/`to`                             | ✅ `from-date`        | ✅ `begin_date` (`yyyyMMdd`) |
| category    | ⚠️ only on `/top-headlines`, not `/everything` | ✅ `section=`         | ❌ needs `fq` (see below)    |
| author      | ❌ unsupported                                 | ✅ `tag=profile/`     | ❌ needs `fq` (see below)    |
| full text   | ❌ truncated to ~200 chars                     | ✅ `show-fields=body` | ❌ abstract only             |
| fetch by id | ❌ no endpoint exists                          | ✅ `GET /{id}`        | ❌ needs `fq` (see below)    |

Each source declares a **capability descriptor**. When a filter is active that a
source can't honor natively, that source is excluded from the batch and the UI
says so explicitly — _"NewsAPI excluded: no author filtering"_.

The tempting alternative, fetching anyway and filtering in JavaScript, is
deliberately avoided: it silently empties pages, which makes an infinite scroll
think it has reached the end while the user stares at a near-blank screen.

### NewsAPI's free tier is the most constrained of the three

Its limits are not documented in one place and several of them only surface as
errors partway through using the app, so they are worth listing. All were
verified against the live API:

| Limit                                                             | Behaviour                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `/everything` requires `q`, `sources` or `domains`                | A request with none of them returns **400**                                     |
| `/top-headlines` requires `category`, `country`, `sources` or `q` | Likewise **400**                                                                |
| Category is only available on `/top-headlines`                    | `/everything` has no category parameter and silently ignores one                |
| `/top-headlines` ignores `from`/`to`                              | Returns **200** with date-unfiltered results — wrong answers, no error          |
| Developer plan caps results at **100**                            | Result 101 onwards returns **426** `maximumResultsReached`                      |
| Developer plan reaches back **~1 month**                          | Older ranges return **426** `parameterInvalid`; 23 days back works, 38 does not |

Two of these are silent rather than loud, which makes them the dangerous ones:
an ignored date range returns plausible-looking wrong articles, and the
100-result ceiling does not appear until a reader has scrolled that far and the
source abruptly drops out mid-feed.

The client therefore declares what it cannot do up front rather than failing
mid-request. `hasMore` is capped at the plan ceiling instead of trusting the
reported `totalResults` (which happily claims 21,000 hits), and NewsAPI opts out
— with a specific, actionable reason shown in the UI — when asked for an author,
more than one category, a category combined with a date range, or a range older
than the plan window.

### NYT's Article Search: no `fq`, and intermittently empty

Two separate problems, both verified against the live API.

**Every request carrying `fq` returns zero results** on the free tier — checked
with a healthy baseline in the same run:

```
q=climate&sort=newest                       hits=10000  docs=10
sort=newest&fq=section_name:("Technology")  hits=0      docs=null
sort=newest&fq=news_desk:("Business")       hits=0      docs=null
```

NYT's own documented `fq` example behaves the same way. Category filtering,
author filtering and by-id lookup are all expressed through `fq`, so all three
are **declared unsupported** rather than issued as queries that quietly return
nothing. NYT opts out with a named reason, exactly as NewsAPI does, and its
`fetchById` is `null` so a deep-linked article says so instead of spinning.
Keyword and date filtering are unaffected.

**Separately, the same request alternates between ~10,000 hits and `docs:
null`**, with no error and no `429`. It is not quota: Most Popular returned 20
articles while Article Search returned zero on the same key in the same run, and
a Top Stories section returned "Section not found" in one request and 29
articles in the next. Handled rather than fixed — `docs: null` parses as an
empty page, and the feed degrades per source with the notice naming what
dropped out.

Top Stories and Most Popular are more reliable but accept no query parameters at
all — no keyword, no date range, no author, no pagination — so they cannot serve
the filtering the brief asks for. Substituting them would trade a source that
sometimes returns nothing for one that can never honour a filter.

**Why NewsAPI sits out the unfiltered feed.** With no keyword and no category
there is no query NewsAPI will accept, so it is excluded from the default feed
and the notice says it needs a keyword or category. The obvious alternative was
to fall back to `/top-headlines?language=en`, which works and would keep all
three sources present on first load. It was rejected because it changes what the
feed _is_: `/top-headlines` returns an editorially curated front page, while
Guardian and NYT return reverse-chronological search results. Merging the two
produces a feed sorted by date whose NewsAPI entries were chosen on a different
basis entirely — inconsistent, and impossible to explain to a reader. Excluding
the source and saying so is the honest version.

---

## Why article ids are encoded in the URL

Article links look like `/post/guardian/d29ybGQvMjAyNi9hdWcvMTgv…` rather than
carrying the source's own identifier. That is deliberate.

Because the merge happens **on the frontend**, one route has to address articles
from every source — and the three disagree about what an id even is:

| Source   | Native id                                                                       |
| -------- | ------------------------------------------------------------------------------- |
| Guardian | `world/2026/aug/18/europe-wildfires` — a path, full of slashes                  |
| NYT      | `nyt://article/798697fc-12fc-5fed-a4db-ac3b0739a741` — contains a scheme, `://` |
| NewsAPI  | no id at all; only the article URL, itself full of `/`, `?` and `#`             |

Dropped into a path segment, each breaks in its own way: Guardian's slashes turn
one segment into five, NYT's `://` is mangled differently by Vite's dev server,
nginx-style path normalization and Vercel's router, and a raw URL brings query
and fragment delimiters that end the path early. Percent-encoding helps but is
not reliably preserved — several layers normalize `%2F` back to `/` before the
router sees it.

So ids are **base64url-encoded into one opaque, uniform token**: no slashes, no
scheme, no reserved characters, identical in shape whatever the source. The
route stays a plain `/post/:source/:id`, and `encodeArticleId` /
`decodeArticleId` are a tested round-trip pair — the tests cover exactly the
slash and `://` cases that motivated it.

The trade-off is readability: the URL no longer shows the article slug. For a
shared link that is a fair price for one that survives three routers and three
id formats, and an undecodable token degrades to "article not found" rather
than a crash.

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
- **Body times are localized only where the source marked them up.** Guardian
  liveblogs stamp each update in the paper's own timezone — "at 5.25am BST" —
  but carry the real instant in an adjacent `datetime` attribute, so those are
  rewritten to the reader's timezone. Times written into the prose itself
  ("9.30am BST: Germany ZEW confidence") are left exactly as published.
  Converting those would mean guessing which date they refer to, resolving an
  ambiguous abbreviation without a timezone database (BST is both British Summer
  Time and Bangladesh Standard Time), and pattern-matching third-party prose
  that also contains prices and scores. A mis-converted time is confidently
  wrong and invisible; the published string names its own zone and never
  misleads.
- **Filters are submitted, not applied live — and rate limits are most of the
  reason.** Every control except the search box edits a draft that reaches the
  feed only when Apply is pressed. Applying on each change is the more fashionable
  choice and it was the original decision here, but each change is a new query
  key, and each query key is a round of requests across every eligible source.
  Configuring a date range, two sources and three categories that way costs
  roughly seven rounds, six of them thrown away before anyone reads them — and
  NYT allows five requests a minute, so a single considered filter change could
  exhaust its budget on its own. One Apply costs one round. The search box stays
  live because search-as-you-type is expected, and its debounce already collapses
  a keystroke burst into one commit. Reset also bypasses the draft: clearing
  everything is unambiguous and should not need a second click. Dismissing the
  mobile sheet abandons the draft, since it covers the feed and unapplied
  selections would otherwise sit invisible behind it.
- **Row heights are fixed constants, not measured.** This keeps virtualization
  jitter-free at the cost of clamping titles and descriptions and reserving a
  fixed image slot.
- **The entry bundle is ~200 kB gzipped** and Vite's raw-byte warning threshold
  is raised to match, with the reasoning in `vite.config.ts`. The detail route
  is code-split; splitting further would defer the filter bar's calendar, which
  is not worth the render-timing complexity at this size.
- **The proxy carries no unit tests.** Testing effort is spent on the frontend,
  which is what this project is. The proxy has no branching logic worth pinning
  down, and the behaviour that matters — a source rate-limiting or failing while
  the others keep rendering — is covered end-to-end where a user would see it.

---

## Testing

```bash
npm run test           # unit + component (vitest, jsdom)
npm run test:coverage  # same, with thresholds enforced
npm run e2e            # end-to-end (playwright, chromium)
```

**No API keys are needed for any of it**, which is the point: a reviewer can
clone the repo and run the whole suite before signing up for anything.

Unit and component tests use Vitest with Testing Library, with MSW intercepting
`fetch` so the real client → validate → normalize chain is exercised rather than
a stubbed module. End-to-end tests use Playwright against **the same Node server the container
runs** — not `vite preview` — with every proxied call intercepted in the
browser. That distinction earned itself: a slip in the container's static file
handling served every asset as `text/html`, so the browser refused to execute
them and the page rendered blank while every route still answered 200. A
preview-server suite could not have seen it.

Both layers read the **same captured fixtures** in `tests/fixtures/`, so they
cannot disagree about what an API returns. Those fixtures are parsed by the real
zod schemas in a dedicated test — the guard that was missing when NYT shipped
broken, because its tests asserted against a hand-written shape the API does not
actually return and therefore agreed with the code while every live request
failed. If a fixture stops parsing, the upstream changed: fix the schema, do not
edit the fixture to match.

The e2e suite is **mocked only, deliberately**. These are public APIs with
strict rate limits — NYT allows five requests a minute — so a suite hitting them
live would be non-deterministic, would be unable to assert on specific articles
since the news changes hourly, and would be unrunnable by anyone without their
own keys. What it costs is the assurance that our assumptions about each API
still hold, which is why the fixtures are captured from real responses and
schema-checked rather than invented.

A few cases are worth calling out because they are the ones that break quietly:

- a rate-limited source degrades the feed instead of emptying it, and the spec
  asserts the **request count** afterwards — an unguarded `429` becomes a
  request storm that looks perfectly healthy on screen
- a filter a source cannot honour produces a named reason, not a silent gap
- a NewsAPI article opened cold explains itself rather than spinning
- the mobile sheet opens, applies a filter and closes at a real phone viewport

---

## Running with Docker

Compose reads `.env` from the project directory. If a key is missing it stops
with a message naming it, rather than starting a container that cannot serve
anything.

Without Compose:

```bash
docker build -t innoscripta-news .
docker run --rm -p 8080:8080 \
  -e NEWSAPI_KEY=... -e GUARDIAN_KEY=... -e NYT_KEY=... \
  innoscripta-news
```

To use a different port, set `PORT` — Compose maps it to the container's 8080:

```bash
PORT=3000 docker compose up --build
```

### How the image is put together

- **Multi-stage.** The build stage installs from the lockfile with `npm ci` and
  runs the same `npm run build` used locally; the runtime stage copies only the
  output.
- **No `node_modules` in the final image.** The server build bundles its only
  dependency, and `server.mjs` otherwise imports `node:` builtins alone, so the
  runtime stage is the Node base plus roughly a megabyte of assets. Nothing is
  installed at run time.
- **Non-root.** Runs as the `node` user that `node:22-alpine` provides.
- **Keys at run time only.** They are passed as environment variables and never
  appear in a build argument or an image layer. The server validates them at
  startup and refuses to boot without them — correct for a container, where a
  half-working process is worse than a failed one.
- **Health check.** Polls the app over HTTP using Node's built-in `fetch`, so
  the image needs no `curl`.

---

## Deploying to Vercel

The deployed preview lives at https://innoscripta-news-rose.vercel.app/.

Import the repository, then set `NEWSAPI_KEY`, `GUARDIAN_KEY` and `NYT_KEY` as
project environment variables. No build configuration is needed:
`api/[...path].ts` is picked up as a function automatically, and `vercel.json`
routes everything else to `index.html` for client-side routing.

The same proxy handler runs in all three environments — Vite middleware in
development, a Vercel function in production, and the Node server in the
container — so the routing table cannot drift between them.

---

## Continuous integration

`.github/workflows/ci.yml` runs lint, type-check, the test suite and a
production build on every push, plus a second job that builds the Docker image
so a broken `Dockerfile` fails in CI rather than on a reviewer's machine. No
secrets are required: the tests mock every upstream.

---

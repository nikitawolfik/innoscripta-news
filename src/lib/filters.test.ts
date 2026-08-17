import { describe, expect, it } from "vitest";

import {
  countActiveFilterGroups,
  parseFilters,
  serializeFilters,
} from "~/lib/filters";
import { DEFAULT_FILTERS, type Filters } from "~/types/filters";

const FULL_FILTERS: Filters = {
  q: "climate change",
  from: "2024-01-01",
  to: "2024-01-31",
  sources: ["guardian", "nyt"],
  categories: ["technology", "science"],
  authors: ["Jane Smith", "Smith, Jr."],
};

describe("serializeFilters + parseFilters", () => {
  it("round-trips a fully populated filter set", () => {
    const searchParams = serializeFilters(FULL_FILTERS);

    expect(parseFilters(searchParams)).toEqual(FULL_FILTERS);
  });

  it("serializes defaults to an empty query string", () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("omits empty values so URLs stay clean", () => {
    const searchParams = serializeFilters({
      ...DEFAULT_FILTERS,
      q: "solar",
    });

    expect(searchParams.toString()).toBe("q=solar");
  });

  it("preserves commas inside author names via repeated params", () => {
    const searchParams = serializeFilters({
      ...DEFAULT_FILTERS,
      authors: ["Smith, Jr.", "Jane Doe"],
    });

    expect(searchParams.getAll("author")).toEqual(["Smith, Jr.", "Jane Doe"]);
    expect(parseFilters(searchParams).authors).toEqual([
      "Smith, Jr.",
      "Jane Doe",
    ]);
  });
});

describe("parseFilters malformed input", () => {
  it("returns defaults for an empty query string", () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
  });

  it("drops invalid dates instead of throwing", () => {
    const searchParams = new URLSearchParams({
      from: "not-a-date",
      to: "2024-13-45",
    });

    expect(parseFilters(searchParams)).toEqual(DEFAULT_FILTERS);
  });

  it("normalizes a full ISO timestamp down to a date", () => {
    const searchParams = new URLSearchParams({
      from: "2024-01-01T10:30:00Z",
    });

    expect(parseFilters(searchParams).from).toBe("2024-01-01");
  });

  it("drops unknown sources and keeps known ones", () => {
    const searchParams = new URLSearchParams({
      sources: "guardian,reuters,nyt",
    });

    expect(parseFilters(searchParams).sources).toEqual(["guardian", "nyt"]);
  });

  it("drops unknown categories and keeps known ones", () => {
    const searchParams = new URLSearchParams({
      categories: "technology,astrology",
    });

    expect(parseFilters(searchParams).categories).toEqual(["technology"]);
  });

  it("trims whitespace and drops empty list items", () => {
    const searchParams = new URLSearchParams({
      q: "  solar  ",
      sources: " guardian , ,",
    });

    const filters = parseFilters(searchParams);

    expect(filters.q).toBe("solar");
    expect(filters.sources).toEqual(["guardian"]);
  });
});

describe("countActiveFilterGroups", () => {
  it("counts zero for the defaults", () => {
    expect(countActiveFilterGroups(DEFAULT_FILTERS)).toBe(0);
  });

  it("counts a date range as one group", () => {
    expect(
      countActiveFilterGroups({ ...DEFAULT_FILTERS, from: "2024-01-01" }),
    ).toBe(1);
  });

  it("counts every populated group once", () => {
    expect(countActiveFilterGroups(FULL_FILTERS)).toBe(5);
  });
});

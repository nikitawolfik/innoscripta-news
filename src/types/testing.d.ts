// Loads the jest-dom matcher augmentation for vitest's `expect` so test files
// type-check; the runtime registration happens in vitest.setup.ts, which lives
// outside this tsconfig's include set.
import "@testing-library/jest-dom/vitest";

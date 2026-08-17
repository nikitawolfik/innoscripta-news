// Relative import on purpose: Vercel builds this file with its own toolchain,
// and relying on the `~/` tsconfig path here would make the deployment depend
// on that resolution working. Everything under src/ still uses the alias.
export { proxy as default } from "../src/server/proxy";

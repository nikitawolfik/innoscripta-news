import { z } from "zod";

const ENV_VARIABLES = ["NEWSAPI_KEY", "GUARDIAN_KEY", "NYT_KEY"] as const;

const serverEnvSchema = z.object({
  NEWSAPI_KEY: z.string().trim().min(1),
  GUARDIAN_KEY: z.string().trim().min(1),
  NYT_KEY: z.string().trim().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);

  if (result.success) {
    cachedEnv = result.data;
    return cachedEnv;
  }

  const missingVariables = ENV_VARIABLES.filter(
    (variable) => !process.env[variable]?.trim(),
  );
  const variableList = missingVariables.join(", ");

  throw new Error(
    `Missing required environment variables: ${variableList}. ` +
      `Copy .env.example to .env and fill in your API keys.`,
  );
}

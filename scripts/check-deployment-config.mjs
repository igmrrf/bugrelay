import { checkFiles } from "./deployment-config.mjs";
const [mode, api, web, flag, production, ...extra] = process.argv.slice(2);
if (
  !api ||
  !web ||
  extra.length ||
  (flag !== undefined &&
    (mode !== "staging" || flag !== "--production-api" || !production))
)
  throw new Error(
    "Usage: node scripts/check-deployment-config.mjs staging|production API_CONFIG WEB_CONFIG [--production-api RESOLVED_PRODUCTION_API_CONFIG]",
  );
await checkFiles(mode, [api, web], production);

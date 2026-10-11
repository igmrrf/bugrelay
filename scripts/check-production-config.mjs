// Preserve the production-only command; staging requires an explicit mode.
import { checkFiles } from "./deployment-config.mjs";
await checkFiles("production", process.argv.slice(2));

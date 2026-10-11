import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
export default defineConfig({
 plugins:[cloudflareTest(async()=>({wrangler:{configPath:'./wrangler.jsonc'},remoteBindings:false,miniflare:{bindings:{ENVIRONMENT:'test',MIGRATIONS:await readD1Migrations('./migrations')}}}))],
 test:{include:['test/**/*.test.ts'],testTimeout:20000,hookTimeout:20000,fileParallelism:false}
});

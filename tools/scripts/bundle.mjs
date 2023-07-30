import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  format: "esm",
  target: "esnext",
  platform: "node",
  banner: {
    js: `#!/usr/bin/env node

// Banner starts;
import {createRequire as _banner_createRequire} from 'module';
import { fileURLToPath as _banner_fileURLToPath } from 'url';
import _banner_path from 'path';
const require = _banner_createRequire(import.meta.url)
const __filename = _banner_fileURLToPath(import.meta.url);
const __dirname = _banner_path.dirname(__filename);
// Banner ends
    `,
  },
});

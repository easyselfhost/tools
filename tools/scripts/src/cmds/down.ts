import * as yargs from "yargs";
import { destroyApp } from "./appUtil.js";
import { ConfigError } from "$root/config.js";
import { logger } from "$root/logger.js";
import { Env } from "envUtil.js";
import { getConfigContextFromPath } from "./configUtil.js";

export const DownCommand: yargs.CommandModule<
  Record<string, string>,
  {
    path: string;
    "dry-run": boolean;
    app: (string | number)[];
    "compose-args": (string | number)[];
  }
> = {
  command: "down",
  describe: "Bring down the server.",
  builder: (y) => {
    return y.options({
      path: {
        type: "string",
        describe: "Path of the server configuration directory.",
        default: ".",
      },
      app: {
        type: "array",
        alias: "apps",
        describe: "Specific app(s) to bring down.",
        default: [],
      },
      "dry-run": {
        type: "boolean",
        describe: "Dry run.",
        default: false,
      },
      "ignore-sys-env": {
        type: "boolean",
        describe: "Ignore system environments.",
        default: false,
      },
      "compose-args": {
        type: "array",
        describe: "Additional docker compose arguments with format 'arg=value'",
        default: [],
      },
    });
  },
  handler: async (args) => {
    logger.debug(`Down ${args.path}`);

    try {
      const baseEnv: Env = args["ignore-sys-env"] ? {} : process.env;
      const cfg = await getConfigContextFromPath(args.path, baseEnv);
      const dryRun = args["dry-run"];

      for (const app of cfg.apps) {
        if (args.app.length > 0 && !args.app.includes(app.name)) {
          logger.debug(`Skip ${app.name} as not specified.`);
          continue;
        }

        await destroyApp(app, cfg.server, {
          dryRun,
          serverPath: args.path,
          baseEnv,
          composeArgs: args["compose-args"].map((item) => item.toString()),
        });
      }
    } catch (err) {
      if (err instanceof ConfigError) {
        console.log(err.message);
      }
      console.log(err);
      process.exit(1);
    }
  },
};

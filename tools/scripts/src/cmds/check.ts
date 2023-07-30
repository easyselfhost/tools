import * as yargs from "yargs";
import { ConfigError } from "$root/config.js";
import { logger } from "$root/logger.js";
import { Env } from "$root/envUtil.js";
import { getConfigContextFromPath } from "./configUtil.js";

export const CheckCommand: yargs.CommandModule<
  Record<string, string>,
  { path: string }
> = {
  command: "check",
  describe: "Check server configurations.",
  builder: (y) => {
    return y.options({
      path: {
        type: "string",
        describe: "Path of the server configuration directory.",
        default: ".",
      },
      "ignore-sys-env": {
        type: "boolean",
        describe: "Ignore system environments.",
        default: false,
      },
    });
  },
  handler: async (args) => {
    const baseEnv: Env = args["ignore-sys-env"] ? {} : process.env;

    logger.debug(`Check ${args.path}`);
    try {
      await getConfigContextFromPath(args.path, baseEnv);
    } catch (err) {
      if (err instanceof ConfigError) {
        console.log(err.message);
      }
      console.log(err);
      process.exit(1);
    }
    logger.debug("Check OK");
  },
};

import * as yargs from "yargs";
import fs from "fs/promises";
import { ConfigError } from "$root/config.js";
import { logger } from "$root/logger.js";
import { exec } from "$root/exec.js";
import { Env, layeredEnv } from "envUtil.js";
import { deployApp } from "./appUtil.js";
import { getConfigContextFromPath } from "./configUtil.js";

async function dirExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}

export const UpCommand: yargs.CommandModule<
  Record<string, string>,
  { path: string; "dry-run": boolean }
> = {
  command: "up",
  aliases: ["deploy"],
  describe: "Deploy the server.",
  builder: (y) => {
    return y.options({
      path: {
        type: "string",
        describe: "Path of the server configuration directory.",
        default: ".",
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
    });
  },
  handler: async (args) => {
    logger.debug(`Deploy ${args.path}`);
    try {
      const baseEnv: Env = args["ignore-sys-env"] ? {} : process.env;
      const cfg = await getConfigContextFromPath(args.path, baseEnv);
      const dryRun = args["dry-run"];

      if (cfg.server.config !== undefined) {
        logger.debug("Setting up server...");

        for (const dir of cfg.server.config.directories ?? []) {
          await exec(`mkdir -p ${dir}`, {
            env: layeredEnv(cfg.server.env, baseEnv),
            cwd: args.path,
            dryRun,
          });

          if (!(await dirExists(dir))) {
            console.log(`Failed to create ${dir}.`);
            process.exit(1);
          }
        }

        const docker = cfg.server.config?.docker;
        if (docker !== undefined) {
          const ctx = docker.context;
          if (ctx !== undefined) {
            const command = [
              `docker context create ${ctx.name} --description "${ctx.description}" --docker "${ctx.docker}"`,
              `docker context update ${ctx.name} --description "${ctx.description}" --docker "${ctx.docker}"`,
            ].join(" || ");
            await exec(command, {
              env: layeredEnv(cfg.server.env, baseEnv),
              cwd: args.path,
              dryRun,
            });
            cfg.server.env["DOCKER_CONTEXT"] = ctx.name;
          }
        }

        for (const cmd of cfg.server.config.setup) {
          await exec(cmd, {
            env: layeredEnv(cfg.server.env, baseEnv),
            cwd: args.path,
            dryRun,
          });
        }
      }

      if (cfg.apps.length === 0) {
        console.log("No app to deployed, please create an app directory");
        process.exit(1);
      }

      for (const app of cfg.apps) {
        await deployApp(app, cfg.server, {
          dryRun,
          serverPath: args.path,
          baseEnv,
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

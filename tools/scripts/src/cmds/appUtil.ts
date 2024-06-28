import { AppConfigContext, ServerConfigContext } from "$root/config.js";
import { logger } from "$root/logger.js";
import { exec } from "$root/exec.js";
import { Env, layeredEnv } from "envUtil.js";
import path from "path";

function splitString(str: string) {
  // Check for an empty string
  if (str === "") {
    return [];
  }

  // Find the index of the first occurrence of '='
  const index = str.indexOf("=");

  // If '=' is not found, return an array with the original string
  if (index === -1) {
    return [str];
  }

  // Split the string into two parts at the first '='
  const key = str.substring(0, index);
  const value = str.substring(index + 1);

  // Return the result as an array
  return [key, value];
}

function parseComposeArgs(composeArgs: string[]): string[] {
  const moreArgs = [];
  for (const arg of composeArgs) {
    const values = splitString(arg);
    if (values.length >= 1) {
      const value = values[0];
      moreArgs.push(value.length === 1 ? `-${value}` : `--${value}`);
    }
    if (values.length >= 2) {
      moreArgs.push(values[1]);
    }
  }
  return moreArgs;
}

export async function deployApp(
  app: AppConfigContext,
  server: ServerConfigContext,
  {
    dryRun,
    serverPath,
    baseEnv,
    composeArgs,
  }: {
    dryRun: boolean;
    serverPath: string;
    baseEnv: Env;
    composeArgs?: string[];
  }
) {
  logger.debug(`Deploying ${app.name}...`);

  const appPath = path.join(serverPath, app.name);
  const appSecret = server.secrets?.apps[app.name] ?? {};
  const serverSecret = server.secrets?.global ?? {};

  for (const fa of app.config?.files ?? []) {
    const cpCmd = fa.command ?? "cp";
    if (cpCmd === "cp") {
      await exec(`mkdir -p ${path.dirname(fa.to)}`, {
        env: layeredEnv(app.env, server.env, baseEnv),
        cwd: appPath,
        dryRun,
      });
    }
    await exec(`${cpCmd} ${fa.from} ${fa.to}`, {
      env: layeredEnv(app.env, server.env, baseEnv),
      cwd: appPath,
      dryRun,
    });
  }

  const moreArgs = parseComposeArgs(composeArgs ?? []);

  console.log(`Starting ${app.name}...`);
  await exec(["docker", "compose", "up", "-d", ...moreArgs], {
    env: layeredEnv(appSecret, app.env, serverSecret, server.env, baseEnv),
    cwd: appPath,
    dryRun,
    pipeStdout: true,
    pipeStderr: true,
  });
}

export async function destroyApp(
  app: AppConfigContext,
  server: ServerConfigContext,
  {
    dryRun,
    serverPath,
    baseEnv,
    composeArgs,
  }: {
    dryRun: boolean;
    serverPath: string;
    baseEnv: Env;
    composeArgs?: string[];
  }
) {
  logger.debug(`Destroying ${app.name}`);

  const appPath = path.join(serverPath, app.name);
  const appSecret = server.secrets?.apps[app.name] ?? {};
  const serverSecret = server.secrets?.global ?? {};

  const moreArgs = parseComposeArgs(composeArgs ?? []);

  await exec(["docker", "compose", "down", ...moreArgs], {
    env: layeredEnv(appSecret, app.env, serverSecret, server.env, baseEnv),
    cwd: appPath,
    dryRun,
  });
}

import { AppConfigContext, ServerConfigContext } from "$root/config.js";
import { logger } from "$root/logger.js";
import { exec } from "$root/exec.js";
import { Env, layeredEnv } from "envUtil.js";
import path from "path";

export async function deployApp(
  app: AppConfigContext,
  server: ServerConfigContext,
  {
    dryRun,
    serverPath,
    baseEnv,
  }: { dryRun: boolean; serverPath: string; baseEnv: Env }
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

  console.log(`Starting ${app.name}...`);
  await exec("docker compose up -d".split(" "), {
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
  }: { dryRun: boolean; serverPath: string; baseEnv: Env }
) {
  logger.debug(`Destroying ${app.name}`);

  const appPath = path.join(serverPath, app.name);
  const appSecret = server.secrets?.apps[app.name] ?? {};
  const serverSecret = server.secrets?.global ?? {};

  await exec("docker compose down".split(" "), {
    env: layeredEnv(appSecret, app.env, serverSecret, server.env, baseEnv),
    cwd: appPath,
    dryRun,
  });
}

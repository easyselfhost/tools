import fs from "fs/promises";
import path from "path";
import yaml, { YAMLException } from "js-yaml";
import dotenv from "dotenv";
import * as constants from "$root/constants.js";
import { logger } from "$root/logger.js";
import { Env, applyEnvToString, expandEnv, layeredEnv } from "$root/envUtil.js";
import {
  AppConfig,
  AppConfigContext,
  ConfigContext,
  ConfigError,
  SecretConfig,
  ServerConfig,
  emptySecretConfig,
} from "$root/config.js";
import { getSecretClient } from "$root/secrets.js";

async function fileExists(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isFile();
  } catch (err) {
    return false;
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function handleConfigFileError(
  error: unknown,
  filename: constants.ConfigFileName
): Error {
  if (error instanceof YAMLException) {
    return new ConfigError({
      name: "CONFIG_FORMAT",
      file: filename,
      message: `error parsing YAML: ${error.message}`,
    });
  }
  if (isErrnoException(error)) {
    if (error.code === "ENOENT") {
      return new ConfigError({
        name: "FILE_SYSTEM",
        file: filename,
        message: `cannot find ${filename}`,
      });
    }
  }
  return error as Error;
}

export async function getConfigContextFromPath(
  filePath: string,
  baseEnv: Env
): Promise<ConfigContext> {
  let serverEnv: Env = {};
  try {
    const envFile = path.join(filePath, constants.SERVER_ENV_FILE_NAME);
    if (await fileExists(envFile)) {
      const envStr = await fs.readFile(envFile, "utf-8");
      serverEnv = expandEnv(dotenv.parse(envStr), baseEnv);
    }
  } catch (err) {
    throw handleConfigFileError(err, constants.SERVER_ENV_FILE_NAME);
  }

  logger.debug({ serverEnv: serverEnv });

  let secret: SecretConfig = emptySecretConfig();
  let rawSecretsLoaded = false;

  try {
    const secretFile = path.join(filePath, constants.SECRET_CONFIG_FILE_NAME);
    if (await fileExists(secretFile)) {
      const secretStr = await fs.readFile(secretFile, "utf-8");
      secret = yaml.load(secretStr) as SecretConfig;

      if (secret.global === undefined) {
        secret.global = {};
      }

      if (secret.apps === undefined) {
        secret.apps = {};
      }

      rawSecretsLoaded = true;
    }
  } catch (err) {
    throw handleConfigFileError(err, constants.SECRET_CONFIG_FILE_NAME);
  }

  logger.debug({ secret: secret });

  let server: ServerConfig | undefined;
  try {
    const serverFile = path.join(filePath, constants.SERVER_CONFIG_FILE_NAME);

    if (await fileExists(serverFile)) {
      let serverStr = await fs.readFile(serverFile, "utf-8");
      serverStr = applyEnvToString(
        serverStr,
        layeredEnv(secret.global, serverEnv)
      );
      server = yaml.load(serverStr) as ServerConfig;
    }
  } catch (err) {
    throw handleConfigFileError(err, constants.SERVER_CONFIG_FILE_NAME);
  }

  logger.debug({ server: server ?? "emtpy" });

  if (server?.secrets?.source !== undefined && !rawSecretsLoaded) {
    const secretClient = getSecretClient(server.secrets, filePath);
    const secretStr = await secretClient.pull();
    secret = yaml.load(secretStr) as SecretConfig;

    if (secret.global === undefined) {
      secret.global = {};
    }

    if (secret.apps === undefined) {
      secret.apps = {};
    }

    logger.debug("loaded secret from source");
    logger.debug({ secret: secret });
  }

  const apps: AppConfigContext[] = [];

  try {
    const files = await fs.readdir(filePath);
    for (const file of files) {
      if ((await fs.stat(file)).isDirectory()) {
        const dir = file;
        logger.debug(`enter app directory ${dir}`);

        const appName = path.basename(dir);
        let appConfig: AppConfig | undefined = undefined;
        let appEnv: Env = {};
        const appSecret = secret.apps[appName] ?? {};

        const appFile = path.join(dir, constants.APP_CONFIG_FILE_NAME);
        const envFile = path.join(dir, constants.APP_ENV_FILE_NAME);

        try {
          if (await fileExists(envFile)) {
            const envStr = await fs.readFile(envFile, "utf-8");
            appEnv = expandEnv(
              dotenv.parse(envStr),
              layeredEnv(appSecret, secret.global, serverEnv)
            );
          }
        } catch (err) {
          throw handleConfigFileError(err, constants.APP_ENV_FILE_NAME);
        }
        logger.debug({ appEnv: appEnv });

        try {
          if (await fileExists(appFile)) {
            let appStr = await fs.readFile(appFile, "utf-8");
            appStr = applyEnvToString(
              appStr,
              layeredEnv(appSecret, appEnv, secret.global, serverEnv)
            );
            appConfig = yaml.load(appStr) as AppConfig;
          }
          logger.debug({ appConfig: appConfig ?? "empty" });
        } catch (err) {
          throw handleConfigFileError(err, constants.APP_CONFIG_FILE_NAME);
        }

        apps.push({
          name: appName,
          config: appConfig,
          env: appEnv,
        });
      }
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      throw err;
    }
    throw handleConfigFileError(err, "");
  }

  return {
    server: {
      config: server,
      secrets: secret,
      env: serverEnv,
    },
    apps: apps,
  };
}

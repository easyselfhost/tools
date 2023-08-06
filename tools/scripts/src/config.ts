import * as constants from "./constants.js";
import { Env } from "envUtil.js";

type ServerDockerConfig = {
  context?: {
    name: string;
    description: string;
    docker: string;
  };
  sudo?: boolean;
};

export type SecretSourceConfig = {
  source?: string;
  keyFile?: string[];
};

export type ServerConfig = {
  version: string;
  setup: string[];
  secrets?: SecretSourceConfig;
  directories?: string[];
  docker?: ServerDockerConfig;
};

export type SecretConfig = {
  apps: Record<string, Env | undefined>;
  global: Env;
  server?: Env;
};

export function emptySecretConfig(): SecretConfig {
  return {
    apps: {},
    global: {},
  };
}

export type FileCopyAction = {
  from: string;
  to: string;
  command?: string;
};

export type AppConfig = {
  files: FileCopyAction[];
};

export type AppConfigContext = {
  name: string;
  config?: AppConfig;
  env: Env;
};

export type ServerConfigContext = {
  config?: ServerConfig;
  env: Env;
  secrets?: SecretConfig;
};

export type ConfigContext = {
  server: ServerConfigContext;
  apps: AppConfigContext[];
};

export type ConfigErrorName = "CONFIG_FORMAT" | "FILE_SYSTEM" | "OTHER";

export class ConfigError extends Error {
  name: ConfigErrorName;
  file: constants.ConfigFileName;
  message: string;

  constructor({
    name,
    file,
    message,
  }: {
    name: ConfigErrorName;
    file: constants.ConfigFileName;
    message: string;
  }) {
    super();
    this.name = name;
    this.file = file;
    this.message = message;
  }
}

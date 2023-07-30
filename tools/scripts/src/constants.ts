export const SERVER_CONFIG_FILE_NAME = "server.yml";
export const SERVER_ENV_FILE_NAME = "server.env";

export const SECRET_CONFIG_FILE_NAME = "secrets.yml";

export const APP_CONFIG_FILE_NAME = "app.yml";
export const APP_ENV_FILE_NAME = "app.env";

export const SECRET_VAULT_FILE_NAME = "secrets.yml.vault";

export type ConfigFileName =
  | typeof SERVER_CONFIG_FILE_NAME
  | typeof SERVER_ENV_FILE_NAME
  | typeof SECRET_CONFIG_FILE_NAME
  | typeof APP_CONFIG_FILE_NAME
  | typeof APP_ENV_FILE_NAME
  | "";

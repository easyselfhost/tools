import fs from "fs/promises";
import { SECRET_CONFIG_FILE_NAME } from "$root/constants.js";
import { logger } from "$root/logger.js";
import path from "path";
import * as yargs from "yargs";
import {
  InvalidActionError,
  InvalidSourceError,
  genKey,
  getSecretClient,
  isKeyPair,
} from "$root/secrets.js";
import { getConfigContextFromPath } from "./configUtil.js";

function handleSecretErrors(err: unknown) {
  if (err instanceof InvalidSourceError || err instanceof InvalidActionError) {
    console.log(err.message);
    process.exit(1);
  }
}

const PushCommand: yargs.CommandModule<
  Record<string, string>,
  { path: string; "dry-run": boolean }
> = {
  command: "push",
  describe: "Push secrets to remote source",
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
    });
  },
  handler: async (args) => {
    logger.debug(`Push secrets under ${args.path}`);

    const config = await getConfigContextFromPath(args.path, {});
    const secrets = config.server.secrets;
    if (secrets === undefined) {
      console.log("No secrets in this server configuration directory.");
      process.exit(1);
    }

    const source = config.server.config?.secrets;
    if (source === undefined) {
      console.log("No secret source is provided.");
      process.exit(1);
    }

    const secretPath = path.join(args.path, SECRET_CONFIG_FILE_NAME);
    const secretStr = await fs.readFile(secretPath, "utf-8");

    if (args["dry-run"]) {
      console.log(`Will push secrets in ${secretPath}`);
      process.exit(0);
    }

    try {
      const secretClient = getSecretClient(source, args.path);
      await secretClient.push(secretStr);
    } catch (err) {
      handleSecretErrors(err);
      throw err;
    }
  },
};

const PullCommand: yargs.CommandModule<
  Record<string, string>,
  {
    path: string;
    "dry-run": boolean;
    "print-secrets": boolean;
    "key-file": string | undefined;
  }
> = {
  command: "pull",
  describe: "Pull secrets from remote source",
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
      "print-secrets": {
        type: "boolean",
        describe: "Print pulled secrets instead of writing them to files.",
        default: false,
      },
      "key-file": {
        type: "string",
        describe: "File that has public and private key in JSON format.",
      },
    });
  },
  handler: async (args) => {
    logger.debug(`Pull secrets in ${args.path}`);

    const config = await getConfigContextFromPath(args.path, {});
    const secrets = config.server.secrets;
    if (secrets === undefined) {
      console.log("No secrets in this server configuration directory.");
      process.exit(1);
    }

    if (args.keyFile !== undefined) {
      const keyPairStr = await fs.readFile(args.keyFile, { encoding: "utf-8" });
      const kp = JSON.parse(keyPairStr);
      if (isKeyPair(kp)) {
        process.env["PRIVATE_KEY"] = kp.privateKey;
      }
    }

    const source = config.server.config?.secrets;
    if (source === undefined) {
      console.log("No secret source is provided.");
      process.exit(1);
    }

    if (args.dryRun) {
      console.log(`Will pull secret from ${source}`);
      process.exit(0);
    }

    try {
      const secretClient = getSecretClient(source, args.path);
      const secrets = await secretClient.pull();

      if (args.printSecrets) {
        console.log(secrets);
        process.exit(0);
      }

      const secretPath = path.join(args.path, SECRET_CONFIG_FILE_NAME);
      await fs.writeFile(secretPath, secrets, { encoding: "utf-8" });
    } catch (err) {
      handleSecretErrors(err);
      throw err;
    }
  },
};

const GenKeyCommand: yargs.CommandModule = {
  command: "genkey",
  describe: "Generate a key pair used to encrypt and decrypt secrets.",
  handler: async () => {
    const keypair = await genKey();
    console.log(JSON.stringify(keypair));
  },
};

export const SecretCommand: yargs.CommandModule = {
  command: "secrets",
  describe: "Push or pull secrets from remote source.",
  builder: (y) => {
    return y.command(PushCommand).command(PullCommand).command(GenKeyCommand);
  },
  handler: () => {
    // Intentionally left empty.
  },
};

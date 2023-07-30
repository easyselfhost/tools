import sodium from "libsodium-wrappers";
import fs from "fs/promises";
import { SecretSourceConfig } from "./config.js";
import { SECRET_VAULT_FILE_NAME } from "./constants.js";
import path from "path";

export class InvalidSourceError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidActionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class SecretClient {
  constructor() {
    if (new.target === SecretClient) {
      throw new Error("Cannot instantiate abstract class.");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public push(_secrets: string): Promise<void> {
    throw new Error("Method 'push' must be implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public pull(): Promise<string> {
    throw new Error("Method 'pull' must be implemented.");
  }
}

export class LocalSecretClient extends SecretClient {
  private pubkey?: string;
  private privkey?: string;
  private path: string;

  constructor(
    path: string,
    { pubkey, privkey }: { pubkey?: string; privkey?: string }
  ) {
    super();
    this.path = path;
    this.pubkey = pubkey;
    this.privkey = privkey;
  }

  public async push(secrets: string): Promise<void> {
    const pubkey = this.pubkey;
    if (pubkey === undefined) {
      throw new InvalidActionError(
        "Cannot push local secret without a public key."
      );
    }

    await sodium.ready;

    const encryptedSecrets = sodium.to_base64(
      sodium.crypto_box_seal(secrets, sodium.from_base64(pubkey))
    );

    await fs.writeFile(this.path, encryptedSecrets, { encoding: "utf-8" });
  }

  public async pull(): Promise<string> {
    const privkey = this.privkey;
    const pubkey = this.pubkey;
    if (privkey === undefined || pubkey === undefined) {
      throw new InvalidActionError(
        "Cannot pull local secret without a private and a public key"
      );
    }

    const encryptedSecrets = await fs.readFile(this.path, {
      encoding: "utf-8",
    });

    await sodium.ready;

    const secrets = sodium.to_string(
      sodium.crypto_box_seal_open(
        sodium.from_base64(encryptedSecrets),
        sodium.from_base64(pubkey),
        sodium.from_base64(privkey)
      )
    );

    return secrets;
  }
}

export function getSecretClient(
  config: SecretSourceConfig,
  basePath: string
): SecretClient {
  const source = config.source ?? "local";

  if (source === "local") {
    const pubkey = config?.publicKey;
    if (pubkey === undefined) {
      throw new InvalidActionError(
        "Storing secrets locally requires a public key"
      );
    }
    const privkey = process.env["PRIVATE_KEY"];

    return new LocalSecretClient(path.join(basePath, SECRET_VAULT_FILE_NAME), {
      pubkey,
      privkey,
    });
  }

  throw new InvalidSourceError(`Unsupported source '${source}'`);
}

export type KeyPair = {
  publicKey: string;
  privateKey: string;
};

export function isKeyPair(obj: unknown): obj is KeyPair {
  const kp = obj as KeyPair;
  return (
    kp.publicKey !== undefined &&
    kp.privateKey !== undefined &&
    typeof kp.publicKey === "string" &&
    typeof kp.privateKey === "string"
  );
}

export async function genKey(): Promise<KeyPair> {
  await sodium.ready;

  const keypair = sodium.crypto_box_keypair();

  return {
    publicKey: sodium.to_base64(keypair.publicKey),
    privateKey: sodium.to_base64(keypair.privateKey),
  };
}

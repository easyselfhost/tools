import {
  SecretClient,
  LocalSecretClient,
  InvalidActionError,
} from "./secrets.js";
import os from "os";
import crypto from "crypto";
import path from "path";

function createTempFileName(): string {
  const tempdir = os.tmpdir();
  const filename = crypto.randomBytes(8).toString("hex");
  return path.join(tempdir, filename);
}

const PUBLIC_KEY = "xvm49vDf9bq6RsjtCJj4r0XlvmSY9I6zRJQVPx-PH3A";
const PRIVATE_KEY = "f9yXtA0UR3bKFmzB9DMZq3EiLx5DJDKZg6RB726o5qU";

describe("test LocalSecretClient", () => {
  test("push and pull from local file using keys", async () => {
    const secrets = "this is a secret";
    const filePath = createTempFileName();

    const client: SecretClient = new LocalSecretClient(filePath, {
      pubkey: PUBLIC_KEY,
      privkey: PRIVATE_KEY,
    });

    await client.push(secrets);
    const pulledSecrets = await client.pull();

    expect(pulledSecrets).toEqual(secrets);
  });

  test("pushing without public key throws an error", async () => {
    const secrets = "this is a secret";
    const filePath = createTempFileName();

    const client: SecretClient = new LocalSecretClient(filePath, {
      privkey: PRIVATE_KEY,
    });

    await expect(async () => {
      await client.push(secrets);
    }).rejects.toThrow(InvalidActionError);
  });

  test("pulling without public or private key throws an error", async () => {
    const secrets = "this is a secret";
    const filePath = createTempFileName();

    const client: SecretClient = new LocalSecretClient(filePath, {
      pubkey: PUBLIC_KEY,
    });

    await client.push(secrets);

    const clients: SecretClient[] = [
      client,
      new LocalSecretClient(filePath, { privkey: PRIVATE_KEY }),
      new LocalSecretClient(filePath, {}),
    ];

    for (const cli of clients) {
      await expect(async () => {
        await cli.pull();
      }).rejects.toThrow(InvalidActionError);
    }
  });
});

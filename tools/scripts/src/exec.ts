import { logger } from "logger.js";
import {
  ExecException,
  exec as osExec,
  spawn,
  CommonSpawnOptions,
} from "child_process";
import { Env } from "envUtil.js";

export type ExecOptions = {
  cwd: string;
  env: Env;
  dryRun?: boolean;
  pipeStdout?: boolean;
  pipeStderr?: boolean;
};

export class ExecError extends Error {
  error: ExecException;
  stdout: string;
  stderr: string;
  constructor({
    error,
    stdout,
    stderr,
  }: {
    error: ExecException;
    stdout: string;
    stderr: string;
  }) {
    super();
    this.error = error;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

async function execUsingExec(
  command: string,
  options: ExecOptions
): Promise<{ stdout: string; stderr: string }> {
  if (options.dryRun === true) {
    console.log(`>>> ${command.trim()}\n\tin ${options.cwd}`);
    return { stdout: "", stderr: "" };
  }

  const promise = new Promise((resolve, reject) => {
    const cp = osExec(
      command,
      { cwd: options.cwd, env: options.env },
      (error, stdout, stderr) => {
        if (error !== undefined && error !== null) {
          reject(new ExecError({ error, stdout, stderr }));
          return;
        }
        resolve({
          stdout,
          stderr,
        });
      }
    );

    if (options.pipeStdout === true) {
      cp.stdout?.pipe(process.stdout);
    }

    if (options.pipeStderr === true) {
      cp.stderr?.pipe(process.stderr);
    }
  }) as Promise<{ stdout: string; stderr: string }>;

  return promise;
}

async function execUsingSpawn(
  command: string[],
  options: ExecOptions
): Promise<{ stdout: string; stderr: string }> {
  if (options.dryRun === true) {
    console.log(`>>> ${command.join(" ")}\n\tin ${options.cwd}`);
    return { stdout: "", stderr: "" };
  }

  return new Promise((resolve, reject) => {
    const opt: CommonSpawnOptions = {
      cwd: options.cwd,
      env: options.env,
    };

    if (options.pipeStdout === true) {
      opt.stdio = "inherit";
    }

    const cp = spawn(command[0], command.slice(1), opt);

    cp.on("error", (error) => {
      reject(error);
    });

    cp.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout: "", stderr: "" });
      } else {
        reject(new Error(`Child process exited with code ${code}`));
      }
    });
  });
}

export async function exec(
  command: string | string[],
  options: ExecOptions
): Promise<{ stdout: string; stderr: string }> {
  logger.debug({
    exec: {
      cmd: command,
      options: options,
    },
  });

  if (typeof command === "string") {
    return await execUsingExec(command, options);
  } else {
    return await execUsingSpawn(command, options);
  }
}

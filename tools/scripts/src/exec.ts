import { logger } from "logger.js";
import { ExecException, exec as osExec } from "child_process";
import { Env } from "envUtil.js";

export type ExecOptions = {
  cwd: string;
  env: Env;
  dryRun: boolean;
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

export async function exec(
  command: string,
  options: ExecOptions
): Promise<{ stdout: string; stderr: string }> {
  logger.debug({
    exec: {
      cmd: command,
      options: options,
    },
  });
  if (options.dryRun) {
    console.log(`>>> ${command.trim()}\n\tin ${options.cwd}`);
    return { stdout: "", stderr: "" };
  }

  return new Promise((resolve, reject) => {
    osExec(
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
  });
}

import { pino } from "pino";

function getLogLevel(): "fatal" | "info" | "debug" {
  const envLevel = process.env["LOG_LEVEL"];

  if (envLevel === "info" || envLevel === "debug") {
    return envLevel;
  }

  return "fatal"
}

export const logger = pino({
  level: getLogLevel(),
  base: undefined,
});

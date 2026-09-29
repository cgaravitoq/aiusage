import { homedir } from "node:os";
import { resolve } from "node:path";

export interface CollectorEnv {
  home: string;
  platform?: NodeJS.Platform;
  aiusageHome?: string;
  xdgConfigHome?: string;
  xdgStateHome?: string;
}

export interface CollectorPaths {
  configFile: string;
  plist: string;
  pricesFile: string;
  service: string;
  stderrLog: string;
  stdoutLog: string;
  timer: string;
}

export function processEnv(): CollectorEnv {
  return {
    home: homedir(),
    platform: process.platform,
    aiusageHome: process.env.AIUSAGE_HOME,
    xdgConfigHome: process.env.XDG_CONFIG_HOME,
    xdgStateHome: process.env.XDG_STATE_HOME,
  };
}

function logDirFor(env: CollectorEnv, home: string): string {
  if (env.platform !== "linux") {
    return resolve(home, "Library", "Logs", "aiusage");
  }
  if (env.aiusageHome === undefined && env.xdgStateHome !== undefined) {
    return resolve(env.xdgStateHome, "aiusage", "logs");
  }
  return resolve(home, ".local", "state", "aiusage", "logs");
}

export function systemdUserUnitDir(env: CollectorEnv): string {
  return env.xdgConfigHome === undefined
    ? resolve(env.home, ".config", "systemd", "user")
    : resolve(env.xdgConfigHome, "systemd", "user");
}

export function collectorPaths(env: CollectorEnv): CollectorPaths {
  const home = resolve(env.aiusageHome ?? env.home);
  const configHome =
    env.aiusageHome === undefined && env.xdgConfigHome !== undefined
      ? resolve(env.xdgConfigHome)
      : resolve(home, ".config");
  const logDir = logDirFor(env, home);

  return {
    configFile: resolve(configHome, "aiusage", "config.json"),
    plist: resolve(
      home,
      "Library",
      "LaunchAgents",
      "dev.aiusage.collector.plist",
    ),
    pricesFile: resolve(configHome, "aiusage", "litellm-prices.json"),
    service: resolve(configHome, "systemd", "user", "aiusage.service"),
    stderrLog: resolve(logDir, "aiusage.err.log"),
    stdoutLog: resolve(logDir, "aiusage.log"),
    timer: resolve(configHome, "systemd", "user", "aiusage.timer"),
  };
}

import { spawn } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = join(root, "scripts", "proxychains.template.conf");
const configPath = join(root, "scripts", "proxychains.conf");

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed.split(/\s+#/)[0].trim();
}

function readEnvFile(path) {
  if (!existsSync(path)) return undefined;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const match = lines[i].match(/^\s*(?:export\s+)?PROXY_URL\s*=\s*(.*)$/);
    if (match) return stripQuotes(match[1]);
  }
  return undefined;
}

function defaultProxyUrl() {
  try {
    const match = readFileSync("/etc/resolv.conf", "utf8").match(
      /^\s*nameserver\s+(\S+)/m,
    );
    if (match) return `http://${match[1]}:7890`;
  } catch {}
  return "http://127.0.0.1:7890";
}

function resolveProxyUrl() {
  const fromEnv = process.env.PROXY_URL && stripQuotes(process.env.PROXY_URL);
  if (fromEnv) return fromEnv;
  for (const file of [
    ".env.development.local",
    ".env.local",
    ".env.development",
    ".env",
  ]) {
    const value = readEnvFile(join(root, file));
    if (value) return value;
  }
  return defaultProxyUrl();
}

function normalizeProxyUrl(value) {
  const parts = value.split(/\s+/).filter(Boolean);
  const raw = parts[0].includes("://") ? parts[0] : `http://${parts[0]}`;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid PROXY_URL: ${parts[0]}`);
  }
  if (parts[1]) url.username = parts[1];
  if (parts[2]) url.password = parts[2];
  if (!url.hostname || !url.port) {
    throw new Error(`PROXY_URL must include host and port: ${parts[0]}`);
  }
  return url;
}

function writeProxychainsConfig(url) {
  if (!existsSync(templatePath)) return;
  const lines = readFileSync(templatePath, "utf8").trimEnd().split(/\r?\n/);
  const entry = [
    "http",
    url.hostname,
    url.port,
    decodeURIComponent(url.username),
    decodeURIComponent(url.password),
  ]
    .filter(Boolean)
    .join(" ");
  const index = lines.findIndex((line) =>
    /^\s*(socks4|socks5|http)\s+/.test(line),
  );
  if (index >= 0) lines[index] = entry;
  else lines.push(entry);
  writeFileSync(configPath, `${lines.join("\n")}\n`, { mode: 0o600 });
}

function commandExists(name) {
  return (process.env.PATH ?? "").split(delimiter).some((directory) => {
    try {
      accessSync(join(directory, name), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function run(command, args, env) {
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (error) => {
    console.error(`[proxy-dev] ${error.message}`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 0;
  });
}

const url = normalizeProxyUrl(resolveProxyUrl());
writeProxychainsConfig(url);

const proxy = url.toString().replace(/\/$/, "");
const noProxy = [process.env.NO_PROXY, "localhost,127.0.0.1,::1,.localhost"]
  .filter(Boolean)
  .join(",");
const env = {
  ...process.env,
  PROXY_URL: proxy,
  HTTP_PROXY: proxy,
  HTTPS_PROXY: proxy,
  ALL_PROXY: proxy,
  http_proxy: proxy,
  https_proxy: proxy,
  all_proxy: proxy,
  NO_PROXY: noProxy,
  no_proxy: noProxy,
};

const hasProxychains = commandExists("proxychains");
const nodeProxySupported =
  process.allowedNodeEnvironmentFlags.has("--use-env-proxy");
const forceProxychains = process.env.PROXYCHAINS_FORCE === "1";

console.log(`[proxy-dev] ${url.protocol}//${url.hostname}:${url.port}`);

if (forceProxychains && !hasProxychains) {
  throw new Error("PROXYCHAINS_FORCE=1 requires proxychains on PATH");
}

if (nodeProxySupported && !forceProxychains) {
  env.NODE_USE_ENV_PROXY = "1";
  run("pnpm", ["dev"], env);
} else if (hasProxychains) {
  run("proxychains", ["-f", configPath, "pnpm", "dev"], env);
} else {
  console.warn(
    "[proxy-dev] proxychains and Node env proxy support are unavailable; starting without enforced proxy",
  );
  run("pnpm", ["dev"], env);
}

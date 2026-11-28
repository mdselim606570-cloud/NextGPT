import { jest } from "@jest/globals";
import os from "os";
import path from "path";
import fs from "fs";
import { resolveMcpConfigPath } from "../../src/features/mcp/actions";

// resolveMcpConfigPath must not depend on the process working directory:
// `next dev`, `next start`, standalone servers and Tauri all run with
// different cwds. These tests pin down the documented resolution order.
describe("resolveMcpConfigPath", () => {
  const ORIGINAL_ENV = { ...process.env };
  const ORIGINAL_CWD = process.cwd();
  let tmpDir: string;

  const clearEnv = () => {
    delete process.env.MCP_CONFIG_PATH;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.APPDATA;
  };

  beforeEach(() => {
    clearEnv();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-config-test-"));
    jest.spyOn(process, "cwd").mockReturnValue(tmpDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    clearEnv();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("prefers MCP_CONFIG_PATH when set", () => {
    const custom = path.join(tmpDir, "custom", "mcp.json");
    process.env.MCP_CONFIG_PATH = custom;
    expect(resolveMcpConfigPath()).toBe(custom);
  });

  test("resolves a relative MCP_CONFIG_PATH against the cwd", () => {
    process.env.MCP_CONFIG_PATH = path.join("relative", "mcp.json");
    expect(resolveMcpConfigPath()).toBe(
      path.join(tmpDir, "relative", "mcp.json"),
    );
  });

  test("uses the legacy app/mcp path only when the file exists", () => {
    const legacyDir = path.join(tmpDir, "app", "mcp");
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyFile = path.join(legacyDir, "mcp_config.json");
    fs.writeFileSync(legacyFile, "{}");

    expect(resolveMcpConfigPath()).toBe(legacyFile);
  });

  test("ignores the legacy path when no file exists there", () => {
    const result = resolveMcpConfigPath();
    expect(result).not.toBe(path.join(tmpDir, "app", "mcp", "mcp_config.json"));
    expect(path.basename(result)).toBe("mcp_config.json");
  });

  test("falls back to the per-user config directory", () => {
    if (process.platform === "win32") {
      process.env.APPDATA = path.join(tmpDir, "AppData", "Roaming");
      expect(resolveMcpConfigPath()).toBe(
        path.join(tmpDir, "AppData", "Roaming", "nextgpt", "mcp_config.json"),
      );
    } else {
      process.env.XDG_CONFIG_HOME = path.join(tmpDir, "xdg");
      expect(resolveMcpConfigPath()).toBe(
        path.join(tmpDir, "xdg", "nextgpt", "mcp_config.json"),
      );
    }
  });

  test("default config dir does not depend on cwd", () => {
    const first = resolveMcpConfigPath();
    jest.spyOn(process, "cwd").mockReturnValue("/some/other/cwd");
    expect(resolveMcpConfigPath()).toBe(first);
  });
});

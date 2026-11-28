import { jest } from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";
import { getMcpConfigFromFile } from "../../src/features/mcp/actions";
import { DEFAULT_MCP_CONFIG } from "../../src/features/mcp/types";

describe("getMcpConfigFromFile", () => {
  const ORIGINAL_ENV = { ...process.env };
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-config-fallback-"));
    configPath = path.join(tmpDir, "mcp_config.json");
    process.env.ENABLE_MCP = "true";
    process.env.CODE = "test-code";
    process.env.MCP_CONFIG_PATH = configPath;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns the default config without logging when the file is missing", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await expect(getMcpConfigFromFile("test-code")).resolves.toEqual(
      DEFAULT_MCP_CONFIG,
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  test("logs unexpected config load errors", async () => {
    fs.mkdirSync(configPath);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await expect(getMcpConfigFromFile("test-code")).resolves.toEqual(
      DEFAULT_MCP_CONFIG,
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load MCP config"),
    );
  });
});

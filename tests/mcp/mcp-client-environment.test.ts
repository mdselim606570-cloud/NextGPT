import { createRequire } from "module";
import { getMcpChildEnvironment } from "../../src/features/mcp/client";

// client.ts lazy-loads the CJS MCP SDK via eval("require(...)") so bundlers
// do not pull it into client bundles. Jest runs this suite as ESM, where
// `require` is not defined, so provide one for the eval'd call.
(globalThis as Record<string, unknown>).require = createRequire(
  import.meta.url,
);

describe("MCP child process environment", () => {
  const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (ORIGINAL_OPENAI_API_KEY === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;
    }
  });

  test("does not inherit application secrets", () => {
    process.env.OPENAI_API_KEY = "should-not-be-inherited";

    const env = getMcpChildEnvironment({
      MCP_SERVER_TOKEN: "explicit-server-token",
    });

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.MCP_SERVER_TOKEN).toBe("explicit-server-token");
  });
});

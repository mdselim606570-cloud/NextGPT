import { getClientApi } from "../../src/app/client/api";
import { ServiceProvider } from "../../src/providers/registry";

describe("getClientApi provider registry", () => {
  test.each([
    [ServiceProvider.Google, "GeminiProApi"],
    [ServiceProvider.Anthropic, "ClaudeApi"],
    [ServiceProvider.XAI, "XAIApi"],
    [ServiceProvider.Ai302, "Ai302Api"],
    [ServiceProvider.OpenAI, "ChatGPTApi"],
    [ServiceProvider.Azure, "ChatGPTApi"],
  ])("maps %s to %s", (provider, expected) => {
    const api = getClientApi(provider);
    expect(api.llm.constructor.name).toBe(expected);
  });

  test("falls back to the OpenAI client for unknown providers", () => {
    const api = getClientApi(ServiceProvider.Stability);
    expect(api.llm.constructor.name).toBe("ChatGPTApi");
  });
});

// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { jest } from "@jest/globals";
import { TextDecoder, TextEncoder } from "util";

// jest-environment-jsdom does not expose Node's text encoder globals, but
// application modules (e.g. src/app/utils/hmac.ts) instantiate them at import
// time.
Object.assign(global, { TextDecoder, TextEncoder });

global.fetch = jest.fn((input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input.toString();
  // The prompt store expects { en, tw, cn } prompt lists from prompts.json;
  // other callers expect an array.
  const json = url.includes("prompts.json")
    ? { en: [], tw: [], cn: [] }
    : [];
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(json),
    headers: new Headers(),
    redirected: false,
    statusText: "OK",
    type: "basic",
    url: "",
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(""),
  } as Response);
});

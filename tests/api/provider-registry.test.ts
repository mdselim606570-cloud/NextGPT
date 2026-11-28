import { ServiceProvider } from "../../src/providers/registry";

describe("provider registry", () => {
  test("ServiceProvider has one entry per supported provider", () => {
    expect(Object.keys(ServiceProvider).length).toBeGreaterThanOrEqual(16);
  });

  test("every ServiceProvider value is a non-empty string", () => {
    for (const value of Object.values(ServiceProvider)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

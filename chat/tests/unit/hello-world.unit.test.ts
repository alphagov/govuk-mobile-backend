import { describe, expect, it } from "vitest";

describe("Hello World Unit Tests", () => {
  it("should return 'Hello, World!'", () => {
    const helloWorld = "Hello, World!";
    expect(helloWorld).toBe("Hello, World!");
  });

  it("should not return 'Goodbye, World!'", () => {
    const helloWorld = "Hello, World!";
    expect(helloWorld).not.toBe("Goodbye, World!");
  });
});

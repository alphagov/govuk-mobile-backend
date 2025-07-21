import { describe, it, expect } from "vitest";
import { deepDiff, deepEqual, DiffResult, DiffEntry } from "./diff";

describe("Node object deep diff helper tests", () => {
  it("should spot the difference between to deep objects", () => {
    const obj1: Record<string, any> = {
      name: "John",
      age: 30,
      address: {
        street: "123 Main St",
        city: "London",
      },
      hobbies: ["reading", "coding"],
    };

    const obj2: Record<string, any> = {
      name: "John",
      age: 31,
      address: {
        street: "456 Oak Ave",
        city: "London",
      },
      hobbies: ["reading", "gaming"],
      email: "john@example.com",
    };

    const diff: DiffResult = deepDiff(obj1, obj2);

    expect(diff).toEqual({
      age: {
        type: "changed",
        from: 30,
        to: 31,
      },
      address: {
        type: "changed",
        value: {
          street: {
            type: "changed",
            from: "123 Main St",
            to: "456 Oak Ave",
          },
        },
      },
      hobbies: {
        type: "changed",
        from: ["reading", "coding"],
        to: ["reading", "gaming"],
      },
      email: {
        type: "added",
        value: "john@example.com",
      },
    });
  });
});

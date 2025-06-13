interface DiffResult {
  [key: string]: DiffEntry;
}

interface DiffEntry {
  type: "added" | "deleted" | "changed";
  value?: any;
  from?: any;
  to?: any;
}

function deepDiff(
  obj1: Record<string, any>,
  obj2: Record<string, any>,
): DiffResult {
  const changes: DiffResult = {};

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const val1 = obj1[key];
    const val2 = obj2[key];

    // Key only exists in obj1
    if (!(key in obj2)) {
      changes[key] = { type: "deleted", value: val1 };
    }
    // Key only exists in obj2
    else if (!(key in obj1)) {
      changes[key] = { type: "added", value: val2 };
    }
    // Both have the key, check if values are different
    else if (!deepEqual(val1, val2)) {
      // If both values are objects, recursively diff them
      if (isObject(val1) && isObject(val2)) {
        const nestedDiff = deepDiff(val1, val2);
        if (Object.keys(nestedDiff).length > 0) {
          changes[key] = { type: "changed", value: nestedDiff };
        }
      } else {
        changes[key] = { type: "changed", from: val1, to: val2 };
      }
    }
  }

  return changes;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

function isObject(obj: any): obj is Record<string, any> {
  return obj !== null && typeof obj === "object" && !Array.isArray(obj);
}

export { deepDiff, deepEqual, DiffResult, DiffEntry };

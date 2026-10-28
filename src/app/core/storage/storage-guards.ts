export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export const isString = (value: unknown): value is string =>
  typeof value === "string";
export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
export const isList =
  <T>(guard: (v: unknown) => v is T) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(guard);

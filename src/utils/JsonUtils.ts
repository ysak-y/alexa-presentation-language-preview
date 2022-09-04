export type JsonType = { [key: string]: JsonValue };

export type JsonValue = string | number | boolean | JsonValue[] | JsonType;

export function isJsonValue(val: unknown): val is JsonValue {
  return (
    typeof val === "string" ||
    typeof val === "number" ||
    typeof val === "boolean" ||
    (Array.isArray(val) && val.every((v) => isJsonValue(v))) ||
    (!!val &&
      typeof val === "object" &&
      Object.keys(val).every((v) => isJsonValue(v)))
  );
}

export function isJsonType(val: unknown): val is JsonType {
  return (
    !!val &&
    typeof val === "object" &&
    Object.keys(val).every((v) => isJsonValue(v))
  );
}

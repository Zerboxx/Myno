export interface JsonSchemaLike {
  type?: string;
  properties?: Record<string, { type?: string; description?: string }>;
  required?: string[];
}

export interface ArgumentCorrectionResult {
  corrected: Record<string, unknown>;
  suggestedCorrection: Record<string, unknown>;
  unknownKeys: string[];
  missingRequired: string[];
  changed: boolean;
}

const PARAM_ALIASES: Record<string, string[]> = {
  is_start: ["action", "start", "isStart", "play", "mode"],
  studio_id: ["studioId", "studio"],
};

export function jsonSchemaSummary(
  schema: JsonSchemaLike | undefined,
): Record<string, string> {
  const summary: Record<string, string> = {};

  if (!schema?.properties) {
    return summary;
  }

  for (const [key, value] of Object.entries(schema.properties)) {
    summary[key] = value.type ?? "unknown";
  }

  return summary;
}

export function correctToolArguments(
  args: Record<string, unknown>,
  schema: JsonSchemaLike | undefined,
): ArgumentCorrectionResult {
  const corrected = { ...args };
  const suggestedCorrection: Record<string, unknown> = {};
  const properties = schema?.properties ?? {};
  const required = schema?.required ?? [];
  const knownKeys = new Set(Object.keys(properties));

  const unknownKeys = Object.keys(corrected).filter(
    (key) => knownKeys.size > 0 && !knownKeys.has(key),
  );

  for (const [canonical, aliases] of Object.entries(PARAM_ALIASES)) {
    if (!(canonical in properties)) {
      continue;
    }

    if (hasValue(corrected[canonical])) {
      continue;
    }

    for (const alias of aliases) {
      if (!hasValue(corrected[alias])) {
        continue;
      }

      const mapped = mapAliasValue(
        canonical,
        alias,
        corrected[alias],
        properties[canonical]?.type,
      );

      if (mapped !== undefined) {
        corrected[canonical] = mapped;
        suggestedCorrection[canonical] = mapped;
        delete corrected[alias];
        break;
      }
    }
  }

  for (const [key, spec] of Object.entries(properties)) {
    if (!hasValue(corrected[key])) {
      continue;
    }

    const coerced = coerceType(corrected[key], spec.type);

    if (coerced !== corrected[key]) {
      corrected[key] = coerced;
      suggestedCorrection[key] = coerced;
    }
  }

  const missingRequired = required.filter((key) => !hasValue(corrected[key]));

  const remainingUnknown = Object.keys(corrected).filter(
    (key) => knownKeys.size > 0 && !knownKeys.has(key),
  );

  return {
    corrected,
    suggestedCorrection,
    unknownKeys: remainingUnknown.length > 0 ? remainingUnknown : unknownKeys,
    missingRequired,
    changed: Object.keys(suggestedCorrection).length > 0,
  };
}

function mapAliasValue(
  canonical: string,
  alias: string,
  value: unknown,
  expectedType?: string,
): unknown {
  if (canonical === "is_start") {
    if (typeof value === "boolean") {
      return value;
    }

    const text = String(value).toLowerCase();

    if (["start", "play", "true", "on", "begin"].includes(text)) {
      return true;
    }

    if (["stop", "end", "false", "off"].includes(text)) {
      return false;
    }
  }

  if (alias === canonical) {
    return coerceType(value, expectedType);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return coerceType(value, expectedType);
  }

  return undefined;
}

export function coerceType(value: unknown, expectedType?: string): unknown {
  if (!expectedType) {
    return value;
  }

  if (expectedType === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true" || value === "1") {
      return true;
    }

    if (value === "false" || value === "0") {
      return false;
    }
  }

  if (expectedType === "number" || expectedType === "integer") {
    if (typeof value === "number") {
      return expectedType === "integer" ? Math.trunc(value) : value;
    }

    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      const numeric = Number(value);
      return expectedType === "integer" ? Math.trunc(numeric) : numeric;
    }
  }

  return value;
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

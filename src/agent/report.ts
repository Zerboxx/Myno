export interface ReportCriteria {
  required: boolean;
  id: string;
  description: string;
}

export interface ReportCheck {
  id: string;
  passed: boolean;
}

export function buildSuccessfulResponse(
  criteria: ReportCriteria[],
  checks: ReportCheck[],
  fallbackContent: string,
): string {
  const requiredCriteria =
    criteria.filter(
      (criterion) =>
        criterion.required,
    );

  const lines = requiredCriteria.map(
    (criterion) => {
      const check =
        checks.find(
          (item) =>
            item.id ===
            criterion.id,
        );

      return check?.passed
        ? `✓ ${criterion.description}`
        : `✗ ${criterion.description}`;
    },
  );

  if (
    lines.length === 0
  ) {
    return (
      fallbackContent ||
      "Task completed and verified."
    );
  }

  return `
Task completed and verified.

${lines.join("\n")}
`;
}

export interface FailureInfo {
  executedToolNames: string[];

  studioUnavailableError?:
    | string
    | undefined;

  verificationReason: string;

  lastError?: string;

  truncate: (
    value: string,
    max: number,
  ) => string;

  maxErrorChars: number;
}

export function buildFailureResponse(
  info: FailureInfo,
): string {
  const uniqueFailedTools = [
    ...new Set(
      info.executedToolNames,
    ),
  ];

  const reason =
    info.studioUnavailableError
      ? info.studioUnavailableError
      : info.verificationReason ||
        info.lastError ||
        "Insufficient evidence.";

  return `
I could not honestly verify that the requested task was completed.

Reason:
${info.truncate(
  reason,
  info.maxErrorChars,
)}
${
  uniqueFailedTools.length > 0
    ? `\nFailed tools: ${uniqueFailedTools.join(", ")}`
    : ""
}

No completion claim was made because the required result was not sufficiently verified.
`;
}
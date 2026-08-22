function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeId(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("ID must not be empty");
  }

  return normalized;
}

export function normalizeText(value: string): string {
  return collapseWhitespace(value);
}

export function normalizeTags(tags: readonly string[]): string[] {
  const normalizedTags: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const normalized = collapseWhitespace(tag);
    const comparisonKey = normalized.toLocaleLowerCase("en-US");

    if (!normalized || seen.has(comparisonKey)) {
      continue;
    }

    seen.add(comparisonKey);
    normalizedTags.push(normalized);
  }

  return normalizedTags;
}

export function normalizeIds(ids: readonly string[]): string[] {
  const normalizedIds: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    const normalized = normalizeId(id);

    if (!seen.has(normalized)) {
      seen.add(normalized);
      normalizedIds.push(normalized);
    }
  }

  return normalizedIds;
}

export function normalizeTimestamp(value: string | Date): string {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid timestamp");
  }

  return date.toISOString();
}

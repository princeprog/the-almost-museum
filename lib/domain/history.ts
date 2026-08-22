import { historyEventSchema } from "./schemas";
import type { HistoryEvent, HistoryEventInput } from "./types";

function cloneAndFreezeJsonLike<T>(value: T, clones = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  const existingClone = clones.get(value);
  if (existingClone !== undefined) {
    return existingClone as T;
  }

  if (Array.isArray(value)) {
    const clone: unknown[] = [];
    clones.set(value, clone);

    for (const item of value) {
      clone.push(cloneAndFreezeJsonLike(item, clones));
    }

    return Object.freeze(clone) as T;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const clone: Record<string, unknown> = prototype === null ? Object.create(null) : {};
  clones.set(value, clone);

  for (const [key, item] of Object.entries(value)) {
    clone[key] = cloneAndFreezeJsonLike(item, clones);
  }

  return Object.freeze(clone) as T;
}

export function createHistoryEvent(input: HistoryEventInput): HistoryEvent {
  const event = historyEventSchema.parse({
    ...input,
    details: input.details ?? {},
  });

  return Object.freeze({
    ...event,
    details: cloneAndFreezeJsonLike(event.details),
  });
}

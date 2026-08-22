import { historyEventSchema } from "./schemas";
import type { HistoryEvent, HistoryEventInput } from "./types";

export function createHistoryEvent(input: HistoryEventInput): HistoryEvent {
  const event = historyEventSchema.parse({
    ...input,
    details: { ...(input.details ?? {}) },
  });

  Object.freeze(event.details);
  return Object.freeze(event);
}

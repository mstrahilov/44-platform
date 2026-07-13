export const INTERACTIVE_PROTOCOL = '44os.interactive.v1' as const;

export type InteractiveBridgeMessage = {
  protocol: typeof INTERACTIVE_PROTOCOL;
  type: 'ready' | 'progress' | 'achievement-intent' | 'error' | 'exit';
  sessionId: string;
  sequence?: number;
  eventKey?: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
  message?: string;
  crossOriginIsolated?: boolean;
};

export function parseInteractiveBridgeMessage(value: unknown): InteractiveBridgeMessage | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Partial<InteractiveBridgeMessage>;
  if (message.protocol !== INTERACTIVE_PROTOCOL || typeof message.sessionId !== 'string') return null;
  if (!['ready', 'progress', 'achievement-intent', 'error', 'exit'].includes(message.type ?? '')) return null;
  if (message.payload && (typeof message.payload !== 'object' || Array.isArray(message.payload))) return null;
  return message as InteractiveBridgeMessage;
}

export function interactiveEntryOrigin(entryUrl: string) {
  const url = new URL(entryUrl);
  if (url.protocol !== 'https:') throw new Error('Interactive builds require HTTPS.');
  return url.origin;
}

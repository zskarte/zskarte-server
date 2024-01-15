export const WebsocketEvent = {
  STATE_PATCHES: 'state:patches',
} as const;
export type WebsocketEvent = (typeof WebsocketEvent)[keyof typeof WebsocketEvent];

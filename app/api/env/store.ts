// Simple in-memory store for uploaded env overrides.
// NOTE: In production you should persist securely and encrypt secrets.

export type SenderEnv = {
  SENDER_EMAIL?: string;
  SENDER_APP_PASSWORD?: string;
  SENDER_NAME?: string;
};

let override: SenderEnv = {};

export function setOverrideEnv(values: SenderEnv) {
  override = { ...override, ...values };
}

export function getOverrideEnv(): SenderEnv {
  return { ...override };
}

export function clearOverrideEnv() {
  override = {};
}

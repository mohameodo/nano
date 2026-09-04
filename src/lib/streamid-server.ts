import { createStreamIDServer } from "@streamid/server-sdk";

export function getStreamIDServer() {
  try {
    return createStreamIDServer();
  } catch {
    return null;
  }
}

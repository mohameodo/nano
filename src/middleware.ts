import { defineMiddleware } from "astro:middleware"
import { protectRequest, secureResponse } from "./protect/sse"

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const protection = await protectRequest(request)
  if (protection.response) {
    return secureResponse(protection.response, protection.sessionId, protection.setCookie)
  }
  const response = await next()
  return secureResponse(response, protection.sessionId, protection.setCookie)
})

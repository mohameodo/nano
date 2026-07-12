/** Cloudflare Workers stub — real Node https is unavailable; callers should use fetch(). */
export default {}
export const Agent = class Agent {}
export const request = () => {
  throw new Error("node:https is not available in Workers; use fetch()")
}
export const get = request

/** Cloudflare Workers stub — real Node http is unavailable; callers should use fetch(). */
export default {}
export const Agent = class Agent {}
export const request = () => {
  throw new Error("node:http is not available in Workers; use fetch()")
}
export const get = request

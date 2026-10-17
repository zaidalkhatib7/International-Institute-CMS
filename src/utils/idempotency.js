/*
 * An Idempotency-Key for one money act (8 to 160 characters of [A-Za-z0-9._:-],
 * as the API takes it). A form makes one when it opens and sends the same key on
 * every retry of the same body, so a double click or a retry after a lost answer
 * never moves money twice.
 */
export function newIdempotencyKey() {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    return `key-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
  }
  return `key-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

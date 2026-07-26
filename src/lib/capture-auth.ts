import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 'v2'
const TOKEN_TTL_SECONDS = 180 * 24 * 60 * 60

function captureSigningSecret() {
  return (
    process.env.CAPTURE_SIGNING_SECRET?.trim() ||
    process.env.CAPTURE_TOKEN?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  )
}

function signatureFor(userId: string, issuedAt: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`${TOKEN_VERSION}:${userId}:${issuedAt}`)
    .digest('base64url')
}

export function captureIsConfigured() {
  return Boolean(captureSigningSecret())
}

export function createCaptureDeviceToken(userId: string) {
  const secret = captureSigningSecret()
  if (!secret) return null
  const issuedAt = Math.floor(Date.now() / 1000).toString()
  return `${TOKEN_VERSION}.${userId}.${issuedAt}.${signatureFor(userId, issuedAt, secret)}`
}

export function readCaptureDeviceToken(token: string) {
  const secret = captureSigningSecret()
  if (!secret) return null

  const [version, userId, issuedAt, signature, ...rest] = token.split('.')
  if (
    version !== TOKEN_VERSION ||
    !userId ||
    !issuedAt ||
    !signature ||
    rest.length > 0
  ) {
    return null
  }

  const issuedAtSeconds = Number(issuedAt)
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (
    !Number.isSafeInteger(issuedAtSeconds) ||
    issuedAtSeconds > nowSeconds + 300 ||
    nowSeconds - issuedAtSeconds > TOKEN_TTL_SECONDS
  ) {
    return null
  }

  const expected = signatureFor(userId, issuedAt, secret)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null
  }

  return userId
}

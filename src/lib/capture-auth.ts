import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 'v1'

function legacyCaptureSecret() {
  return process.env.CAPTURE_TOKEN?.trim() || null
}

function captureSigningSecret() {
  return (
    legacyCaptureSecret() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  )
}

function signatureFor(userId: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`${TOKEN_VERSION}:${userId}`)
    .digest('base64url')
}

export function captureIsConfigured() {
  return Boolean(captureSigningSecret())
}

export function createCaptureDeviceToken(userId: string) {
  const secret = captureSigningSecret()
  if (!secret) return null
  return `${TOKEN_VERSION}.${userId}.${signatureFor(userId, secret)}`
}

export function readCaptureDeviceToken(token: string) {
  const secret = captureSigningSecret()
  if (!secret) return null

  const [version, userId, signature, ...rest] = token.split('.')
  if (
    version !== TOKEN_VERSION ||
    !userId ||
    !signature ||
    rest.length > 0
  ) {
    return null
  }

  const expected = signatureFor(userId, secret)
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

export function isLegacyCaptureToken(token: string) {
  const secret = legacyCaptureSecret()
  if (!secret) return false

  const actualBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(secret)
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

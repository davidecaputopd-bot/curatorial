const BUCKET = 'inbox-images'
const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${BUCKET}/`

export function inboxImageStoragePath(value: string | null | undefined) {
  if (!value) return null

  if (!/^https?:\/\//i.test(value)) {
    return value.startsWith('/') || value.includes('..') ? null : value
  }

  try {
    const url = new URL(value)
    const markerIndex = url.pathname.indexOf(PUBLIC_PATH_MARKER)
    if (markerIndex === -1) return null
    return decodeURIComponent(
      url.pathname.slice(markerIndex + PUBLIC_PATH_MARKER.length)
    )
  } catch {
    return null
  }
}

export async function signedInboxImageUrl(
  supabase: {
    storage: {
      from(bucket: string): {
        createSignedUrl(path: string, expiresIn: number): Promise<{
          data: { signedUrl?: string } | null
          error: unknown
        }>
      }
    }
  },
  value: string | null | undefined
) {
  const path = inboxImageStoragePath(value)
  if (!path) return value || null

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60)

  return error ? null : data?.signedUrl || null
}

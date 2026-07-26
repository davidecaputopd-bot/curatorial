type AuthUser = {
  email?: string | null
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase('en-US') || null
}

export function getGrowOwnerEmail() {
  return normalizeEmail(
    process.env.GROW_OWNER_EMAIL || process.env.NEXT_PUBLIC_GROW_LOGIN_EMAIL
  )
}

export function isGrowOwner(user: AuthUser | null | undefined) {
  const ownerEmail = getGrowOwnerEmail()
  return Boolean(ownerEmail && normalizeEmail(user?.email) === ownerEmail)
}

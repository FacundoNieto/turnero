export function flattenPermissions(permissions: Record<string, string[]>) {
  return new Set(Object.keys(permissions || {}))
}

export function can(permissionsSet: Set<string> | undefined, code: string) {
  if (!permissionsSet) return false
  return permissionsSet.has(code)
}

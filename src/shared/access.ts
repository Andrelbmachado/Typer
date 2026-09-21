export const API_SCOPES = ['projects:read', 'projects:write', 'fonts:export'] as const
export type ApiScope = (typeof API_SCOPES)[number]

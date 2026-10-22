export function adminAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return true;
  const header =
    request.headers.get("x-admin-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

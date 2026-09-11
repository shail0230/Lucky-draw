import { AppError, database } from "./store";
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function cookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="))?.slice(name.length + 1) || "";
}
export function setCookie(response: Response, request: Request, name: string, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append("Set-Cookie", `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new AppError("This request is not allowed.", 403);
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError("Expected a JSON request.");
  try { const parsed = await request.json(); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); return parsed as Record<string, unknown>; }
  catch { throw new AppError("Please check your entry and try again."); }
}
export async function safe(action: () => Promise<Response>) {
  try { return await action(); }
  catch (error) {
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    console.error("Lucky draw request failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "The draw is temporarily unavailable. Please try again shortly." }, 503);
  }
}
export async function authenticated(request: Request) {
  const db = await database();
  const id = cookie(request, "benne_session");
  if (!id) throw new AppError("Please verify your mobile number to continue.", 401);
  const session = await db.prepare("SELECT phone FROM sessions WHERE id = ? AND expires_at > ?").bind(id, Date.now()).first<{ phone: string }>();
  if (!session) throw new AppError("Your session has expired. Please verify your number again.", 401);
  return { db, phone: session.phone };
}

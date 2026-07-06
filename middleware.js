import { NextResponse } from "next/server";

export const config = { matcher: ["/admin/:path*"] };

async function expectedToken() {
  const data = new TextEncoder().encode(
    `${process.env.ADMIN_PASSWORD || ""}:tavle-admin-session`
  );
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req) {
  const cookie = req.cookies.get("tavle_admin")?.value;
  if (cookie !== (await expectedToken())) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

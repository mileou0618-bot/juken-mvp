import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/juken") {
    return NextResponse.redirect(new URL("/", req.url), 301);
  }
  if (pathname === "/juken/diagnosis") {
    return NextResponse.redirect(new URL("/diagnosis", req.url), 301);
  }
  if (pathname === "/juken/result") {
    return NextResponse.redirect(new URL("/result", req.url), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/juken", "/juken/diagnosis", "/juken/result"],
};


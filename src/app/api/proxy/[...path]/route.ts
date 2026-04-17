import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.ORDER_BACKEND_URL ??
  process.env.NEXT_PUBLIC_ORDER_BACKEND_URL ??
  "http://localhost:8080";

const SUPPORTED_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];
type RouteContext = { params: { path: string[] } | Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  if (!SUPPORTED_METHODS.includes(request.method)) {
    return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
  }

  const { path } = await Promise.resolve(context.params);
  const pathSuffix = path.join("/");
  const query = request.nextUrl.search;
  const targetUrl = `${BACKEND_BASE_URL}/api/${pathSuffix}${query}`;

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (["host", "connection", "content-length"].includes(key.toLowerCase())) return;
    forwardHeaders.set(key, value);
  });

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type") ?? "application/json";
    responseHeaders.set("content-type", contentType);

    const responseText = await response.text();

    return new NextResponse(responseText, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { message: "Tidak dapat terhubung ke backend order service." },
      { status: 502 }
    );
  }
}

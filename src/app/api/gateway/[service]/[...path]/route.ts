import { NextRequest, NextResponse } from "next/server";

const SERVICE_URLS: Record<string, string | undefined> = {
  auth: process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_AUTH_BACKEND_URL ?? "http://localhost:3002",
  inventory:
    process.env.INVENTORY_BACKEND_URL ?? process.env.NEXT_PUBLIC_INVENTORY_BACKEND_URL ?? "http://localhost:4002",
  order: process.env.ORDER_BACKEND_URL ?? process.env.NEXT_PUBLIC_ORDER_BACKEND_URL ?? "http://localhost:5002",
  wallet: process.env.WALLET_BACKEND_URL ?? process.env.NEXT_PUBLIC_WALLET_BACKEND_URL ?? "http://localhost:6002",
  voucher: process.env.VOUCHER_BACKEND_URL ?? process.env.NEXT_PUBLIC_VOUCHER_BACKEND_URL ?? "http://localhost:7002",
};

type RouteContext = {
  params:
    | { service: string; path: string[] }
    | Promise<{ service: string; path: string[] }>;
};

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
  const { service, path } = await Promise.resolve(context.params);
  const baseUrl = SERVICE_URLS[service];

  if (!baseUrl) {
    return NextResponse.json(
      { message: `Backend URL untuk service '${service}' belum di-set.` },
      { status: 500 }
    );
  }

  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const targetUrl = `${cleanBaseUrl}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (["host", "connection", "content-length"].includes(lower)) {
      return;
    }
    headers.set(key, value);
  });

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      cache: "no-store",
    });

    const responseText = await response.text();
    const responseHeaders = new Headers();
    responseHeaders.set(
      "content-type",
      response.headers.get("content-type") ?? "application/json"
    );

    return new NextResponse(responseText, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { message: `Gagal terhubung ke service '${service}'.` },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: RouteContext) {
  return deprecatedResponse(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return deprecatedResponse(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return deprecatedResponse(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return deprecatedResponse(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return deprecatedResponse(request, context);
}

type RouteContext = { params: { path: string[] } | Promise<{ path: string[] }> };
async function deprecatedResponse(request: NextRequest, context: RouteContext) {
  const { path } = await Promise.resolve(context.params);
  return NextResponse.json(
    {
      message: "Endpoint /api/proxy sudah deprecated. Gunakan /api/gateway/{service}/... .",
      path,
      method: request.method,
    },
    { status: 410 }
  );
}

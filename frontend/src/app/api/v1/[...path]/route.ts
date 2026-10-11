import { getCloudflareContext } from "@opennextjs/cloudflare";
export const dynamic = "force-dynamic";
async function proxy(request: Request) {
  const url = new URL(request.url);
  const init = {
    method: request.method,
    headers: new Headers(request.headers),
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual" as RequestRedirect,
    duplex: "half",
  };
  // Local Next dev only. Production always requires a private service binding.
  if (process.env.NODE_ENV === "development") {
    init.headers.set("Accept-Encoding", "identity");
    const response = await fetch(
      `http://127.0.0.1:8787${url.pathname}${url.search}`,
      init,
    );
    const headers = new Headers(response.headers);
    // Node fetch decodes upstream bodies; forwarding compression headers would
    // make the browser decode them twice.
    headers.delete("Content-Encoding");
    headers.delete("Content-Length");
    return new Response(response.body, { status: response.status, headers });
  }
  const { env } = await getCloudflareContext({ async: true });
  const binding = (
    env as unknown as { API: { fetch: (r: Request) => Promise<Response> } }
  ).API;
  if (!binding)
    return Response.json(
      {
        error: {
          code: "API_UNAVAILABLE",
          message: "Service is not configured.",
        },
      },
      { status: 503 },
    );
  return binding.fetch(new Request(request.url, init));
}
export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as DELETE,
  proxy as PUT,
  proxy as OPTIONS,
};

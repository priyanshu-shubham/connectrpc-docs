export interface ConnectResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
  duration: number;
}

export async function sendConnectRequest(
  baseUrl: string,
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<ConnectResponse> {
  const start = performance.now();

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const duration = Math.round(performance.now() - start);

  let data: unknown;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  const resHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    resHeaders[k] = v;
  });

  return { status: res.status, data, headers: resHeaders, duration };
}

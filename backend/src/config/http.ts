import https from 'https';

/**
 * Minimal HTTPS JSON client, forced to IPv4.
 *
 * Why not global fetch(): some upstreams (e.g. USDA FoodData Central on
 * AWS/cloud.gov) publish AAAA records. Inside a container without IPv6 egress,
 * fetch() selects the IPv6 address and hangs (ETIMEDOUT). `family: 4` pins
 * DNS resolution to IPv4, which connects fine.
 */
function request<T>(
  url: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  payload: unknown | undefined,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = payload !== undefined ? JSON.stringify(payload) : undefined;
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        family: 4,                       // ← force IPv4
        timeout: timeoutMs,
        headers: {
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
          ...headers,
        },
      },
      res => {
        const status = res.statusCode ?? 0;
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (status < 200 || status >= 300) return reject(new Error(`HTTP ${status}`));
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export function getJSON<T = unknown>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 15000
): Promise<T> {
  return request<T>(url, 'GET', headers, undefined, timeoutMs);
}

/**
 * Fire a GET purely for its side effect of reaching the server — resolves with
 * the status code whatever the response body or status is. Used by the idle
 * keep-alive, where a 502 from a still-booting instance is a successful wake,
 * not a failure, and parsing the body would be wasted work.
 */
export function ping(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 10000
): Promise<number> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        family: 4,
        timeout: timeoutMs,
        headers: { Accept: 'application/json', ...headers },
      },
      res => {
        res.resume();                       // drain so the socket can close
        res.on('end', () => resolve(res.statusCode ?? 0));
      }
    );
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}

export function postJSON<T = unknown>(
  url: string,
  payload: unknown,
  headers: Record<string, string> = {},
  timeoutMs = 15000
): Promise<T> {
  return request<T>(url, 'POST', headers, payload, timeoutMs);
}

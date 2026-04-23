// Local HTTP server exposing /api/inngest for Inngest dev server to ping
// Usage: node --env-file=.env.local scripts/local-server.js

import {createServer} from 'node:http';
import {serve} from 'inngest/lambda';
import {inngest} from '../inngest/client.js';
import {communityMonitorDaily} from '../inngest/functions/communityMonitor.js';

const PORT = process.env.PORT || 3002;
const handler = serve({
  client: inngest,
  functions: [communityMonitorDaily],
});

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith('/api/inngest')) {
    res.writeHead(404).end('Not found');
    return;
  }

  // Collect body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf-8');

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const queryStringParameters = Object.fromEntries(url.searchParams);

  const event = {
    httpMethod: req.method,
    headers: req.headers,
    path: url.pathname,
    queryStringParameters,
    body,
    isBase64Encoded: false,
  };

  try {
    const result = await handler(event);
    res.writeHead(result.statusCode || 200, result.headers || {});
    res.end(result.body || '');
  } catch (err) {
    console.error('Handler error:', err);
    res.writeHead(500).end(JSON.stringify({error: err.message}));
  }
});

server.listen(PORT, () => {
  console.log(`▶ Local server: http://localhost:${PORT}/api/inngest`);
  console.log(`▶ Inngest dev: open another terminal and run:`);
  console.log(`     npx inngest-cli@latest dev -u http://localhost:${PORT}/api/inngest`);
  console.log(`▶ Then open http://localhost:8288 → Functions → community-monitor-daily → Invoke`);
});

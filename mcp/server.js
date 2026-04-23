#!/usr/bin/env node
// MCP server for Joy Community Engine — auto-loads .env.local before module init
// Run: node mcp/server.js
// Register: claude mcp add joy-community -- node /Users/AvadaGroup/Desktop/joy-community-engine/mcp/server.js

import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {existsSync} from 'node:fs';

// Load .env.local FIRST (before any module that reads env vars)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// Dynamic imports (run AFTER env is loaded)
const {Server} = await import('@modelcontextprotocol/sdk/server/index.js');
const {StdioServerTransport} = await import('@modelcontextprotocol/sdk/server/stdio.js');
const {CallToolRequestSchema, ListToolsRequestSchema} = await import('@modelcontextprotocol/sdk/types.js');
const {allTools} = await import('./tools.js');

const server = new Server(
  {name: 'joy-community-engine', version: '0.1.0'},
  {capabilities: {tools: {}}}
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async req => {
  const tool = allTools.find(t => t.name === req.params.name);
  if (!tool) throw new Error(`Tool not found: ${req.params.name}`);

  try {
    const result = await tool.handler(req.params.arguments || {});
    return {content: [{type: 'text', text: JSON.stringify(result, null, 2)}]};
  } catch (err) {
    return {
      isError: true,
      content: [{type: 'text', text: `Error: ${err.message}`}],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Joy Community MCP server ready');

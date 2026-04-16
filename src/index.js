#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';

const API_BASE = 'https://api.moondream.ai/v1';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'image/jpeg';
}

function isLocalFile(input) {
  if (!input || typeof input !== 'string') return false;
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('data:')) return false;
  if (fs.existsSync(input) && fs.statSync(input).isFile()) return true;
  if (input.startsWith('/') || input.startsWith('./') || input.startsWith('../')) {
    try {
      return fs.existsSync(input) && fs.statSync(input).isFile();
    } catch {
      return false;
    }
  }
  return false;
}

async function fileToBase64(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  const mimeType = getMimeType(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

class MoondreamServer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.server = new Server(
      {
        name: 'mcp-server-moondream',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'caption',
          description: 'Generate a natural language description of an image',
          inputSchema: {
            type: 'object',
            properties: {
              image_url: {
                type: 'string',
                description: 'URL, local file path, or base64 encoded image data'
              },
              length: {
                type: 'string',
                enum: ['short', 'normal', 'long'],
                default: 'normal',
                description: 'Length of the caption'
              }
            },
            required: ['image_url']
          }
        },
        {
          name: 'query',
          description: 'Ask a question about an image (Visual Question Answering)',
          inputSchema: {
            type: 'object',
            properties: {
              image_url: {
                type: 'string',
                description: 'URL, local file path, or base64 encoded image data'
              },
              question: {
                type: 'string',
                description: 'Question to ask about the image'
              }
            },
            required: ['image_url', 'question']
          }
        },
        {
          name: 'detect',
          description: 'Detect objects in an image with bounding boxes',
          inputSchema: {
            type: 'object',
            properties: {
              image_url: {
                type: 'string',
                description: 'URL, local file path, or base64 encoded image data'
              },
              object: {
                type: 'string',
                description: 'Object class to detect (e.g., "person", "car", "cat")'
              }
            },
            required: ['image_url', 'object']
          }
        },
        {
          name: 'point',
          description: 'Get center coordinates of an object in an image',
          inputSchema: {
            type: 'object',
            properties: {
              image_url: {
                type: 'string',
                description: 'URL, local file path, or base64 encoded image data'
              },
              object: {
                type: 'string',
                description: 'Object to find coordinates for'
              }
            },
            required: ['image_url', 'object']
          }
        },
        {
          name: 'segment',
          description: 'Generate an SVG mask for an object in an image',
          inputSchema: {
            type: 'object',
            properties: {
              image_url: {
                type: 'string',
                description: 'URL, local file path, or base64 encoded image data'
              },
              object: {
                type: 'string',
                description: 'Object to segment'
              }
            },
            required: ['image_url', 'object']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'caption':
            return await this.caption(args.image_url, args.length);
          case 'query':
            return await this.query(args.image_url, args.question);
          case 'detect':
            return await this.detect(args.image_url, args.object);
          case 'point':
            return await this.point(args.image_url, args.object);
          case 'segment':
            return await this.segment(args.image_url, args.object);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }

  async callApi(endpoint, body) {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moondream-Auth': this.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  async resolveImageUrl(input) {
    if (isLocalFile(input)) {
      return await fileToBase64(input);
    }
    return input;
  }

  async caption(imageUrl, length = 'normal') {
    const resolvedUrl = await this.resolveImageUrl(imageUrl);
    const result = await this.callApi('caption', { image_url: resolvedUrl, length, stream: false });
    return {
      content: [{ type: 'text', text: result.caption }]
    };
  }

  async query(imageUrl, question) {
    const resolvedUrl = await this.resolveImageUrl(imageUrl);
    const result = await this.callApi('query', { image_url: resolvedUrl, question });
    return {
      content: [{ type: 'text', text: result.answer }]
    };
  }

  async detect(imageUrl, object) {
    const resolvedUrl = await this.resolveImageUrl(imageUrl);
    const result = await this.callApi('detect', { image_url: resolvedUrl, object });
    return {
      content: [{ type: 'text', text: JSON.stringify(result.objects, null, 2) }]
    };
  }

  async point(imageUrl, object) {
    const resolvedUrl = await this.resolveImageUrl(imageUrl);
    const result = await this.callApi('point', { image_url: resolvedUrl, object });
    return {
      content: [{ type: 'text', text: JSON.stringify(result.points, null, 2) }]
    };
  }

  async segment(imageUrl, object) {
    const resolvedUrl = await this.resolveImageUrl(imageUrl);
    const result = await this.callApi('segment', { image_url: resolvedUrl, object });
    return {
      content: [{ type: 'text', text: JSON.stringify({ path: result.path, bbox: result.bbox }, null, 2) }]
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Server running on stdio');
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { apiKey: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && i + 1 < args.length) {
      config.apiKey = args[i + 1];
      i++;
    }
  }

  return config;
}

async function main() {
  const { apiKey } = parseArgs();
  const key = apiKey || process.env.MOONDREAM_API_KEY;

  if (!key) {
    console.error('Error: API key required. Pass --api-key or set MOONDREAM_API_KEY env variable.');
    process.exit(1);
  }

  const server = new MoondreamServer(key);
  await server.start();
}

main().catch(console.error);

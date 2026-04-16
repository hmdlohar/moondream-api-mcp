# Moondream API MCP Server

A Model Context Protocol (MCP) server that provides access to Moondream AI's vision API capabilities.

## Features

- **Caption**: Generate natural language descriptions of images
- **Query**: Ask questions about images (Visual Question Answering)
- **Detect**: Detect objects with bounding boxes
- **Point**: Find center coordinates of objects
- **Segment**: Generate SVG masks for objects

## Installation

```bash
npm install -g moondream-api-mcp
```

## Usage

### With npx (no install required)

```bash
npx moondream-api-mcp --api-key YOUR_API_KEY
```

### With npx using environment variable

```bash
export MOONDREAM_API_KEY=YOUR_API_KEY
npx moondream-api-mcp
```

### Command Line

```bash
node src/index.js --api-key YOUR_API_KEY
```

### Environment Variable

```bash
export MOONDREAM_API_KEY=YOUR_API_KEY
node src/index.js
```

### As global CLI

```bash
npm install -g moondream-api-mcp
moondream-api-mcp --api-key YOUR_API_KEY
```

## Available Tools

| Tool | Description |
|------|-------------|
| `caption` | Generate a description of an image |
| `query` | Ask a question about an image |
| `detect` | Detect objects in an image |
| `point` | Find coordinates of an object |
| `segment` | Generate an SVG mask for an object |

## Image Input

All tools accept:
- Remote URLs (http/https)
- Local file paths
- Base64 encoded image data

## Usage with Opencode

Add to your `opencode.json` or `opencode.config.js`:

```json
{
  "mcpServers": {
    "moondream": {
      "command": "npx",
      "args": ["moondream-api-mcp", "--api-key", "YOUR_API_KEY"]
    }
  }
}
```

Or with environment variable:

```json
{
  "mcpServers": {
    "moondream": {
      "command": "moondream-api-mcp"
    }
  }
}
```

Then set `MOONDREAM_API_KEY` in your environment.

Once configured, you can use the tools in Opencode:

- "Caption what's in this image"
- "Detect all cars in this image"
- "What objects are in this image?"
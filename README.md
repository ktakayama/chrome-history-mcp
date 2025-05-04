# Chrome History MCP Server

This project provides a Model Context Protocol (MCP) server that exposes your Google Chrome browsing history as a tool.

## Prerequisites

*   [Bun](https://bun.sh/) runtime

## Setup

1.  Clone this repository.
2.  Install dependencies:
    ```bash
    bun install
    ```

## Configuration

The server can be configured using environment variables.

*   `CHROME_HISTORY_PATH`: (Optional) Specifies the path to the Chrome history SQLite file. If not set, it defaults to the standard location on macOS (`~/Library/Application Support/Google/Chrome/Default/History`).

### Example MCP Client Configuration

Here is an example of how you might configure this server within an MCP client's configuration file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "chrome_history": {
      "command": "bun",
      "args": [
        "run",
        "/path/to/chrome-history-mcp/index.ts"
      ],
      "env": {
        "CHROME_HISTORY_PATH": "~/Library/Application Support/Google/Chrome/Default/History"
      }
    }
  }
}
```

Replace `/path/to/chrome-history-mcp/index.ts` with the actual path to the `index.ts` file on your system.

## Available Tools

The server provides one tool: `history`.

### `history` Tool

Fetches entries from your Chrome browsing history.

**Parameters:**

*   `query` (string, optional): Filter history entries by title (case-insensitive, partial match).
*   `start_date` (string, optional): ISO date string to filter entries visited on or after this date.
*   `end_date` (string, optional): ISO date string to filter entries visited on or before this date.
*   `min_visit_count` (number, optional): Minimum visit count filter.
*   `max_visit_count` (number, optional): Maximum visit count filter.
*   `max_length` (number, optional, default 30): Maximum number of entries to return.
*   `start_index` (number, optional, default 0): Offset index for pagination.

**Example Usage (via MCP Client):**

```
Use the chrome_history tool to find my last 10 visited websites.
```

```
Use the chrome_history tool to find history entries about "Bun" visited in the last week.
```

```
Use the chrome_history tool with parameters {"title": "GitHub", "max_length": 5}
```

## Notes

*   The server copies the history file to a temporary location before reading to avoid locking issues.

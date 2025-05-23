import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";
import { copyFile, mkdtemp, rm } from "fs/promises";
import Database from "bun:sqlite";

const server = new McpServer({
  name: "Chrome History",
  version: "1.0.0",
});

/**
 * Get the path to the Chrome history file
 */
function getChromeHistoryPath(): string {
  const envPath = process.env.CHROME_HISTORY_PATH;
  const homeDir = os.homedir();
  if (envPath && envPath.trim() !== "") {
    return path.resolve(envPath.replace(/^~/, homeDir));
  }
  return path.resolve(
    homeDir,
    "Library/Application Support/Google/Chrome/Default/History",
  );
}

/**
 * Copy the Chrome history file to a temporary location to avoid file lock
 */
async function copyHistoryFile(
  originalPath: string,
): Promise<{ tmpFile: string; tmpDir: string }> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "chrome-history-"));
  const tmpFile = path.join(tmpDir, "History");
  await copyFile(originalPath, tmpFile);
  return { tmpFile, tmpDir };
}

/**
 * Fetch history from SQLite database
 */
function fetchHistoryFromDb(
  dbPath: string,
  filters: {
    query?: string;
    start_date?: string;
    end_date?: string;
    min_visit_count?: number;
    max_visit_count?: number;
    max_length: number;
    start_index: number;
  },
): Array<{
  url: string;
  title: string;
  visit_count: number;
  visit_time: number;
}> {
  let query = `
    SELECT urls.url, urls.title, urls.visit_count, visits.visit_time
    FROM urls
    JOIN visits ON urls.id = visits.url
    WHERE hidden = 0
  `;
  const params: any[] = [];

  if (filters.query) {
    const keywords = filters.query
      .split(/\s+/)
      .filter((keyword) => keyword.length > 0);
    if (keywords.length > 0) {
      keywords.forEach((keyword) => {
        query += " AND (urls.title LIKE ? OR urls.url LIKE ?)";
        params.push(`%${keyword}%`, `%${keyword}%`);
      });
    }
  }
  if (filters.start_date && filters.start_date.trim() !== "") {
    const startDate = new Date(filters.start_date);
    if (!isNaN(startDate.getTime())) {
      const startTime = (startDate.getTime() + 11644473600000) * 1000;
      query += " AND visits.visit_time >= ?";
      params.push(startTime);
    } else {
      console.warn(`Invalid start_date string provided: ${filters.start_date}`);
    }
  }
  if (filters.end_date && filters.end_date.trim() !== "") {
    const endDate = new Date(filters.end_date);
    if (!isNaN(endDate.getTime())) {
      const endTime = (endDate.getTime() + 11644473600000) * 1000;
      query += " AND visits.visit_time <= ?";
      params.push(endTime);
    } else {
      console.warn(`Invalid end_date string provided: ${filters.end_date}`);
    }
  }
  if (filters.min_visit_count !== undefined) {
    query += " AND urls.visit_count >= ?";
    params.push(filters.min_visit_count);
  }
  if (filters.max_visit_count !== undefined) {
    query += " AND urls.visit_count <= ?";
    params.push(filters.max_visit_count);
  }

  query += " ORDER BY visits.visit_time DESC LIMIT ? OFFSET ?";
  params.push(filters.max_length, filters.start_index);

  const db = new Database(dbPath, { readonly: true });
  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  db.close();

  return rows;
}

/**
 * Format history rows into a readable string
 */
function formatHistoryRows(
  rows: Array<{ url: string; title: string; visit_count: number }>,
): string {
  if (rows.length === 0) {
    return "No history entries matching the specified criteria were found.";
  }
  return rows
    .map(
      (row) =>
        `Title: ${row.title || "None"}\nURL: ${row.url}\nVisit count: ${row.visit_count}\n`,
    )
    .join("\n---\n");
}

server.tool(
  "history",
  {
    query: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    min_visit_count: z.number().optional(),
    max_visit_count: z.number().optional(),
    max_length: z.number().default(30),
    start_index: z.number().default(0),
  },
  async (params) => {
    try {
      const historyPath = getChromeHistoryPath();

      if (!fs.existsSync(historyPath)) {
        return {
          content: [
            {
              type: "text",
              text: "Chrome history file not found.",
            },
          ],
        };
      }

      const { tmpFile, tmpDir } = await copyHistoryFile(historyPath);
      const rows = fetchHistoryFromDb(tmpFile, params);
      await rm(tmpDir, { recursive: true, force: true });

      const text = formatHistoryRows(rows);

      return {
        content: [
          {
            type: "text",
            text,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `An error occurred while fetching history: ${String(error)}`,
          },
        ],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

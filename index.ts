import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "Chrome History",
  version: "1.0.0",
});

server.tool(
  "history",
  {
    title: z.string().optional(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    min_visit_count: z.number().optional(),
    max_visit_count: z.number().optional(),
    max_length: z.number().default(30),
    start_index: z.number().default(0),
  },
  async ({
    title,
    start_date,
    end_date,
    min_visit_count,
    max_visit_count,
    max_length,
    start_index,
  }) => {
    // TODO
    return {
      content: [{ type: "text", text: `` }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

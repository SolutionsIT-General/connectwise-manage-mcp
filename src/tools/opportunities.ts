import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CwManageClient } from "../api-client.js";
import { customFieldConditionsSchema } from "./custom-field-conditions.js";
import { fieldsSchema } from "./fields.js";

export function registerOpportunityTools(server: McpServer, client: CwManageClient) {
  server.tool(
    "cw_search_opportunities",
    "Search sales opportunities in ConnectWise Manage. Use 'conditions' for CW query syntax (e.g. \"status/name = '1. Open'\", \"closedFlag = false\"). Filter on custom fields with 'customFieldConditions' (e.g. caption=\"Contract Type\" AND value=\"Managed\").",
    {
      conditions: z.string().optional().describe("ConnectWise conditions query string"),
      customFieldConditions: customFieldConditionsSchema,
      fields: fieldsSchema,
      page: z.number().optional().describe("Page number (default: 1)"),
      pageSize: z.number().optional().describe("Results per page (default: 25, max: 1000)"),
      orderBy: z.string().optional().describe("Field to order by (e.g. 'id desc')"),
    },
    async ({ fields, conditions, customFieldConditions, page, pageSize, orderBy }) => {
      const result = await client.get("/sales/opportunities", {
        conditions,
        customFieldConditions,
        fields,
        page: page ?? 1,
        pageSize: pageSize ?? 25,
        orderBy,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "cw_get_opportunity",
    "Get a specific sales opportunity by ID.",
    {
      id: z.number().describe("Opportunity ID"),
    },
    async ({ id }) => {
      const result = await client.get(`/sales/opportunities/${id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "cw_search_opportunity_forecasts",
    "Search opportunity forecasts/revenue items for a specific opportunity.",
    {
      opportunityId: z.number().describe("Opportunity ID"),
      fields: fieldsSchema,
      page: z.number().optional().describe("Page number (default: 1)"),
      pageSize: z.number().optional().describe("Results per page (default: 25, max: 1000)"),
    },
    async ({ fields, opportunityId, page, pageSize }) => {
      const result = await client.get(`/sales/opportunities/${opportunityId}/forecast`, {
        fields,
        page: page ?? 1,
        pageSize: pageSize ?? 25,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "cw_search_opportunity_notes",
    "Get notes on a specific sales opportunity.",
    {
      opportunityId: z.number().describe("Opportunity ID"),
      fields: fieldsSchema,
      page: z.number().optional().describe("Page number (default: 1)"),
      pageSize: z.number().optional().describe("Results per page (default: 25, max: 1000)"),
    },
    async ({ fields, opportunityId, page, pageSize }) => {
      const result = await client.get(`/sales/opportunities/${opportunityId}/notes`, {
        fields,
        page: page ?? 1,
        pageSize: pageSize ?? 25,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "cw_search_sales_stages",
    "List sales pipeline stages in ConnectWise Manage.",
    {
      conditions: z.string().optional().describe("ConnectWise conditions query string"),
      fields: fieldsSchema,
      page: z.number().optional().describe("Page number (default: 1)"),
      pageSize: z.number().optional().describe("Results per page (default: 25, max: 1000)"),
    },
    async ({ fields, conditions, page, pageSize }) => {
      const result = await client.get("/sales/stages", {
        conditions,
        fields,
        page: page ?? 1,
        pageSize: pageSize ?? 25,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}

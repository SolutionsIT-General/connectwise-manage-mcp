import { describe, it, expect, vi, afterEach } from "vitest";
import worker from "../worker.js";

const MCP_HEADERS = {
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
  "X-CW-Company-Id": "example",
  "X-CW-Public-Key": "pub",
  "X-CW-Private-Key": "priv",
  "X-CW-Client-Id": "client-guid",
};

const API_BASE = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0";

function fakeResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

async function mcp(body: unknown): Promise<unknown> {
  const res = await worker.fetch(
    new Request("http://worker.local/mcp", {
      method: "POST",
      headers: MCP_HEADERS,
      body: JSON.stringify(body),
    }),
    { AUTH_MODE: "gateway" },
  );
  expect(res.status).toBe(200);
  return res.json();
}

/** Call a tool and return the ConnectWise URL it requested. */
async function callAndCaptureUrl(name: string, args: Record<string, unknown>): Promise<URL> {
  const fetchMock = vi.fn().mockResolvedValue(fakeResponse([]));
  vi.stubGlobal("fetch", fetchMock);

  const body = (await mcp({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name, arguments: args },
  })) as { result?: { isError?: boolean } };

  expect(body.result?.isError).not.toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  return new URL((fetchMock.mock.calls[0] as [string])[0]);
}

const FIELDS = "id,summary,status/name,company/name";

// Every cw_search_* tool. Each one is a plain GET of a list endpoint.
const cases: [string, Record<string, unknown>, string][] = [
  ["cw_search_tickets", {}, "/service/tickets"],
  ["cw_search_projects", {}, "/project/projects"],
  ["cw_search_project_tickets", {}, "/project/tickets"],
  ["cw_search_companies", {}, "/company/companies"],
  ["cw_search_contacts", {}, "/company/contacts"],
  ["cw_search_configurations", {}, "/company/configurations"],
  ["cw_search_opportunities", {}, "/sales/opportunities"],
  ["cw_search_opportunity_forecasts", { opportunityId: 9 }, "/sales/opportunities/9/forecast"],
  ["cw_search_opportunity_notes", { opportunityId: 9 }, "/sales/opportunities/9/notes"],
  ["cw_search_sales_stages", {}, "/sales/stages"],
  ["cw_search_activities", {}, "/sales/activities"],
  ["cw_search_agreements", {}, "/finance/agreements"],
  ["cw_search_agreement_recaps", {}, "/finance/agreementrecap/"],
  ["cw_search_invoices", {}, "/finance/invoices"],
  ["cw_search_purchase_orders", {}, "/procurement/purchaseorders"],
  ["cw_search_procurement_products", {}, "/procurement/products"],
  ["cw_search_sales_orders", {}, "/sales/orders"],
  ["cw_search_catalog_items", {}, "/procurement/catalog"],
  ["cw_search_members", {}, "/system/members"],
  ["cw_search_time_entries", {}, "/time/entries"],
  ["cw_search_schedule_entries", {}, "/schedule/entries"],
];

afterEach(() => vi.unstubAllGlobals());

describe("search fields", () => {
  describe.each(cases)("%s", (name, args, path) => {
    it("passes fields to Manage unchanged", async () => {
      const url = await callAndCaptureUrl(name, { ...args, fields: FIELDS });
      expect(url.origin + url.pathname).toBe(`${API_BASE}${path}`);
      expect(url.searchParams.get("fields")).toBe(FIELDS);
    });

    it.each([undefined, ""])("omits an unset fields list (%s)", async (fields) => {
      const url = await callAndCaptureUrl(name, {
        ...args,
        ...(fields === undefined ? {} : { fields }),
      });
      expect(url.searchParams.has("fields")).toBe(false);
    });
  });

  it("advertises an optional fields string on every search tool and nowhere else", async () => {
    const body = (await mcp({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    })) as { result: { tools: { name: string; inputSchema: {
      properties: Record<string, { type?: string; maxLength?: number }>;
      required?: string[];
    } }[] } };
    const tools = body.result.tools;
    const names = cases.map(([name]) => name);

    expect(tools.filter((tool) => tool.name.startsWith("cw_search_")).map((tool) => tool.name).sort())
      .toEqual([...names].sort());
    expect(tools.filter((tool) => "fields" in tool.inputSchema.properties).map((tool) => tool.name).sort())
      .toEqual([...names].sort());
    for (const name of names) {
      const schema = tools.find((tool) => tool.name === name)!.inputSchema;
      expect(schema.properties.fields.type).toBe("string");
      expect(schema.properties.fields.maxLength).toBe(1000);
      expect(schema.required ?? []).not.toContain("fields");
    }
  });

  it("rejects a fields list over 1000 characters before calling Manage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const body = (await mcp({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "cw_search_tickets", arguments: { fields: "a,".repeat(501) } },
    })) as { result?: { isError?: boolean }; error?: unknown };
    expect(body.error ?? body.result?.isError).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

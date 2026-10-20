import type { SearchRequest } from "@ghas/contracts";
import { mcpSearch } from "../services/mcp-manager";

export async function runMcpSearch(request: SearchRequest) {
  return mcpSearch(request.query, request.per_page ?? 20, request.categories as string[] | undefined);
}

export type GraphEntityType = "Student" | "School" | "Program" | "Ambassador" | "City";

export type GraphNode = {
  id: string;
  label: string;
  type: GraphEntityType | string;
  properties: Record<string, string | number | boolean | null>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, string | number | boolean | null>;
};

export type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta?: {
    truncated: boolean;
    totalRelations?: number;
    returnedNodes: number;
    returnedEdges: number;
    maxDepth: number;
    maxEdges: number;
    relationshipTypes?: string[];
    centerFallbackUsed?: boolean;
  };
};

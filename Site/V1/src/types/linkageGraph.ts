export type GraphEntityType =
  | "Student"
  | "School"
  | "Program"
  | "Ambassador"
  | "City"
  | "SourceLead"
  | "NiveauScolaire"
  | "TypeEtablissement";

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
    truncatedNodes?: boolean;
    totalNodesBeforeCap?: number;
    totalRelations?: number;
    returnedNodes: number;
    returnedEdges: number;
    maxDepth: number;
    maxEdges: number;
    maxNodes?: number;
    relationshipTypes?: string[];
    centerFallbackUsed?: boolean;
    includeAmbassadors?: boolean;
    ambassadorsMerged?: number;
  };
};

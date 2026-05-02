import { useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useEffect } from "react";
import type { GraphNode, GraphResponse } from "../types/linkageGraph";
import { apiUrl } from "../lib/apiBase";
import { useUserProfile } from "../state/UserProfileContext";

type LinkObject = {
  source: string | GraphNode;
  target: string | GraphNode;
  id: string;
  type: string;
};

type GraphNodeWithPhysics = GraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

const nodePalette: Record<string, string> = {
  Student: "#E53935",
  School: "#1E88E5",
  Program: "#43A047",
  Ambassador: "#8E24AA",
  City: "#FB8C00",
  User: "#1F1F1F",
};

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ");
}

function asNodeId(ref: string | GraphNode) {
  return typeof ref === "string" ? ref : ref.id;
}

function getPrimaryNodeInfo(node: GraphNode) {
  const baseName = node.properties.name ? String(node.properties.name) : node.label;

  switch (node.type) {
    case "School":
      return `Ecole: ${baseName}`;
    case "Ambassador":
      return `Ambassadeur: ${baseName}`;
    case "Program":
      return `Programme: ${baseName}`;
    case "City":
      return `Ville: ${baseName}`;
    case "Student":
      return `Eleve: ${baseName}`;
    case "User":
      return `Mon profil: ${baseName}`;
    default:
      return `${node.type}: ${baseName}`;
  }
}

export function LinkagePage() {
  const { profile } = useUserProfile();
  const [graph, setGraph] = useState<GraphResponse>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [maxEdges, setMaxEdges] = useState(120);
  const [maxDepth, setMaxDepth] = useState(1);
  const [maxNodes, setMaxNodes] = useState(72);
  const [requestVersion, setRequestVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isLayoutPinned = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGraph() {
      try {
        setLoading(true);
        setError(null);
        const query = new URLSearchParams({
          centerEmail: profile.email || "",
          maxEdges: String(maxEdges),
          maxDepth: String(maxDepth),
          maxNodes: String(maxNodes),
        });
        const response = await fetch(apiUrl(`/api/linkage/graph?${query.toString()}`), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Impossible de recuperer le graphe Linkage.");
        }

        const payload = (await response.json()) as GraphResponse;
        setGraph(payload);
        setSelectedNode(null);
        setHoveredNode(null);
        setActiveTypes((current) => {
          const apiTypes = Array.from(new Set(payload.nodes.map((node) => node.type)));
          const discoveredTypes = Array.from(new Set(["User", ...apiTypes]));
          if (current.length === 0) {
            return discoveredTypes.length > 0 ? discoveredTypes : ["User"];
          }
          const next = current.filter((type) => discoveredTypes.includes(type));
          return next.length > 0 ? next : discoveredTypes;
        });
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(
            "Le service Linkage est indisponible. En production, configure VITE_API_BASE_URL vers ton API, ou lance le backend + Neo4j en local.",
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void loadGraph();
    return () => controller.abort();
  }, [maxDepth, maxEdges, maxNodes, profile.email, requestVersion]);

  const graphWithUser = useMemo(() => {
    const fullName = `${profile.prenom} ${profile.nom}`.trim();
    const userLabel = fullName || profile.email || "Utilisateur";

    const userNode: GraphNodeWithPhysics = {
      id: "current-user-node",
      label: userLabel,
      type: "User",
      fx: 0,
      fy: 0,
      properties: {
        age: profile.age || null,
        niveau_scolaire: profile.niveau_scolaire || null,
        etablissement_actuel: profile.etablissement_actuel || null,
        ville: profile.ville || null,
        favoris: profile.etablissements_favoris.join(", ") || null,
      },
    };

    const schoolNodes = graph.nodes.filter((node) => node.type === "School");
    const schoolByName = new Map(
      schoolNodes.map((school) => [
        normalizeName(String(school.properties.name ?? school.label)),
        school.id,
      ]),
    );

    const favoriteSchoolIds = profile.etablissements_favoris
      .map((favorite) => {
        const normalizedFavorite = normalizeName(favorite);
        const directMatch = schoolByName.get(normalizedFavorite);
        if (directMatch) return directMatch;

        const bestContains = schoolNodes.find((school) =>
          normalizeName(String(school.properties.name ?? school.label)).includes(normalizedFavorite),
        );
        if (bestContains) return bestContains.id;

        const reverseContains = schoolNodes.find((school) =>
          normalizedFavorite.includes(normalizeName(String(school.properties.name ?? school.label))),
        );
        return reverseContains?.id;
      })
      .filter((id): id is string => Boolean(id));

    const userLinks = favoriteSchoolIds.map((schoolId, index) => ({
      id: `user-follows-${index}-${schoolId}`,
      source: userNode.id,
      target: schoolId,
      type: "FOLLOWS",
      properties: {},
    }));

    const ambassadorById = new Map(
      graph.nodes.filter((node) => node.type === "Ambassador").map((node) => [node.id, node]),
    );

    const ambassadorLinks = graph.edges
      .filter((edge) => {
        const sourceId = asNodeId(edge.source);
        const targetId = asNodeId(edge.target);
        const schoolToAmbassador =
          favoriteSchoolIds.includes(sourceId) && ambassadorById.has(targetId);
        const ambassadorToSchool =
          favoriteSchoolIds.includes(targetId) && ambassadorById.has(sourceId);
        return schoolToAmbassador || ambassadorToSchool;
      })
      .map((edge, index) => {
        const sourceId = asNodeId(edge.source);
        const targetId = asNodeId(edge.target);
        const ambassadorId = ambassadorById.has(sourceId) ? sourceId : targetId;
        return {
          id: `user-ambassador-${index}-${ambassadorId}`,
          source: userNode.id,
          target: ambassadorId,
          type: "CONNECTED_TO_AMBASSADOR",
          properties: {},
        };
      });

    return {
      nodes: [userNode, ...graph.nodes],
      edges: [...graph.edges, ...userLinks, ...ambassadorLinks],
    };
  }, [graph.edges, graph.nodes, profile]);

  const availableTypes = useMemo(
    () =>
      Array.from(new Set(graphWithUser.nodes.map((node) => node.type))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [graphWithUser.nodes],
  );

  const filteredGraph = useMemo(() => {
    const nodeIds = new Set(
      graphWithUser.nodes
        .filter((node) => activeTypes.includes(node.type))
        .map((node) => node.id),
    );
    return {
      nodes: graphWithUser.nodes.filter((node) => nodeIds.has(node.id)),
      links: graphWithUser.edges.filter(
        (edge) => nodeIds.has(asNodeId(edge.source)) && nodeIds.has(asNodeId(edge.target)),
      ),
    };
  }, [activeTypes, graphWithUser.edges, graphWithUser.nodes]);

  useEffect(() => {
    isLayoutPinned.current = false;
  }, [filteredGraph.links.length, filteredGraph.nodes.length]);

  function toggleType(type: string) {
    setActiveTypes((current) =>
      current.includes(type) ? current.filter((currentType) => currentType !== type) : [...current, type],
    );
  }

  const stats = useMemo(
    () => ({
      nodes: filteredGraph.nodes.length,
      links: filteredGraph.links.length,
    }),
    [filteredGraph.links.length, filteredGraph.nodes.length],
  );

  const isHeavyGraph = filteredGraph.nodes.length > 48;
  const pinnedNode = selectedNode ?? hoveredNode;

  return (
    <main className="section container linkage-page">
      <div className="linkage-header">
        <h2>Linkage - graphe du reseau</h2>
        <p className="section-sub">
          Explore les connexions entre eleves, ecoles et programmes via la base graphe.
        </p>
      </div>

      {loading ? <p>Chargement du graphe...</p> : null}
      {error ? <p className="linkage-error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="linkage-filters">
            <h3>Filtrer les noeuds</h3>
            <p className="linkage-meta">
              {stats.nodes} noeuds - {stats.links} connexions
              {graph.meta?.maxNodes != null ? (
                <>
                  {" "}
                  (plafond API: {graph.meta.maxNodes} noeuds)
                </>
              ) : null}
            </p>
            <div className="linkage-controls">
              <label htmlFor="linkage-max-edges">
                Max relations analysees: <strong>{maxEdges}</strong>
              </label>
              <input
                id="linkage-max-edges"
                type="range"
                min={40}
                max={280}
                step={20}
                value={maxEdges}
                onChange={(event) => setMaxEdges(Number(event.target.value))}
              />
              <label htmlFor="linkage-max-nodes">
                Max noeuds affiches: <strong>{maxNodes}</strong>
              </label>
              <input
                id="linkage-max-nodes"
                type="range"
                min={32}
                max={120}
                step={4}
                value={maxNodes}
                onChange={(event) => setMaxNodes(Number(event.target.value))}
              />
              <label htmlFor="linkage-max-depth">Profondeur:</label>
              <select
                id="linkage-max-depth"
                value={maxDepth}
                onChange={(event) => setMaxDepth(Number(event.target.value))}
              >
                <option value={1}>1 saut (recommande gros volumes)</option>
                <option value={2}>2 sauts</option>
                <option value={3}>3 sauts</option>
              </select>
              <button type="button" className="btn btn-soft" onClick={() => setRequestVersion((v) => v + 1)}>
                Recharger
              </button>
            </div>
            <div className="chips">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`chip ${activeTypes.includes(type) ? "chip-active" : ""}`}
                  onClick={() => toggleType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="linkage-hint">
              Astuce: glisse un noeud pour le repositionner. Gros volumes: profondeur 1 saut et moins de relations
              analysees = chargement plus rapide et graphe plus lisible.
            </p>
            {graph.meta?.truncated ? (
              <p className="linkage-warning">
                Relations tronquees cote serveur ({graph.meta.returnedEdges}/{graph.meta.totalRelations ?? "?"}).
              </p>
            ) : null}
            {graph.meta?.truncatedNodes ? (
              <p className="linkage-warning">
                Noeuds limites a {graph.meta.maxNodes} pour lisibilite (avant plafond:{" "}
                {graph.meta.totalNodesBeforeCap ?? "?"} noeuds).
              </p>
            ) : null}
          </section>

          <section className="linkage-layout">
            <article className="linkage-graph-card">
              <div className="linkage-legend">
                {Object.entries(nodePalette).map(([type, color]) => (
                  <span key={type} className="linkage-legend-item">
                    <i style={{ backgroundColor: color }} />
                    {type}
                  </span>
                ))}
              </div>
              <ForceGraph2D
                width={900}
                height={560}
                graphData={filteredGraph}
                cooldownTicks={isHeavyGraph ? 90 : 160}
                d3VelocityDecay={isHeavyGraph ? 0.45 : 0.35}
                nodeLabel={(node) => {
                  const typedNode = node as GraphNode;
                  return `${getPrimaryNodeInfo(typedNode)} (${typedNode.type})`;
                }}
                nodeRelSize={isHeavyGraph ? 3 : 5}
                nodeColor={(node) => nodePalette[(node as GraphNode).type] ?? "#6D7483"}
                linkDirectionalParticles={isHeavyGraph ? 0 : 2}
                linkDirectionalParticleWidth={1.5}
                onNodeClick={(node) => setSelectedNode(node as GraphNode)}
                onNodeHover={(node) => setHoveredNode((node as GraphNode | null) ?? null)}
                onNodeDragEnd={(node) => {
                  const dragged = node as GraphNodeWithPhysics;
                  dragged.fx = dragged.x;
                  dragged.fy = dragged.y;
                }}
                onEngineStop={() => {
                  if (isLayoutPinned.current) return;
                  filteredGraph.nodes.forEach((node) => {
                    const currentNode = node as GraphNodeWithPhysics;
                    if (typeof currentNode.x === "number" && typeof currentNode.y === "number") {
                      currentNode.fx = currentNode.x;
                      currentNode.fy = currentNode.y;
                    }
                  });
                  isLayoutPinned.current = true;
                }}
                linkLabel={(link) => (link as LinkObject).type}
                linkWidth={(link) => {
                  const type = (link as LinkObject).type;
                  return type === "FOLLOWS" || type === "CONNECTED_TO_AMBASSADOR" ? 2.8 : 1.2;
                }}
                linkColor={(link) => {
                  const type = (link as LinkObject).type;
                  return type === "FOLLOWS" || type === "CONNECTED_TO_AMBASSADOR"
                    ? "#d5153f"
                    : "#cfd4dd";
                }}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const typedNode = node as GraphNodeWithPhysics;
                  const label = getPrimaryNodeInfo(typedNode);
                  const showLabel =
                    typedNode.type === "User" ||
                    (pinnedNode !== null && pinnedNode.id === typedNode.id);
                  const fontSize = Math.max(10, 13 / globalScale);
                  ctx.font = `${fontSize}px Inter, sans-serif`;
                  ctx.fillStyle = nodePalette[typedNode.type] ?? "#6D7483";
                  ctx.beginPath();
                  ctx.arc(
                    typedNode.x ?? 0,
                    typedNode.y ?? 0,
                    typedNode.type === "User" ? 9 : 5,
                    0,
                    2 * Math.PI,
                  );
                  ctx.fill();
                  if (showLabel) {
                    ctx.fillStyle = "#1f2532";
                    ctx.fillText(label, (typedNode.x ?? 0) + 10, (typedNode.y ?? 0) - 8);
                  }
                }}
              />
            </article>

            <aside className="linkage-details">
              <h3>Details du noeud</h3>
              {!selectedNode ? (
                <p>Clique sur un noeud pour afficher ses informations.</p>
              ) : (
                <>
                  <p>
                    <strong>{getPrimaryNodeInfo(selectedNode)}</strong>
                  </p>
                  <ul>
                    {Object.entries(selectedNode.properties).map(([key, value]) => (
                      <li key={key}>
                        <strong>{key}:</strong> {String(value)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </aside>
          </section>
        </>
      ) : null}
    </main>
  );
}

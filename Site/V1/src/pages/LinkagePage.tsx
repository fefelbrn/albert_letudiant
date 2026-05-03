import { useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  SourceLead: "#00897B",
  NiveauScolaire: "#6D4C41",
  TypeEtablissement: "#5E35B1",
};

/** Libellés français pour l’interface (les types API restent en anglais). */
const typeLabelFr: Record<string, string> = {
  Student: "Élèves",
  School: "Écoles",
  Program: "Formations",
  Ambassador: "Ambassadeurs",
  City: "Villes",
  SourceLead: "Sources",
  NiveauScolaire: "Niveaux scolaires",
  TypeEtablissement: "Types d’établissement",
  User: "Comptes",
};

function labelForGraphType(type: string) {
  return typeLabelFr[type] ?? type;
}

/** Libellés courts pour les types de relations Neo4j (comme dans le navigateur graphe). */
const relationshipLabelFr: Record<string, string> = {
  STUDIES_AT: "Étudie à",
  STUDIED_AT: "A étudié à",
  INTERESTED_IN: "Intéressé·e par",
  LIVES_IN: "Vit à",
  CONNECTED_TO: "Mise en relation",
  HAS_NIVEAU: "Niveau scolaire",
  DISCOVERED_VIA: "Découvert via",
  HAS_TYPE_ETABLISSEMENT: "Type d’établissement",
  CATEGORIZED_AS: "Rattaché à",
  LOCATED_IN: "Localisation",
  HAS_PROGRAM: "Propose",
  PARTNERS_WITH: "Partenariat",
  APPLIED_TO: "Candidature",
};

function labelForRelationship(type: string) {
  return relationshipLabelFr[type] ?? type;
}

function linkEndpoints(link: LinkObject): { sx: number; sy: number; tx: number; ty: number } | null {
  const s = link.source;
  const t = link.target;
  if (typeof s === "string" || typeof t === "string") return null;
  const sn = s as GraphNodeWithPhysics;
  const tn = t as GraphNodeWithPhysics;
  if (typeof sn.x !== "number" || typeof sn.y !== "number" || typeof tn.x !== "number" || typeof tn.y !== "number") {
    return null;
  }
  return { sx: sn.x, sy: sn.y, tx: tn.x, ty: tn.y };
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
    case "SourceLead":
      return `Source: ${baseName}`;
    case "NiveauScolaire":
      return `Niveau: ${baseName}`;
    case "TypeEtablissement":
      return `Type etablissement: ${baseName}`;
    default:
      return `${node.type}: ${baseName}`;
  }
}

export function LinkagePage() {
  const { profile } = useUserProfile();
  const [searchParams] = useSearchParams();
  const [graph, setGraph] = useState<GraphResponse>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  /** Curseurs : brouillon jusqu’au clic sur Recharger */
  const [draftMaxEdges, setDraftMaxEdges] = useState(220);
  const [draftPerNodeLimit, setDraftPerNodeLimit] = useState(10);
  const [draftMaxNodes, setDraftMaxNodes] = useState(96);
  /** Paramètres réellement envoyés à l’API */
  const [appliedMaxEdges, setAppliedMaxEdges] = useState(220);
  const [appliedPerNodeLimit, setAppliedPerNodeLimit] = useState(10);
  const [appliedMaxNodes, setAppliedMaxNodes] = useState(96);
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
        const urlEmail = searchParams.get("centerEmail")?.trim().toLowerCase() ?? "";
        const urlPrenom = searchParams.get("centerPrenom")?.trim().toLowerCase() ?? "";
        const urlNom = searchParams.get("centerNom")?.trim().toLowerCase() ?? "";
        const centerEmail = urlEmail || (profile.email || "").trim().toLowerCase();
        const centerPrenom = urlPrenom || (profile.prenom || "").trim().toLowerCase();
        const centerNom = urlNom || (profile.nom || "").trim().toLowerCase();
        const urlPerNode = Number(searchParams.get("perNodeLimit") ?? "");
        const effectivePerNode =
          Number.isFinite(urlPerNode) && urlPerNode >= 3 && urlPerNode <= 25
            ? urlPerNode
            : appliedPerNodeLimit;

        const query = new URLSearchParams({
          centerEmail,
          centerPrenom,
          centerNom,
          maxEdges: String(appliedMaxEdges),
          maxNodes: String(appliedMaxNodes),
          perNodeLimit: String(effectivePerNode),
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
          const discoveredTypes = Array.from(new Set(payload.nodes.map((node) => node.type)));
          if (current.length === 0) {
            return discoveredTypes.length > 0 ? discoveredTypes : [];
          }
          const next = current.filter((type) => discoveredTypes.includes(type));
          return next.length > 0 ? next : discoveredTypes;
        });
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(
            "Impossible d’afficher la carte du réseau pour le moment. Réessaie dans un instant ; si ça continue, " +
              "vérifie ta connexion ou que le service de démo est bien lancé.",
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void loadGraph();
    return () => controller.abort();
  }, [
    appliedMaxEdges,
    appliedMaxNodes,
    appliedPerNodeLimit,
    profile.email,
    profile.nom,
    profile.prenom,
    requestVersion,
    searchParams.toString(),
  ]);

  const linkageGraph = useMemo(
    () => ({ nodes: graph.nodes, edges: graph.edges }),
    [graph.edges, graph.nodes],
  );

  const availableTypes = useMemo(
    () =>
      Array.from(new Set(linkageGraph.nodes.map((node) => node.type))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [linkageGraph.nodes],
  );

  const filteredGraph = useMemo(() => {
    const nodeIds = new Set(
      linkageGraph.nodes
        .filter((node) => activeTypes.includes(node.type))
        .map((node) => node.id),
    );
    return {
      nodes: linkageGraph.nodes.filter((node) => nodeIds.has(node.id)),
      links: linkageGraph.edges.filter(
        (edge) => nodeIds.has(asNodeId(edge.source)) && nodeIds.has(asNodeId(edge.target)),
      ),
    };
  }, [activeTypes, linkageGraph.edges, linkageGraph.nodes]);

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
        <h2>Ton réseau sur la carte</h2>
        <p className="section-sub">
          Visualise d’un coup d’œil les liens entre élèves, écoles, villes et ambassadeurs autour de ton profil.
        </p>
      </div>

      {loading ? <p>Chargement de la carte…</p> : null}
      {error ? <p className="linkage-error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="linkage-filters">
            <h3>Réglages d’affichage</h3>
            <p className="linkage-meta">
              Vue actuelle : <strong>{stats.nodes}</strong> profils et lieux · <strong>{stats.links}</strong> liens sur la
              carte
              {graph.meta?.maxNodes != null ? (
                <>
                  {" "}
                  — affichage plafonné à <strong>{graph.meta.maxNodes}</strong> points pour garder la carte lisible
                </>
              ) : null}
            </p>
            <p className="linkage-controls-intro">
              Ajuste les curseurs comme tu veux, puis clique sur « Mettre à jour la carte » pour recalculer le réseau.
            </p>
            <div className="linkage-controls">
              <div className="linkage-slider-block">
                <div className="linkage-slider-block-head">
                  <span className="linkage-slider-title">Étendue du réseau</span>
                  <span className="linkage-slider-value">{draftMaxEdges}</span>
                </div>
                <p className="linkage-slider-help">
                  Plus tu montes le curseur, plus on explore de liens autour de toi (écoles, contacts, etc.).
                </p>
                <input
                  id="linkage-max-edges"
                  type="range"
                  min={40}
                  max={280}
                  step={20}
                  value={draftMaxEdges}
                  onChange={(event) => setDraftMaxEdges(Number(event.target.value))}
                  aria-label="Étendue du réseau"
                />
              </div>
              <div className="linkage-slider-block">
                <div className="linkage-slider-block-head">
                  <span className="linkage-slider-title">Nombre de points sur la carte</span>
                  <span className="linkage-slider-value">{draftMaxNodes}</span>
                </div>
                <p className="linkage-slider-help">
                  Limite le nombre de profils, écoles et lieux affichés en même temps.
                </p>
                <input
                  id="linkage-max-nodes"
                  type="range"
                  min={32}
                  max={120}
                  step={4}
                  value={draftMaxNodes}
                  onChange={(event) => setDraftMaxNodes(Number(event.target.value))}
                  aria-label="Nombre de points sur la carte"
                />
              </div>
              <div className="linkage-slider-block">
                <div className="linkage-slider-block-head">
                  <span className="linkage-slider-title">Liens par profil au centre</span>
                  <span className="linkage-slider-value">{draftPerNodeLimit}</span>
                </div>
                <p className="linkage-slider-help">
                  Pour chaque personne au cœur du réseau, combien de connexions au maximum on affiche.
                </p>
                <input
                  id="linkage-per-node"
                  type="range"
                  min={4}
                  max={20}
                  step={1}
                  value={draftPerNodeLimit}
                  onChange={(event) => setDraftPerNodeLimit(Number(event.target.value))}
                  aria-label="Liens par profil au centre"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary linkage-apply-btn"
                onClick={() => {
                  setAppliedMaxEdges(draftMaxEdges);
                  setAppliedMaxNodes(draftMaxNodes);
                  setAppliedPerNodeLimit(draftPerNodeLimit);
                  setRequestVersion((v) => v + 1);
                }}
              >
                Mettre à jour la carte
              </button>
            </div>
            <h4 className="linkage-chips-heading">Afficher sur la carte</h4>
            <div className="chips">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`chip ${activeTypes.includes(type) ? "chip-active" : ""}`}
                  onClick={() => toggleType(type)}
                >
                  {labelForGraphType(type)}
                </button>
              ))}
            </div>
            <p className="linkage-hint">
              La carte est construite autour de ton profil élève : même école, ambassadeurs, villes… L’adresse e-mail
              de ton compte doit correspondre à un élève présent dans la base de démo. Astuce : tu peux faire glisser
              les pastilles pour mieux les ranger.
            </p>
            {graph.meta?.centerMatched === false ? (
              <p className="linkage-warning">
                Aucun profil élève ne correspond à ce compte (e-mail ou prénom + nom). Vérifie les informations du
                compte ou les données de démo.
              </p>
            ) : null}
            {graph.meta?.truncated ? (
              <p className="linkage-warning">
                Pour aller plus vite, une partie des liens a été simplifiée ({graph.meta.returnedEdges} affichés sur{" "}
                {graph.meta.totalRelations ?? "?"} au total).
              </p>
            ) : null}
            {graph.meta?.truncatedNodes ? (
              <p className="linkage-warning">
                Affichage limité à {graph.meta.maxNodes} points pour la lisibilité (il y en avait{" "}
                {graph.meta.totalNodesBeforeCap ?? "?"} au total).
              </p>
            ) : null}
          </section>

          <section className="linkage-layout">
            <article className="linkage-graph-card">
              <div className="linkage-legend">
                {Object.entries(nodePalette).map(([type, color]) => (
                  <span key={type} className="linkage-legend-item">
                    <i style={{ backgroundColor: color }} />
                    {labelForGraphType(type)}
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
                  return `${getPrimaryNodeInfo(typedNode)} (${labelForGraphType(typedNode.type)})`;
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
                linkLabel={(link) => {
                  const rel = link as LinkObject;
                  const neo = rel.type;
                  return `${neo} — ${labelForRelationship(neo)}`;
                }}
                linkWidth={() => 1.2}
                linkColor={() => "#cfd4dd"}
                linkCanvasObjectMode={() => "after"}
                linkCanvasObject={(link, ctx, globalScale) => {
                  const rel = link as LinkObject;
                  const ends = linkEndpoints(rel);
                  if (!ends) return;
                  const { sx, sy, tx, ty } = ends;
                  const neo = rel.type;
                  if (!neo) return;
                  const mx = (sx + tx) / 2;
                  const my = (sy + ty) / 2;
                  const padX = 5 / globalScale;
                  const padY = 3 / globalScale;
                  const r = 4 / globalScale;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";

                  if (isHeavyGraph) {
                    const fs = Math.max(6, 8 / globalScale);
                    ctx.font = `600 ${fs}px ui-monospace, "Cascadia Code", monospace`;
                    const w = ctx.measureText(neo).width;
                    const boxW = w + padX * 2;
                    const boxH = fs + padY * 2;
                    const left = mx - boxW / 2;
                    const top = my - boxH / 2;
                    ctx.fillStyle = "rgba(255,255,255,0.92)";
                    ctx.strokeStyle = "#c5cad6";
                    ctx.lineWidth = 1 / globalScale;
                    ctx.beginPath();
                    ctx.roundRect(left, top, boxW, boxH, r);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = "#3a4150";
                    ctx.fillText(neo, mx, my);
                    return;
                  }

                  const line1 = neo;
                  const line2 = labelForRelationship(neo);
                  const fs1 = Math.max(7, 9 / globalScale);
                  const fs2 = Math.max(6, 7.5 / globalScale);
                  ctx.font = `600 ${fs1}px ui-monospace, "Cascadia Code", monospace`;
                  const w1 = ctx.measureText(line1).width;
                  ctx.font = `500 ${fs2}px Inter, system-ui, sans-serif`;
                  const w2 = ctx.measureText(line2).width;
                  const lineGap = 2 / globalScale;
                  const boxW = Math.max(w1, w2) + padX * 2;
                  const boxH = fs1 + fs2 + lineGap + padY * 2;
                  const left = mx - boxW / 2;
                  const top = my - boxH / 2;
                  ctx.fillStyle = "rgba(255,255,255,0.94)";
                  ctx.strokeStyle = "#c5cad6";
                  ctx.lineWidth = 1 / globalScale;
                  ctx.beginPath();
                  ctx.roundRect(left, top, boxW, boxH, r);
                  ctx.fill();
                  ctx.stroke();
                  ctx.fillStyle = "#1f2532";
                  ctx.font = `600 ${fs1}px ui-monospace, "Cascadia Code", monospace`;
                  ctx.fillText(line1, mx, top + padY + fs1 / 2);
                  ctx.fillStyle = "#5c6478";
                  ctx.font = `500 ${fs2}px Inter, system-ui, sans-serif`;
                  ctx.fillText(line2, mx, top + padY + fs1 + lineGap + fs2 / 2);
                }}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const typedNode = node as GraphNodeWithPhysics;
                  const label = getPrimaryNodeInfo(typedNode);
                  const showLabel = pinnedNode !== null && pinnedNode.id === typedNode.id;
                  const fontSize = Math.max(10, 13 / globalScale);
                  ctx.font = `${fontSize}px Inter, sans-serif`;
                  ctx.fillStyle = nodePalette[typedNode.type] ?? "#6D7483";
                  ctx.beginPath();
                  ctx.arc(
                    typedNode.x ?? 0,
                    typedNode.y ?? 0,
                    5,
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
              <h3>Détail d’un profil</h3>
              {!selectedNode ? (
                <p>Clique sur une pastille de la carte pour voir les informations détaillées.</p>
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

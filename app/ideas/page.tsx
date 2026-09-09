"use client";

import { useStudio } from "@/core/store";
import type { IdeaNode, IdeaNodeType } from "@/core/ops/types";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo } from "react";
import { btnGhost, btnPrimary, SectionHeader } from "@/core/ui/OpsField";

const NODE_TYPES: IdeaNodeType[] = [
  "idea", "concept", "reference", "campaign", "message", "audience", "problem", "opportunity", "content", "custom",
];

export default function IdeaMapPage() {
  const { ops, setIdeaMap } = useStudio();

  const initialNodes: Node[] = useMemo(
    () =>
      ops.ideaNodes.length
        ? ops.ideaNodes.map((n) => ({
            id: n.id,
            position: { x: n.x, y: n.y },
            data: { label: n.label, type: n.type, projectId: n.projectId },
            type: "default",
            style: {
              background: "#1b1c1f",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#f2f1ed",
              fontSize: 12,
              padding: 8,
              minWidth: 120,
            },
          }))
        : [
            {
              id: "seed-1",
              position: { x: 120, y: 120 },
              data: { label: "Start here", type: "idea" },
              style: { background: "#1b1c1f", border: "1px solid rgba(255,255,255,0.15)", color: "#f2f1ed", padding: 8 },
            },
          ],
    [ops.ideaNodes],
  );

  const initialEdges = useMemo(
    () => ops.ideaEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    [ops.ideaEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const persist = useCallback(() => {
    const ideaNodes: IdeaNode[] = nodes.map((n) => ({
      id: n.id,
      label: String(n.data.label ?? ""),
      type: (n.data.type as IdeaNodeType) ?? "idea",
      projectId: n.data.projectId as string | undefined,
      x: n.position.x,
      y: n.position.y,
    }));
    const ideaEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
    setIdeaMap(ideaNodes, ideaEdges);
  }, [nodes, edges, setIdeaMap]);

  useEffect(() => {
    const t = window.setTimeout(persist, 800);
    return () => window.clearTimeout(t);
  }, [nodes, edges, persist]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  function addNode() {
    const id = `node-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        position: { x: 100 + nds.length * 30, y: 100 + nds.length * 20 },
        data: { label: "New node", type: "idea" },
        style: { background: "#1b1c1f", border: "1px solid rgba(255,255,255,0.15)", color: "#f2f1ed", padding: 8 },
      },
    ]);
  }

  return (
    <>
      <SectionHeader
        title="Idea Map"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={addNode} className={btnPrimary}>Add node</button>
            <button type="button" onClick={persist} className={btnGhost}>Save</button>
            <button type="button" onClick={() => { setNodes([]); setEdges([]); }} className={btnGhost}>Clear</button>
          </div>
        }
      />
      <div className="h-[70vh] border border-white/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          colorMode="dark"
        >
          <Background gap={20} color="#333" />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <p className="mt-4 text-xs opacity-40">
        Node types: {NODE_TYPES.join(", ")}. Drag to move, connect handles to link ideas.
      </p>
    </>
  );
}

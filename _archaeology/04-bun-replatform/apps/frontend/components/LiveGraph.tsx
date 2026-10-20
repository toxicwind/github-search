'use client';

import React, { useEffect, useRef } from 'react';
import { drag } from 'd3-drag';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';
import { select } from 'd3-selection';

interface Node extends SimulationNodeDatum {
    id: string;
    group: number;
    type: string;
}

interface Link extends SimulationLinkDatum<Node> {
    source: string | Node;
    target: string | Node;
    value: number;
}

interface LiveGraphProps {
    nodes: Node[];
    links: Link[];
    width?: number;
    height?: number;
}

const LiveGraph: React.FC<LiveGraphProps> = ({ nodes, links, width = 600, height = 400 }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render

        const simulation = forceSimulation(nodes)
            .force("link", forceLink<Node, Link>(links).id((d) => d.id).distance(100))
            .force("charge", forceManyBody().strength(-300))
            .force("center", forceCenter(width / 2, height / 2))
            .force("collide", forceCollide(30));

        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", (d: Link) => Math.sqrt(d.value));

        const node = svg.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", 8)
            .attr("fill", (d: Node) => {
                switch (d.type) {
                    case 'struct': return '#ff79c6';
                    case 'enum': return '#bd93f9';
                    case 'function': return '#50fa7b';
                    default: return '#8be9fd';
                }
            });

        node.append("title")
            .text((d: Node) => d.id);

        // Labels
        const labels = svg.append("g")
            .attr("class", "labels")
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text((d: Node) => d.id)
            .style("font-size", "10px")
            .style("fill", "#ccc")
            .style("pointer-events", "none");

        simulation.on("tick", () => {
            link
                .attr("x1", (d: Link) => (d.source as Node).x ?? 0)
                .attr("y1", (d: Link) => (d.source as Node).y ?? 0)
                .attr("x2", (d: Link) => (d.target as Node).x ?? 0)
                .attr("y2", (d: Link) => (d.target as Node).y ?? 0);

            node
                .attr("cx", (d: Node) => d.x ?? 0)
                .attr("cy", (d: Node) => d.y ?? 0);

            labels
                .attr("x", (d: Node) => d.x ?? 0)
                .attr("y", (d: Node) => d.y ?? 0);
        });

        function bindDrag(simulation: Simulation<Node, Link>) {
            function dragstarted(event: any) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event: any) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragended(event: any) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }

            return drag<SVGCircleElement, Node>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

        node.call(bindDrag(simulation) as any);

        return () => {
            simulation.stop();
        };
    }, [nodes, links, width, height]);

    return (
        <div className="bg-black/40 rounded-lg border border-cyber-border overflow-hidden">
            <div className="p-2 border-b border-cyber-border bg-cyber-bg-tertiary flex justify-between items-center">
                <span className="text-xs font-mono text-cyber-accent">LIVE GRAPH (PHYSICS-ENGINE)</span>
                <span className="text-[10px] text-cyber-text-muted">DRAG TO INTERACT</span>
            </div>
            <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`} />
        </div>
    );
};

export default LiveGraph;

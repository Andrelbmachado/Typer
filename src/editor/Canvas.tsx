import { useCallback, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { pathToSvgD, createPath } from '../geometry/Path'
import { createNode, type PathNode } from '../geometry/Node'

const VIEW_SIZE = 900
const MARGIN = 100

export function Canvas() {
  const project = useProjectStore((s) => s.project)
  const setGlyphPaths = useProjectStore((s) => s.setGlyphPaths)
  const ensureGlyph = useProjectStore((s) => s.ensureGlyph)
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const selectedTool = useEditorStore((s) => s.selectedTool)
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds)
  const setSelectedNodeIds = useEditorStore((s) => s.setSelectedNodeIds)

  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)

  const { guides } = project

  ensureGlyph(editingGlyph, editingGlyph.codePointAt(0) ?? null)
  const glyph = project.glyphs[editingGlyph]

  // font units -> screen px: fit [descender, ascender] into the available vertical space
  const vRange = guides.ascender - guides.descender || 1
  const scale = (VIEW_SIZE - MARGIN * 2) / vRange

  const toScreen = useCallback(
    (x: number, y: number) => ({
      sx: MARGIN + x * scale,
      sy: MARGIN + (guides.ascender - y) * scale,
    }),
    [scale, guides.ascender],
  )

  const toFont = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - MARGIN) / scale,
      y: guides.ascender - (sy - MARGIN) / scale,
    }),
    [scale, guides.ascender],
  )

  const guideLines = useMemo(() => {
    const lines: { label: string; y: number }[] = [
      { label: 'Ascender', y: guides.ascender },
      { label: 'Cap Height', y: guides.capHeight },
      { label: 'X-Height', y: guides.xHeight },
      { label: 'Baseline', y: guides.baseline },
      { label: 'Descender', y: guides.descender },
    ]
    return lines.map((l) => ({ ...l, ...toScreen(0, l.y) }))
  }, [guides, toScreen])

  if (!glyph) return null

  const lsbX = toScreen(glyph.metrics.leftBearing, 0).sx
  const advanceX = toScreen(glyph.metrics.advanceWidth, 0).sx

  function updateNode(pathId: string, nodeId: string, x: number, y: number) {
    const paths = glyph!.paths.map((p) =>
      p.id !== pathId
        ? p
        : { ...p, nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)) },
    )
    setGlyphPaths(editingGlyph, paths)
  }

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    if (selectedTool !== 'pen') return
    const rect = svgRef.current!.getBoundingClientRect()
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW_SIZE
    const sy = ((e.clientY - rect.top) / rect.height) * VIEW_SIZE
    const { x, y } = toFont(sx, sy)

    const paths = glyph.paths.length > 0 ? [...glyph.paths] : [createPath(true)]
    const lastPath = paths[paths.length - 1]
    const newNode = createNode(Math.round(x), Math.round(y))
    paths[paths.length - 1] = { ...lastPath, nodes: [...lastPath.nodes, newNode] }
    setGlyphPaths(editingGlyph, paths)
  }

  function handleNodePointerDown(e: React.PointerEvent, node: PathNode) {
    e.stopPropagation()
    if (selectedTool !== 'node' && selectedTool !== 'select') return
    setSelectedNodeIds([node.id])
    setDraggingNodeId(node.id)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!draggingNodeId) return
    const rect = svgRef.current!.getBoundingClientRect()
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW_SIZE
    const sy = ((e.clientY - rect.top) / rect.height) * VIEW_SIZE
    const { x, y } = toFont(sx, sy)
    for (const p of glyph.paths) {
      if (p.nodes.some((n) => n.id === draggingNodeId)) {
        updateNode(p.id, draggingNodeId, Math.round(x), Math.round(y))
        break
      }
    }
  }

  function handlePointerUp() {
    setDraggingNodeId(null)
  }

  function handleNodeDoubleClick(pathId: string, node: PathNode) {
    const nextType = node.type === 'corner' ? 'smooth' : 'corner'
    const paths = glyph.paths.map((p) =>
      p.id !== pathId
        ? p
        : {
            ...p,
            nodes: p.nodes.map((n) => (n.id === node.id ? { ...n, type: nextType as PathNode['type'] } : n)),
          },
    )
    setGlyphPaths(editingGlyph, paths)
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      className="glyph-canvas"
      onClick={handleCanvasClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <rect x={0} y={0} width={VIEW_SIZE} height={VIEW_SIZE} fill="#ffffff" />

      {/* Left/Right side bearing markers */}
      <line x1={lsbX} y1={0} x2={lsbX} y2={VIEW_SIZE} stroke="#7dd3fc" strokeDasharray="2,4" />
      <line x1={advanceX} y1={0} x2={advanceX} y2={VIEW_SIZE} stroke="#7dd3fc" strokeDasharray="2,4" />

      {guideLines.map((g) => (
        <g key={g.label}>
          <line x1={0} y1={g.sy} x2={VIEW_SIZE} y2={g.sy} stroke={g.label === 'Baseline' ? '#38bdf8' : '#3a3a3a'} strokeWidth={g.label === 'Baseline' ? 1.5 : 1} />
          <text x={4} y={g.sy - 4} fontSize={11} fill="#999">
            {g.label} ({g.y})
          </text>
        </g>
      ))}

      {glyph.paths.map((p) => (
        <g key={p.id}>
          <path d={pathToSvgD(p)} fill="#111" stroke="none" fillRule="nonzero" />
          <path d={pathToSvgD(p)} fill="none" stroke="#2563eb" strokeWidth={1} />
          {p.nodes.map((n) => {
            const { sx, sy } = toScreen(n.x, n.y)
            const selected = selectedNodeIds.includes(n.id)
            return (
              <g key={n.id}>
                {n.handleIn &&
                  (() => {
                    const h = toScreen(n.handleIn!.x, n.handleIn!.y)
                    return <line x1={sx} y1={sy} x2={h.sx} y2={h.sy} stroke="#f59e0b" strokeWidth={1} />
                  })()}
                {n.handleOut &&
                  (() => {
                    const h = toScreen(n.handleOut!.x, n.handleOut!.y)
                    return <line x1={sx} y1={sy} x2={h.sx} y2={h.sy} stroke="#f59e0b" strokeWidth={1} />
                  })()}
                <rect
                  x={sx - 4}
                  y={sy - 4}
                  width={8}
                  height={8}
                  fill={selected ? '#2563eb' : n.type === 'corner' ? '#fff' : '#fbbf24'}
                  stroke="#2563eb"
                  strokeWidth={1}
                  onPointerDown={(e) => handleNodePointerDown(e, n)}
                  onDoubleClick={() => handleNodeDoubleClick(p.id, n)}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

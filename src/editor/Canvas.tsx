import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { pathToSvgD, pathsToSvgD, createPath, type GlyphPath } from '../geometry/Path'
import { createNode, type PathNode } from '../geometry/Node'

const VIEW_SIZE = 900
const MARGIN = 100
const CLOSE_HIT_RADIUS = 9 // screen px

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

  // --- Pen tool state: the path currently being drawn (not yet closed/finished) ---
  const [activePathId, setActivePathId] = useState<string | null>(null)
  const [cursorFont, setCursorFont] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingHandle, setIsDraggingHandle] = useState(false)

  const { guides } = project

  useEffect(() => {
    ensureGlyph(editingGlyph, editingGlyph.codePointAt(0) ?? null)
  }, [editingGlyph, ensureGlyph])

  // switching glyph or tool cancels any in-progress path
  useEffect(() => {
    setActivePathId(null)
    setCursorFont(null)
  }, [editingGlyph, selectedTool])

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

  const eventToFont = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = svgRef.current!.getBoundingClientRect()
      const sx = ((e.clientX - rect.left) / rect.width) * VIEW_SIZE
      const sy = ((e.clientY - rect.top) / rect.height) * VIEW_SIZE
      return toFont(sx, sy)
    },
    [toFont],
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

  const activePath = activePathId ? glyph?.paths.find((p) => p.id === activePathId) ?? null : null

  // End the pen stroke: Escape/Enter, or switching away
  useEffect(() => {
    if (selectedTool !== 'pen') return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        setActivePathId(null)
        setCursorFont(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedTool])

  if (!glyph) return null

  const lsbX = toScreen(glyph.metrics.leftBearing, 0).sx
  const advanceX = toScreen(glyph.metrics.advanceWidth, 0).sx

  function replacePath(paths: GlyphPath[], pathId: string, updater: (p: GlyphPath) => GlyphPath) {
    return paths.map((p) => (p.id === pathId ? updater(p) : p))
  }

  function updateNode(pathId: string, nodeId: string, patch: Partial<PathNode>) {
    setGlyphPaths(
      editingGlyph,
      replacePath(glyph!.paths, pathId, (p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
      })),
    )
  }

  // ---------- Pen tool ----------

  function penPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (selectedTool !== 'pen') return
    const { x, y } = eventToFont(e)
    const fx = Math.round(x)
    const fy = Math.round(y)

    // closing an in-progress path: click near its own first node
    if (activePath && activePath.nodes.length > 1) {
      const first = activePath.nodes[0]
      const a = toScreen(first.x, first.y)
      const b = toScreen(fx, fy)
      const dist = Math.hypot(a.sx - b.sx, a.sy - b.sy)
      if (dist <= CLOSE_HIT_RADIUS) {
        setGlyphPaths(editingGlyph, replacePath(glyph.paths, activePath.id, (p) => ({ ...p, closed: true })))
        setActivePathId(null)
        setCursorFont(null)
        return
      }
    }

    const newNode = createNode(fx, fy)

    if (activePath) {
      setGlyphPaths(
        editingGlyph,
        replacePath(glyph.paths, activePath.id, (p) => ({ ...p, nodes: [...p.nodes, newNode] })),
      )
    } else {
      const newPath = createPath(false)
      newPath.nodes = [newNode]
      setGlyphPaths(editingGlyph, [...glyph.paths, newPath])
      setActivePathId(newPath.id)
    }

    setIsDraggingHandle(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function penPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (selectedTool !== 'pen') return
    const { x, y } = eventToFont(e)
    setCursorFont({ x, y })

    if (!isDraggingHandle || !activePathId) return
    const path = glyph.paths.find((p) => p.id === activePathId)
    if (!path || path.nodes.length === 0) return
    const last = path.nodes[path.nodes.length - 1]

    const handleOut = { x: Math.round(x), y: Math.round(y) }
    const handleIn = { x: Math.round(2 * last.x - x), y: Math.round(2 * last.y - y) }

    setGlyphPaths(
      editingGlyph,
      replacePath(glyph.paths, activePathId, (p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === last.id ? { ...n, type: 'smooth', handleOut, handleIn } : n)),
      })),
    )
  }

  function penPointerUp() {
    if (selectedTool !== 'pen') return
    setIsDraggingHandle(false)
  }

  // ---------- Node / select tools ----------

  function handleNodePointerDown(e: React.PointerEvent, pathId: string, node: PathNode) {
    if (selectedTool === 'pen') {
      if (activePath && pathId === activePath.id && node.id === activePath.nodes[0]?.id && activePath.nodes.length > 1) {
        e.stopPropagation()
        setGlyphPaths(editingGlyph, replacePath(glyph!.paths, activePath.id, (p) => ({ ...p, closed: true })))
        setActivePathId(null)
        setCursorFont(null)
      }
      return
    }
    e.stopPropagation()
    if (selectedTool !== 'node' && selectedTool !== 'select') return
    if (e.shiftKey) {
      setSelectedNodeIds(
        selectedNodeIds.includes(node.id)
          ? selectedNodeIds.filter((id) => id !== node.id)
          : [...selectedNodeIds, node.id],
      )
    } else if (!selectedNodeIds.includes(node.id)) {
      setSelectedNodeIds([node.id])
    }
    setDraggingNodeId(node.id)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function handleHandlePointerDown(e: React.PointerEvent, pathId: string, node: PathNode, which: 'handleIn' | 'handleOut') {
    e.stopPropagation()
    if (selectedTool !== 'node' && selectedTool !== 'select') return
    ;(e.target as Element).setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      const { x, y } = eventToFont(ev)
      const point = { x: Math.round(x), y: Math.round(y) }
      const patch: Partial<PathNode> =
        node.type === 'smooth'
          ? {
              [which]: point,
              [which === 'handleIn' ? 'handleOut' : 'handleIn']: {
                x: Math.round(2 * node.x - point.x),
                y: Math.round(2 * node.y - point.y),
              },
            }
          : { [which]: point }
      updateNode(pathId, node.id, patch)
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function handleCanvasPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (selectedTool === 'pen') {
      penPointerDown(e)
      return
    }
    if (selectedTool === 'select' && e.target === svgRef.current) {
      setSelectedNodeIds([])
    }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (selectedTool === 'pen') {
      penPointerMove(e)
      return
    }
    if (!draggingNodeId) return
    const { x, y } = eventToFont(e)
    for (const p of glyph.paths) {
      if (p.nodes.some((n) => n.id === draggingNodeId)) {
        updateNode(p.id, draggingNodeId, { x: Math.round(x), y: Math.round(y) })
        break
      }
    }
  }

  function handlePointerUp() {
    if (selectedTool === 'pen') {
      penPointerUp()
      return
    }
    setDraggingNodeId(null)
  }

  function handleNodeDoubleClick(pathId: string, node: PathNode) {
    const nextType = node.type === 'corner' ? 'smooth' : 'corner'
    const paths = glyph.paths.map((p) =>
      p.id !== pathId
        ? p
        : {
            ...p,
            nodes: p.nodes.map((n) =>
              n.id === node.id
                ? nextType === 'corner'
                  ? { ...n, type: 'corner' as const, handleIn: undefined, handleOut: undefined }
                  : { ...n, type: 'smooth' as const }
                : n,
            ),
          },
    )
    setGlyphPaths(editingGlyph, paths)
  }

  const previewLine =
    selectedTool === 'pen' && activePath && activePath.nodes.length > 0 && cursorFont && !isDraggingHandle
      ? (() => {
          const last = activePath.nodes[activePath.nodes.length - 1]
          const a = toScreen(last.x, last.y)
          const b = toScreen(cursorFont.x, cursorFont.y)
          return { x1: a.sx, y1: a.sy, x2: b.sx, y2: b.sy }
        })()
      : null

  const closeTarget =
    selectedTool === 'pen' && activePath && activePath.nodes.length > 1
      ? toScreen(activePath.nodes[0].x, activePath.nodes[0].y)
      : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      className="glyph-canvas"
      onPointerDown={handleCanvasPointerDown}
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

      <path d={pathsToSvgD(glyph.paths)} fill="#111" stroke="none" fillRule="nonzero" />

      {glyph.paths.map((p) => (
        <g key={p.id}>
          <path d={pathToSvgD(p)} fill="none" stroke="#2563eb" strokeWidth={1} />
          {p.nodes.map((n) => {
            const { sx, sy } = toScreen(n.x, n.y)
            const selected = selectedNodeIds.includes(n.id)
            const showHandles = selectedTool === 'node' || selectedTool === 'select' || (selectedTool === 'pen' && p.id === activePathId)
            return (
              <g key={n.id}>
                {showHandles && n.handleIn && (
                  <g>
                    <line x1={sx} y1={sy} x2={toScreen(n.handleIn.x, n.handleIn.y).sx} y2={toScreen(n.handleIn.x, n.handleIn.y).sy} stroke="#f59e0b" strokeWidth={1} />
                    <circle
                      cx={toScreen(n.handleIn.x, n.handleIn.y).sx}
                      cy={toScreen(n.handleIn.x, n.handleIn.y).sy}
                      r={3.5}
                      fill="#fff"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(e) => handleHandlePointerDown(e, p.id, n, 'handleIn')}
                    />
                  </g>
                )}
                {showHandles && n.handleOut && (
                  <g>
                    <line x1={sx} y1={sy} x2={toScreen(n.handleOut.x, n.handleOut.y).sx} y2={toScreen(n.handleOut.x, n.handleOut.y).sy} stroke="#f59e0b" strokeWidth={1} />
                    <circle
                      cx={toScreen(n.handleOut.x, n.handleOut.y).sx}
                      cy={toScreen(n.handleOut.x, n.handleOut.y).sy}
                      r={3.5}
                      fill="#fff"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(e) => handleHandlePointerDown(e, p.id, n, 'handleOut')}
                    />
                  </g>
                )}
                <rect
                  x={sx - 4}
                  y={sy - 4}
                  width={8}
                  height={8}
                  fill={selected ? '#2563eb' : n.type === 'corner' ? '#fff' : '#fbbf24'}
                  stroke="#2563eb"
                  strokeWidth={1}
                  onPointerDown={(e) => handleNodePointerDown(e, p.id, n)}
                  onDoubleClick={() => handleNodeDoubleClick(p.id, n)}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            )
          })}
        </g>
      ))}

      {previewLine && (
        <line
          x1={previewLine.x1}
          y1={previewLine.y1}
          x2={previewLine.x2}
          y2={previewLine.y2}
          stroke="#2563eb"
          strokeWidth={1}
          strokeDasharray="3,3"
          pointerEvents="none"
        />
      )}

      {closeTarget && (
        <circle
          cx={closeTarget.sx}
          cy={closeTarget.sy}
          r={CLOSE_HIT_RADIUS}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1.5}
          pointerEvents="none"
        />
      )}
    </svg>
  )
}

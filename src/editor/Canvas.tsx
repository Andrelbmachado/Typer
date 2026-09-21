import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { pathToSvgD, pathsToSvgD, createPath, type GlyphPath } from '../geometry/Path'
import { createNode, type PathNode } from '../geometry/Node'
import { translateNode } from '../geometry/Align'
import { guideAppearance, type GuideKey } from '../typography/Font'
import { toolCursor } from './toolCursor'
import { snapPointFromAnchor, snapVectorToAngle } from '../geometry/Pen'

export const VIEW_SIZE = 1000
const MARGIN = 100
const CLOSE_HIT_RADIUS = 9 // screen px

export function Canvas() {
  const project = useProjectStore((s) => s.project)
  const setGlyphPaths = useProjectStore((s) => s.setGlyphPaths)
  const updateGuide = useProjectStore((s) => s.updateGuide)
  const ensureGlyph = useProjectStore((s) => s.ensureGlyph)
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const selectedTool = useEditorStore((s) => s.selectedTool)
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds)
  const setSelectedNodeIds = useEditorStore((s) => s.setSelectedNodeIds)
  const setSelectedPathIds = useEditorStore((s) => s.setSelectedPathIds)
  const zoom = useEditorStore((s) => s.zoom)
  const camera = useEditorStore((s) => s.camera)
  const setZoom = useEditorStore((s) => s.setZoom)
  const setCamera = useEditorStore((s) => s.setCamera)
  const hiddenPathIds = useEditorStore((s) => s.hiddenPathIds)

  const svgRef = useRef<SVGSVGElement>(null)
  const nodeDragRef = useRef<{ ids: string[]; last: { x: number; y: number } } | null>(null)

  // Keep interaction state in refs as well as React state. Pointer events can arrive
  // before React has painted the state change from the preceding event.
  const [activePathId, setActivePathId] = useState<string | null>(null)
  const activePathIdRef = useRef<string | null>(null)
  const [cursorFont, setCursorFont] = useState<{ x: number; y: number } | null>(null)
  const penDragRef = useRef<{ pathId: string; nodeId: string; start: { x: number; y: number }; moved: boolean } | null>(null)
  const shapeDragRef = useRef<{ pathId: string; start: { x: number; y: number } } | null>(null)
  const brushDragRef = useRef<{ pathId: string; last: { x: number; y: number } } | null>(null)
  const panDragRef = useRef<{ x: number; y: number; camera: { x: number; y: number } } | null>(null)
  const guideDragRef = useRef<{ key: GuideKey } | null>(null)

  const { guides } = project
  const visibleReferences = (project.references ?? []).filter((reference) => reference.visible)

  useEffect(() => {
    ensureGlyph(editingGlyph, editingGlyph.codePointAt(0) ?? null)
  }, [editingGlyph, ensureGlyph])

  // switching glyph or tool cancels any in-progress path
  useEffect(() => {
    activePathIdRef.current = null
    penDragRef.current = null
    nodeDragRef.current = null
    shapeDragRef.current = null
    brushDragRef.current = null
    panDragRef.current = null
    guideDragRef.current = null
    setActivePathId(null)
    setCursorFont(null)
  }, [editingGlyph, selectedTool])

  const glyph = project.glyphs[editingGlyph]
  const viewSize = VIEW_SIZE / zoom

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
      const sx = camera.x + ((e.clientX - rect.left) / rect.width) * viewSize
      const sy = camera.y + ((e.clientY - rect.top) / rect.height) * viewSize
      return toFont(sx, sy)
    },
    [camera, toFont, viewSize],
  )

  const guideLines = useMemo(() => {
    const lines: { key: GuideKey; label: string; y: number }[] = [
      { key: 'ascender', label: 'Ascender', y: guides.ascender },
      { key: 'capHeight', label: 'Cap Height', y: guides.capHeight },
      { key: 'xHeight', label: 'X-Height', y: guides.xHeight },
      { key: 'baseline', label: 'Baseline', y: guides.baseline },
      { key: 'descender', label: 'Descender', y: guides.descender },
    ]
    return lines.map((line) => ({ ...line, ...guideAppearance(project, line.key), ...toScreen(0, line.y) }))
  }, [guides, project, toScreen])

  const activePath = activePathId ? glyph?.paths.find((p) => p.id === activePathId) ?? null : null

  // Enter/Escape end the current contour without discarding the work. It stays
  // editable, but is deliberately excluded from TTF output until it is closed.
  useEffect(() => {
    if (selectedTool !== 'pen') return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        activePathIdRef.current = null
        penDragRef.current = null
        setActivePathId(null)
        setCursorFont(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedTool])

  if (!glyph) return null
  const visiblePaths = glyph.paths.filter((path) => !hiddenPathIds.includes(path.id))

  const lsbX = toScreen(glyph.metrics.leftBearing, 0).sx
  const advanceX = toScreen(glyph.metrics.advanceWidth, 0).sx

  function replacePath(paths: GlyphPath[], pathId: string, updater: (p: GlyphPath) => GlyphPath) {
    return paths.map((p) => (p.id === pathId ? updater(p) : p))
  }

  function updateCurrentGlyphPaths(updater: (paths: GlyphPath[]) => GlyphPath[]) {
    const currentGlyph = useProjectStore.getState().project.glyphs[editingGlyph]
    if (currentGlyph) setGlyphPaths(editingGlyph, updater(currentGlyph.paths))
  }

  function updateNode(pathId: string, nodeId: string, patch: Partial<PathNode>) {
    updateCurrentGlyphPaths((paths) =>
      replacePath(paths, pathId, (p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
      })),
    )
  }

  function rectangleNodes(start: { x: number; y: number }, end: { x: number; y: number }, existing?: PathNode[]) {
    const corners = [
      { x: start.x, y: start.y }, { x: end.x, y: start.y },
      { x: end.x, y: end.y }, { x: start.x, y: end.y },
    ]
    return corners.map((corner, index) => existing?.[index] ? { ...existing[index], ...corner } : createNode(Math.round(corner.x), Math.round(corner.y)))
  }

  // ---------- Pen tool ----------

  function penPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (selectedTool !== 'pen') return
    if (e.button !== 0) return
    const { x, y } = eventToFont(e)
    const currentGlyph = useProjectStore.getState().project.glyphs[editingGlyph]
    if (!currentGlyph) return
    const currentActiveId = activePathIdRef.current
    const currentActivePath = currentActiveId ? currentGlyph.paths.find((p) => p.id === currentActiveId) ?? null : null
    const snapped = e.shiftKey && currentActivePath?.nodes.at(-1)
      ? snapPointFromAnchor(currentActivePath.nodes.at(-1)!, { x, y })
      : { x: Math.round(x), y: Math.round(y) }
    const fx = snapped.x
    const fy = snapped.y

    // closing an in-progress path: click near its own first node
    if (currentActivePath && currentActivePath.nodes.length > 1) {
      const first = currentActivePath.nodes[0]
      const a = toScreen(first.x, first.y)
      const b = toScreen(fx, fy)
      const dist = Math.hypot(a.sx - b.sx, a.sy - b.sy)
      if (dist <= CLOSE_HIT_RADIUS) {
        updateCurrentGlyphPaths((paths) => replacePath(paths, currentActivePath.id, (p) => ({ ...p, closed: true })))
        setSelectedPathIds([currentActivePath.id])
        setSelectedNodeIds(currentActivePath.nodes.map((node) => node.id))
        activePathIdRef.current = null
        penDragRef.current = null
        setActivePathId(null)
        setCursorFont(null)
        return
      }
    }

    const newNode = createNode(fx, fy)

    let pathId: string
    if (currentActivePath) {
      pathId = currentActivePath.id
      updateCurrentGlyphPaths((paths) => replacePath(paths, pathId, (p) => ({ ...p, nodes: [...p.nodes, newNode] })))
    } else {
      const newPath = createPath(false)
      newPath.nodes = [newNode]
      pathId = newPath.id
      updateCurrentGlyphPaths((paths) => [...paths, newPath])
      activePathIdRef.current = pathId
      setActivePathId(newPath.id)
    }

    penDragRef.current = { pathId, nodeId: newNode.id, start: { x: fx, y: fy }, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function penPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (selectedTool !== 'pen') return
    const { x, y } = eventToFont(e)
    setCursorFont({ x, y })

    const penDrag = penDragRef.current
    if (!penDrag) return
    const dx = x - penDrag.start.x
    const dy = y - penDrag.start.y
    if (!penDrag.moved && Math.hypot(dx, dy) < 2) return
    penDrag.moved = true

    const vector = e.shiftKey ? snapVectorToAngle({ x: x - penDrag.start.x, y: y - penDrag.start.y }) : { x: x - penDrag.start.x, y: y - penDrag.start.y }
    const handleOut = { x: Math.round(penDrag.start.x + vector.x), y: Math.round(penDrag.start.y + vector.y) }
    const handleIn = { x: Math.round(penDrag.start.x - vector.x), y: Math.round(penDrag.start.y - vector.y) }

    updateCurrentGlyphPaths((paths) =>
      replacePath(paths, penDrag.pathId, (p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === penDrag.nodeId ? { ...n, type: 'smooth', handleOut, handleIn } : n)),
      })),
    )
  }

  function penPointerUp() {
    if (selectedTool !== 'pen') return
    penDragRef.current = null
  }

  function shapePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const start = eventToFont(e)
    const path = createPath(true)
    path.nodes = rectangleNodes(start, start)
    updateCurrentGlyphPaths((paths) => [...paths, path])
    setSelectedPathIds([path.id])
    setSelectedNodeIds(path.nodes.map((node) => node.id))
    shapeDragRef.current = { pathId: path.id, start }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function brushPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const point = eventToFont(e)
    const path = createPath(false)
    path.nodes = [createNode(Math.round(point.x), Math.round(point.y))]
    updateCurrentGlyphPaths((paths) => [...paths, path])
    setSelectedPathIds([path.id])
    setSelectedNodeIds(path.nodes.map((node) => node.id))
    brushDragRef.current = { pathId: path.id, last: point }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function addNodeAt(point: { x: number; y: number }) {
    const currentGlyph = useProjectStore.getState().project.glyphs[editingGlyph]
    if (!currentGlyph) return
    let match: { pathId: string; index: number; x: number; y: number; distance: number } | null = null
    for (const path of currentGlyph.paths) {
      const count = path.closed ? path.nodes.length : path.nodes.length - 1
      for (let index = 0; index < count; index += 1) {
        const from = path.nodes[index]
        const to = path.nodes[(index + 1) % path.nodes.length]
        const dx = to.x - from.x
        const dy = to.y - from.y
        const lengthSq = dx * dx + dy * dy || 1
        const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSq))
        const x = from.x + t * dx
        const y = from.y + t * dy
        const distance = Math.hypot(point.x - x, point.y - y)
        if (!match || distance < match.distance) match = { pathId: path.id, index, x, y, distance }
      }
    }
    if (!match || match.distance > 24) return
    const node = createNode(Math.round(match.x), Math.round(match.y))
    updateCurrentGlyphPaths((paths) => replacePath(paths, match.pathId, (path) => ({ ...path, nodes: [...path.nodes.slice(0, match.index + 1), node, ...path.nodes.slice(match.index + 1)] })))
    setSelectedNodeIds([node.id])
  }

  // ---------- Node / select tools ----------

  function handleNodePointerDown(e: React.PointerEvent, pathId: string, node: PathNode) {
    if (selectedTool === 'pen') {
      e.stopPropagation()
      const currentGlyph = useProjectStore.getState().project.glyphs[editingGlyph]
      const currentActiveId = activePathIdRef.current
      const currentPath = currentGlyph?.paths.find((p) => p.id === currentActiveId)
      if (currentPath && pathId === currentPath.id && node.id === currentPath.nodes[0]?.id && currentPath.nodes.length > 1) {
        updateCurrentGlyphPaths((paths) => replacePath(paths, currentPath.id, (p) => ({ ...p, closed: true })))
        setSelectedPathIds([currentPath.id])
        setSelectedNodeIds(currentPath.nodes.map((item) => item.id))
        activePathIdRef.current = null
        penDragRef.current = null
        setActivePathId(null)
        setCursorFont(null)
      }
      if (currentPath && e.altKey && pathId === currentPath.id && node.id === currentPath.nodes.at(-1)?.id) {
        updateNode(pathId, node.id, { type: 'corner', handleIn: undefined, handleOut: undefined })
      }
      return
    }
    e.stopPropagation()
    if (selectedTool === 'delete-node') {
      updateCurrentGlyphPaths((paths) => paths.map((path) => {
        if (path.id !== pathId) return path
        const nodes = path.nodes.filter((item) => item.id !== node.id)
        return { ...path, nodes, closed: path.closed && nodes.length >= 3 }
      }).filter((path) => path.nodes.length))
      setSelectedNodeIds(selectedNodeIds.filter((id) => id !== node.id))
      return
    }
    if (selectedTool === 'scissors') {
      updateCurrentGlyphPaths((paths) => replacePath(paths, pathId, (path) => {
        const index = path.nodes.findIndex((item) => item.id === node.id)
        return { ...path, closed: false, nodes: [...path.nodes.slice(index), ...path.nodes.slice(0, index)] }
      }))
      return
    }
    if (selectedTool === 'fill') {
      updateCurrentGlyphPaths((paths) => replacePath(paths, pathId, (path) => ({
        ...path,
        nodes: [...path.nodes].reverse().map((item) => ({ ...item, handleIn: item.handleOut, handleOut: item.handleIn })),
      })))
      return
    }
    if (selectedTool !== 'node' && selectedTool !== 'select') return
    let nextSelection = selectedNodeIds
    if (e.shiftKey) {
      nextSelection = selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id]
      setSelectedNodeIds(nextSelection)
    } else if (!selectedNodeIds.includes(node.id)) {
      nextSelection = [node.id]
      setSelectedNodeIds(nextSelection)
    }
    setSelectedPathIds([])
    nodeDragRef.current = { ids: nextSelection, last: { x: node.x, y: node.y } }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
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
    if (selectedTool === 'shape') {
      shapePointerDown(e)
      return
    }
    if (selectedTool === 'brush') {
      brushPointerDown(e)
      return
    }
    if (selectedTool === 'add-node') {
      addNodeAt(eventToFont(e))
      return
    }
    if (selectedTool === 'zoom') {
      const rect = svgRef.current!.getBoundingClientRect()
      const sx = camera.x + ((e.clientX - rect.left) / rect.width) * viewSize
      const sy = camera.y + ((e.clientY - rect.top) / rect.height) * viewSize
      const nextZoom = zoom >= 3 ? 1 : Math.min(3, zoom * 1.5)
      const nextSize = VIEW_SIZE / nextZoom
      setZoom(nextZoom)
      setCamera(nextZoom === 1 ? { x: 0, y: 0 } : { x: sx - nextSize / 2, y: sy - nextSize / 2 })
      return
    }
    if (selectedTool === 'hand') {
      panDragRef.current = { x: e.clientX, y: e.clientY, camera }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (selectedTool === 'select' && e.target === svgRef.current) {
      setSelectedNodeIds([])
      setSelectedPathIds([])
    }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const guideDrag = guideDragRef.current
    if (guideDrag) {
      updateGuide(guideDrag.key, Math.round(eventToFont(e).y))
      return
    }
    if (selectedTool === 'pen') {
      penPointerMove(e)
      return
    }
    const shapeDrag = shapeDragRef.current
    if (shapeDrag) {
      const end = eventToFont(e)
      updateCurrentGlyphPaths((paths) => replacePath(paths, shapeDrag.pathId, (path) => ({ ...path, nodes: rectangleNodes(shapeDrag.start, end, path.nodes) })))
      return
    }
    const brushDrag = brushDragRef.current
    if (brushDrag) {
      const point = eventToFont(e)
      if (Math.hypot(point.x - brushDrag.last.x, point.y - brushDrag.last.y) >= 8) {
        const node = createNode(Math.round(point.x), Math.round(point.y))
        updateCurrentGlyphPaths((paths) => replacePath(paths, brushDrag.pathId, (path) => ({ ...path, nodes: [...path.nodes, node] })))
        brushDrag.last = point
      }
      return
    }
    const panDrag = panDragRef.current
    if (panDrag) {
      const rect = svgRef.current!.getBoundingClientRect()
      setCamera({ x: panDrag.camera.x - ((e.clientX - panDrag.x) / rect.width) * viewSize, y: panDrag.camera.y - ((e.clientY - panDrag.y) / rect.height) * viewSize })
      return
    }
    const drag = nodeDragRef.current
    if (!drag) return
    const { x, y } = eventToFont(e)
    const next = { x: Math.round(x), y: Math.round(y) }
    const dx = next.x - drag.last.x
    const dy = next.y - drag.last.y
    if (dx === 0 && dy === 0) return
    const ids = new Set(drag.ids)
    updateCurrentGlyphPaths((paths) => paths.map((path) => ({
      ...path,
      nodes: path.nodes.map((node) => ids.has(node.id) ? translateNode(node, dx, dy) : node),
    })))
    drag.last = next
  }

  function handlePointerUp() {
    guideDragRef.current = null
    if (selectedTool === 'pen') {
      penPointerUp()
      return
    }
    if (brushDragRef.current) {
      const pathId = brushDragRef.current.pathId
      updateCurrentGlyphPaths((paths) => replacePath(paths, pathId, (path) => ({ ...path, closed: path.nodes.length >= 3 })))
      const currentPath = useProjectStore.getState().project.glyphs[editingGlyph]?.paths.find((path) => path.id === pathId)
      if (currentPath) {
        setSelectedPathIds([pathId])
        setSelectedNodeIds(currentPath.nodes.map((node) => node.id))
      }
      brushDragRef.current = null
    }
    shapeDragRef.current = null
    panDragRef.current = null
    nodeDragRef.current = null
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
    selectedTool === 'pen' && activePath && activePath.nodes.length > 0 && cursorFont && !penDragRef.current
      ? (() => {
          const last = activePath.nodes[activePath.nodes.length - 1]
          const a = toScreen(last.handleOut?.x ?? last.x, last.handleOut?.y ?? last.y)
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
      viewBox={`${camera.x} ${camera.y} ${viewSize} ${viewSize}`}
      className="glyph-canvas"
      aria-label={`Editor de glifo ${editingGlyph}`}
      style={{ cursor: toolCursor(selectedTool) }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <rect x={0} y={0} width={VIEW_SIZE} height={VIEW_SIZE} fill="#ffffff" />

      {visibleReferences.map((reference) => (
        <image
          key={reference.id}
          href={reference.source}
          x={0}
          y={0}
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          opacity={reference.opacity}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
        />
      ))}

      {/* Left/Right side bearing markers */}
      <line x1={lsbX} y1={0} x2={lsbX} y2={VIEW_SIZE} stroke="#7dd3fc" strokeDasharray="2,4" />
      <line x1={advanceX} y1={0} x2={advanceX} y2={VIEW_SIZE} stroke="#7dd3fc" strokeDasharray="2,4" />

      {guideLines.map((guide) => (
        <g key={guide.key}>
          <title>{guide.label}: {guide.y} · {guide.locked ? 'fixa' : 'móvel'}</title>
          <line x1={0} y1={guide.sy} x2={VIEW_SIZE} y2={guide.sy} stroke={guide.color} strokeWidth={guide.key === 'baseline' ? 1.5 : 1} pointerEvents="none" />
          <line
            x1={0}
            y1={guide.sy}
            x2={VIEW_SIZE}
            y2={guide.sy}
            stroke="transparent"
            strokeWidth={12 / zoom}
            aria-label={`${guide.label}: ${guide.y}`}
            style={{ cursor: guide.locked ? 'default' : 'ns-resize' }}
            onPointerDown={(event) => {
              if (guide.locked || event.button !== 0) return
              event.stopPropagation()
              guideDragRef.current = { key: guide.key }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
          />
        </g>
      ))}

      <g transform={`translate(${MARGIN} ${MARGIN + guides.ascender * scale}) scale(${scale} ${-scale})`}>
        <path d={pathsToSvgD(visiblePaths)} fill="#111" stroke="none" fillRule="nonzero" />
        {visiblePaths.map((p) => (
          <path key={p.id} d={pathToSvgD(p)} fill="none" stroke="#2563eb" strokeWidth={1 / scale} vectorEffect="non-scaling-stroke" />
        ))}
      </g>

      {visiblePaths.map((p) => (
        <g key={p.id}>
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
          r={CLOSE_HIT_RADIUS / zoom}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1.5}
          pointerEvents="none"
        />
      )}
    </svg>
  )
}

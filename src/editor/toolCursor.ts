import type { ToolId } from '../store/editorStore'

const SHAPES: Partial<Record<ToolId, string>> = {
  pen: '<path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L9 4 2.5 10.5 4 18l7.5 1.5"/>',
  node: '<path d="m3 21 9-9"/><path d="m15 6 3 3"/><path d="m5 3 16 16"/>',
  shape: '<rect x="4" y="4" width="16" height="16" rx="1"/>',
  brush: '<path d="m14 6 4 4"/><path d="m4 20c2 0 4-1 5-3l7-7-4-4-7 7c-2 1-3 3-3 5 0 1 1 2 2 2z"/>',
  'delete-node': '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 8.6 20 20"/><path d="M8.6 15.4 20 4"/>',
  fill: '<path d="m9 11-6 6v3h9l3-3"/><path d="m16 3 5 5-9 9-5-5 9-9z"/><path d="M19 18h.01"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10V5a2 2 0 0 0-4 0v10"/><path d="m18 8 2 1a2 2 0 0 1 1 2v5a6 6 0 0 1-6 6h-3a6 6 0 0 1-5-3l-3-5a2 2 0 0 1 3-2l1 1"/>',
}

export function toolCursor(tool: ToolId) {
  if (tool === 'select') return 'default'
  const shape = SHAPES[tool]
  if (!shape) return 'crosshair'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="#18181b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 4, crosshair`
}

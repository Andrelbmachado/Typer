import * as z from 'zod/v4'
import { API_SCOPES, type ApiScope } from '../shared/access'

export { API_SCOPES, type ApiScope }

export const presetNameSchema = z.enum(['neutral-grotesk', 'geometric-sans', 'humanist-sans'])
export const projectIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'ID de projeto inválido.').min(1).max(128)
export const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() })
export const nodeSchema = z.object({
  id: z.string().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  type: z.enum(['corner', 'smooth', 'symmetric']).default('corner'),
  handleIn: pointSchema.optional(),
  handleOut: pointSchema.optional(),
})
export const pathSchema = z.object({ id: z.string().optional(), closed: z.boolean().default(true), nodes: z.array(nodeSchema).min(1) })
export const glyphSchema = z.object({
  name: z.string().min(1).max(8),
  unicode: z.number().int().min(0).max(0x10ffff).nullable(),
  metrics: z.object({ advanceWidth: z.number().positive(), leftBearing: z.number(), rightBearing: z.number() }),
  paths: z.array(pathSchema),
})

export const createProjectSchema = z.object({ familyName: z.string().trim().min(1).max(80), preset: presetNameSchema.default('neutral-grotesk') })
export const upsertGlyphsSchema = z.object({ projectId: projectIdSchema, glyphs: z.array(glyphSchema).min(1).max(256) })
export const validationSchema = z.object({ projectId: projectIdSchema, requiredCharacters: z.array(z.string().min(1).max(2)).default([]) })

export type GlyphInput = z.infer<typeof glyphSchema>
export type PresetNameInput = z.infer<typeof presetNameSchema>

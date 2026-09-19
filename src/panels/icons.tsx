import type { SVGProps } from 'react'

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  )
}

export const IconSelect = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 3l7 17 2-7 7-2z" />
  </Icon>
)

export const IconPen = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </Icon>
)

export const IconNode = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 18c4-10 12-10 16-14" />
    <circle cx="4" cy="18" r="2" fill="currentColor" />
    <circle cx="20" cy="4" r="2" fill="currentColor" />
  </Icon>
)

export const IconRectangle = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
  </Icon>
)

export const IconBrush = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 114.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 00-3-3.02z" />
  </Icon>
)

export const IconEraser = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M20 20H8.5L3.5 15a1 1 0 010-1.4l9.6-9.6a1 1 0 011.4 0l6 6a1 1 0 010 1.4L13 19" />
    <path d="M8.5 20L4 15.5" />
  </Icon>
)

export const IconScissors = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4L8.12 15.88" />
    <path d="M14.47 14.48L20 20" />
    <path d="M8.12 8.12L12 12" />
  </Icon>
)

export const IconText = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 6h16" />
    <path d="M12 6v14" />
    <path d="M9 20h6" />
  </Icon>
)

export const IconZoom = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icon>
)

export const IconHand = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M18 12.5V8a1.5 1.5 0 00-3 0v3M15 11V6a1.5 1.5 0 00-3 0v5M12 11V5a1.5 1.5 0 00-3 0v9M9 12.2V9a1.5 1.5 0 00-3 0v5.5a7 7 0 007 7h1.6a5 5 0 004.9-4l.5-2.5a3 3 0 00-2.4-3.5" />
  </Icon>
)

export const IconMore = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
  </Icon>
)

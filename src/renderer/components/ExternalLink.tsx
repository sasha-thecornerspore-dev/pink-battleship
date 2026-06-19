import type { ReactNode } from 'react'
import { pb } from '../lib/api'

/** A link that opens in the user's real browser (never navigates the sandboxed app). */
export default function ExternalLink({ href, children, style }: { href: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        void pb.system.openExternal(href)
      }}
      style={{ color: 'var(--pb-primary-deep)', cursor: 'pointer', textDecoration: 'underline', ...style }}
    >
      {children}
    </a>
  )
}

import React from 'react'
import { ICON_PATHS } from './iconPaths.js'

export default function Icon({ name, size = 20, stroke = 1.8, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={ICON_PATHS[name] || ICON_PATHS.tag} />
    </svg>
  )
}

// Round badge with a category's icon. Unknown keys (e.g. an old emoji) fall back to the tag icon.
export function CategoryIcon({ category, size = 40, tone }) {
  return (
    <span className={tone ? `badge ${tone}` : 'badge'} style={{ width: size, height: size }}>
      <Icon name={category?.icon || 'tag'} size={Math.round(size * 0.5)} />
    </span>
  )
}

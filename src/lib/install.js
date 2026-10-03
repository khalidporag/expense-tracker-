// "Use it as an app" prompt logic. Pure: describes the situation, decides what to offer.
//   installed - already running as an installed app (nothing to offer)
//   inapp     - inside another app's built-in browser (Facebook, Instagram, WebView...) which cannot install apps
//   prompt    - the browser gave us a one-tap install prompt (Android Chrome, Samsung Internet, desktop Chrome/Edge)
//   ios       - iPhone/iPad: Apple gives websites no install button, so we show the 3-tap how-to
//   none      - nothing we can usefully offer
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|Snapchat|MicroMessenger|TikTok|musical_ly|Twitter|LinkedInApp|Pinterest|KAKAOTALK|; wv\)/i

export function detectPlatform({ ua = '', maxTouchPoints = 0, hasPrompt = false, standalone = false } = {}) {
  if (standalone) return 'installed'
  if (IN_APP.test(ua)) return 'inapp'
  if (hasPrompt) return 'prompt'
  // iPadOS 13+ reports itself as a Mac, but has a touch screen.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)
  return ios ? 'ios' : 'none'
}

export const isSnoozed = (dismissedAt, now, days = 14) => dismissedAt != null && now - dismissedAt < days * 86400000

// Automated browsers don't see the banner (it would cover tests) unless forced with ?install=1.
export function shouldShowBanner({ platform, dismissedAt = null, now, automated = false, forced = false }) {
  if (platform === 'installed' || platform === 'none') return false
  if (automated && !forced) return false
  return !isSnoozed(dismissedAt, now)
}

export const canInstall = (platform) => platform === 'prompt' || platform === 'ios' || platform === 'inapp'

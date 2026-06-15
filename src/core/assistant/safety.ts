export interface SafetyVerdict {
  allowed: boolean
  reason?: string
}

// Hard-blocked on EVERY backend, including local/uncensored — the app is the
// moderator for models that have none. Never generated, never dispatched.
const HARD_BLOCK: { re: RegExp; label: string }[] = [
  { re: /\b(child|children|minor|minors|underage|under[- ]?age|preteen|pre[- ]?teen|loli|cp|young ?girl|young ?boy|kid|kids)\b/i, label: 'minors' },
  { re: /\b(non[- ]?consent|nonconsensual|rape|forced|unwilling)\b/i, label: 'non-consent' },
  { re: /\b(bestiality|incest)\b/i, label: 'prohibited' },
]

export function screenContent(text: string, boundaries: string[]): SafetyVerdict {
  for (const { re, label } of HARD_BLOCK) {
    if (re.test(text)) {
      return { allowed: false, reason: `Hard-blocked (${label}) on every backend, including local. This is never generated.` }
    }
  }
  const lower = text.toLowerCase()
  for (const b of boundaries) {
    const term = b.trim().toLowerCase()
    if (term && lower.includes(term)) {
      return { allowed: false, reason: `Blocked by your boundary list: "${b}".` }
    }
  }
  return { allowed: true }
}

const PII: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b(?:\d[ -]?){13,16}\b/, // card-ish
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // email
  /\b\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/, // phone
]

export function containsPII(text: string): boolean {
  return PII.some((re) => re.test(text))
}

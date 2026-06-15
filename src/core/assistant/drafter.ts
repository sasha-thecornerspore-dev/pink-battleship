import type { AssistantTask } from '@shared/models'

/**
 * Deterministic template drafter — a stand-in so the feature works offline and in
 * the prototype. In the desktop app this is replaced by a real provider call
 * (local model or BYO key) chosen by the router. Templates stay tasteful by design.
 */
export function draftTemplate(task: AssistantTask, context: string, persona: string, explicit: boolean): string {
  const c = context.trim() || 'my latest set'
  const tone = persona.trim() ? ` (${persona.trim()} voice)` : ''
  const spice = explicit ? ' 🔥' : ''
  switch (task) {
    case 'caption':
      return `New drop just landed 🩷 ${c}. Subscribers see it all first — link in bio, loves.${spice}${tone}`
    case 'fan_reply':
      return `Hey you 😘 so glad you're here. ${c} — want me to send you something a little special? Just say the word.${spice}${tone}`
    case 'content_idea':
      return `Content idea: a themed mini-series around "${c}" — 3 teasers for socials + 1 full PPV. Tease Mon/Wed, drop Fri.${tone}`
    default:
      return c
  }
}

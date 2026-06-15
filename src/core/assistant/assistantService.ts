import type { AssistantConfig, DraftRequest, DraftResult } from '@shared/models'
import { screenContent, containsPII } from './safety'
import { pickProvider } from './router'
import { draftTemplate } from './drafter'

export { ALL_PROVIDERS } from './router'

export class AssistantService {
  draft(req: DraftRequest, config: AssistantConfig, available: string[]): DraftResult {
    const screen = screenContent(`${req.context} ${req.persona ?? ''}`, config.boundaries)
    if (!screen.allowed) return { ok: false, blocked: screen.reason, notes: [] }

    const hasPII = containsPII(req.context)
    const route = pickProvider({ explicit: req.explicit, hasPII, available: new Set(available) })
    if (!route.provider) {
      return { ok: false, blocked: 'No backend available for this task. Enable the local model or add an API key.', notes: route.notes }
    }

    const text = draftTemplate(req.task, req.context, req.persona ?? '', req.explicit)
    return {
      ok: true,
      route: route.provider.id,
      routeLabel: route.provider.label,
      text,
      notes: [...route.notes, 'Drafted by a local template in this build — connect a model for real generation.'],
    }
  }
}

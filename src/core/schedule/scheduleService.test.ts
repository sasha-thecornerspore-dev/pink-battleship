import { describe, it, expect } from 'vitest'
import { InMemoryDatabase } from '../db/inMemoryDatabase'
import { ScheduleService } from './scheduleService'

describe('ScheduleService', () => {
  it('creates, sorts by time, updates status, and removes', () => {
    const svc = new ScheduleService(new InMemoryDatabase())
    svc.create({ platformId: 'onlyfans', kind: 'post', title: 'Later post', caption: '', scheduledAt: '2026-06-16T18:00:00Z' })
    const early = svc.create({ platformId: 'chaturbate', kind: 'go_live', title: 'Go live', caption: '', scheduledAt: '2026-06-15T20:00:00Z' })

    const list = svc.list()
    expect(list).toHaveLength(2)
    expect(list[0].title).toBe('Go live') // earliest first

    svc.setStatus(early.id, 'posted')
    expect(svc.list().find((i) => i.id === early.id)?.status).toBe('posted')

    svc.remove(early.id)
    expect(svc.list()).toHaveLength(1)
  })
})

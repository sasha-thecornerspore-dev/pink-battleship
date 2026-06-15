import type { Database } from '../db/database'
import type { ScheduledItem, ScheduleStatus } from '@shared/models'

const KEY = 'schedule:items'

export type NewScheduledItem = Omit<ScheduledItem, 'id' | 'status'>

/**
 * Content calendar / scheduler. Items are stored as JSON in the encrypted
 * settings store (no new tables). For platforms without an API, an item is a
 * manual-assist reminder (copy caption → open composer); official platforms can
 * later auto-post. Status tracks planned → posted/skipped.
 */
export class ScheduleService {
  constructor(private readonly db: Database) {}

  private read(): ScheduledItem[] {
    const r = this.db.getSetting(KEY)
    return r ? (JSON.parse(r) as ScheduledItem[]) : []
  }
  private write(items: ScheduledItem[]): void {
    this.db.setSetting(KEY, JSON.stringify(items))
  }

  list(): ScheduledItem[] {
    return [...this.read()].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  }

  create(input: NewScheduledItem): ScheduledItem {
    const items = this.read()
    const item: ScheduledItem = { ...input, id: `sch:${items.length}-${input.scheduledAt}`, status: 'planned' }
    this.write([...items, item])
    return item
  }

  setStatus(id: string, status: ScheduleStatus): void {
    this.write(this.read().map((i) => (i.id === id ? { ...i, status } : i)))
  }

  remove(id: string): void {
    this.write(this.read().filter((i) => i.id !== id))
  }
}

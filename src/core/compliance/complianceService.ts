import type { Database } from '../db/database'
import type { DmcaInput, TwoFiveSevenRecord } from '@shared/models'

const REC_KEY = 'compliance:2257'
const CUST_KEY = 'compliance:custodian'

export interface CustodianInfo {
  name: string
  address: string
}
export type NewRecord = Omit<TwoFiveSevenRecord, 'id' | 'addedAt'>

/**
 * Compliance helpers (recordkeeping aid — NOT legal advice). 2257 performer
 * records + custodian statement live in the encrypted store; tax set-aside and
 * DMCA notice are pure derivations. Everything stays on-device.
 */
export class ComplianceService {
  constructor(private readonly db: Database) {}

  private read(): TwoFiveSevenRecord[] {
    const r = this.db.getSetting(REC_KEY)
    return r ? (JSON.parse(r) as TwoFiveSevenRecord[]) : []
  }
  private write(items: TwoFiveSevenRecord[]): void {
    this.db.setSetting(REC_KEY, JSON.stringify(items))
  }

  records(): TwoFiveSevenRecord[] {
    return this.read()
  }
  addRecord(input: NewRecord): TwoFiveSevenRecord {
    const items = this.read()
    const rec: TwoFiveSevenRecord = { ...input, id: `rec:${items.length}-${input.legalName}`, addedAt: '' }
    this.write([...items, rec])
    return rec
  }
  removeRecord(id: string): void {
    this.write(this.read().filter((r) => r.id !== id))
  }

  custodian(): CustodianInfo {
    const r = this.db.getSetting(CUST_KEY)
    return r ? (JSON.parse(r) as CustodianInfo) : { name: '', address: '' }
  }
  setCustodian(info: CustodianInfo): void {
    this.db.setSetting(CUST_KEY, JSON.stringify(info))
  }

  custodianStatement(): string {
    const c = this.custodian()
    const recs = this.records()
    return [
      'Records required pursuant to 18 U.S.C. § 2257 and 28 C.F.R. 75 are maintained by the Custodian of Records:',
      '',
      c.name || '[Custodian name]',
      c.address || '[Custodian address]',
      '',
      `Performers on file: ${recs.length}${recs.length ? ` (${recs.map((r) => r.legalName).join(', ')})` : ''}.`,
      '',
      'This tool assists recordkeeping only and is not legal advice. Confirm your obligations and the secondary-producer scope with qualified counsel.',
    ].join('\n')
  }

  static taxSetAside(net: number, rate: number): number {
    return Math.round(net * rate * 100) / 100
  }

  static dmca(i: DmcaInput): string {
    return [
      'DMCA Takedown Notice',
      '',
      'To Whom It May Concern,',
      '',
      `I am the owner of the copyrighted work "${i.workTitle || '[work title]'}", originally published at ${i.originalUrl || '[original URL]'}.`,
      `It is being infringed at: ${i.infringingUrl || '[infringing URL]'}.`,
      '',
      'I have a good-faith belief that the use described above is not authorized by the copyright owner, its agent, or the law. The information in this notice is accurate, and under penalty of perjury, I am the copyright owner or authorized to act on its behalf.',
      '',
      'Please remove or disable access to the infringing material promptly.',
      '',
      'Signed,',
      i.name || '[Your name]',
    ].join('\n')
  }
}

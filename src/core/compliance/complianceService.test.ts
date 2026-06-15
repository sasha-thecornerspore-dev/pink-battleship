import { describe, it, expect } from 'vitest'
import { InMemoryDatabase } from '../db/inMemoryDatabase'
import { ComplianceService } from './complianceService'

describe('ComplianceService', () => {
  it('stores 2257 records and builds a custodian statement', () => {
    const svc = new ComplianceService(new InMemoryDatabase())
    svc.setCustodian({ name: 'Jane Doe', address: '123 Main St' })
    svc.addRecord({ legalName: 'Jane Doe', aliases: 'StarJane', dob: '1996-04-02', idType: 'Passport', idRef: 'X1', productionDates: '2026-05' })
    const stmt = svc.custodianStatement()
    expect(stmt).toContain('Jane Doe')
    expect(stmt).toContain('123 Main St')
    expect(svc.records()).toHaveLength(1)
  })

  it('removes records', () => {
    const svc = new ComplianceService(new InMemoryDatabase())
    const rec = svc.addRecord({ legalName: 'A B', aliases: '', dob: '1990-01-01', idType: 'DL', idRef: 'Y', productionDates: '' })
    svc.removeRecord(rec.id)
    expect(svc.records()).toHaveLength(0)
  })

  it('computes a tax set-aside', () => {
    expect(ComplianceService.taxSetAside(1000, 0.28)).toBe(280)
  })

  it('generates a DMCA notice containing the URLs and name', () => {
    const notice = ComplianceService.dmca({ workTitle: 'My Set', infringingUrl: 'http://leak.example/x', originalUrl: 'http://mine.example', name: 'Jane' })
    expect(notice).toContain('My Set')
    expect(notice).toContain('http://leak.example/x')
    expect(notice).toContain('Jane')
  })
})

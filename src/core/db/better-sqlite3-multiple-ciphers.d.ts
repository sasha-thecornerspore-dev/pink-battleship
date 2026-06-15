declare module 'better-sqlite3-multiple-ciphers' {
  interface Statement {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint }
    get(...params: unknown[]): unknown
    all(...params: unknown[]): unknown[]
  }
  interface DatabaseInstance {
    pragma(source: string): unknown
    exec(sql: string): DatabaseInstance
    prepare(sql: string): Statement
    close(): void
  }
  interface Options {
    readonly?: boolean
    fileMustExist?: boolean
    timeout?: number
  }
  interface DatabaseConstructor {
    new (filename: string, options?: Options): DatabaseInstance
  }
  const Database: DatabaseConstructor
  export default Database
}

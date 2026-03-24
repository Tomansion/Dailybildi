import { Database } from 'arangojs'

// Store original Request constructor
const OriginalRequest = global.Request

// Patch Request constructor to remove keepalive option (incompatible with Next.js undici)
class PatchedRequest extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init && 'keepalive' in init) {
      const { keepalive, ...restInit } = init
      super(input, restInit)
    } else {
      super(input, init)
    }
  }
}

// Override global Request to fix Next.js + ArangoDB compatibility
global.Request = PatchedRequest as any

class ArangoDBClient {
  private static instance: Database | null = null

  static getClient(): Database {
    if (!this.instance) {
      const url = process.env.ARANGO_URL || 'http://localhost:8529'
      const databaseName = process.env.ARANGO_DATABASE || 'dailybildi'
      const username = process.env.ARANGO_USERNAME || 'root'
      const password = process.env.ARANGO_PASSWORD || ''

      this.instance = new Database({
        url,
        databaseName,
        auth: { username, password },
        precaptureStackTraces: false,
      })
    }

    return this.instance
  }

  static closeConnection(): void {
    if (this.instance) {
      this.instance.close()
      this.instance = null
    }
  }
}

export default ArangoDBClient

import { Database } from 'arangojs'

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

#!/usr/bin/env node
const { initializeMongo } = require('../src/data/mongo')

console.log('Starting web server...')

async function run () {
  const db = await initializeMongo()
  console.log('db', db)

  const apps = require('../app')
  const httpsServer = apps.httpsServer
  const httpServer = apps.httpServer

  httpsServer.listen(process.env.HTTPS_PORT || 8443, () => {
    const addr = httpsServer.address()
    console.log(`HTTPS server listening on port ${addr.port} at ${addr.address}`)
  })

  httpServer.listen(process.env.PORT || 3000, () => {
    const addr = httpServer.address()
    console.log(`HTTP server listening on port ${addr.port} at ${addr.address}`)
  })
}

run().then(() => console.log('Initialized')).catch((e) => console.error(e))

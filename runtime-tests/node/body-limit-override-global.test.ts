import { once } from 'node:events'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { serve } from '@hono/node-server'
import { Hono } from '../../src'
import { bodyLimit } from '../../src/middleware/body-limit'

describe('bodyLimit with @hono/node-server and overrideGlobalObjects: false', () => {
  const app = new Hono()
  app.post('/body-limit', bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
    const text = await c.req.text()
    return c.text(`ok ${text.length}`)
  })

  let server: Server
  let url: string

  beforeAll(async () => {
    server = serve({
      fetch: app.fetch,
      port: 0,
      overrideGlobalObjects: false,
    }) as Server
    await once(server, 'listening')
    const address = server.address() as AddressInfo
    url = `http://127.0.0.1:${address.port}/body-limit`
  })

  afterAll(() => {
    server?.close()
  })

  it('should accept chunked request without Content-Length when overrideGlobalObjects is false', async () => {
    const chunked = await fetch(url, {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('hello'))
          controller.close()
        },
      }),
      // @ts-expect-error duplex is required in node fetch for streaming body
      duplex: 'half',
    })

    expect(chunked.status).toBe(200)
    expect(await chunked.text()).toBe('ok 5')
  })
})

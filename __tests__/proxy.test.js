const transportProxy = require('../dist/index')
const request = require('request-promise')

const TEST_HTTP_DOMAIN = 'http://www.qq.com'
const TEST_HTTPS_DOMAIN = 'https://www.qq.com'
const PROXY_HOST = '127.0.0.1'
const PROXY_PORT = 8888

describe('Node Transport Proxy Test[Through Proxy]', () => {
  const proxyClient = transportProxy({
    host: PROXY_HOST,
    port: PROXY_PORT,
    proxy: process.env.http_proxy
  })

  test('http-test', async () => {
    const res = await request({
      method: 'GET',
      url: TEST_HTTP_DOMAIN,
      proxy: `http://${PROXY_HOST}:${PROXY_PORT}`,
      resolveWithFullResponse: true
    })
    expect(res.toJSON().statusCode).toBe(200)
  }, 5000)
  test('https-test', async () => {
    const res = await request({
      method: 'GET',
      url: TEST_HTTPS_DOMAIN,
      proxy: `http://${PROXY_HOST}:${PROXY_PORT}`,
      resolveWithFullResponse: true
    })
    expect(res.toJSON().statusCode).toBe(200)
  }, 5000)

  afterAll(async () => {
    setTimeout(proxyClient.close.bind(proxyClient), 0)
  })
})

// external depend
import * as http from 'http'
import * as url from 'url'
import * as net from 'net'

// internal depend
import Logger from './lib/logger'

const noop = function() {}

/**环境变量 */
const env = process.env
const envProxy =
  env.http_proxy || env.https_proxy || env.HTTP_PROXY || env.HTTPS_PROXY || ''
const envProxyOpts = url.parse(envProxy)
const envProxyHost = envProxyOpts.hostname
const envProxyPort = envProxyOpts.port

/**协议规定 */
const resRawData =
  'HTTP/1.1 200 Connection Established\r\nproxy-agent: node-transport-proxy\r\n\r\n'

/**http */
const requestHandler = function(
  proxy: string,
  req: http.IncomingMessage,
  res: http.ServerResponse
) {
  const reqOpts = url.parse(req.url)
  let eventProxyOpts = url.parse(proxy || '')
  let options
  if (envProxy) {
    options = {
      host: eventProxyOpts.hostname || envProxyHost,
      port: eventProxyOpts.port || envProxyPort,
      path: `${reqOpts.protocol}//${reqOpts.hostname}${reqOpts.path}`,
      method: req.method,
      headers: req.headers
    }
  } else {
    options = {
      host: reqOpts.hostname,
      port: reqOpts.port || 80,
      path: reqOpts.path,
      method: req.method,
      headers: req.headers
    }
  }

  const proxyReq = http
    .request(options, function(proxyRes) {
      Logger.info(
        `[${proxyRes.statusCode}][${
          envProxy ? `Proxy by ${options.host}` : 'no-proxy'
        }] ${req.method} ${options.path}`
      )

      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    })
    .on('error', function(e) {
      Logger.error(e.message)
      res.end()
    })

  req.pipe(proxyReq)
}

/**ws/wss/https */
const connectHandler = function(
  proxy: string,
  req: http.IncomingMessage,
  cltSocket: net.Socket,
  head: Buffer
) {
  const reqOpts = url.parse(`https://${req.url}`)
  let eventProxyOpts = url.parse(proxy || '')
  let options
  if (envProxy) {
    options = {
      host: eventProxyOpts.hostname || envProxyHost,
      port: eventProxyOpts.port || envProxyPort,
      path: `${reqOpts.hostname}:${reqOpts.port}${reqOpts.path}`,
      method: 'CONNECT',
      headers: req.headers
    }
    http
      .request(options)
      .on(
        'connect',
        (proxyReq: http.IncomingMessage, proxyResSocket: net.Socket, head) => {
          Logger.info(
            `[${proxyReq.statusCode}][Proxy by ${options.host}] CONNECT ${
              options.path
            }`
          )
          proxyResSocket.on('error', errorHandler)
          if (proxyReq.statusCode !== 200) {
            Logger.error(`error: ${proxyReq.statusMessage}`)
          } else {
            cltSocket.write(resRawData)
            cltSocket.pipe(proxyResSocket).pipe(cltSocket)
          }
        }
      )
      .on('error', errorHandler)
      .end()
  } else {
    options = {
      host: reqOpts.hostname,
      port: reqOpts.port || 80,
      path: reqOpts.path,
      method: req.method,
      headers: req.headers
    }
    const proxyReqSocket = net
      .connect(
        +reqOpts.port || 80,
        reqOpts.hostname,
        () => {
          Logger.info(
            `[200][no-proxy] CONNECT ${reqOpts.hostname}:${reqOpts.port}${
              reqOpts.path
            }`
          )
          cltSocket.write(resRawData)
          cltSocket.pipe(proxyReqSocket).pipe(cltSocket)
        }
      )
      .on('error', errorHandler)
  }
}
const errorHandler = function(e: Error) {
  Logger.error(e.message)
  throw e.message
}
const listenCallback = function(host, port) {
  Logger.debug(`Transport Proxy has runner at [Host]: ${host} [Port]: ${port}`)
}

module.exports = ({ host, port, proxy }, callback?: Function) => {
  return http
    .createServer(requestHandler.bind(this, proxy))
    .listen(
      port,
      (callback&&callback.bind(null, host, port)) || listenCallback.bind(null, host, port)
    )
    .on('connect', connectHandler.bind(this, proxy))
    .on('error', errorHandler)
}

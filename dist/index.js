"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const url = require("url");
const net = require("net");
const logger_1 = require("./lib/logger");
const noop = function () { };
const env = process.env;
const envProxy = env.http_proxy || env.https_proxy || env.HTTP_PROXY || env.HTTPS_PROXY || '';
const envProxyOpts = url.parse(envProxy);
const envProxyHost = envProxyOpts.hostname;
const envProxyPort = envProxyOpts.port;
const resRawData = 'HTTP/1.1 200 Connection Established\r\nproxy-agent: node-transport-proxy\r\n\r\n';
const requestHandler = function (proxy, req, res) {
    const reqOpts = url.parse(req.url);
    let eventProxyOpts = url.parse(proxy || '');
    let options;
    if (envProxy) {
        options = {
            host: eventProxyOpts.hostname || envProxyHost,
            port: eventProxyOpts.port || envProxyPort,
            path: `${reqOpts.protocol}//${reqOpts.hostname}${reqOpts.path}`,
            method: req.method,
            headers: req.headers
        };
    }
    else {
        options = {
            host: reqOpts.hostname,
            port: reqOpts.port || 80,
            path: reqOpts.path,
            method: req.method,
            headers: req.headers
        };
    }
    const proxyReq = http
        .request(options, function (proxyRes) {
        logger_1.default.info(`[${proxyRes.statusCode}][${envProxy ? `Proxy by ${options.host}` : 'no-proxy'}] ${req.method} ${options.path}`);
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    })
        .on('error', function (e) {
        logger_1.default.error(e.message);
        res.end();
    });
    req.pipe(proxyReq);
};
const connectHandler = function (proxy, req, cltSocket, head) {
    const reqOpts = url.parse(`https://${req.url}`);
    let eventProxyOpts = url.parse(proxy || '');
    let options;
    if (envProxy) {
        options = {
            host: eventProxyOpts.hostname || envProxyHost,
            port: eventProxyOpts.port || envProxyPort,
            path: `${reqOpts.hostname}:${reqOpts.port}${reqOpts.path}`,
            method: 'CONNECT',
            headers: req.headers
        };
        http
            .request(options)
            .on('connect', (proxyReq, proxyResSocket, head) => {
            logger_1.default.info(`[${proxyReq.statusCode}][Proxy by ${options.host}] CONNECT ${options.path}`);
            proxyResSocket.on('error', errorHandler);
            if (proxyReq.statusCode !== 200) {
                logger_1.default.error(`error: ${proxyReq.statusMessage}`);
            }
            else {
                cltSocket.write(resRawData);
                cltSocket.pipe(proxyResSocket).pipe(cltSocket);
            }
        })
            .on('error', errorHandler)
            .end();
    }
    else {
        options = {
            host: reqOpts.hostname,
            port: reqOpts.port || 80,
            path: reqOpts.path,
            method: req.method,
            headers: req.headers
        };
        const proxyReqSocket = net
            .connect(+reqOpts.port || 80, reqOpts.hostname, () => {
            logger_1.default.info(`[200][no-proxy] CONNECT ${reqOpts.hostname}:${reqOpts.port}${reqOpts.path}`);
            cltSocket.write(resRawData);
            cltSocket.pipe(proxyReqSocket).pipe(cltSocket);
        })
            .on('error', errorHandler);
    }
};
const errorHandler = function (e) {
    logger_1.default.error(e.message);
    throw e.message;
};
const listenCallback = function (host, port) {
    logger_1.default.debug(`Transport Proxy has runner at [Host]: ${host} [Port]: ${port}`);
};
module.exports = ({ host, port, proxy }, callback) => {
    return http
        .createServer(requestHandler.bind(this, proxy))
        .listen(port, (callback && callback.bind(null, host, port)) || listenCallback.bind(null, host, port))
        .on('connect', connectHandler.bind(this, proxy))
        .on('error', errorHandler);
};

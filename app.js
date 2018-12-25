const transportProxy = require('./dist/index')

const env = process.env
transportProxy({
  host: env.host || 'localhost',
  port: env.port || 8888,
  proxy: env.proxy || ''
})

const colors = require('colors/safe')
const dayjs = require('dayjs')

colors.setTheme({
  info: 'green',
  warn: 'yellow',
  debug: 'cyan',
  error: 'red'
})

const levelMap = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

Object.freeze(levelMap)

function now() {
  return `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] `
}

class Logger {
  prefix
  levelMap
  level

  constructor(level = 2, prefix = '') {
    this.setLevel.call(this, level)
    this.prefix = prefix
    this.levelMap = levelMap
  }
  setLevel(level = 2) {
    return (this.level = level)
  }
  error(msg: string, pureText?: boolean): any {
    if (this.level >= levelMap['error']) {
      if (pureText) {
        return this.prefix + now() + colors['error'](msg)
      } else {
        console.log(this.prefix + now() + colors['error'](msg))
      }
    }
  }
  warn(msg: string, pureText?: boolean): any {
    if (this.level >= levelMap['warn']) {
      if (pureText) {
        return this.prefix + now() + colors['warn'](msg)
      } else {
        console.log(this.prefix + now() + colors['warn'](msg))
      }
    }
  }
  info(msg: string, pureText?: boolean): any {
    if (this.level >= levelMap['info']) {
      if (pureText) {
        return this.prefix + now() + colors['info'](msg)
      } else {
        console.log(this.prefix + now() + colors['info'](msg))
      }
    }
  }
  debug(msg: string, pureText?: boolean): any {
    if (this.level >= levelMap['debug']) {
      if (pureText) {
        return this.prefix + now() + colors['debug'](msg)
      } else {
        console.log(this.prefix + now() + colors['debug'](msg))
      }
    }
  }
  now(): string {
    return now()
  }
}
export default new Logger(3, '[Ntp Cli]')

#!/usr/bin/env node

// external depend
const program = require('commander')
const path = require('path')
const os = require('os')
const fs = require('fs')
const util = require('util')
const ora = require('ora')

// internal depend
const pkgJson = require('../package.json')
const { Logger } = require('./utils')
const { spawn, execSync } = require('child_process')

/**const */
const APP_DATA = path.join(os.homedir(), '.startingAppData')
const CACHE_NAME = 'ntp.cache'
const ERROR_NAME = 'ntp.error'
const CACHE_PATH = path.join(APP_DATA, CACHE_NAME)
const ERROR_FILE = path.join(APP_DATA, ERROR_NAME)

/**获取应用缓存 */
function getAppCache() {
  try {
    const appCache = fs.readFileSync(CACHE_PATH)
    return JSON.parse(appCache.toString('utf-8'))
  } catch (e) {
    return ''
  }
}

/**设置应用缓存 */
function setAppCache(pid, options) {
  let cacheOptions = {
    appPath: __filename,
    pid,
    options
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheOptions), {
    encoding: 'utf-8'
  })
}

/**设置应用缓存 */
function clearAppCache() {
  fs.writeFileSync(CACHE_PATH, '')
}

/**获取options */
function getOptions() {
  var options = {}
  Object.keys(program).forEach(function(name) {
    if (program.optionFor('--' + name)) {
      options[name] = program[name]
    }
  })

  return options
}

function isRunningByPid(pid) {
  try {
    // 检测不到进程状态会抛出异常
    const execRes = execSync(
      util.format(
        process.platform === 'win32'
          ? 'tasklist /fi "PID eq %s" | findstr /i "node.exe"'
          : 'ps -f -p %s | grep "node"',
        pid
      ),
      {
        timeout: 2000,
        detached: true,
        windowsHide: true
      }
    )
    return !!execRes.toString().trim()
  } catch (e) {
    return false
  }
}

function startCallback(options) {
  const spinner = ora({
    text: Logger.info('ntp is starting up...please wait \r\n', true)
  }).start()
  setTimeout(() => {
    const error = fs.readFileSync(ERROR_FILE, {
      encoding: 'utf-8'
    })
    if (error) {
      spinner.fail(Logger.error(error.toString('utf-8'), true))
    } else {
      spinner.succeed(showStatus(options, true))
    }
  }, 600)
}

/**启动程序 */
function startApp(options) {
  if (fs.existsSync(ERROR_FILE)) {
    fs.unlinkSync(ERROR_FILE)
  }
  const ps = spawn('node', [path.join(__dirname, '../', 'app.js')], {
    env: Object.assign({}, process.env, options),
    stdio: ['ignore', 'ignore', fs.openSync(ERROR_FILE, 'a+')],
    detached: true
  })

  setAppCache(ps.pid, options)
  startCallback(options) // 等错误信息先收集
  ps.unref() // 避免父进程等待子进程
}

/**暂停程序 */
function stopApp(pid) {
  process.kill(+pid)
  clearAppCache()
  Logger.info('ntp service has been killed.')
}

function showStatus({ host, port, proxy }, isSilent) {
  return Logger.info(
    `ntp has listening at [Host]: ${host} [Port]: ${port} ${
      proxy ? `(with proxy: ${proxy})` : ''
    }`,
    isSilent
  )
}

// 辅助信息
program
  .version(pkgJson.version)
  .description('简易的node透明代理')
  .usage('ntp <command> [options]')

// command
program
  .command('status')
  .description('获取当前运行的ntp状态')
  .action(() => {
    const appCache = getAppCache()
    if (appCache) {
      showStatus(appCache.options)
    } else {
      Logger.warn('There is no ntp backgroud service.')
    }
  })
program
  .command('start')
  .description('启动ntp后台程序')

  .action(() => {
    const options = getOptions()
    const appCache = getAppCache()
    if (!appCache) {
      startApp(options)
    } else {
      const isRunning = isRunningByPid(appCache.pid)
      if (isRunning) {
        showStatus(options)
      } else {
        clearAppCache()
        startApp(options)
      }
    }
  })
program
  .command('stop')
  .description('暂停ntp后台程序')
  .action(() => {
    const appCache = getAppCache()
    if (!appCache) {
      Logger.warn('There is no ntp backgroud service.')
    } else {
      const pid = appCache.pid
      stopApp(pid)
    }
  })
program
  .command('restart')
  .description('重启ntp后台程序')
  .action(() => {
    const options = getOptions()
    const appCache = getAppCache()
    if (!appCache) {
      Logger.warn('There is no ntp backgroud service.')
      startApp(options)
    } else {
      const pid = appCache.pid
      stopApp(pid)
      setTimeout(() => {
        startApp(options)
      }, 1000)
    }
  })

// options
program
  .option('-H, --host [host]', 'ntp监听的host', String, '127.0.0.1')
  .option('-p, --port [port]', 'ntp监听的端口', String, '8888')
  .option('-x, --proxy [proxy]', 'ntp使用的代理', String, undefined)

// no command
if (!process.argv.slice(2).length) {
  program.outputHelp(txt => {
    return txt
  })
}

// error on unknown commands
program.on('command:*', function() {
  console.warn(
    'Invalid command: %s\nSee --help for a list of available commands.',
    program.args.join(' ')
  )

  program.outputHelp(txt => {
    return txt
  })
})

program.parse(process.argv)

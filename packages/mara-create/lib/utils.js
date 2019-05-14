const os = require('os')
const dns = require('dns')
const tmp = require('tmp')
const url = require('url')
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const semver = require('semver')
const execa = require('execa')
const hyperquest = require('hyperquest')
const unpack = require('tar-pack').unpack
const execSync = execa.shellSync

function checkNodeVersion(packageJsonPath) {
  if (!fs.existsSync(packageJsonPath)) return

  const packageJson = require(packageJsonPath)
  if (!packageJson.engines || !packageJson.engines.node) return

  const currentNodeVersion = process.version
  const requiredVersion = packageJson.engines.node

  if (!semver.satisfies(currentNodeVersion, requiredVersion)) {
    console.error(
      chalk.red(
        'You are running Node %s.\n' +
          '@mara/create requires Node %s or higher. \n' +
          'Please update your version of Node.'
      ),
      currentNodeVersion,
      requiredVersion
    )
    process.exit(1)
  }
}

function getInstallPackage(version, originalDirectory) {
  let packageToInstall = '@mara/x'
  const validSemver = semver.valid(version)

  if (validSemver) {
    packageToInstall += `@${validSemver}`
  } else if (version) {
    if (version[0] === '@' && version.indexOf('/') === -1) {
      // version tag
      packageToInstall += version
    } else if (version.match(/^file:/)) {
      // local file
      packageToInstall = `file:${path.resolve(
        originalDirectory,
        version.match(/^file:(.*)?$/)[1]
      )}`
    } else {
      // for tar.gz or alternative paths
      packageToInstall = version
    }
  }

  return packageToInstall
}

function executeNodeScript({ cwd, args }, data, source) {
  return new Promise((resolve, reject) => {
    const child = execa(
      process.execPath,
      [...args, '-e', source, '--', JSON.stringify(data)],
      { cwd, stdio: 'inherit' }
    )

    child.on('close', code => {
      if (code !== 0) {
        reject({
          command: `node ${args.join(' ')}`
        })
        return
      }
      resolve()
    })
  })
}

function checkIfOnline(useYarn) {
  if (!useYarn) {
    // Don't ping the Yarn registry.
    // We'll just assume the best case.
    return Promise.resolve(true)
  }

  return new Promise(resolve => {
    dns.lookup('registry.npm.taobao.org', err => {
      let proxy

      if (err != null && (proxy = getProxy())) {
        // If a proxy is defined, we likely can't resolve external hostnames.
        // Try to resolve the proxy name as an indication of a connection.
        dns.lookup(url.parse(proxy).hostname, proxyErr => {
          resolve(proxyErr == null)
        })
      } else {
        resolve(err == null)
      }
    })
  })
}

function getProxy() {
  if (process.env.https_proxy) {
    return process.env.https_proxy
  } else {
    try {
      // Trying to read https-proxy from .npmrc
      let httpsProxy = execSync('npm config get https-proxy')
        .toString()
        .trim()
      return httpsProxy !== 'null' ? httpsProxy : undefined
    } catch (e) {
      return
    }
  }
}

function checkYarnVersion() {
  let hasMinYarnPnp = false
  let yarnVersion = null

  try {
    yarnVersion = execSync('yarnpkg --version')
      .toString()
      .trim()
    let trimmedYarnVersion = /^(.+?)[-+].+$/.exec(yarnVersion)

    if (trimmedYarnVersion) {
      trimmedYarnVersion = trimmedYarnVersion.pop()
    }

    hasMinYarnPnp = semver.gte(trimmedYarnVersion || yarnVersion, '1.12.0')
  } catch (err) {
    // ignore
  }

  return {
    hasMinYarnPnp: hasMinYarnPnp,
    yarnVersion: yarnVersion
  }
}

function extractStream(stream, dest) {
  return new Promise((resolve, reject) => {
    stream.pipe(
      unpack(dest, err => {
        if (err) {
          reject(err)
        } else {
          resolve(dest)
        }
      })
    )
  })
}

function getTemporaryDirectory() {
  return new Promise((resolve, reject) => {
    // Unsafe cleanup lets us recursively delete the directory if it contains
    // contents; by default it only allows removal if it's empty
    tmp.dir({ unsafeCleanup: true }, (err, tmpdir, callback) => {
      if (err) {
        reject(err)
      } else {
        resolve({
          tmpdir: tmpdir,
          cleanup: () => {
            try {
              callback()
            } catch (ignored) {
              // Callback might throw and fail, since it's a temp directory the
              // OS will clean it up eventually...
            }
          }
        })
      }
    })
  })
}

// Extract package name from tarball url or path.
function getPackageName(installPackage) {
  if (installPackage.match(/^.+\.(tgz|tar\.gz)$/)) {
    return getTemporaryDirectory()
      .then(obj => {
        let stream

        if (/^http/.test(installPackage)) {
          stream = hyperquest(installPackage)
        } else {
          stream = fs.createReadStream(installPackage)
        }

        return extractStream(stream, obj.tmpdir).then(() => obj)
      })
      .then(obj => {
        const packageName = require(path.join(obj.tmpdir, 'package.json')).name
        obj.cleanup()

        return packageName
      })
      .catch(err => {
        // The package name could be with or without semver version, e.g. react-scripts-0.2.0-alpha.1.tgz
        // However, this function returns package name only without semver version.
        console.log(
          `Could not extract the package name from the archive: ${err.message}`
        )
        const assumedProjectName = installPackage.match(
          /^.+\/(.+?)(?:-\d+.+)?\.(tgz|tar\.gz)$/
        )[1]
        console.log(
          `Based on the filename, assuming it is "${chalk.cyan(
            assumedProjectName
          )}"`
        )

        return Promise.resolve(assumedProjectName)
      })
  } else if (installPackage.indexOf('git+') === 0) {
    // Pull package name out of git urls e.g:
    // git+https://github.com/mycompany/react-scripts.git
    // git+ssh://github.com/mycompany/react-scripts.git#v1.2.3
    return Promise.resolve(installPackage.match(/([^/]+)\.git(#.*)?$/)[1])
  } else if (installPackage.match(/.+@/)) {
    // Do not match @scope/ when stripping off @version or @tag
    return Promise.resolve(
      installPackage.charAt(0) + installPackage.substr(1).split('@')[0]
    )
  } else if (installPackage.match(/^file:/)) {
    const installPackagePath = installPackage.match(/^file:(.*)?$/)[1]
    const installPackageJson = require(path.join(
      installPackagePath,
      'package.json'
    ))

    return Promise.resolve(installPackageJson.name)
  }

  return Promise.resolve(installPackage)
}

function makeCaretRange(dependencies, name) {
  const version = dependencies[name]

  if (typeof version === 'undefined') {
    console.error(chalk.red(`Missing ${name} dependency in package.json`))
    process.exit(1)
  }

  let patchedVersion = `^${version}`

  if (!semver.validRange(patchedVersion)) {
    console.error(
      `Unable to patch ${name} dependency version because version ${chalk.red(
        version
      )} will become invalid ${chalk.red(patchedVersion)}`
    )
    patchedVersion = version
  }

  dependencies[name] = patchedVersion
}

// 标记版本范围
function setCaretRangeForRuntimeDeps(packageName) {
  const packagePath = path.join(process.cwd(), 'package.json')
  const packageJson = require(packagePath)

  if (typeof packageJson.dependencies === 'undefined') {
    console.error(chalk.red('Missing dependencies in package.json'))
    process.exit(1)
  }

  const packageVersion = packageJson.dependencies[packageName]
  if (typeof packageVersion === 'undefined') {
    console.error(chalk.red(`Unable to find ${packageName} in package.json`))
    process.exit(1)
  }

  makeCaretRange(packageJson.dependencies, 'vue')
  makeCaretRange(packageJson.dependencies, 'vue-template-compiler')

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + os.EOL)
}

function checkNpmInCmd() {
  const cwd = process.cwd()
  let childOutput = null

  try {
    // Note: intentionally using spawn over exec since
    // the problem doesn't reproduce otherwise.
    // `npm config list` is the only reliable way I could find
    // to reproduce the wrong path. Just printing process.cwd()
    // in a Node process was not enough.
    childOutput = execa.sync('npm', ['config', 'list']).output.join('')
  } catch (err) {
    // Something went wrong spawning node.
    // Not great, but it means we can't do this check.
    // We might fail later on, but let's continue.
    return true
  }

  if (typeof childOutput !== 'string') return true

  const lines = childOutput.split('\n')
  // `npm config list` output includes the following line:
  // "; cwd = C:\path\to\current\dir" (unquoted)
  // I couldn't find an easier way to get it.
  const prefix = '; cwd = '
  const line = lines.find(line => line.indexOf(prefix) === 0)

  if (typeof line !== 'string') {
    // Fail gracefully. They could remove it.
    return true
  }

  const npmCWD = line.substring(prefix.length)

  if (npmCWD === cwd) return true

  console.error(
    chalk.red(
      `Could not start an npm process in the right directory.\n\n` +
        `The current directory is: ${chalk.bold(cwd)}\n` +
        `However, a newly started npm process runs in: ${chalk.bold(
          npmCWD
        )}\n\n` +
        `This is probably caused by a misconfigured system terminal shell.`
    )
  )

  if (process.platform === 'win32') {
    console.error(
      chalk.red(`On Windows, this can usually be fixed by running:\n\n`) +
        `  ${chalk.cyan(
          'reg'
        )} delete "HKCU\\Software\\Microsoft\\Command Processor" /v AutoRun /f\n` +
        `  ${chalk.cyan(
          'reg'
        )} delete "HKLM\\Software\\Microsoft\\Command Processor" /v AutoRun /f\n\n` +
        chalk.red(`Try to run the above two lines in the terminal.\n`) +
        chalk.red(
          `To learn more about this problem, read: https://blogs.msdn.microsoft.com/oldnewthing/20071121-00/?p=24433/`
        )
    )
  }

  return false
}

// If project only contains files generated by Github, it’s safe.
// Also, if project contains remnant error logs from a previous
// installation, lets remove them now.
function isSafeToCreateProjectIn(root, name) {
  const validFiles = [
    '.DS_Store',
    'Thumbs.db',
    '.git',
    '.gitignore',
    'README.md',
    'LICENSE',
    '.hg',
    '.hgignore',
    '.hgcheck',
    '.npmignore',
    'mkdocs.yml',
    'docs',
    '.travis.yml',
    '.gitlab-ci.yml',
    '.gitattributes'
  ]
  // These files should be allowed to remain on a failed install,
  // but then silently removed during the next create.
  const errorLogFilePatterns = [
    'npm-debug.log',
    'yarn-error.log',
    'yarn-debug.log'
  ]

  console.log()

  const conflicts = fs
    .readdirSync(root)
    .filter(file => !validFiles.includes(file))
    // Don't treat log files from previous installation as conflicts
    .filter(
      file => !errorLogFilePatterns.some(pattern => file.indexOf(pattern) === 0)
    )

  if (conflicts.length > 0) {
    console.log(
      `The directory ${chalk.cyan(name)} contains files that could conflict:`
    )
    console.log()
    for (const file of conflicts) {
      console.log(chalk.red(`  ${file}`))
    }
    console.log()

    return false
  }

  // Remove any remnant files from a previous installation
  const currentFiles = fs.readdirSync(path.join(root))

  currentFiles.forEach(file => {
    errorLogFilePatterns.forEach(errorLogFilePattern => {
      // This will catch `(npm-debug|yarn-error|yarn-debug).log*` files
      if (file.indexOf(errorLogFilePattern) === 0) {
        fs.removeSync(path.join(root, file))
      }
    })
  })

  return true
}

function camelCase(split, name) {
  const toUpperCase = str => str.toUpperCase()
  const upperFirstChar = str => str.replace(/^[a-z]{1}/, toUpperCase)

  return name.split(split).reduce((res, cur) => res + upperFirstChar(cur))
}

module.exports = {
  camelCase,
  execSync,
  getProxy,
  getPackageName,
  getInstallPackage,
  setCaretRangeForRuntimeDeps,
  isSafeToCreateProjectIn,
  checkNpmInCmd,
  checkIfOnline,
  extractStream,
  checkYarnVersion,
  checkNodeVersion,
  executeNodeScript
}

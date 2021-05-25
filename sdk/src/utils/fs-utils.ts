import { promisify } from 'util'
import { dirname } from 'path'
import mkdirp from 'mkdirp'
import * as fs from 'fs'
import * as fsExtra from 'fs-extra'

import type { CancelToken } from '@avocode/cancel-token'

export async function checkFile(
  filename: string,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<boolean> {
  const stat = promisify(fs.stat)
  try {
    const stats = await stat(filename)
    options.cancelToken?.throwIfCancelled()

    return stats.isFile() && stats.size > 0
  } catch (err) {
    options.cancelToken?.throwIfCancelled()
    return false
  }
}

export async function readJsonFile(
  filename: string,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<unknown> {
  const readFile = promisify(fs.readFile)
  const json = await readFile(filename, 'utf8')
  options.cancelToken?.throwIfCancelled()

  return JSON.parse(json)
}

export async function writeJsonFile(
  filename: string,
  data: object,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<void> {
  await mkdirp(dirname(filename))
  options.cancelToken?.throwIfCancelled()

  const writeFile = promisify(fs.writeFile)
  const json = JSON.stringify(data)
  await writeFile(filename, json)
  options.cancelToken?.throwIfCancelled()
}

export function readFileStream(filename: string): fs.ReadStream {
  return fs.createReadStream(filename)
}

export async function readFileBlob(
  filename: string,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<Buffer> {
  const readFile = promisify(fs.readFile)
  const result = await readFile(filename)
  options.cancelToken?.throwIfCancelled()

  return result
}

export async function writeJsonFileStream(
  filename: string,
  dataStream: NodeJS.ReadableStream,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<void> {
  await mkdirp(dirname(filename))
  options.cancelToken?.throwIfCancelled()

  const writeStream = fs.createWriteStream(filename)

  return new Promise((resolve, reject) => {
    options.cancelToken?.onCancelled((reason: any) => {
      reject(reason)
      writeStream.close()
    })

    writeStream.once('close', resolve)
    writeStream.once('error', reject)
    dataStream.once('error', reject)

    dataStream.pipe(writeStream)
  })
}

export async function writeFileBlob(
  filename: string,
  blob: Buffer,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<void> {
  const writeFile = promisify(fs.writeFile)
  await writeFile(filename, blob)
  options.cancelToken?.throwIfCancelled()
}

export async function deleteFile(
  filename: string,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<void> {
  const unlink = promisify(fs.unlink)
  await unlink(filename)
  options.cancelToken?.throwIfCancelled()
}

export async function copyDirectory(
  prevDirname: string,
  nextDirname: string,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<void> {
  const copy = promisify(fsExtra.copy)
  await copy(prevDirname, nextDirname)
  options.cancelToken?.throwIfCancelled()
}

export async function moveDirectory(
  prevDirname: string,
  nextDirname: string,
  options: {
    cancelToken?: CancelToken | null
  } = {}
): Promise<void> {
  const rename = promisify(fs.rename)
  await rename(prevDirname, nextDirname)
  options.cancelToken?.throwIfCancelled()
}

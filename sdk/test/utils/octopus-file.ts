import { promisify } from 'util'
import * as fs from 'fs'
import mkdirp from 'mkdirp'

import { createTempFileTarget } from './temp-location'

import type {
  ArtboardId,
  OctopusDocument,
  ManifestData,
} from '@opendesign/octopus-reader'
import { basename, dirname } from 'path'

const writeFile = promisify(fs.writeFile)

export async function createOctopusFile(
  filePath: string
): Promise<{
  octopusFilename: string
  manifest: ManifestData
  artboardOctopuses: Record<ArtboardId, OctopusDocument>
  bitmapFilenames: Record<string, string>
  bitmapMapping: Record<string, string>
}> {
  const octopusFilename = await createTempFileTarget(filePath)
  await mkdirp(octopusFilename)

  const manifest: ManifestData = {
    'artboards': [
      {
        'artboard_original_id': 'a',
        'artboard_name': 'A',
        'failed': false,
        'url': 'https://example.com/octopus-a.json',
        'preview_url': null,
        'is_symbol': false,
      },
    ],
    'pages': null,
  }
  await writeFile(`${octopusFilename}/manifest.json`, JSON.stringify(manifest))

  const artboardOctopuses: Record<ArtboardId, OctopusDocument> = {
    'a': {
      'frame': { 'x': 0, 'y': 10 },
      'layers': [
        {
          'id': 'xx',
          'name': 'Xx',
          'type': 'layer',
          'bitmap': {
            'filename': 'https://example.com/images/xx.png',
          },
        },
        {
          'id': 'yy',
          'name': 'Yy',
          'type': 'layer',
          'bitmap': {
            'filename': 'https://example.com/images/yy.png',
          },
        },
        // prerendered bitmap
        {
          'id': 'zz',
          'name': 'Zz',
          'type': 'textLayer',
          'text': { 'value': 'Text zzz' },
          'bitmap': {
            'filename': 'https://example.com/images/zz.png',
          },
        },
        // bitmap mask
        {
          'id': 'mm',
          'name': 'Mm',
          'type': 'layer',
          'bitmapMask': {
            'filename': 'https://example.com/images/mask-mm.png',
          },
        },
      ],
    },
  }
  await mkdirp(`${octopusFilename}/artboards/a`)
  await writeFile(
    `${octopusFilename}/artboards/a/data.json`,
    JSON.stringify(artboardOctopuses['a'])
  )

  const bitmapFilenameEntries: Array<[string, string]> = [
    [
      'https://example.com/images/xx.png',
      `${octopusFilename}/bitmaps/mapped-xx.png`,
    ],
    [
      'https://example.com/images/yy.png',
      `${octopusFilename}/bitmaps/mapped-yy.png`,
    ],
    [
      'https://example.com/images/zz.png',
      `${octopusFilename}/bitmaps/prerendered/mapped-zz.png`,
    ],
    [
      'https://example.com/images/mask-mm.png',
      `${octopusFilename}/bitmaps/mapped-mask-mm.png`,
    ],
  ]
  const bitmapFilenames = Object.fromEntries(bitmapFilenameEntries)
  const bitmapMapping = Object.fromEntries(
    await Promise.all(
      bitmapFilenameEntries.map(async ([bitmapKey, bitmapFilename]) => {
        const bitmapBasename = basename(bitmapFilename)
        await writeBitmapFile(bitmapFilename)
        return [bitmapKey, bitmapBasename]
      })
    )
  )
  await writeFile(
    `${octopusFilename}/bitmaps.json`,
    JSON.stringify(bitmapMapping)
  )

  return {
    octopusFilename,
    manifest,
    artboardOctopuses,
    bitmapFilenames,
    bitmapMapping,
  }
}

async function writeBitmapFile(filename: string) {
  await mkdirp(dirname(filename))
  await writeFile(filename, 'fake-binary-data png')
}

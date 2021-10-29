import { deepStrictEqual, doesNotThrow, ok, strictEqual } from 'assert'
import { readdirSync, readFileSync, statSync, unlinkSync } from 'fs'

import { createOctopusFile } from '../utils/octopus-file'
import { createSdk } from '../utils/sdk'
import { createTempFileTarget } from '../utils/temp-location'

import {
  multiArtboardSketchFileFixture,
  singleArtboardSketchFileFixture,
  singleInlineArtboardPhotoshopFileFixture,
} from '../design-files/fixtures'

import type { OctopusDocument, ManifestData } from '@opendesign/octopus-reader'
import { ApiDesignInfo } from '../../src/local/local-design'

describe('DesignFacade', () => {
  describe('local files', () => {
    it('should return the manifest read from disk', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const { octopusFilename, manifest } = await createOctopusFile(
        'file.octopus'
      )
      const designFacade = await sdk.openOctopusFile(octopusFilename)

      deepStrictEqual(designFacade.getManifest(), manifest)
    })

    it('should return artboard octopus data read from disk', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const { octopusFilename, artboardOctopuses } = await createOctopusFile(
        'file.octopus'
      )
      const designFacade = await sdk.openOctopusFile(octopusFilename)

      const artboardFacade = designFacade.getArtboardById('a')
      ok(artboardFacade)
      deepStrictEqual(await artboardFacade.getContent(), artboardOctopuses['a'])
    })

    it('should save its manifest to a new location', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const {
        octopusFilename: originalFilename,
        manifest,
      } = await createOctopusFile('original.octopus')
      const designFacade = await sdk.openOctopusFile(originalFilename)

      const copyFilename = await createTempFileTarget('copy.octopus')
      await designFacade.saveOctopusFile({ filePath: copyFilename })

      deepStrictEqual(
        JSON.parse(readFileSync(`${copyFilename}/manifest.json`, 'utf8')),
        manifest
      )
    })

    it('should save its artboard octopus data to a new location', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const {
        octopusFilename: originalFilename,
        artboardOctopuses,
      } = await createOctopusFile('original.octopus')
      const designFacade = await sdk.openOctopusFile(originalFilename)

      const copyFilename = await createTempFileTarget('copy.octopus')
      await designFacade.saveOctopusFile({ filePath: copyFilename })

      deepStrictEqual(
        JSON.parse(
          readFileSync(`${copyFilename}/artboards/a/data.json`, 'utf8')
        ),
        artboardOctopuses['a']
      )
    })

    it('should save its bitmaps referenced via relative paths in octopus data to a new location', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const {
        octopusFilename: originalFilename,
        bitmapFilenames,
        bitmapMapping,
      } = await createOctopusFile('original.octopus')

      const designFacade = await sdk.openOctopusFile(originalFilename)

      const copyFilename = await createTempFileTarget('copy.octopus')
      await designFacade.saveOctopusFile({ filePath: copyFilename })

      deepStrictEqual(
        JSON.parse(readFileSync(`${copyFilename}/bitmaps.json`, 'utf8')),
        bitmapMapping
      )

      Object.entries(bitmapFilenames).forEach(
        ([_bitmapKey, bitmapFilename]) => {
          statSync(bitmapFilename)
        }
      )
    })

    it('should fail opening a non-existent octopus file', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const randomFilename = await createTempFileTarget('random-file.octopus')
      const [result] = await Promise.allSettled([
        sdk.openOctopusFile(randomFilename),
      ])
      strictEqual(result.status, 'rejected')
    })

    it('should fail opening an octopus file without the .octopus extension', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const { octopusFilename } = await createOctopusFile('file.random')
      const [result] = await Promise.allSettled([
        sdk.openOctopusFile(octopusFilename),
      ])
      strictEqual(result.status, 'rejected')
    })

    it('should fail opening an octopus file without a manifest', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const { octopusFilename } = await createOctopusFile('file.octopus')
      unlinkSync(`${octopusFilename}/manifest.json`)

      const [result] = await Promise.allSettled([
        sdk.openOctopusFile(octopusFilename),
      ])
      strictEqual(result.status, 'rejected')
    })
  })

  describe('design uploads', () => {
    it('should return contents of an uploaded design', async function () {
      const { sdk } = await createSdk({ designFiles: true, api: true })

      const designFacade = await sdk.importDesignFile(
        singleArtboardSketchFileFixture.filename
      )

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const artboardFacade = designFacade.findArtboard({
        name: fixtureArtboardDesc.name,
      })
      ok(artboardFacade)

      const octopus = await artboardFacade.getContent()
      strictEqual(octopus['bounds']?.['width'], fixtureArtboardDesc.width)
      strictEqual(octopus['bounds']?.['height'], fixtureArtboardDesc.height)
    })

    it('should list all bitmaps in an uploaded design', async function () {
      const { sdk } = await createSdk({ designFiles: true, api: true })

      const designFacade = await sdk.importDesignFile(
        multiArtboardSketchFileFixture.filename
      )

      const bitmapAssetDesc = await designFacade.getBitmapAssets()
      strictEqual(
        bitmapAssetDesc.length,
        multiArtboardSketchFileFixture.bitmapCount
      )
    })
  })

  describe('design downloading', () => {
    let designId: string
    let tokenFromBefore: string

    before(async function () {
      const { sdk, token } = await createSdk({
        designFiles: true,
        api: true,
      })
      ok(token)
      tokenFromBefore = token

      const designFacade = await sdk.importDesignFile(
        singleArtboardSketchFileFixture.filename
      )
      ok(designFacade.id)
      designId = designFacade.id
    })

    it('should return contents of an uploaded design', async function () {
      const { sdk } = await createSdk({ token: tokenFromBefore, api: true })
      const designFacade = await sdk.fetchDesignById(designId)

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const artboardFacade = designFacade.findArtboard({
        name: fixtureArtboardDesc.name,
      })
      ok(artboardFacade)

      const octopus = await artboardFacade.getContent()
      strictEqual(octopus['bounds']?.['width'], fixtureArtboardDesc.width)
      strictEqual(octopus['bounds']?.['height'], fixtureArtboardDesc.height)
    })

    it('should save contents of an uploaded design', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = await createTempFileTarget('file.octopus')
      await designFacade.saveOctopusFile({ filePath: filename })

      const manifest: ManifestData = JSON.parse(
        readFileSync(`${filename}/manifest.json`, 'utf8')
      )
      strictEqual(
        manifest['artboards'].length,
        singleArtboardSketchFileFixture.artboards.length
      )

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const octopus: OctopusDocument = JSON.parse(
        readFileSync(
          `${filename}/artboards/${fixtureArtboardDesc.id}/data.json`,
          'utf8'
        )
      )
      strictEqual(octopus['bounds']?.['width'], fixtureArtboardDesc.width)
      strictEqual(octopus['bounds']?.['height'], fixtureArtboardDesc.height)
    })

    it('should save info about the API design', async function () {
      const { sdk, apiRoot } = await createSdk({
        token: tokenFromBefore,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = await createTempFileTarget('file.octopus')
      await designFacade.saveOctopusFile({ filePath: filename })

      const apiDesignInfo: ApiDesignInfo = JSON.parse(
        readFileSync(`${filename}/api-design.json`, 'utf8')
      )
      deepStrictEqual(apiDesignInfo, { apiRoot, designId })
    })

    it('should cache the manifest of a fetched design in a local file', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = designFacade.octopusFilename
      ok(filename)

      const manifest: ManifestData = JSON.parse(
        readFileSync(`${filename}/manifest.json`, 'utf8')
      )
      strictEqual(
        manifest['artboards'].length,
        singleArtboardSketchFileFixture.artboards.length
      )
    })

    it('should cache artboard octopuses of a fetched design in a local file', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = designFacade.octopusFilename
      ok(filename)

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const artboardFacade = designFacade.getArtboardById(
        fixtureArtboardDesc.id
      )
      const artboardOctopus = await artboardFacade?.getContent()
      ok(artboardOctopus)

      const localOctopus: OctopusDocument = JSON.parse(
        readFileSync(
          `${filename}/artboards/${fixtureArtboardDesc.id}/data.json`,
          'utf8'
        )
      )
      deepStrictEqual(localOctopus, artboardOctopus)
    })

    it('should continue using the API design reference after reopening the cache', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)
      const filename = designFacade.octopusFilename
      ok(filename)

      const reopenedDesignFacade = await sdk.openOctopusFile(filename)

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const artboardFacade = reopenedDesignFacade.getArtboardById(
        fixtureArtboardDesc.id
      )
      const artboardOctopus = await artboardFacade?.getContent()
      ok(artboardOctopus)
    })
  })

  describe('asset downloading', () => {
    it('should download all bitmaps from an uploaded design', async function () {
      const { sdk } = await createSdk({
        designFiles: true,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.importDesignFile(
        multiArtboardSketchFileFixture.filename
      )

      const filename = designFacade.octopusFilename
      ok(filename)

      const bitmapAssetDescs = await designFacade.getBitmapAssets()
      await designFacade.downloadBitmapAssets(bitmapAssetDescs)

      doesNotThrow(() => {
        const bitmapBasenames = readdirSync(`${filename}/bitmaps`)
        strictEqual(
          bitmapBasenames.length,
          multiArtboardSketchFileFixture.bitmapCount
        )
      })
    })

    it('should download prerendered bitmaps from an uploaded design to a subdirectory', async function () {
      const { sdk } = await createSdk({
        designFiles: true,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.importDesignFile(
        singleInlineArtboardPhotoshopFileFixture.filename
      )

      const filename = designFacade.octopusFilename
      ok(filename)

      const bitmapAssetDescs = await designFacade.getBitmapAssets()
      await designFacade.downloadBitmapAssets(bitmapAssetDescs)

      doesNotThrow(() => {
        const bitmapBasenames = readdirSync(`${filename}/bitmaps/prerendered`)
        strictEqual(
          bitmapBasenames.length,
          singleInlineArtboardPhotoshopFileFixture.prerenderedBitmapCount
        )
      })
    })
  })

  describe('figma designs', () => {
    let designId: string
    let tokenFromBefore: string

    before(async function () {
      const { sdk, token } = await createSdk({ api: true })
      ok(token)
      tokenFromBefore = token

      const designFacade = await sdk.importFigmaDesign({
        figmaToken: process.env['E2E_FIGMA_TOKEN'] || null,
        figmaFileKey: process.env['E2E_FIGMA_FILE_KEY'] || '',
      })
      ok(designFacade.id)
      designId = designFacade.id
    })

    it('should save a Sketch export result file', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        designFiles: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = await createTempFileTarget('file.sketch')
      await designFacade.exportDesignFile(filename)

      doesNotThrow(() => {
        const stats = statSync(filename)
        ok(stats.isFile())
        ok(stats.size > 0)
      })
    })
  })

  describe('figma designs with immediate conversion', () => {
    it('should save a Sketch conversion result file', async function () {
      const { sdk } = await createSdk({ designFiles: true, api: true })

      const designFacade = await sdk.convertFigmaDesign({
        figmaToken: process.env['E2E_FIGMA_TOKEN'] || null,
        figmaFileKey: process.env['E2E_FIGMA_FILE_KEY'] || '',
        exports: [{ format: 'sketch' }],
      })

      const filename = await createTempFileTarget('file.sketch')
      await designFacade.exportDesignFile(filename)

      doesNotThrow(() => {
        const stats = statSync(filename)
        ok(stats.isFile())
        ok(stats.size > 0)
      })
    })
  })
})

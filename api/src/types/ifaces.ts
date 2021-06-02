import type { ManifestData } from '@opendesign/octopus-reader'
import type { CancelToken } from '@avocode/cancel-token'
import type { ReadStream } from 'fs'
import type { components } from 'open-design-api-types'

type ArtboardId = components['schemas']['ArtboardId']
type DesignData = components['schemas']['Design']
type DesignExportData = components['schemas']['DesignExport']
type DesignExportId = components['schemas']['DesignExportId']
type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']
type DesignSummary = components['schemas']['DesignSummary']
type DesignId = components['schemas']['DesignId']
type DesignImportFormatEnum = components['schemas']['DesignImportFormatEnum']
type DesignVersionId = components['schemas']['DesignVersionId']
type OctopusDocument = components['schemas']['OctopusDocument']

// Top-level API

export interface IOpenDesignApiModule {
  createOpenDesignApi(params: { token: string }): IOpenDesignApi
}

export interface IOpenDesignApi {
  getApiRoot(): string

  destroy(): void

  // Import

  importDesignFile(
    stream: ReadStream,
    options?: {
      designId?: DesignId | null
      format?: DesignImportFormatEnum
      cancelToken?: CancelToken | null
    }
  ): Promise<IApiDesign>

  importDesignLink(
    url: string,
    options?: {
      designId?: DesignId | null
      format?: DesignImportFormatEnum
      cancelToken?: CancelToken | null
    }
  ): Promise<IApiDesign>

  importFigmaDesignLink(params: {
    designId?: DesignId | null
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string> | null
    name?: string | null
    cancelToken?: CancelToken | null
  }): Promise<IApiDesign>

  importFigmaDesignLinkWithExports(params: {
    designId?: DesignId | null
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string> | null
    name?: string | null
    exports: Array<{ format: DesignExportTargetFormatEnum }>
    cancelToken?: CancelToken | null
  }): Promise<{
    designId: DesignId
    exports: Array<IApiDesignExport>
  }>

  // Designs

  // - Design Structure

  getDesignList(options: {
    cancelToken?: CancelToken | null
  }): Promise<Array<IApiDesign>>

  getDesignById(
    designId: DesignId,
    options?: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    }
  ): Promise<IApiDesign>

  // - Design Contents

  getDesignArtboardContent(
    designId: DesignId,
    artboardId: ArtboardId,
    options?: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    }
  ): Promise<OctopusDocument>

  getDesignArtboardContentJsonStream(
    designId: DesignId,
    artboardId: ArtboardId,
    options?: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    }
  ): Promise<NodeJS.ReadableStream>

  // - Design Exports

  exportDesign(
    designId: DesignId,
    params: {
      designVersionId?: DesignVersionId | null
      format: DesignExportTargetFormatEnum
      cancelToken?: CancelToken | null
    }
  ): Promise<IApiDesignExport>

  getDesignExportById(
    designId: DesignId,
    designExportId: DesignExportId,
    options?: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    }
  ): Promise<IApiDesignExport>

  getDesignExportResultStream(
    designId: DesignId,
    designExportId: DesignExportId,
    options?: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    }
  ): Promise<NodeJS.ReadableStream>
}

// Design-level API

export interface IApiDesign {
  readonly id: DesignData['id']
  readonly versionId: DesignVersionId
  readonly name: DesignData['name']
  readonly format: DesignData['format']
  readonly createdAt: DesignData['created_at']
  readonly completedAt: DesignData['completed_at']
  readonly status: DesignData['status']

  getApiRoot(): string

  getSummary(options?: {
    cancelToken?: CancelToken | null
  }): Promise<DesignSummary>
  getManifest(options?: {
    cancelToken?: CancelToken | null
  }): Promise<ManifestData>

  // Design Contents

  getArtboardContent(
    artboardId: ArtboardId,
    options?: {
      cancelToken?: CancelToken | null
    }
  ): Promise<OctopusDocument>

  getArtboardContentJsonStream(
    artboardId: ArtboardId,
    options?: {
      cancelToken?: CancelToken | null
    }
  ): Promise<NodeJS.ReadableStream>

  // Design Exports

  exportDesign(params: {
    format: DesignExportTargetFormatEnum
    cancelToken?: CancelToken | null
  }): Promise<IApiDesignExport>

  getDesignExportById(
    exportId: DesignExportId,
    options?: {
      cancelToken?: CancelToken | null
    }
  ): Promise<IApiDesignExport>

  getDesignExportResultStream(
    exportId: DesignExportId,
    options?: {
      cancelToken?: CancelToken | null
    }
  ): Promise<NodeJS.ReadableStream>

  getBitmapAssetStream(
    bitmapKey: string,
    options?: {
      cancelToken?: CancelToken | null
    }
  ): Promise<NodeJS.ReadableStream>
}

export interface IApiDesignExport {
  id: DesignExportData['id']
  status: DesignExportData['status']
  resultFormat: DesignExportData['result_format']
  resultUrl: DesignExportData['result_url']

  refresh(): Promise<IApiDesignExport>

  // Design Structure

  designId: DesignData['id']

  // Design Export Results

  getProcessedDesignExport(options?: {
    cancelToken?: CancelToken | null
  }): Promise<IApiDesignExport>

  getResultStream(options?: {
    cancelToken?: CancelToken | null
  }): Promise<NodeJS.ReadableStream>
}

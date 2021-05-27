import type { ArtboardId, LayerId } from './ids.type'

export type TextFontDescriptor = {
  /**
   * The postscript name of the font.
   *
   * This is the internal font name by which the font file is looked up in the font directory and the system.
   */
  fontPostScriptName: string

  /**
   * Whether the `fontPostScriptName` value had to be synthetically created from the font face name and its type name due to the actactual postscript name not being available.
   */
  fontPostScriptNameSynthetic: boolean

  /**
   * The needed types/weights of the font used.
   */
  fontTypes: Array<string>

  /**
   * A human-readable name of the font.
   *
   * This value is not always available.
   */
  fontName: string | null
}

export type FontDescriptor = TextFontDescriptor & {
  /**
   * The ID of the layer which uses the font.
   */
  layerId: LayerId
}

export type AggregatedFontDescriptor = {
  /**
   * The postscript name of the font.
   *
   * This is the internal font name by which the font file is looked up in the font directory and the system.
   */
  fontPostScriptName: string

  /**
   * Whether the `fontPostScriptName` value had to be synthetically created from the font face name and its type name due to the actactual postscript name not being available.
   */
  fontPostScriptNameSynthetic: boolean

  /**
   * The needed types/weights of the font used.
   */
  fontTypes: Array<string>

  /**
   * A human-readable name of the font.
   *
   * This value is not always available.
   */
  fontName: string | null

  /**
   * IDs of layers which use the font.
   */
  layerIds: Array<LayerId>
}

export type FileFontDescriptor = FontDescriptor & {
  /**
   * ID of the artboard containing the layer which uses the font.
   */
  artboardId: ArtboardId
}

export type AggregatedFileFontDescriptor = {
  /**
   * The postscript name of the font.
   *
   * This is the internal font name by which the font file is looked up in the font directory and the system.
   */
  fontPostScriptName: string

  /**
   * Whether the `fontPostScriptName` value had to be synthetically created from the font face name and its type name due to the actactual postscript name not being available.
   */
  fontPostScriptNameSynthetic: boolean

  /**
   * The needed types/weights of the font used.
   */
  fontTypes: Array<string>

  /**
   * A human-readable name of the font.
   *
   * This value is not always available.
   */
  fontName: string | null

  /**
   * IDs of layers which use the font grouped by their containing artboard.
   */
  artboardLayerIds: Record<ArtboardId, Array<LayerId>>
}

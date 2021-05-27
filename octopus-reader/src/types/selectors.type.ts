import type { ArtboardId, LayerId, PageId } from './ids.type'
import type { LayerOctopusData } from './octopus.type'

/**
 * An object used for looking up pages by various properties. Properties can be combined freely.
 * @category Page Lookup
 */
export type PageSelector = {
  /** A single page ID or a list of IDs for matching multiple pages. */
  id?: PageId | Array<PageId>
  /** An exact page name, a list of exact page names or a regular expression. This can always match multiple pages. */
  name?: string | Array<string> | RegExp
}

/**
 * An object used for looking up artboards by various properties. Properties can be combined freely.
 * @category Artboard Lookup
 */
export type ArtboardSelector = {
  /** A single artboard ID or a list of IDs for matching multiple artboards. */
  id?: ArtboardId | Array<ArtboardId>
  /** An exact artboard name, a list of exact artboard names or a regular expression. This can always match multiple artboards. */
  name?: string | Array<string> | RegExp
}

/**
 * An object used for looking up layers within an artboard by various properties. Properties can be combined freely.
 * @category Layer Lookup
 */
export type LayerSelector = {
  /** A single layer ID or a list of IDs for matching multiple layers. */
  id?: LayerId | Array<LayerId>

  /**
   * A single layer type or a list of layer types. This can always match multiple layers.
   *
   * See the [Octopus Format](https://opendesign.dev/docs/octopus-format#Layer) documentation for the possible values.
   */
  type?: LayerOctopusData['type'] | Array<LayerOctopusData['type']>

  /**
   * An exact layer name, a list of exact layer names or a regular expression. This can always match multiple layers.
   *
   * NOTE: `null` can be used to match layers without a name (which should not exist but it is theoretically possible from a data type perspective).
   */
  name?: string | null | Array<string | null> | RegExp

  /**
   * An exact text layer content, a list of exact text layer contents or a regular expression. This can always match multiple layers. Only text layers can be matched.
   */
  text?: string | Array<string> | RegExp

  /** A single bitmap asset name or a list of bitmap asset names. This can always match multiple layers. */
  bitmapAssetName?: string | Array<string>

  /** A single font postscript name or a list of font postscript names. This can always match multiple layers. Only text layers can be matched. */
  fontPostScriptName?: string | Array<string>

  /** Whether to only match visible or invisible layers. */
  visible?: boolean
}

/**
 * An object used for looking up layers within a design by various properties. Properties can be combined freely.
 * @category Layer Lookup
 */
export type DesignLayerSelector = {
  /** A single artboard ID or a list of IDs within which to search for layers. */
  artboardId?: ArtboardId | Array<ArtboardId>

  /** A single layer ID or a list of IDs for matching multiple layers. */
  id?: LayerId | Array<LayerId>

  /**
   * A single layer type or a list of layer types. This can always match multiple layers.
   *
   * See the [Octopus Format](https://opendesign.dev/docs/octopus-format#Layer) documentation for the possible values.
   */
  type?: LayerOctopusData['type'] | Array<LayerOctopusData['type']>

  /**
   * An exact layer name, a list of exact layer names or a regular expression. This can always match multiple layers.
   *
   * NOTE: `null` can be used to match layers without a name (which should not exist but it is theoretically possible from a data type perspective).
   */
  name?: string | null | Array<string | null> | RegExp

  /**
   * An exact text layer content, a list of exact text layer contents or a regular expression. This can always match multiple layers. Only text layers can be matched.
   */
  text?: string | Array<string> | RegExp

  /** A single bitmap asset name or a list of bitmap asset names. This can always match multiple layers. */
  bitmapAssetName?: string | Array<string>

  /** A single font postscript name or a list of font postscript names. This can always match multiple layers. Only text layers can be matched. */
  fontPostScriptName?: string | Array<string>

  /** Whether to only match visible or invisible layers. */
  visible?: boolean
}

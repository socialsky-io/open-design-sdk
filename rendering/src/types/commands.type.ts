export type LayerType =
  | 'layer'
  | 'shapeLayer'
  | 'groupLayer'
  | 'textLayer'
  | 'adjustmentLayer'

export type BlendingMode =
  | 'NORMAL'
  | 'BLEND_DIVIDE'
  | 'BLEND_SUBTRACTION'
  | 'COLOR'
  | 'COLOR_BURN'
  | 'COLOR_DODGE'
  | 'DARKEN'
  | 'DARKER_COLOR'
  | 'DIFFERENCE'
  | 'DISSOLVE'
  | 'EXCLUSION'
  | 'HARD_LIGHT'
  | 'HARD_MIX'
  | 'HUE'
  | 'LIGHTEN'
  | 'LIGHTER_COLOR'
  | 'LIGHTEN_BURN'
  | 'LIGHTEN_DODGE'
  | 'LIGHTEN_LIGHT'
  | 'LUMINOSITY'
  | 'MULTIPLY'
  | 'OVERLAY'
  | 'PASS_THROUGH'
  | 'PIN_LIGHT'
  | 'SATURATION'
  | 'SCREEN'
  | 'SOFT_LIGHT'
  | 'VIVID_LIGHT'

export type ClippingMode = string

export type LayerAttributes = {
  'visibility'?: 'default' | 'hide' | 'show' | 'force-show' // optional, supported values listed below
  'blend-mode'?: BlendingMode // optional
  'opacity'?: number // optional
  'draw-effects'?: boolean // optional
  'enable-clipping'?: boolean // optional
  'draw-background'?: boolean // optional
}

export type RenderingCommand =
  | { 'cmd': 'quit' }
  | {
      'cmd': 'load-octopus'
      'design'?: string // defaults to "$default" if omitted
      'assetpath'?: string | null // optional
      'fontpath'?: string | null // optional

      // oneof:
      'file'?: string
      'directory'?: string // optional
    }
  | {
      'cmd': 'load-design'
      'design'?: string // defaults to "$default" if omitted
      'directory': string
    }
  | { 'cmd': 'create-design'; 'design': string }
  | {
      'cmd': 'load-artboard'
      'design'?: string // defaults to "$last" if omitted
      'artboard'?: string
      'symbol'?: string // optional
      'offset'?: [number, number] // defaults to [0, 0] if omitted
      'page'?: string | null // optional
      'assetpath'?: string | null // optional
      'fontpath'?: string | null // optional

      // oneof:
      'file'?: string
      'directory'?: string
    }
  | {
      'cmd': 'get-artboard-dependencies'
      'design'?: string // defaults to "$last" if omitted
      'artboard'?: string // defaults to "$default" if omitted
    }
  | {
      'cmd': 'finalize-artboard'
      'design'?: string // defaults to "$last" if omitted
      'artboard'?: string // defaults to "$default" if omitted
    }
  | {
      'cmd': 'set-artboard-offset'
      'design'?: string
      'artboard'?: string
      'offset': [number, number]
    }
  | {
      'cmd': 'set-artboard-page'
      'design': string
      'artboard': string
      'page': string | null
    }
  | {
      'cmd': 'load-image'
      'design'?: string // defaults to "$last" if omitted
      'key'?: string // optional - defaults to basename of "file"
      'file': string
    }
  | {
      'cmd': 'load-font'
      'design'?: string // defaults to "$last" if omitted
      'key': string // postscript name
      'face-name'?: string // PostScript name of the face to load from the font file, if empty, the first (or the only) face from the file is loaded
      'file': string
    }
  | {
      'cmd': 'unload-artboard'
      'design': string
      'artboard': string
    }
  | { 'cmd': 'list-designs' }
  | {
      'cmd': 'list-artboards'
      'design'?: string // defaults to "$last" if omitted
    }
  | {
      'cmd': 'list-pages'
      'design'?: string // defaults to "$last" if omitted
    }
  | {
      'cmd': 'get-layer-tree'
      'design'?: string // defaults to "$last" if omitted
      'artboard'?: string // defaults to "$default" if omitted
      'layer'?: string // optional, will return subtree if specified
      'get-base'?: boolean // default = true
      'get-type'?: boolean // default = true
      'get-bounds'?: boolean // default = false
      'get-name'?: boolean // default = false
    }
  | {
      'cmd': 'get-artboard'
      'design'?: string // defaults to "$last" if omitted
      'artboard'?: string // defaults to "$default" if omitted
    }
  | {
      'cmd': 'get-layer'
      'design'?: string // defaults to "$last" if omitted
      'artboard': string
      'layer': string
    }
  | {
      'cmd': 'get-layer-shape'
      'design'?: string // defaults to "$last" if omitted
      'artboard': string
      'layer': string
    }
  | {
      'cmd': 'identify-layer'
      'design'?: string // defaults to "$last" if omitted
      'artboard': string
      'position': [number, number]
    }
  | {
      'cmd': 'identify-layers'
      'design'?: string // defaults to "$last" if omitted
      'artboard': string
      'bounds': [number, number, number, number]
      'policy': 'partial' | 'partial-external' | 'encompassing'
    }
  | {
      'cmd': 'render-design'
      'design'?: string // defaults to "$last" if omitted
      'scale'?: number // optional, default = 1.0
      'bounds'?: [number, number, number, number] // optional, whole design rendered if omitted

      // oneof:
      'file'?: string
      'image'?: string
    }
  | {
      'cmd': 'render-page'
      'design'?: string // defaults to "$last" if omitted
      'page': string
      'scale'?: number // optional, default = 1.0
      'bounds'?: [number, number, number, number] // optional, whole page rendered if omitted

      // oneof:
      'file'?: string
      'image'?: string
    }
  | {
      'cmd': 'render-artboard'
      'design'?: string // defaults to "$last" if omitted
      'artboard': string
      'scale'?: number // optional, default = 1.0
      'bounds'?: [number, number, number, number] // optional, whole artboard rendered if omitted

      // oneof:
      'file'?: string
      'image'?: string
    }
  | {
      'cmd': 'render-artboard-composition'
      'design'?: string // defaults to "$last" if omitted
      'artboard'?: string // defaults to "$default" if omitted
      'scale'?: number // optional, default = 1.0
      'bounds'?: [number, number, number, number] // optional, whole artboard rendered if omitted
      'background'?: {
        // optional
        'enable': boolean
        'color'?: [number, number, number, number] // optional, defaults to artboard's inherent background color
      }
      'draw-shown-only'?: boolean // optional, default = false
      'layer-attributes': Array<{ 'layer': string } & LayerAttributes>

      // oneof:
      'file'?: string
      'image'?: string
    }
  | ({
      'cmd': 'render-layer'
      'design'?: string // defaults to "$last" if omitted
      'artboard': string
      'layer': string
      'scale'?: number // optional, default = 1.0
      'bounds'?: [number, number, number, number] // optional, defaults to layer's full bounds

      // oneof:
      'file'?: string
      'image'?: string
    } & LayerAttributes)
  | { 'cmd': 'release-image'; 'image': string }
  | { 'cmd': 'get-image'; 'image': string }
  | {
      'cmd': 'resize-image'
      'image': string
      'output-image'?: string // optional, input image overwritten if omitted
      'dimensions': [number, number]
      'mode': 'stretch' | 'fill' | 'fit'
      'align'?: [number, number] // optional, For fill and fit, "align" dictates how the input will be cropped / positioned in the output. Use 0.0 for left/top, 1.0 for right/bottom, and 0.5 for center.
      'border-color': [number, number, number, number] // optional, The empty space when using mode="fit" is filled with "border-color" (transparent by default)
    }
  | {
      'cmd': 'trim-image'
      'image': string
      'output-image'?: string // optional, input image overwritten if omitted
    }
  | {
      'cmd': 'save-image'
      'image': string
      'file': string
    }
  | {
      'cmd': 'unload-design'
      'design': string
    }
  | {
      'cmd': 'unload-artboard'
      'design': string
      'artboard': string
    }

export type SuccessResult = { 'ok': true }
export type ErrorResult = { 'ok': false; 'error': string; 'message': string }

export type CommonResult = SuccessResult | ErrorResult

export type CommandResults = {
  // 'create-design': (SuccessResult & {
  // }) | ErrorResult

  'get-artboard-dependencies':
    | (SuccessResult & {
        'symbols': Array<string>
      })
    | ErrorResult

  'get-layer':
    | (SuccessResult & {
        'design': string
        'artboard': string
        'layer': string
        'base': string
        'type': LayerType
        'name': string
        'bounds': [number, number, number, number]
        'full-bounds': [number, number, number, number]
        'affected-bounds': [number, number, number, number]
        'logical-bounds': [number, number, number, number]
        'untransformed-bounds': [number, number, number, number]
        'visibility': boolean
        'blend-mode': BlendingMode
        'clipping-mode': ClippingMode
        'opacity': number
        'fill-opacity': number
      })
    | ErrorResult

  'identify-layer':
    | (SuccessResult & {
        'layer': string | null
      })
    | ErrorResult

  'identify-layers':
    | (SuccessResult & {
        'layers': Array<string>
      })
    | ErrorResult
}

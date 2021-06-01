import { Bitmap } from './bitmap'

import { memoize } from '../utils/memoize-utils'

import type { IBitmap } from '../types/bitmap.iface'
import type { IBitmapMask } from '../types/bitmap-mask.iface'
import type { Bounds } from '../types/octopus.type'

type BitmapMaskDescriptor = {
  'filename'?: string
  'bounds'?: Bounds
  'enabled'?: boolean
  'extendWithWhite'?: boolean
}

export class BitmapMask implements IBitmapMask {
  _bitmapMaskDesc: BitmapMaskDescriptor

  constructor(bitmapMaskDesc: BitmapMaskDescriptor) {
    this._bitmapMaskDesc = bitmapMaskDesc
  }

  getBitmap = memoize((): IBitmap | null => {
    return new Bitmap({
      'filename': this._bitmapMaskDesc['filename'],
      'bounds': this._bitmapMaskDesc['bounds'],
    })
  })

  isEnabled(): boolean {
    return this._bitmapMaskDesc['enabled'] !== false
  }

  isExtendedWithWhite(): boolean {
    return Boolean(this._bitmapMaskDesc['extendWithWhite'])
  }
}

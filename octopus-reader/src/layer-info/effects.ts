import { Bitmap } from '../layer-info/bitmap'

import { memoize } from '../utils/memoize-utils'

import type { IBitmap } from '../types/bitmap.iface'
import type {
  IEffects,
  IPatternBorderEffect,
  IPatternFillEffect,
} from '../types/effects.iface'
import type {
  LayerOctopusData,
  PatternBorderEffectOctopusData,
  PatternFillEffectOctopusData,
} from '../types/octopus.type'

export class Effects implements IEffects {
  readonly octopus: NonNullable<LayerOctopusData['effects']>

  constructor(effectsOctopusData: NonNullable<LayerOctopusData['effects']>) {
    this.octopus = effectsOctopusData
  }

  getPatternFills = memoize(
    (): Array<IPatternFillEffect> => {
      const patternFillDataList =
        this.octopus && this.octopus['fills']
          ? (this.octopus['fills'].filter((fillData) => {
              return 'pattern' in fillData && fillData['pattern']
            }) as Array<PatternFillEffectOctopusData>)
          : []

      return patternFillDataList.map((patternFillData) => {
        return new PatternFillEffect(patternFillData)
      })
    }
  )

  getPatternBorders = memoize(
    (): Array<IPatternBorderEffect> => {
      const patternBorderDataList =
        this.octopus && this.octopus['borders']
          ? (this.octopus['borders'].filter((borderData) => {
              return 'pattern' in borderData && borderData['pattern']
            }) as Array<PatternBorderEffectOctopusData>)
          : []

      return patternBorderDataList.map((patternBorderData) => {
        return new PatternBorderEffect(patternBorderData)
      })
    }
  )
}

export class PatternFillEffect implements IPatternFillEffect {
  readonly octopus: PatternFillEffectOctopusData

  _bitmap: IBitmap | null = null

  constructor(patternFillEffectDesc: PatternFillEffectOctopusData) {
    this.octopus = patternFillEffectDesc
  }

  getBitmap(): IBitmap | null {
    const bitmap =
      this._bitmap ||
      (this.octopus['pattern']['filename']
        ? new Bitmap({
            'filename': this.octopus['pattern']['filename'],
          })
        : null)

    this._bitmap = bitmap
    return bitmap
  }
}

export class PatternBorderEffect implements IPatternBorderEffect {
  readonly octopus: PatternBorderEffectOctopusData

  _bitmap: IBitmap | null = null

  constructor(patternBorderEffectDesc: PatternBorderEffectOctopusData) {
    this.octopus = patternBorderEffectDesc
  }

  getBitmap(): IBitmap | null {
    const bitmap =
      this._bitmap ||
      (this.octopus['pattern']['filename']
        ? new Bitmap({
            'filename': this.octopus['pattern']['filename'],
          })
        : null)

    this._bitmap = bitmap
    return bitmap
  }
}

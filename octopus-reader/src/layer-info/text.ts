import { memoize } from '../utils/memoize-utils'

import type { components } from 'open-design-api-types/typescript/octopus'
import type { TextFontDescriptor } from '../types/fonts.type'
import type { IText } from '../types/text.iface'

export class Text implements IText {
  readonly octopus: NonNullable<components['schemas']['TextLayer']['text']>

  constructor(
    textDesc: NonNullable<components['schemas']['TextLayer']['text']>
  ) {
    this.octopus = textDesc
  }

  getTextContent(): string {
    return this.octopus['value'] || ''
  }

  getFonts = memoize(
    (): Array<TextFontDescriptor> => {
      const styles = [
        this.octopus['defaultStyle'],
        ...(this.octopus['styles'] || []),
      ]

      const fontDescsByPostScriptName: {
        [postScriptName: string]: {
          types: Set<string>
          postScriptNameSynthetic: boolean
        }
      } = {}

      styles.forEach((style) => {
        const font = style ? style['font'] : null
        const postScriptName = font ? font['postScriptName'] : null
        if (font && postScriptName) {
          const types =
            fontDescsByPostScriptName[postScriptName]?.types || new Set()
          types.add(font['type'] || '')

          fontDescsByPostScriptName[postScriptName] = {
            types,
            postScriptNameSynthetic: Boolean(font['syntheticPostScriptName']),
          }
        }
      })

      return Object.keys(fontDescsByPostScriptName).map(
        (fontPostScriptName) => {
          const fontDesc = fontDescsByPostScriptName[fontPostScriptName] || {
            types: [],
            postScriptNameSynthetic: false,
          }
          return {
            fontPostScriptName,
            fontPostScriptNameSynthetic: fontDesc.postScriptNameSynthetic,
            fontTypes: [...fontDesc.types],
          }
        }
      )
    }
  )
}

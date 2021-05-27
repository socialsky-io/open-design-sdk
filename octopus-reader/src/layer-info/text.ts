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

      const fontTypeByPostScriptName: {
        [postScriptName: string]: Set<string>
      } = {}
      const syntheticPostScriptNames = new Set()

      styles.forEach((style) => {
        const font = style ? style['font'] : null
        const postScriptName = font ? font['postScriptName'] : null
        if (font && postScriptName) {
          const fontTypes =
            fontTypeByPostScriptName[postScriptName] || new Set()
          fontTypes.add(font['type'] || '')
          fontTypeByPostScriptName[postScriptName] = fontTypes

          if (font['syntheticPostScriptName']) {
            syntheticPostScriptNames.add(postScriptName)
          }
        }
      })

      return Object.keys(fontTypeByPostScriptName).map((fontPostScriptName) => {
        const fontTypes = fontTypeByPostScriptName[fontPostScriptName] || []
        return {
          fontPostScriptName,
          fontPostScriptNameSynthetic: syntheticPostScriptNames.has(
            fontPostScriptName
          ),
          fontTypes: [...fontTypes],
        }
      })
    }
  )
}

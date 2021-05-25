import type { IArtboard } from '../types/artboard.iface'
import type { ArtboardId } from '../types/ids.type'
import type { ArtboardSelector } from '../types/selectors.type'

export function matchArtboardId(
  selectorArtboardId: ArtboardId | Array<ArtboardId>,
  artboard: IArtboard
): boolean {
  return Array.isArray(selectorArtboardId)
    ? selectorArtboardId.some((enumId) => {
        return enumId === artboard.id
      })
    : selectorArtboardId === artboard.id
}

export function matchArtboardName(
  selectorArtboardName: string | Array<string> | RegExp,
  artboard: IArtboard
): boolean {
  const artboardName = artboard.name

  return Array.isArray(selectorArtboardName)
    ? selectorArtboardName.some((enumName) => {
        return enumName === artboardName
      })
    : selectorArtboardName instanceof RegExp
    ? artboardName !== null && Boolean(artboardName.match(selectorArtboardName))
    : selectorArtboardName === artboardName
}

export function matchArtboard(
  selector: ArtboardSelector,
  artboard: IArtboard
): boolean {
  return (
    (!('id' in selector) ||
      Boolean(selector['id'] && matchArtboardId(selector['id'], artboard))) &&
    (!('name' in selector) ||
      Boolean(
        selector['name'] && matchArtboardName(selector['name'], artboard)
      ))
  )
}

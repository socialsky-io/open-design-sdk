import type { PageId } from '../types/ids.type'
import type { IPage } from '../types/page.iface'
import type { PageSelector } from '../types/selectors.type'

export function matchPageId(
  selectorPageId: PageId | Array<PageId>,
  page: IPage
): boolean {
  return Array.isArray(selectorPageId)
    ? selectorPageId.some((enumId) => {
        return enumId === page.id
      })
    : selectorPageId === page.id
}

export function matchPageName(
  selectorPageName: string | Array<string> | RegExp,
  page: IPage
): boolean {
  const pageName = page.name

  return Array.isArray(selectorPageName)
    ? selectorPageName.some((enumName) => {
        return enumName === pageName
      })
    : selectorPageName instanceof RegExp
    ? pageName !== null && Boolean(pageName.match(selectorPageName))
    : selectorPageName === pageName
}

export function matchPage(selector: PageSelector, page: IPage): boolean {
  return (
    (!('id' in selector) ||
      Boolean(selector['id'] && matchPageId(selector['id'], page))) &&
    (!('name' in selector) ||
      Boolean(selector['name'] && matchPageName(selector['name'], page)))
  )
}

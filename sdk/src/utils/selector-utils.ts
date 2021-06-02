import { ILayer, LayerSelector } from '@opendesign/octopus-reader'
import { DesignFacade } from '../design-facade'
import { LayerFacade } from '../layer-facade'

export function createLayerEntitySelector<Selector extends LayerSelector>(
  designFacade: DesignFacade,
  selector: Selector | ((layer: LayerFacade) => boolean)
): Selector | ((layer: ILayer) => boolean) {
  if (typeof selector !== 'function') {
    return selector
  }

  return (layerEntity: ILayer) => {
    const artboardId = layerEntity.artboardId
    const layer = artboardId
      ? designFacade.getArtboardLayerFacade(artboardId, layerEntity.id)
      : null

    return Boolean(layer && selector(layer))
  }
}

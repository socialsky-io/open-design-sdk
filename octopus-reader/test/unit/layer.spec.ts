import { Artboard } from '../../src/nodes/artboard'
import { Layer } from '../../src/nodes/layer'

import { deepStrictEqual, ok, strictEqual, throws } from 'assert'
import { OctopusDocument, LayerOctopusData } from '../../src/types/octopus.type'

describe('Layer', () => {
  function createOctopus<T extends Partial<OctopusDocument>>(
    data: T
  ): OctopusDocument & T {
    const width = Math.round(Math.random() * 400)
    const height = Math.round(Math.random() * 400)

    return {
      'frame': {
        'x': Math.round(Math.random() * 400),
        'y': Math.round(Math.random() * 400),
      },
      'bounds': {
        'left': 0,
        'top': 0,
        'right': width,
        'bottom': height,
        'width': width,
        'height': height,
      },
      'layers': [],
      ...data,
    }
  }

  function createLayerOctopus<T extends Partial<LayerOctopusData>>(
    data: T
  ): LayerOctopusData {
    const id = String(Math.round(Math.random() * 400))
    const base = {
      'id': `layer-${id}`,
      'name': `Layer ID=${id}`,
      'type': 'layer',
    }
    const type = data['type'] || base['type']

    // @ts-expect-error Hard to generalize.
    return {
      ...base,
      ...(type === 'textLayer' ? { 'text:': {} } : {}),
      ...(type === 'groupLayer' ? { 'layers:': [] } : {}),
      ...data,
    }
  }

  describe('layer info', () => {
    it('should have the ID from octopus', () => {
      const layer = new Layer(createLayerOctopus({ 'id': 'a' }))

      strictEqual(layer.id, 'a')
    })

    it('should have the provided octopus', () => {
      const octopus = createLayerOctopus({ 'id': 'a' })
      const layer = new Layer({ ...octopus })

      deepStrictEqual(layer.octopus, octopus)
    })

    it('should have the name from octopus', () => {
      const layer = new Layer(createLayerOctopus({ 'id': 'a', 'name': 'Abc' }))

      strictEqual(layer.name, 'Abc')
    })

    it('should have the type from octopus', () => {
      const layer = new Layer(
        createLayerOctopus({ 'id': 'a', 'type': 'shapeLayer' })
      )

      strictEqual(layer.type, 'shapeLayer')
    })

    it('should return the provided artboard', () => {
      const artboard = new Artboard('x', createOctopus({}))
      const layer = new Layer(createLayerOctopus({ 'id': 'a' }), { artboard })

      strictEqual(layer.getArtboard(), artboard)
    })
  })

  describe('parent layer info', () => {
    it('should not return a parent layer ID when not parent layer ID is specified', () => {
      const layerOctopus = createLayerOctopus({ 'id': 'a' })
      const artboardOctopus = createOctopus({
        'layers': [layerOctopus],
      })

      const layer = new Layer(layerOctopus, {
        parentLayerId: null,
        artboard: new Artboard('x', artboardOctopus),
      })

      strictEqual(layer.getParentLayerId(), null)
    })

    it('should not return a parent layer ID when neither a parent layer ID is specified nor an artboard instance is provided', () => {
      const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
        parentLayerId: null,
        artboard: null,
      })

      strictEqual(layer.getParentLayerId(), null)
    })

    it('should return the specified parent layer ID', () => {
      const layerOctopus = createLayerOctopus({ 'id': 'a' })
      const artboardOctopus = createOctopus({
        'layers': [
          createLayerOctopus({
            'id': 'x',
            'layers': [
              createLayerOctopus({ 'id': 'b', 'layers': [layerOctopus] }),
            ],
          }),
        ],
      })

      const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
        parentLayerId: 'b',
        artboard: new Artboard('x', artboardOctopus),
      })

      strictEqual(layer.getParentLayerId(), 'b')
    })

    it('should return the specified parent layer ID even when an artboard instance is not provided', () => {
      const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
        parentLayerId: 'b',
        artboard: null,
      })

      strictEqual(layer.getParentLayerId(), 'b')
    })
  })

  describe('parent layers', () => {
    describe('parent layer lookup', () => {
      it('should not return a parent layer when no parent layer ID is not specified', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: null,
          artboard: new Artboard('x', artboardOctopus),
        })

        strictEqual(layer.getParentLayer(), null)
      })

      it('should not return a parent layer when neither a parent layer ID is specified nor an artboard instance is provided', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: null,
          artboard: null,
        })

        strictEqual(layer.getParentLayer(), null)
      })

      it('should fail on looking up the parent layer when a parent layer ID is specified without providing the artboard instance', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: 'b',
          artboard: null,
        })

        throws(() => {
          layer.getParentLayer()
        })
      })

      it('should fail on looking up the parent layer when the parent layer is not available on the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: 'b',
          artboard: new Artboard('x', artboardOctopus),
        })

        throws(() => {
          layer.getParentLayer()
        })
      })

      it('should return the parent layer from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'layers': [
                createLayerOctopus({ 'id': 'y', 'layers': [layerOctopus] }),
              ],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'y',
          artboard,
        })

        strictEqual(layer.getParentLayer(), artboard.getLayerById('y'))
      })
    })

    describe('parent layer chain lookup', () => {
      it('should not return any parent layers when no parent layer ID is not specified', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: null,
          artboard: new Artboard('x', artboardOctopus),
        })

        strictEqual(layer.getParentLayers().length, 0)
      })

      it('should not return any parent layers when neither a parent layer ID is specified nor an artboard instance is provided', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: null,
          artboard: null,
        })

        strictEqual(layer.getParentLayers().length, 0)
      })

      it('should fail on looking up parent layers when a parent layer ID is specified without providing the artboard instance', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: 'b',
          artboard: null,
        })

        throws(() => {
          layer.getParentLayers()
        })
      })

      it('should fail on looking up parent layers when the direct parent layer is not available on the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: 'b',
          artboard: new Artboard('x', artboardOctopus),
        })

        throws(() => {
          layer.getParentLayers()
        })
      })

      it('should return the parent layer chain from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'layers': [
                createLayerOctopus({ 'id': 'y', 'layers': [layerOctopus] }),
              ],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'y',
          artboard,
        })

        const parentLayers = layer.getParentLayers().getLayers()
        strictEqual(parentLayers.length, 2)
        strictEqual(parentLayers[0], artboard.getLayerById('y'))
        strictEqual(parentLayers[1], artboard.getLayerById('x'))
      })
    })

    describe('parent layer ID chain lookup', () => {
      it('should not return any parent layer IDs when no parent layer ID is not specified', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: null,
          artboard: new Artboard('x', artboardOctopus),
        })

        strictEqual(layer.getParentLayerIds().length, 0)
      })

      it('should not return any parent layer IDs when neither a parent layer ID is specified nor an artboard instance is provided', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: null,
          artboard: null,
        })

        strictEqual(layer.getParentLayerIds().length, 0)
      })

      it('should fail on looking up parent layer IDs when a parent layer ID is specified without providing the artboard instance', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: 'b',
          artboard: null,
        })

        throws(() => {
          layer.getParentLayerIds()
        })
      })

      it('should fail on looking up parent layer IDs when the direct parent layer is not available on the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: 'b',
          artboard: new Artboard('x', artboardOctopus),
        })

        throws(() => {
          layer.getParentLayerIds()
        })
      })

      it('should return the parent layer ID chain from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'layers': [
                createLayerOctopus({ 'id': 'y', 'layers': [layerOctopus] }),
              ],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'y',
          artboard,
        })

        const parentLayers = layer.getParentLayerIds()
        strictEqual(parentLayers.length, 2)
        strictEqual(parentLayers[0], 'y')
        strictEqual(parentLayers[1], 'x')
      })
    })

    describe('selector-based parent layer lookup', () => {
      it('should not return a parent layer when no parent layer ID is not specified', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'x', 'name': 'Layer X' }),
            createLayerOctopus({ 'id': 'y', 'name': 'Layer Y' }),
            layerOctopus,
          ],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: null,
          artboard: new Artboard('x', artboardOctopus),
        })

        strictEqual(layer.findParentLayer({ 'name': 'Layer X' }), null)
      })

      it('should not return any parent layer when neither a parent layer ID is specified nor an artboard instance is provided', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: null,
          artboard: null,
        })

        strictEqual(layer.findParentLayer({ 'name': 'Layer X' }), null)
      })

      it('should fail on looking up parent layer when a parent layer ID is specified without providing the artboard instance', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: 'b',
          artboard: null,
        })

        throws(() => {
          layer.findParentLayer({ 'name': 'Layer X' })
        })
      })

      it('should fail on looking up parent layer when the direct parent layer is not available on the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: 'b',
          artboard: new Artboard('x', artboardOctopus),
        })

        throws(() => {
          layer.findParentLayer({ 'name': 'Layer X' })
        })
      })

      it('should return the parent layer matching the selector from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'name': 'Layer X',
              'layers': [
                createLayerOctopus({
                  'id': 'y',
                  'name': 'Layer Y',
                  'layers': [layerOctopus],
                }),
              ],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'y',
          artboard,
        })

        strictEqual(
          layer.findParentLayer({ 'name': 'Layer X' }),
          artboard.getLayerById('x')
        )
      })

      it('should return the deepest parent layer matching the selector from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'name': 'ABC',
              'layers': [
                createLayerOctopus({
                  'id': 'y',
                  'name': 'ABC',
                  'layers': [layerOctopus],
                }),
              ],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'y',
          artboard,
        })

        strictEqual(
          layer.findParentLayer({ name: 'ABC' }),
          artboard.getLayerById('y')
        )
      })

      it('should not return a sibling layer matching the selector from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'name': 'Layer X',
              'layers': [
                layerOctopus,
                createLayerOctopus({
                  'id': 'y',
                  'name': 'Layer Y',
                }),
              ],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'x',
          artboard,
        })

        strictEqual(layer.findParentLayer({ 'name': 'Layer Y' }), null)
      })

      it('should not return a parent layer sibling layer matching the selector from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'name': 'Layer X',
              'layers': [layerOctopus],
            }),
            createLayerOctopus({
              'id': 'y',
              'name': 'Layer Y',
              'layers': [layerOctopus],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'x',
          artboard,
        })

        strictEqual(layer.findParentLayer({ 'name': 'Layer Y' }), null)
      })
    })

    describe('selector-based batch parent layer lookup', () => {
      it('should not return any parent layers when no parent layer ID is not specified', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'x', 'name': 'Layer X' }),
            createLayerOctopus({ 'id': 'y', 'name': 'Layer Y' }),
            layerOctopus,
          ],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: null,
          artboard: new Artboard('x', artboardOctopus),
        })

        strictEqual(layer.findParentLayers({ 'name': 'Layer X' }).length, 0)
      })

      it('should not return any parent layer when neither a parent layer ID is specified nor an artboard instance is provided', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: null,
          artboard: null,
        })

        strictEqual(layer.findParentLayers({ 'name': 'Layer X' }).length, 0)
      })

      it('should fail on looking up parent layer when a parent layer ID is specified without providing the artboard instance', () => {
        const layer = new Layer(createLayerOctopus({ 'id': 'a' }), {
          parentLayerId: 'b',
          artboard: null,
        })

        throws(() => {
          layer.findParentLayers({ 'name': 'Layer X' })
        })
      })

      it('should fail on looking up parent layer when the direct parent layer is not available on the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          parentLayerId: 'b',
          artboard: new Artboard('x', artboardOctopus),
        })

        throws(() => {
          layer.findParentLayers({ 'name': 'Layer X' })
        })
      })

      it('should return the parent layer matching the selector from the artboard instance sorted from the deepest layer up', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'name': 'ABC',
              'layers': [
                createLayerOctopus({
                  'id': 'y',
                  'name': 'XYZ',
                  'layers': [
                    createLayerOctopus({
                      'id': 'z',
                      'name': 'ABC',
                      'layers': [layerOctopus],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'z',
          artboard,
        })

        const parentLayers = layer.findParentLayers({ name: 'ABC' }).getLayers()
        strictEqual(parentLayers.length, 2)
        strictEqual(parentLayers[0], artboard.getLayerById('z'))
        strictEqual(parentLayers[1], artboard.getLayerById('x'))
      })

      it('should not return sibling layers matching the selector from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'name': 'Layer X',
              'layers': [
                layerOctopus,
                createLayerOctopus({
                  'id': 'y',
                  'name': 'Layer Y',
                }),
              ],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'x',
          artboard,
        })

        strictEqual(layer.findParentLayers({ 'name': 'Layer Y' }).length, 0)
      })

      it('should not return parent layer sibling layers matching the selector from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({ 'id': 'a' })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'x',
              'name': 'Layer X',
              'layers': [layerOctopus],
            }),
            createLayerOctopus({
              'id': 'y',
              'name': 'Layer Y',
              'layers': [layerOctopus],
            }),
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          parentLayerId: 'x',
          artboard,
        })

        strictEqual(layer.findParentLayers({ 'name': 'Layer Y' }).length, 0)
      })
    })
  })

  describe('nested layers', () => {
    describe('nested layer list', () => {
      it('should return the first-level nested layers', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({ 'id': 'b' }),
            createLayerOctopus({ 'id': 'c' }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers = layer.getNestedLayers().getLayers()
        strictEqual(nestedLayers.length, 2)
        ok(nestedLayers[0])
        ok(nestedLayers[1])
        strictEqual(nestedLayers[0].id, 'b')
        strictEqual(nestedLayers[1].id, 'c')
      })

      it('should return the same first-level nested layer list on multiple calls', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({ 'id': 'b' }),
            createLayerOctopus({ 'id': 'c' }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers1 = layer.getNestedLayers()
        const nestedLayers2 = layer.getNestedLayers()
        strictEqual(nestedLayers1, nestedLayers2)
      })

      it('should not return deeper-level nested layers by default', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'layers': [createLayerOctopus({ 'id': 'c' })],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers = layer.getNestedLayers().getLayers()
        strictEqual(nestedLayers.length, 1)
        ok(nestedLayers[0])
        strictEqual(nestedLayers[0].id, 'b')
      })

      it('should return the specified number of levels of nested layers', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'layers': [
                createLayerOctopus({
                  'id': 'c',
                  'layers': [createLayerOctopus({ 'id': 'd' })],
                }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers = layer.getNestedLayers({ depth: 2 }).getLayers()
        strictEqual(nestedLayers.length, 2)
        ok(nestedLayers[0])
        ok(nestedLayers[1])
        strictEqual(nestedLayers[0].id, 'b')
        strictEqual(nestedLayers[1].id, 'c')
      })

      it('should return the same multi-level nested layer list on multiple calls', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'layers': [createLayerOctopus({ 'id': 'c' })],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers1 = layer.getNestedLayers({ depth: 2 })
        const nestedLayers2 = layer.getNestedLayers({ depth: 2 })
        strictEqual(nestedLayers1, nestedLayers2)
      })
    })

    describe('nested layer lookup', () => {
      it('should look up a first-level nested layer by a selector', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
            createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
            createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
          ],
        })

        const layer = new Layer(layerOctopus)

        strictEqual(layer.findNestedLayer({ name: 'Layer C' })?.id, 'c')
      })

      it('should look up a deeper-level nested layer by a selector', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'layers': [
                createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                createLayerOctopus({ 'id': 'e', 'name': 'Layer E' }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        strictEqual(layer.findNestedLayer({ name: 'Layer C' })?.id, 'c')
      })

      it('should return a matching nested layer from any levels by default', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'name': 'Layer A',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'layers': [
                createLayerOctopus({
                  'id': 'c',
                  'name': 'Layer C',
                  'layers': [
                    createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                  ],
                }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        strictEqual(layer.findNestedLayer({ name: 'Layer D' })?.id, 'd')
      })

      it('should return a matching highest-level nested layer', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'name': 'Layer A',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'name': 'ABC',
              'layers': [
                createLayerOctopus({
                  'id': 'c',
                  'name': 'ABC',
                  'layers': [createLayerOctopus({ 'id': 'd', 'name': 'ABC' })],
                }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        strictEqual(layer.findNestedLayer({ name: 'ABC' })?.id, 'b')
      })

      it('should return a matching deeper-level nested layer listed in a layer which precedes a matching sibling layer', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'name': 'Layer A',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'layers': [
                createLayerOctopus({
                  'id': 'c',
                  'name': 'ABC',
                }),
              ],
            }),
            createLayerOctopus({ 'id': 'd', 'name': 'ABC' }),
          ],
        })

        const layer = new Layer(layerOctopus)

        strictEqual(layer.findNestedLayer({ name: 'ABC' })?.id, 'c')
      })

      it('should not return matching nested layers from levels deeper than the specified depth', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'name': 'Layer A',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'layers': [
                createLayerOctopus({
                  'id': 'c',
                  'name': 'Layer C',
                  'layers': [createLayerOctopus({ 'id': 'd', 'name': 'ABC' })],
                }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        strictEqual(layer.findNestedLayer({ name: 'ABC' }, { depth: 2 }), null)
      })
    })

    describe('batch nested layer lookup', () => {
      it('should look up first-level nested layers by a selector', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({ 'id': 'b', 'name': 'ABC' }),
            createLayerOctopus({ 'id': 'c', 'name': 'ABC' }),
            createLayerOctopus({ 'id': 'd', 'name': 'XYZ' }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers = layer.findNestedLayers({ name: 'ABC' }).getLayers()
        strictEqual(nestedLayers.length, 2)
        ok(nestedLayers[0])
        ok(nestedLayers[1])
        strictEqual(nestedLayers[0].id, 'b')
        strictEqual(nestedLayers[1].id, 'c')
      })

      it('should look up deeper-level nested layers by a selector', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'layers': [
                createLayerOctopus({ 'id': 'c', 'name': 'ABC' }),
                createLayerOctopus({ 'id': 'd', 'name': 'ABC' }),
                createLayerOctopus({ 'id': 'e', 'name': 'Layer E' }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers = layer.findNestedLayers({ name: 'ABC' }).getLayers()
        strictEqual(nestedLayers.length, 2)
        ok(nestedLayers[0])
        ok(nestedLayers[1])
        strictEqual(nestedLayers[0].id, 'c')
        strictEqual(nestedLayers[1].id, 'd')
      })

      it('should return matching nested layers from all levels by default', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({ 'id': 'b1', 'name': 'ABC' }),
            createLayerOctopus({
              'id': 'b2',
              'layers': [
                createLayerOctopus({ 'id': 'c1', 'name': 'ABC' }),
                createLayerOctopus({
                  'id': 'c2',
                  'layers': [createLayerOctopus({ 'id': 'd1', 'name': 'ABC' })],
                }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers = layer.findNestedLayers({ name: 'ABC' }).getLayers()
        strictEqual(nestedLayers.length, 3)
        ok(nestedLayers[0])
        ok(nestedLayers[1])
        ok(nestedLayers[2])
        strictEqual(nestedLayers[0].id, 'b1')
        strictEqual(nestedLayers[1].id, 'c1')
        strictEqual(nestedLayers[2].id, 'd1')
      })

      it('should not return matching nested layers containing matching deeper-level nested layers multiple times', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'name': 'ABC',
              'layers': [
                createLayerOctopus({
                  'id': 'c',
                  'name': 'ABC',
                  'layers': [createLayerOctopus({ 'id': 'd', 'name': 'ABC' })],
                }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers = layer.findNestedLayers({ name: 'ABC' }).getLayers()
        strictEqual(nestedLayers.length, 3)
        ok(nestedLayers[0])
        ok(nestedLayers[1])
        ok(nestedLayers[2])
        strictEqual(nestedLayers[0].id, 'b')
        strictEqual(nestedLayers[1].id, 'c')
        strictEqual(nestedLayers[2].id, 'd')
      })

      it('should not return matching nested layers from levels deeper than the specified depth', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'layers': [
            createLayerOctopus({
              'id': 'b',
              'name': 'ABC',
              'layers': [
                createLayerOctopus({
                  'id': 'c',
                  'name': 'ABC',
                  'layers': [createLayerOctopus({ 'id': 'd', 'name': 'ABC' })],
                }),
              ],
            }),
          ],
        })

        const layer = new Layer(layerOctopus)

        const nestedLayers = layer
          .findNestedLayers({ name: 'ABC' }, { depth: 2 })
          .getLayers()
        strictEqual(nestedLayers.length, 2)
        ok(nestedLayers[0])
        ok(nestedLayers[1])
        strictEqual(nestedLayers[0].id, 'b')
        strictEqual(nestedLayers[1].id, 'c')
      })
    })
  })

  describe('bitmap assets', () => {
    it('should return the main bitmap of a bitmap layer as a bitmap asset', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'layer',
          'bitmap': {
            'filename': 'a.png',
            'bounds': {
              'left': 10,
              'top': 20,
              'right': 110,
              'bottom': 220,
              'width': 100,
              'height': 200,
            },
          },
        })
      )

      const bitmapAssetDescs = layer.getBitmapAssets()
      strictEqual(bitmapAssetDescs.length, 1)
      deepStrictEqual(bitmapAssetDescs[0], {
        layerIds: ['a'],
        name: 'a.png',
        prerendered: false,
      })
    })

    it('should return the prerendered bitmap of a non-bitmap layer as a prerendered bitmap asset', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'shapeLayer',
          'bitmap': {
            'filename': 'a.png',
            'bounds': {
              'left': 10,
              'top': 20,
              'right': 110,
              'bottom': 220,
              'width': 100,
              'height': 200,
            },
          },
        })
      )

      const bitmapAssetDescs = layer.getBitmapAssets()
      strictEqual(bitmapAssetDescs.length, 1)
      deepStrictEqual(bitmapAssetDescs[0], {
        layerIds: ['a'],
        name: 'a.png',
        prerendered: true,
      })
    })

    it('should return pattern fill bitmaps as bitmap assets', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'shapeLayer',
          'effects': {
            'fills': [
              {
                'pattern': {
                  'filename': 'a.png',
                  'offset': { 'horizontal': 0, 'vertical': 0 },
                  'relativeTo': 'layer',
                  'type': 'fit',
                },
              },
              {
                'pattern': {
                  'filename': 'b.png',
                  'offset': { 'horizontal': 0, 'vertical': 0 },
                  'relativeTo': 'layer',
                  'type': 'fit',
                },
              },
            ],
          },
        })
      )

      const bitmapAssetDescs = layer.getBitmapAssets()
      strictEqual(bitmapAssetDescs.length, 2)
      deepStrictEqual(bitmapAssetDescs[0], {
        layerIds: ['a'],
        name: 'a.png',
        prerendered: false,
      })
      deepStrictEqual(bitmapAssetDescs[1], {
        layerIds: ['a'],
        name: 'b.png',
        prerendered: false,
      })
    })

    it('should return pattern border bitmaps as bitmap assets', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'shapeLayer',
          'effects': {
            'borders': [
              {
                'width': 2,
                'pattern': {
                  'filename': 'a.png',
                  'offset': { 'horizontal': 0, 'vertical': 0 },
                  'relativeTo': 'layer',
                  'type': 'fit',
                },
              },
              {
                'width': 2,
                'pattern': {
                  'filename': 'b.png',
                  'offset': { 'horizontal': 0, 'vertical': 0 },
                  'relativeTo': 'layer',
                  'type': 'fit',
                },
              },
            ],
          },
        })
      )

      const bitmapAssetDescs = layer.getBitmapAssets()
      strictEqual(bitmapAssetDescs.length, 2)
      deepStrictEqual(bitmapAssetDescs[0], {
        layerIds: ['a'],
        name: 'a.png',
        prerendered: false,
      })
      deepStrictEqual(bitmapAssetDescs[1], {
        layerIds: ['a'],
        name: 'b.png',
        prerendered: false,
      })
    })

    describe('nested layers', () => {
      it('should return the main bitmaps of nested bitmap layers as bitmap assets', () => {
        const layer = new Layer(
          createLayerOctopus({
            'id': 'a',
            'type': 'groupLayer',
            'layers': [
              createLayerOctopus({
                'id': 'b',
                'type': 'layer',
                'bitmap': {
                  'filename': 'a.png',
                  'bounds': {
                    'left': 10,
                    'top': 20,
                    'right': 110,
                    'bottom': 220,
                    'width': 100,
                    'height': 200,
                  },
                },
              }),
              createLayerOctopus({
                'id': 'c',
                'type': 'layer',
                'bitmap': {
                  'filename': 'b.png',
                  'bounds': {
                    'left': 10,
                    'top': 20,
                    'right': 110,
                    'bottom': 220,
                    'width': 100,
                    'height': 200,
                  },
                },
              }),
            ],
          })
        )

        const bitmapAssetDescs = layer.getBitmapAssets()
        strictEqual(bitmapAssetDescs.length, 2)
        deepStrictEqual(bitmapAssetDescs[0], {
          layerIds: ['b'],
          name: 'a.png',
          prerendered: false,
        })
        deepStrictEqual(bitmapAssetDescs[1], {
          layerIds: ['c'],
          name: 'b.png',
          prerendered: false,
        })
      })

      it('should return the main bitmaps of nested non-bitmap layers as bitmap assets', () => {
        const layer = new Layer(
          createLayerOctopus({
            'id': 'a',
            'type': 'groupLayer',
            'layers': [
              createLayerOctopus({
                'id': 'b',
                'type': 'shapeLayer',
                'bitmap': {
                  'filename': 'a.png',
                  'bounds': {
                    'left': 10,
                    'top': 20,
                    'right': 110,
                    'bottom': 220,
                    'width': 100,
                    'height': 200,
                  },
                },
              }),
              createLayerOctopus({
                'id': 'c',
                'type': 'shapeLayer',
                'bitmap': {
                  'filename': 'b.png',
                  'bounds': {
                    'left': 10,
                    'top': 20,
                    'right': 110,
                    'bottom': 220,
                    'width': 100,
                    'height': 200,
                  },
                },
              }),
            ],
          })
        )

        const bitmapAssetDescs = layer.getBitmapAssets()
        strictEqual(bitmapAssetDescs.length, 2)
        deepStrictEqual(bitmapAssetDescs[0], {
          layerIds: ['b'],
          name: 'a.png',
          prerendered: true,
        })
        deepStrictEqual(bitmapAssetDescs[1], {
          layerIds: ['c'],
          name: 'b.png',
          prerendered: true,
        })
      })

      it('should return pattern fill bitmaps in nested layers as bitmap assets', () => {
        const layer = new Layer(
          createLayerOctopus({
            'id': 'a',
            'type': 'groupLayer',
            'layers': [
              createLayerOctopus({
                'id': 'b',
                'type': 'shapeLayer',
                'effects': {
                  'fills': [
                    {
                      'pattern': {
                        'filename': 'a.png',
                        'offset': { 'horizontal': 0, 'vertical': 0 },
                        'relativeTo': 'layer',
                        'type': 'fit',
                      },
                    },
                    {
                      'pattern': {
                        'filename': 'b.png',
                        'offset': { 'horizontal': 0, 'vertical': 0 },
                        'relativeTo': 'layer',
                        'type': 'fit',
                      },
                    },
                  ],
                },
              }),
              createLayerOctopus({
                'id': 'c',
                'name': 'C',
                'type': 'shapeLayer',
                'effects': {
                  'fills': [
                    {
                      'pattern': {
                        'filename': 'c.png',
                        'offset': { 'horizontal': 0, 'vertical': 0 },
                        'relativeTo': 'layer',
                        'type': 'fit',
                      },
                    },
                  ],
                },
              }),
            ],
          })
        )

        const bitmapAssetDescs = layer.getBitmapAssets()
        strictEqual(bitmapAssetDescs.length, 3)
        deepStrictEqual(bitmapAssetDescs[0], {
          layerIds: ['b'],
          name: 'a.png',
          prerendered: false,
        })
        deepStrictEqual(bitmapAssetDescs[1], {
          layerIds: ['b'],
          name: 'b.png',
          prerendered: false,
        })
        deepStrictEqual(bitmapAssetDescs[2], {
          layerIds: ['c'],
          name: 'c.png',
          prerendered: false,
        })
      })

      it('should return pattern border bitmaps in nested layers as bitmap assets', () => {
        const layer = new Layer(
          createLayerOctopus({
            'id': 'a',
            'type': 'groupLayer',
            'layers': [
              createLayerOctopus({
                'id': 'b',
                'type': 'shapeLayer',
                'effects': {
                  'borders': [
                    {
                      'width': 2,
                      'pattern': {
                        'filename': 'a.png',
                        'offset': { 'horizontal': 0, 'vertical': 0 },
                        'relativeTo': 'layer',
                        'type': 'fit',
                      },
                    },
                    {
                      'width': 2,
                      'pattern': {
                        'filename': 'b.png',
                        'offset': { 'horizontal': 0, 'vertical': 0 },
                        'relativeTo': 'layer',
                        'type': 'fit',
                      },
                    },
                  ],
                },
              }),
              createLayerOctopus({
                'id': 'c',
                'type': 'shapeLayer',
                'effects': {
                  'borders': [
                    {
                      'width': 2,
                      'pattern': {
                        'filename': 'c.png',
                        'offset': { 'horizontal': 0, 'vertical': 0 },
                        'relativeTo': 'layer',
                        'type': 'fit',
                      },
                    },
                  ],
                },
              }),
            ],
          })
        )

        const bitmapAssetDescs = layer.getBitmapAssets()
        strictEqual(bitmapAssetDescs.length, 3)
        deepStrictEqual(bitmapAssetDescs[0], {
          layerIds: ['b'],
          name: 'a.png',
          prerendered: false,
        })
        deepStrictEqual(bitmapAssetDescs[1], {
          layerIds: ['b'],
          name: 'b.png',
          prerendered: false,
        })
        deepStrictEqual(bitmapAssetDescs[2], {
          layerIds: ['c'],
          name: 'c.png',
          prerendered: false,
        })
      })

      it('should not return bitmap assets from nested layers at levels deeper than the specified depth', () => {
        const layer = new Layer(
          createLayerOctopus({
            'id': 'a',
            'type': 'groupLayer',
            'layers': [
              createLayerOctopus({
                'id': 'b',
                'type': 'layer',
                'bitmap': {
                  'filename': 'a.png',
                  'bounds': {
                    'left': 10,
                    'top': 20,
                    'right': 110,
                    'bottom': 220,
                    'width': 100,
                    'height': 200,
                  },
                },
              }),
              createLayerOctopus({
                'id': 'c',
                'type': 'groupLayer',
                'layers': [
                  {
                    'id': 'd',
                    'name': 'D',
                    'type': 'layer',
                    'bitmap': {
                      'filename': 'b.png',
                      'bounds': {
                        'left': 10,
                        'top': 20,
                        'right': 110,
                        'bottom': 220,
                        'width': 100,
                        'height': 200,
                      },
                    },
                  },
                ],
              }),
            ],
          })
        )

        const bitmapAssetDescs = layer.getBitmapAssets({ depth: 2 })
        strictEqual(bitmapAssetDescs.length, 1)
        deepStrictEqual(bitmapAssetDescs[0], {
          layerIds: ['b'],
          name: 'a.png',
          prerendered: false,
        })
      })
    })
  })

  describe('fonts', () => {
    it('should return the default text style font', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'layer',
          'text': {
            'value': 'Oh my text',
            'defaultStyle': {
              'font': {
                'name': 'Abc',
                'type': 'Black',
                'postScriptName': 'PostAbc',
                'syntheticPostScriptName': false,
              },
            },
          },
        })
      )

      const fontDescs = layer.getFonts()
      strictEqual(fontDescs.length, 1)
      deepStrictEqual(fontDescs[0], {
        layerIds: ['a'],
        fontPostScriptName: 'PostAbc',
        fontPostScriptNameSynthetic: false,
        fontTypes: ['Black'],
      })
    })

    it('should flag synthetic default text style font postscript names', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'layer',
          'text': {
            'value': 'Oh my text',
            'defaultStyle': {
              'font': {
                'name': 'Abc',
                'type': 'Black',
                'postScriptName': 'PostAbc',
                'syntheticPostScriptName': true,
              },
            },
          },
        })
      )

      const fontDescs = layer.getFonts()
      strictEqual(fontDescs.length, 1)
      strictEqual(fontDescs[0]?.fontPostScriptNameSynthetic, true)
    })

    it('should return text range style fonts', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'textLayer',
          'text': {
            'value': 'Oh my text',
            'styles': [
              {
                'ranges': [{ 'from': 0, 'to': 10 }],
                'font': {
                  'name': 'Abc',
                  'type': 'Black',
                  'postScriptName': 'PostAbc',
                  'size': 10,
                },
              },
            ],
          },
        })
      )

      const fontDescs = layer.getFonts()
      strictEqual(fontDescs.length, 1)
      deepStrictEqual(fontDescs[0], {
        layerIds: ['a'],
        fontPostScriptName: 'PostAbc',
        fontPostScriptNameSynthetic: false,
        fontTypes: ['Black'],
      })
    })

    it('should flag synthetic text range style font postscript names', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'textLayer',
          'text': {
            'value': 'Oh my text',
            'styles': [
              {
                'ranges': [{ 'from': 0, 'to': 10 }],
                'font': {
                  'name': 'Abc',
                  'type': 'Black',
                  'postScriptName': 'PostAbc',
                  'syntheticPostScriptName': true,
                  'size': 10,
                },
              },
            ],
          },
        })
      )

      const fontDescs = layer.getFonts()
      strictEqual(fontDescs.length, 1)
      strictEqual(fontDescs[0]?.fontPostScriptNameSynthetic, true)
    })

    it('should merge multiple types of the same font into a single item', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'textLayer',
          'text': {
            'value': 'Oh my text',
            'styles': [
              {
                'ranges': [{ 'from': 0, 'to': 10 }],
                'font': {
                  'name': 'Abc',
                  'type': 'Black',
                  'postScriptName': 'PostAbc',
                  'size': 10,
                },
              },
              {
                'ranges': [{ 'from': 10, 'to': 20 }],
                'font': {
                  'name': 'Abc',
                  'type': 'Normal',
                  'postScriptName': 'PostAbc',
                  'size': 10,
                },
              },
            ],
          },
        })
      )

      const fontDescs = layer.getFonts()
      strictEqual(fontDescs.length, 1)
      deepStrictEqual(fontDescs[0], {
        layerIds: ['a'],
        fontPostScriptName: 'PostAbc',
        fontPostScriptNameSynthetic: false,
        fontTypes: ['Black', 'Normal'],
      })
    })

    describe('nested layers', () => {
      it('should return the default text style font from nested layers', () => {
        const layer = new Layer(
          createLayerOctopus({
            'id': 'a',
            'type': 'groupLayer',
            'layers': [
              createLayerOctopus({
                'id': 'b',
                'type': 'textLayer',
                'text': {
                  'value': 'Oh my text',
                  'defaultStyle': {
                    'font': {
                      'name': 'Abc',
                      'type': 'Black',
                      'postScriptName': 'PostAbc',
                      'syntheticPostScriptName': false,
                      'size': 10,
                    },
                  },
                },
              }),
            ],
          })
        )

        const fontDescs = layer.getFonts()
        strictEqual(fontDescs.length, 1)
        deepStrictEqual(fontDescs[0], {
          layerIds: ['b'],
          fontPostScriptName: 'PostAbc',
          fontPostScriptNameSynthetic: false,
          fontTypes: ['Black'],
        })
      })

      it('should return text range style fonts from nested layers', () => {
        const layer = new Layer(
          createLayerOctopus({
            'id': 'a',
            'type': 'groupLayer',
            'layers': [
              createLayerOctopus({
                'id': 'b',
                'name': 'B',
                'type': 'textLayer',
                'text': {
                  'value': 'Oh my text',
                  'styles': [
                    {
                      'ranges': [{ 'from': 0, 'to': 10 }],
                      'font': {
                        'name': 'Abc',
                        'type': 'Black',
                        'postScriptName': 'PostAbc',
                        'size': 10,
                      },
                    },
                  ],
                },
              }),
            ],
          })
        )

        const fontDescs = layer.getFonts()
        strictEqual(fontDescs.length, 1)
        deepStrictEqual(fontDescs[0], {
          layerIds: ['b'],
          fontPostScriptName: 'PostAbc',
          fontPostScriptNameSynthetic: false,
          fontTypes: ['Black'],
        })
      })
    })
  })

  describe('masks', () => {
    it('should claim it is masked when the clipped flag is set', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'layer',
          'clipped': true,
          'maskedBy': 'b',
        })
      )

      strictEqual(layer.isMasked(), true)
    })

    it('should claim it is not masked when the clipped flag is not set', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'layer',
          'clipped': false,
          'maskedBy': undefined,
        })
      )

      strictEqual(layer.isMasked(), false)
    })

    it('should return the mask layer from octopus', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'layer',
          'clipped': true,
          'maskedBy': 'b',
        })
      )

      strictEqual(layer.getMaskLayerId(), 'b')
    })

    it('should not return a mask layer ID when not set in octopus', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'type': 'layer',
          'clipped': false,
          'maskedBy': undefined,
        })
      )

      strictEqual(layer.getMaskLayerId(), null)
    })

    describe('mask layers', () => {
      it('should not return a mask layer when a mask layer is not set in octopus', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'clipped': false,
          'maskedBy': undefined,
        })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          artboard: new Artboard('x', artboardOctopus),
        })

        strictEqual(layer.getMaskLayer(), null)
      })

      it('should not return a mask layer when neither a mask layer is set in octopus nor an artboard instance is provided', () => {
        const layer = new Layer(
          createLayerOctopus({
            'id': 'a',
            'clipped': false,
            'maskedBy': undefined,
          }),
          {
            artboard: null,
          }
        )

        strictEqual(layer.getMaskLayer(), null)
      })

      it('should fail on looking up the mask layer when a mask layer ID is set in octopus without providing the artboard instance', () => {
        const layer = new Layer(
          createLayerOctopus({ 'id': 'a', 'clipped': true, 'maskedBy': 'b' }),
          {
            artboard: null,
          }
        )

        throws(() => {
          layer.getMaskLayer()
        })
      })

      it('should fail on looking up the mask layer when the mask layer is not available on the artboard instance', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'clipped': true,
          'maskedBy': 'b',
        })
        const artboardOctopus = createOctopus({
          'layers': [layerOctopus],
        })

        const layer = new Layer(layerOctopus, {
          artboard: new Artboard('x', artboardOctopus),
        })

        throws(() => {
          layer.getMaskLayer()
        })
      })

      it('should return the mask layer from the artboard instance', () => {
        const layerOctopus = createLayerOctopus({
          'id': 'a',
          'clipped': true,
          'maskedBy': 'b',
        })
        const artboardOctopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'b',
            }),
            layerOctopus,
          ],
        })

        const artboard = new Artboard('x', artboardOctopus)
        const layer = new Layer(layerOctopus, {
          artboard,
        })

        strictEqual(layer.getMaskLayer(), artboard.getLayerById('b'))
      })
    })
  })

  describe('components', () => {
    it('should claim it is a component instance when it has a symbol ID set in octopus', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'symbolID': 'x',
        })
      )

      strictEqual(layer.isComponentInstance(), true)
    })

    it('should claim it is a component instance when it has a document ID set in octopus', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'documentId': 'y',
        })
      )

      strictEqual(layer.isComponentInstance(), true)
    })

    it('should claim it is not a component instance when it has neither a symbol ID nor a document ID set in octopus', () => {
      const layer = new Layer(
        createLayerOctopus({
          'id': 'a',
          'symbolID': undefined,
          'documentId': undefined,
        })
      )

      strictEqual(layer.isComponentInstance(), false)
    })
  })
})

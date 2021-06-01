import { Artboard } from '../../src/nodes/artboard'
import { Design } from '../../src/nodes/design'

import { deepStrictEqual, ok, strictEqual } from 'assert'
import { OctopusDocument, LayerOctopusData } from '../../src/types/octopus.type'

describe('Artboard', () => {
  function createOctopus<T extends Partial<OctopusDocument>>(
    data: T
  ): OctopusDocument & T {
    return {
      'frame': {
        'x': Math.round(Math.random() * 400),
        'y': Math.round(Math.random() * 400),
      },
      'bounds': {
        'left': 0,
        'top': 0,
        'width': Math.round(Math.random() * 400),
        'height': Math.round(Math.random() * 400),
      },
      ...data,
    }
  }

  function createLayerOctopus<T extends Partial<LayerOctopusData>>(
    data: T
  ): LayerOctopusData & T {
    const id = String(Math.round(Math.random() * 400))
    return {
      'id': `layer-${id}`,
      'name': `Layer ID=${id}`,
      'type': 'layer',
      ...data,
    }
  }

  describe('artboard info', () => {
    it('should have the provided ID', () => {
      const artboard = new Artboard('a', createOctopus({}))

      strictEqual(artboard.id, 'a')
    })

    it('should have the provided octopus', () => {
      const octopus = createOctopus({})
      const artboard = new Artboard('a', { ...octopus })

      deepStrictEqual(artboard.getOctopus(), octopus)
    })

    it('should have the provided name', () => {
      const artboard = new Artboard('a', createOctopus({}), { name: 'Abc' })

      strictEqual(artboard.name, 'Abc')
    })

    it('should not have a name by default', () => {
      const artboard = new Artboard('a', createOctopus({}))

      strictEqual(artboard.name, null)
    })

    it('should have the provided page ID', () => {
      const artboard = new Artboard('a', createOctopus({}), { pageId: 'p1' })

      strictEqual(artboard.pageId, 'p1')
    })

    it('should not have a page ID by default', () => {
      const artboard = new Artboard('a', createOctopus({}))

      strictEqual(artboard.pageId, null)
    })

    it('should return the provided design', () => {
      const design = new Design()
      const artboard = new Artboard('a', createOctopus({}), { design })

      strictEqual(artboard.getDesign(), design)
    })
  })

  describe('layer lists', () => {
    it('should return a root layer list based on layers in octopus', () => {
      const octopus = createOctopus({
        'layers': [
          createLayerOctopus({ 'id': 'x' }),
          createLayerOctopus({ 'id': 'a' }),
          createLayerOctopus({ 'id': 'o' }),
        ],
      })
      const artboard = new Artboard('a', octopus)

      const rootLayers = artboard.getRootLayers().getLayers()

      strictEqual(rootLayers.length, 3)
      ok(rootLayers[0])
      ok(rootLayers[1])
      ok(rootLayers[2])
      strictEqual(rootLayers[0].id, 'x')
      strictEqual(rootLayers[1].id, 'a')
      strictEqual(rootLayers[2].id, 'o')
    })

    it('should return the same root layer list on multiple getter calls', () => {
      const octopus = createOctopus({
        'layers': [
          createLayerOctopus({}),
          createLayerOctopus({}),
          createLayerOctopus({}),
        ],
      })
      const artboard = new Artboard('a', octopus)

      const rootLayers1 = artboard.getRootLayers()
      const rootLayers2 = artboard.getRootLayers()
      strictEqual(rootLayers1, rootLayers2)
    })

    it('should return a flattened layer list based on layers in octopus', () => {
      const octopus = createOctopus({
        'layers': [
          createLayerOctopus({ 'id': 'a' }),
          createLayerOctopus({
            'id': 'b',
            'type': 'groupLayer',
            'layers': [createLayerOctopus({ 'id': 'a2' })],
          }),
          createLayerOctopus({
            'id': 'c',
            'type': 'groupLayer',
            'layers': [
              createLayerOctopus({ 'id': 'b2' }),
              createLayerOctopus({ 'id': 'c2' }),
            ],
          }),
        ],
      })
      const artboard = new Artboard('a', octopus)

      const flattenedLayers = artboard.getFlattenedLayers().getLayers()

      strictEqual(flattenedLayers.length, 6)
      strictEqual(flattenedLayers[0]?.id, 'a')
      strictEqual(flattenedLayers[1]?.id, 'b')
      strictEqual(flattenedLayers[2]?.id, 'a2')
      strictEqual(flattenedLayers[3]?.id, 'c')
      strictEqual(flattenedLayers[4]?.id, 'b2')
      strictEqual(flattenedLayers[5]?.id, 'c2')
    })

    it('should return the same flattened layer list on multiple getter calls', () => {
      const octopus = createOctopus({
        'layers': [
          createLayerOctopus({ 'id': 'a' }),
          createLayerOctopus({
            'id': 'b',
            'type': 'groupLayer',
            'layers': [createLayerOctopus({ 'id': 'c' })],
          }),
        ],
      })
      const artboard = new Artboard('a', octopus)

      const flattenedLayers1 = artboard.getFlattenedLayers()
      const flattenedLayers2 = artboard.getFlattenedLayers()
      strictEqual(flattenedLayers1, flattenedLayers2)
    })
  })

  describe('layer lookup', () => {
    describe('ID-based layer lookup', () => {
      it('should look up a root layer by ID', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a' }),
            createLayerOctopus({ 'id': 'b' }),
            createLayerOctopus({ 'id': 'c' }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(artboard.getLayerById('b')?.id, 'b')
      })

      it('should look up a first-level nested layer by ID', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a' }),
            createLayerOctopus({
              'id': 'b',
              'type': 'groupLayer',
              'layers': [createLayerOctopus({ 'id': 'c' })],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(artboard.getLayerById('c')?.id, 'c')
      })

      it('should look up a deeper-level nested layer by ID', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'a',
              'layers': [
                createLayerOctopus({
                  'id': 'b',
                  'type': 'groupLayer',
                  'layers': [createLayerOctopus({ 'id': 'c' })],
                }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(artboard.getLayerById('c')?.id, 'c')
      })
    })

    describe('selector-based individual layer lookup', () => {
      it('should look up a root layer by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
            createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(artboard.findLayer({ name: 'Layer B' })?.id, 'b')
      })

      it('should look up a first-level nested layer by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'type': 'groupLayer',
              'layers': [createLayerOctopus({ 'id': 'c', 'name': 'Layer C' })],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(artboard.findLayer({ name: 'Layer C' })?.id, 'c')
      })

      it('should look up a deeper-level nested layer by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'a',
              'name': 'Layer A',
              'layers': [
                createLayerOctopus({
                  'id': 'b',
                  'name': 'Layer B',
                  'type': 'groupLayer',
                  'layers': [
                    createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                  ],
                }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(artboard.findLayer({ name: 'Layer C' })?.id, 'c')
      })

      it('should look up a root layer by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
            createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(
          artboard.findLayer({ name: ['Layer C', 'Layer B'] })?.id,
          'b'
        )
      })

      it('should look up a first-level nested layer by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'type': 'groupLayer',
              'layers': [
                createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(
          artboard.findLayer({ name: ['Layer D', 'Layer C'] })?.id,
          'c'
        )
      })

      it('should look up a deeper-level nested layer by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'a',
              'name': 'Layer A',
              'layers': [
                createLayerOctopus({
                  'id': 'b',
                  'name': 'Layer B',
                  'type': 'groupLayer',
                  'layers': [
                    createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                    createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                  ],
                }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        strictEqual(
          artboard.findLayer({ name: ['Layer D', 'Layer C'] })?.id,
          'c'
        )
      })
    })

    describe('batch selector-based layer lookup', () => {
      it('should look up a root layer by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
            createLayerOctopus({ 'id': 'c', 'name': 'Layer A' }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersA = artboard.findLayers({ name: 'Layer A' })
        strictEqual(layersA.length, 2)
        strictEqual(layersA.getLayerById('a')?.id, 'a')
        strictEqual(layersA.getLayerById('c')?.id, 'c')
      })

      it('should look up first-level nested layers by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'type': 'groupLayer',
              'layers': [
                createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                createLayerOctopus({ 'id': 'e', 'name': 'Layer C' }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersC = artboard.findLayers({ name: 'Layer C' })
        strictEqual(layersC.length, 2)
        strictEqual(layersC.getLayerById('c')?.id, 'c')
        strictEqual(layersC.getLayerById('e')?.id, 'e')
      })

      it('should look up a deeper-level nested layer by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'a',
              'name': 'Layer A',
              'layers': [
                createLayerOctopus({
                  'id': 'b',
                  'name': 'Layer B',
                  'type': 'groupLayer',
                  'layers': [
                    createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                    createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                    createLayerOctopus({ 'id': 'e', 'name': 'Layer C' }),
                  ],
                }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersC = artboard.findLayers({ name: 'Layer C' })
        strictEqual(layersC.length, 2)
        strictEqual(layersC.getLayerById('c')?.id, 'c')
        strictEqual(layersC.getLayerById('e')?.id, 'e')
      })

      it('should look up root layers by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
            createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersAC = artboard.findLayers({ name: ['Layer C', 'Layer A'] })
        strictEqual(layersAC.length, 2)
        strictEqual(layersAC.getLayerById('a')?.id, 'a')
        strictEqual(layersAC.getLayerById('c')?.id, 'c')
      })

      it('should look up first-level nested layers by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'type': 'groupLayer',
              'layers': [
                createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                createLayerOctopus({ 'id': 'e', 'name': 'Layer E' }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersCD = artboard.findLayers({ name: ['Layer D', 'Layer C'] })
        strictEqual(layersCD.length, 2)
        strictEqual(layersCD.getLayerById('c')?.id, 'c')
        strictEqual(layersCD.getLayerById('d')?.id, 'd')
      })

      it('should look up deeper-level nested layers by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'a',
              'name': 'Layer A',
              'layers': [
                createLayerOctopus({
                  'id': 'b',
                  'name': 'Layer B',
                  'type': 'groupLayer',
                  'layers': [
                    createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                    createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                    createLayerOctopus({ 'id': 'e', 'name': 'Layer E' }),
                  ],
                }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersCD = artboard.findLayers({ name: ['Layer D', 'Layer C'] })
        strictEqual(layersCD.length, 2)
        strictEqual(layersCD.getLayerById('c')?.id, 'c')
        strictEqual(layersCD.getLayerById('d')?.id, 'd')
      })

      it('should not return duplicate results when both a group layer and layers nested within it are matched', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'a',
              'name': 'Layer A',
              'layers': [
                createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
                createLayerOctopus({ 'id': 'c', 'name': 'Layer A' }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersABC = artboard.findLayers({ id: ['a', 'b', 'c'] })
        strictEqual(layersABC.length, 3)
        strictEqual(layersABC.getLayerById('a')?.id, 'a')
        strictEqual(layersABC.getLayerById('b')?.id, 'b')
        strictEqual(layersABC.getLayerById('c')?.id, 'c')
      })
    })

    describe('batch bitmap asset name selector-based layer lookup', () => {
      it('should look up a root layer by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
            createLayerOctopus({ 'id': 'c', 'name': 'Layer A' }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersA = artboard.findLayers({ name: 'Layer A' })
        strictEqual(layersA.length, 2)
        strictEqual(layersA.getLayerById('a')?.id, 'a')
        strictEqual(layersA.getLayerById('c')?.id, 'c')
      })

      it('should look up first-level nested layers by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'type': 'groupLayer',
              'layers': [
                createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                createLayerOctopus({ 'id': 'e', 'name': 'Layer C' }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersC = artboard.findLayers({ name: 'Layer C' })
        strictEqual(layersC.length, 2)
        strictEqual(layersC.getLayerById('c')?.id, 'c')
        strictEqual(layersC.getLayerById('e')?.id, 'e')
      })

      it('should look up a deeper-level nested layer by an exact match selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'a',
              'name': 'Layer A',
              'layers': [
                createLayerOctopus({
                  'id': 'b',
                  'name': 'Layer B',
                  'type': 'groupLayer',
                  'layers': [
                    createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                    createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                    createLayerOctopus({ 'id': 'e', 'name': 'Layer C' }),
                  ],
                }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersC = artboard.findLayers({ name: 'Layer C' })
        strictEqual(layersC.length, 2)
        strictEqual(layersC.getLayerById('c')?.id, 'c')
        strictEqual(layersC.getLayerById('e')?.id, 'e')
      })

      it('should look up root layers by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
            createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersAC = artboard.findLayers({ name: ['Layer C', 'Layer A'] })
        strictEqual(layersAC.length, 2)
        strictEqual(layersAC.getLayerById('a')?.id, 'a')
        strictEqual(layersAC.getLayerById('c')?.id, 'c')
      })

      it('should look up first-level nested layers by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
            createLayerOctopus({
              'id': 'b',
              'name': 'Layer B',
              'type': 'groupLayer',
              'layers': [
                createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                createLayerOctopus({ 'id': 'e', 'name': 'Layer E' }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersCD = artboard.findLayers({ name: ['Layer D', 'Layer C'] })
        strictEqual(layersCD.length, 2)
        strictEqual(layersCD.getLayerById('c')?.id, 'c')
        strictEqual(layersCD.getLayerById('d')?.id, 'd')
      })

      it('should look up deeper-level nested layers by a list selector', () => {
        const octopus = createOctopus({
          'layers': [
            createLayerOctopus({
              'id': 'a',
              'name': 'Layer A',
              'layers': [
                createLayerOctopus({
                  'id': 'b',
                  'name': 'Layer B',
                  'type': 'groupLayer',
                  'layers': [
                    createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                    createLayerOctopus({ 'id': 'd', 'name': 'Layer D' }),
                    createLayerOctopus({ 'id': 'e', 'name': 'Layer E' }),
                  ],
                }),
              ],
            }),
          ],
        })
        const artboard = new Artboard('a', octopus)

        const layersCD = artboard.findLayers({ name: ['Layer D', 'Layer C'] })
        strictEqual(layersCD.length, 2)
        strictEqual(layersCD.getLayerById('c')?.id, 'c')
        strictEqual(layersCD.getLayerById('d')?.id, 'd')
      })
    })
  })

  describe('layer collection flattening', () => {
    it('should not return duplicate results when both a group layer and layers nested within it are matched', () => {
      const octopus = createOctopus({
        'layers': [
          createLayerOctopus({
            'id': 'a',
            'name': 'Layer A',
            'layers': [
              createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
              createLayerOctopus({ 'id': 'c', 'name': 'Layer A' }),
            ],
          }),
        ],
      })
      const artboard = new Artboard('a', octopus)

      const layersABC = artboard.findLayers({ id: ['a', 'b', 'c'] })
      const flattened = layersABC.flatten()
      strictEqual(flattened.length, 3)
      strictEqual(flattened.getLayerById('a')?.id, 'a')
      strictEqual(flattened.getLayerById('b')?.id, 'b')
      strictEqual(flattened.getLayerById('c')?.id, 'c')
    })
  })

  describe('layer depth info', () => {
    it('should return the depth of 0 for root layers', () => {
      const octopus = createOctopus({
        'layers': [
          createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
          createLayerOctopus({ 'id': 'b', 'name': 'Layer B' }),
          createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
        ],
      })
      const artboard = new Artboard('a', octopus)

      strictEqual(artboard.getLayerDepth('b'), 0)
    })

    it('should return the depth of 1 for first-level nested layers', () => {
      const octopus = createOctopus({
        'layers': [
          createLayerOctopus({ 'id': 'a', 'name': 'Layer A' }),
          createLayerOctopus({
            'id': 'b',
            'name': 'Layer B',
            'type': 'groupLayer',
            'layers': [createLayerOctopus({ 'id': 'c', 'name': 'Layer C' })],
          }),
        ],
      })
      const artboard = new Artboard('a', octopus)

      strictEqual(artboard.getLayerDepth('c'), 1)
    })

    it('should return depth for deeper-level nested layers', () => {
      const octopus = createOctopus({
        'layers': [
          createLayerOctopus({
            'id': 'a',
            'name': 'Layer A',
            'layers': [
              createLayerOctopus({
                'id': 'b',
                'name': 'Layer B',
                'type': 'groupLayer',
                'layers': [
                  createLayerOctopus({ 'id': 'c', 'name': 'Layer C' }),
                ],
              }),
            ],
          }),
        ],
      })
      const artboard = new Artboard('a', octopus)

      strictEqual(artboard.getLayerDepth('c'), 2)
    })
  })

  describe('artboard background', () => {
    it('should not return a background color when no color is specified in octopus', () => {
      const octopus = createOctopus({
        'hasBackgroundColor': false,
        'backgroundColor': undefined,
      })
      const artboard = new Artboard('a', octopus)

      strictEqual(artboard.getBackgroundColor(), null)
    })

    it('should not return the background color from octopus when the background color is disabled', () => {
      const octopus = createOctopus({
        'hasBackgroundColor': false,
        'backgroundColor': { 'r': 50, 'g': 150, 'b': 250, 'a': 1 },
      })
      const artboard = new Artboard('a', octopus)

      strictEqual(artboard.getBackgroundColor(), null)
    })

    it('should return the background color from octopus when the background color is enabled', () => {
      const octopus = createOctopus({
        'hasBackgroundColor': true,
        'backgroundColor': { 'r': 50, 'g': 150, 'b': 250, 'a': 1 },
      })
      const artboard = new Artboard('a', octopus)

      deepStrictEqual(artboard.getBackgroundColor(), {
        'r': 50,
        'g': 150,
        'b': 250,
        'a': 1,
      })
    })
  })

  describe('component artboards', () => {
    it('should claim the artboard is a component when it has a symbol ID in octopus', () => {
      const octopus = createOctopus({
        'symbolID': 'x',
      })
      const artboard = new Artboard('a', octopus)

      strictEqual(artboard.isComponent(), true)
    })

    it('should not claim the artboard is a component when it does not have a symbol ID in octopus', () => {
      const octopus = createOctopus({
        'symbolID': undefined,
      })
      const artboard = new Artboard('a', octopus)

      strictEqual(artboard.isComponent(), false)
    })
  })
})

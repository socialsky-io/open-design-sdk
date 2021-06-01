import { Design } from '../../src/nodes/design'

import { ok, strictEqual } from 'assert'

describe('Design', () => {
  function createOctopus() {
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
    }
  }

  it('should return an added artboard by ID', () => {
    const design = new Design()

    design.addArtboard('a', createOctopus())

    const artboard = design.getArtboardById('a')
    ok(artboard)
    strictEqual(artboard.id, 'a')
  })

  it('should not return a removed artboard by ID', () => {
    const design = new Design()

    design.addArtboard('a', createOctopus())
    design.removeArtboard('a')

    const artboard = design.getArtboardById('a')
    strictEqual(artboard, null)
  })

  describe('artboard list', () => {
    it('should return an empty artboard list by default', () => {
      const design = new Design()

      strictEqual(design.getArtboards().length, 0)
    })

    it('should include an added artboard in the artboard list', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus())

      const artboards = design.getArtboards()
      strictEqual(artboards.length, 1)
      ok(artboards[0])
      strictEqual(artboards[0].id, 'a')
    })

    it('should not include newly added artboards in a previously returned artboard list', () => {
      const design = new Design()

      const prevArtboards = design.getArtboards()

      design.addArtboard('a', createOctopus())
      strictEqual(prevArtboards.length, 0)
    })

    it('should include newly added artboards in the current artboard list', () => {
      const design = new Design()
      const prevArtboards = design.getArtboards()

      design.addArtboard('a', createOctopus())

      const nextArtboards = design.getArtboards()
      strictEqual(nextArtboards.length, 1)
      ok(nextArtboards[0])
      strictEqual(nextArtboards[0].id, 'a')
    })

    it('should keep newly removed artboards in a previously returned artboard list', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus())

      const prevArtboards = design.getArtboards()
      design.removeArtboard('a')

      strictEqual(prevArtboards.length, 1)
      ok(prevArtboards[0])
      strictEqual(prevArtboards[0].id, 'a')
    })

    it('should not include newly removed artboards in the current artboard list', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus())

      const prevArtboards = design.getArtboards()
      design.removeArtboard('a')

      const nextArtboards = design.getArtboards()
      strictEqual(nextArtboards.length, 0)
    })
  })

  describe('page-specific artboard lists', () => {
    it('should return empty page artboard lists by default', () => {
      const design = new Design()

      strictEqual(design.getPageArtboards('p1').length, 0)
    })

    it('should include added artboards in their respective page artboard lists', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { pageId: 'p1' })
      design.addArtboard('b', createOctopus(), { pageId: 'p2' })

      const pageArtboards1 = design.getPageArtboards('p1')
      strictEqual(pageArtboards1.length, 1)
      ok(pageArtboards1[0])
      strictEqual(pageArtboards1[0].id, 'a')

      const pageArtboards2 = design.getPageArtboards('p2')
      strictEqual(pageArtboards2.length, 1)
      ok(pageArtboards2[0])
      strictEqual(pageArtboards2[0].id, 'b')
    })

    it('should not include newly added artboards in a previously returned page artboard list', () => {
      const design = new Design()

      const prevArtboards = design.getPageArtboards('p1')

      design.addArtboard('a', createOctopus(), { pageId: 'p1' })
      strictEqual(prevArtboards.length, 0)
    })

    it('should include newly added artboards in the current artboard list', () => {
      const design = new Design()
      const prevArtboards = design.getPageArtboards('p1')

      design.addArtboard('a', createOctopus(), { pageId: 'p1' })

      const nextArtboards = design.getPageArtboards('p1')
      strictEqual(nextArtboards.length, 1)
      ok(nextArtboards[0])
      strictEqual(nextArtboards[0].id, 'a')
    })
  })

  describe('master component artboards', () => {
    it('should return an added master component artboard by component ID', () => {
      const design = new Design()

      design.addArtboard('a', { ...createOctopus(), 'symbolID': 'abc' })

      const artboard = design.getArtboardByComponentId('abc')
      ok(artboard)
      strictEqual(artboard.id, 'a')
    })

    it('should not return a removed master component artboard by component ID', () => {
      const design = new Design()

      design.addArtboard('a', { ...createOctopus(), 'symbolID': 'abc' })
      design.removeArtboard('a')

      const artboard = design.getArtboardByComponentId('abc')
      strictEqual(artboard, null)
    })
  })

  describe('master component artboard list', () => {
    it('should return an empty master component artboard list by default', () => {
      const design = new Design()

      strictEqual(design.getComponentArtboards().length, 0)
    })

    it('should include an added artboard in the master component artboard list', () => {
      const design = new Design()

      design.addArtboard('a', { ...createOctopus(), 'symbolID': 'abc' })

      const artboards = design.getComponentArtboards()
      strictEqual(artboards.length, 1)
      ok(artboards[0])
      strictEqual(artboards[0].id, 'a')
    })

    it('should not include newly added artboards in a previously returned master component artboard list', () => {
      const design = new Design()

      const prevArtboards = design.getComponentArtboards()

      design.addArtboard('a', { ...createOctopus(), 'symbolID': 'abc' })
      strictEqual(prevArtboards.length, 0)
    })

    it('should include newly added artboards in the current master component artboard list', () => {
      const design = new Design()
      const prevArtboards = design.getComponentArtboards()

      design.addArtboard('a', { ...createOctopus(), 'symbolID': 'abc' })

      const nextArtboards = design.getComponentArtboards()
      strictEqual(nextArtboards.length, 1)
      ok(nextArtboards[0])
      strictEqual(nextArtboards[0].id, 'a')
    })

    it('should keep newly removed artboards in a previously returned master component artboard list', () => {
      const design = new Design()

      design.addArtboard('a', { ...createOctopus(), 'symbolID': 'abc' })

      const prevArtboards = design.getComponentArtboards()
      design.removeArtboard('a')

      strictEqual(prevArtboards.length, 1)
      ok(prevArtboards[0])
      strictEqual(prevArtboards[0].id, 'a')
    })

    it('should not include newly removed artboards in the current master component artboard list', () => {
      const design = new Design()

      design.addArtboard('a', { ...createOctopus(), 'symbolID': 'abc' })

      const prevArtboards = design.getComponentArtboards()
      design.removeArtboard('a')

      const nextArtboards = design.getComponentArtboards()
      strictEqual(nextArtboards.length, 0)
    })
  })

  describe('artboard info', () => {
    it('should not configure the artboard name by default', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus())

      const artboard = design.getArtboardById('a')
      ok(artboard)
      strictEqual(artboard.name, null)
    })

    it('should configure the artboard name when specified', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Hello' })

      const artboard = design.getArtboardById('a')
      ok(artboard)
      strictEqual(artboard.name, 'Hello')
    })

    it('should not configure the artboard page ID by default', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus())

      const artboard = design.getArtboardById('a')
      ok(artboard)
      strictEqual(artboard.pageId, null)
    })

    it('should configure the artboard page ID when specified', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { pageId: 'p1' })

      const artboard = design.getArtboardById('a')
      ok(artboard)
      strictEqual(artboard.pageId, 'p1')
    })
  })

  describe('single artboard lookup', () => {
    it('should look up an added artboard by exact name match', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })

      const artboard = design.findArtboard({ name: 'Abc' })
      ok(artboard)
      strictEqual(artboard.id, 'a')
    })

    it('should look up the first added artboard exactly matching one of the listed names', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })
      design.addArtboard('b', createOctopus(), { name: 'Def' })

      const artboard = design.findArtboard({ name: ['Abc', 'Def'] })
      ok(artboard)
      strictEqual(artboard.id, 'a')
    })

    it('should look up the first added artboard matching a name pattern', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })
      design.addArtboard('b', createOctopus(), { name: 'Def' })

      const artboard = design.findArtboard({ name: /Abc|Def/ })
      ok(artboard)
      strictEqual(artboard.id, 'a')
    })

    it('should not look up any of the added artboards when neither matches the name', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })

      const artboard = design.findArtboard({ name: 'Unknown' })
      strictEqual(artboard, null)
    })

    it('should not look up a removed artboard when matching by name', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })
      design.removeArtboard('a')

      const artboard = design.findArtboard({ name: 'Abc' })
      strictEqual(artboard, null)
    })
  })

  describe('multi-artboard lookup', () => {
    it('should look up added artboards by exact name match sorted by addition order', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })
      design.addArtboard('b', createOctopus(), { name: 'Def' })
      design.addArtboard('c', createOctopus(), { name: 'Abc' })

      const artboards = design.findArtboards({ name: 'Abc' })
      strictEqual(artboards.length, 2)
      ok(artboards[0])
      ok(artboards[1])
      strictEqual(artboards[0].id, 'a')
      strictEqual(artboards[1].id, 'c')
    })

    it('should look up added artboards exactly matching one of the listed names', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })
      design.addArtboard('b', createOctopus(), { name: 'Xyz' })
      design.addArtboard('c', createOctopus(), { name: 'Def' })

      const artboards = design.findArtboards({ name: ['Abc', 'Def'] })
      strictEqual(artboards.length, 2)
      ok(artboards[0])
      ok(artboards[1])
      strictEqual(artboards[0].id, 'a')
      strictEqual(artboards[1].id, 'c')
    })

    it('should look up the first added artboard matching a name pattern', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })
      design.addArtboard('b', createOctopus(), { name: 'Xyz' })
      design.addArtboard('c', createOctopus(), { name: 'Def' })

      const artboards = design.findArtboards({ name: /Abc|Def/ })
      strictEqual(artboards.length, 2)
      ok(artboards[0])
      ok(artboards[1])
      strictEqual(artboards[0].id, 'a')
      strictEqual(artboards[1].id, 'c')
    })

    it('should not look up any of the added artboards when neither matches the name', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })
      design.addArtboard('b', createOctopus(), { name: 'Def' })

      const artboards = design.findArtboards({ name: 'Unknown' })
      strictEqual(artboards.length, 0)
    })

    it('should not look up removed artboards when matching by name', () => {
      const design = new Design()

      design.addArtboard('a', createOctopus(), { name: 'Abc' })
      design.addArtboard('b', createOctopus(), { name: 'Abc' })
      design.removeArtboard('a')

      const artboards = design.findArtboards({ name: 'Abc' })
      strictEqual(artboards.length, 1)
      ok(artboards[0])
      strictEqual(artboards[0].id, 'b')
    })
  })

  describe('layer lookup defaults', () => {
    it('should not return any individual layers based on an ID by default', () => {
      const design = new Design()

      strictEqual(design.findLayerById('abc'), null)
    })

    it('should not return any layers based on an ID by default', () => {
      const design = new Design()

      strictEqual(design.findLayersById('abc').length, 0)
    })

    it('should not return any individual layers based on a selector by default', () => {
      const design = new Design()

      strictEqual(design.findLayer({ name: 'abc' }), null)
    })

    it('should not return any layers based on a selector by default', () => {
      const design = new Design()

      strictEqual(design.findLayers({ name: 'abc' }).length, 0)
    })
  })

  describe('artboard data aggregation defaults', () => {
    it('should not return any bitmap assets by default', () => {
      const design = new Design()

      strictEqual(design.getBitmapAssets().length, 0)
    })

    it('should not return any fonts by default', () => {
      const design = new Design()

      strictEqual(design.getFonts().length, 0)
    })

    it('should return an empty flattened layer list by default', () => {
      const design = new Design()

      strictEqual(design.getFlattenedLayers().length, 0)
    })
  })
})

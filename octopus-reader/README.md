Open Design SDK > Octopus Reader

# Octopus Reader

This part of the Open Design SDK is responsible for **traversing Octopus file data** and **aggregating various information** from the design artboards. In the context of the whole Open Design SDK, this is quite a **low-level layer**.

## Structure

There are four main levels of the design file contents:

- **Designs** (the whole design file)
- **Pages** (design artboard collection; optional feature)
- **Artboards** (a single frame of the design or a main component definition)
- **Layers** (individual shapes, texts and other graphical elements)

## Features / Use Cases

- In-memory **convenience layer** for working with design file contents
- **Looking up layers** in design files, artboards or layer subtrees
- **Listing bitmap and font assets** needed for rendering design files, artboards or layer subtrees

## Guide

### Installation

```bash
yarn add @avocode/open-design-octopus-reader
```

### Usage

```bash
import { createEmptyDesign } from '@avocode/open-design-octopus-reader'

const design = createEmptyDesign()
```

### Open Designs

The Octopus Reader is **not responsible for loading any data** from a data source (e.g. the file system or the network). The user needs to manually retrieve the data and construct the Octopus Reader design structure.

```typescript
const design = OctopusReader.createEmptyDesign()

const artboard1 = design.addArtboard('artboard-1', artboardOctopusData1, {
  name: 'A',
  pageId: 'page-1',
})

const artboard2 = design.addArtboard('artboard-2', artboardOctopusData2, {
  name: 'B',
  pageId: 'page-2',
})
```

### Layer Lookup

It is possible to **look up layers by IDs and by selectors**. Each content level (design, artboard, layer subtree) allows such lookup.

```typescript
const layerA1 = artboard.getLayerById('a1')

const textLayersABC = artboard.findLayers({
  name: ['A', 'B', 'C'],
  type: 'textLayer',
})
```

Lookup methods can either:

- **query the immediate layer level** of its context (design – root layers of all artboards; artboard – root layers of the artboard; layer – first-level nested layers in the layer); such methods are prefixed with `get`.
- **query any number of nesting levels** within its context (design – all layers from all artboards; artboard – all layers in the artboard; layer – all layers nested in the layer); such methods are prefixed with `find` and accept selectors; the depth can also be limited to a specific number of levels.

```typescript
artboard.getLayerById('id')
artboard.findLayer({ name: 'query' })
artboard.findLayers({ name: 'query' })
```

These methods are further split into single-result and multi-result ones where the single-result methods return either a layer match or `null` while the multi-result methods always return a layer collection object.

Design-level lookup methods wrap matched layers in a descriptor objects which contain information about the artboard from which the matched layer originates.

```typescript
design.findLayer({ type: 'shapeLayer' }) // Type: { artboardId: 'artboard-1', layer: Layer } | null
```

Layer collection objects are array-like by providing general-purpose methods such as `forEach`, `map` or `filter`:

```typescript
const shapeLayerNames: Array<string> = artboard
  .findLayers({ type: 'shapeLayer' })
  .map((layer) => {
    return layer.name
  })
```

The layer collection objects can be further queried:

```typescript
const textLayers = artboard1.findLayers({ type: 'textLayer' })
const textLayersABC = textLayers.findLayers({ name: ['A', 'B', 'C'] })
```

### Asset Aggregation

Each content level exposes methods for obtaining lists of assets (bitmaps, fonts) it needs. The aggregations can also be limited to a specific number of nesting levels.

:warning: Note that there can be duplicate asset results in cases where multiple layers use the same asset to allow precise localization of the originating layer within the design file contents.

#### Bitmap Assets

```typescript
const designAssets = design.getBitmapAssets()
// Type: Array<{ artboardId, layerId, name }>

const artboardAssets = artboard.getBitmapAssets()
// Type: Array<{ layerId, name }>

const layerAssets = layer.getBitmapAssets({ depth: 2 })
// Type: Array<{ layerId, name }>
```

#### Font Assets

```typescript
const designAssets = design.getFonts()
// Type: Array<{ artboardId, layerId, fontPostScriptName: string, fontTypes: Array<string> }>

const artboardAssets = artboard.getFonts()
// Type: Array<{ layerId, fontPostScriptName: string, fontTypes: Array<string> }>

const layerAssets = layer.getFonts({ depth: 2 })
// Type: Array<{ layerId, fontPostScriptName: string, fontTypes: Array<string> }>
```

> :warning: Note that there can be duplicate asset results in cases where multiple layers use the same asset to allow precise localization of the originating layer within the design file contents.
>
> :bulb: Deduplicated asset lists can be retrieved by calling the getUniqueBitmapAssets() and getUniqueFonts() methods respectively instead.

### Layer Info

Basides the most common info such as `id` or `name`, **users are supposed to take most layer info from the [layer octopus data](https://octopus-schema.avocode.com/)** (accessible as `layer.octopus`).

The convenience methods of `Layer` objects are mainly for nested layer lookup and asset aggregations.

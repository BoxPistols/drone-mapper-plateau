export interface CityConfig {
  id: string
  name: string
  prefecture: string
  tilesUrl: string
  longitude: number
  latitude: number
  height: number
  lod?: number
  hasTexture?: boolean
}

export type BuildingProperties = Record<string, string | number | boolean | null | undefined>

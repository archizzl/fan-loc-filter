export interface Fan {
  _rowId: string;
  ConsolidatedFanID: string;
  CountryData: string;
  CityData: string;
  StateData: string;
  LatitudeData: number;
  LongitudeData: number;
  [key: string]: string | number;
}

export interface FilterCircle {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
  type: "include" | "exclude";
  label: string;
}

export interface DataFilter {
  id: string;
  field: string;
  value: string;
  type: "include" | "exclude";
  boundary?: GeoJSON.GeoJsonObject | null; // undefined=not fetched, null=not found
}

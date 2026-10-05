export type FarmGeoSource='device_live_capture'|'device_at_upload'|'manual'|'exif'|'none';
export type FarmGeoMatchMethod='polygon'|'boundary_near'|'nearest'|'manual'|'spatial_memory'|'unmatched';

export type FarmGeoContext={
  lat:number;
  lon:number;
  accuracyM:number;
  altitudeM?:number;
  headingDeg?:number;
  capturedAt:string;
  source:FarmGeoSource;
  parcelId?:string;
  parcelName?:string;
  matchMethod:FarmGeoMatchMethod;
  matchDistanceM?:number;
  matchConfidence:number;
  ambiguousParcelIds?:string[];
};

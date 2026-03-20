import Papa from "papaparse";
import type { Fan } from "../types";

export function parseFanCSV(file: File): Promise<{ fans: Fan[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        const fans: Fan[] = [];
        let rowIdx = 0;
        for (const row of results.data as Record<string, string>[]) {
          const lat = parseFloat(row.LatitudeData);
          const lng = parseFloat(row.LongitudeData);
          if (isNaN(lat) || isNaN(lng)) continue;
          fans.push({
            ...row,
            _rowId: String(rowIdx++),
            ConsolidatedFanID: row.ConsolidatedFanID || "",
            CountryData: row.CountryData || "",
            CityData: row.CityData || "",
            StateData: row.StateData || "",
            LatitudeData: lat,
            LongitudeData: lng,
          });
        }
        resolve({ fans, headers });
      },
      error(err) {
        reject(err);
      },
    });
  });
}

export function fansToCSV(fans: Fan[], headers: string[]): string {
  // Exclude internal _rowId from export
  const exportHeaders = headers.filter((h) => h !== "_rowId");
  return Papa.unparse(fans, { columns: exportHeaders });
}

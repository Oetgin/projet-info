import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export type ParkingType = 'car' | 'bike';

export interface Parking {
  id: string;
  name: string;
  free: number;
  total: number;
  occupied: number;
  status: string;
  lastUpdate: string;
  lat: number;
  lng: number;
  type: ParkingType;
  distance?: number;
}

export interface HistoryRecord {
  total_spaces: number;
  occupied_spaces: number;
  status: string;
  time: string;
}

export interface PredictionRecord {
  total_spaces: number;
  predicted_occupied: number;
  predicted_lower_bound: number;
  predicted_upper_bound: number;
  time: string;
}

interface RemoteParking {
  parc_id: string;
  total_spaces: number;
  occupied_spaces: number;
  status: string;
  lastupdate: string;
}

const PARKING_META: Record<string, { name: string; lat: number; lng: number }> = {
  CVI: { name: 'Parc relais Cesson-Viasilva', lat: 48.1196, lng: -1.6289 },
  HFR: { name: 'Parc relais Henri Fréville', lat: 48.0877, lng: -1.6748 },
  JFK: { name: 'Parc relais J.F. Kennedy', lat: 48.1279, lng: -1.7089 },
  LGA: { name: 'Parc relais Les Gayeulles', lat: 48.1347, lng: -1.6467 },
  POT: { name: 'Parc relais La Poterie', lat: 48.0916, lng: -1.6347 },
  PRE: { name: 'Parc relais Les Préales', lat: 48.109, lng: -1.696 },
  SJG: { name: 'Parc relais Saint-Jacques – Gaîté', lat: 48.0928, lng: -1.7085 },
  VU: { name: 'Parc relais Villejean-Université', lat: 48.1213, lng: -1.704 },
};

@Injectable({
  providedIn: 'root',
})
export class ParkingService {
  selectedParking: Parking | null = null;
  userLocation: { lat: number; lng: number } | null = null;

  constructor(private http: HttpClient) {}

  setUserLocation(lat: number, lng: number): void {
    this.userLocation = { lat, lng };
  }

  getDrivingDirectionsUrl(parking: Parking): string {
    if (!this.userLocation) {
      return '';
    }
    const origin = `${this.userLocation.lat},${this.userLocation.lng}`;
    const destination = `${parking.lat},${parking.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin,
    )}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  }

  getRemoteParkings(): Observable<Parking[]> {
    return this.http.get<RemoteParking[]>('/api/overview').pipe(
      map((items) => {
        const mapped = items.map((item): Parking | null => {
          const meta = PARKING_META[item.parc_id];
          if (!meta) {
            return null;
          }

          return {
            id: item.parc_id,
            name: meta.name,
            total: item.total_spaces,
            occupied: item.occupied_spaces,
            free: Math.max(item.total_spaces - item.occupied_spaces, 0),
            status: item.status,
            lastUpdate: item.lastupdate,
            lat: meta.lat,
            lng: meta.lng,
            type: 'car',
          };
        });

        return mapped.filter((parking): parking is Parking => parking !== null);
      }),
    );
  }

  getHistory(parkId: string, limit = 100): Observable<HistoryRecord[]> {
    return this.http.get<HistoryRecord[]>(`/api/history/${parkId}?limit=${limit}`);
  }

  getPredictions(parkId: string, limit = 48): Observable<PredictionRecord[]> {
    return this.http.get<PredictionRecord[]>(`/api/predictions/${parkId}?limit=${limit}`);
  }
}

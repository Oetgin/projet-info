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

const API_BASE = 'https://api.eaas.page';

const PARKING_META: Record<string, { name: string; lat: number; lng: number }> = {
  CVI: { name: 'Parc relais Cesson-Viasilva', lat: 48.13259, lng: -1.620879 },
  HFR: { name: 'Parc relais Henri Fréville', lat: 48.087537, lng: -1.674555 },
  JFK: { name: 'Parc relais J.F. Kennedy', lat: 48.12108, lng: -1.713631 },
  LGA: { name: 'Parc relais Les Gayeulles', lat: 48.129565, lng: -1.657108 },
  POT: { name: 'Parc relais La Poterie', lat: 48.08682, lng: -1.64342 },
  PRE: { name: 'Parc relais Les Préales', lat: 48.11356, lng: -1.64025 },
  SJG: { name: 'Parc relais Saint-Jacques – Gaîté', lat: 48.091038, lng: -1.703637 },
  VU: { name: 'Parc relais Villejean-Université', lat: 48.121906, lng: -1.704182 },
};

@Injectable({
  providedIn: 'root',
})
export class ParkingService {
  selectedParking: Parking | null = null;
  userLocation: { lat: number; lng: number } | null = null;
  // timestamp de référence (ISO) correspondant au moment du clic utilisateur
  referenceTime?: string;

  constructor(private http: HttpClient) {}

  setUserLocation(lat: number, lng: number): void {
    this.userLocation = { lat, lng };
  }

  setReferenceTime(iso: string): void {
    this.referenceTime = iso;
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

  normalizeApiTime(value: string): Date {
    if (!value) {
      return new Date(value);
    }
    const utcFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
    const timestamp = utcFormat.test(value) ? `${value}Z` : value;
    return new Date(timestamp);
  }

  getRemoteParkings(): Observable<Parking[]> {
    return this.http.get<RemoteParking[]>(`${API_BASE}/overview`).pipe(
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

  getHistory(parkId: string, limit = 100, from?: string): Observable<HistoryRecord[]> {
    let url = `${API_BASE}/history/${parkId}?limit=${limit}`;
    if (from) {
      url += `&from=${encodeURIComponent(from)}`;
    }
    return this.http.get<HistoryRecord[]>(url);
  }

  getPredictions(parkId: string, limit = 48, from?: string): Observable<PredictionRecord[]> {
    let url = `${API_BASE}/predictions/${parkId}?limit=${limit}`;
    if (from) {
      url += `&from=${encodeURIComponent(from)}`;
    }
    return this.http.get<PredictionRecord[]>(url);
  }
}

import { Component, AfterViewInit, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Router } from '@angular/router';
import { ParkingService } from '../../services/parking.service';


@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.html',
  styleUrls: ['./map.css'],
})
export class MapComponent implements OnInit, AfterViewInit {

  private map!: L.Map;

  selectedParking!: {
    id: string;
    name: string;
    free: number;
    total: number;
    status: string;
  };

  constructor(
    private zone: NgZone,
    private router: Router,
    private parkingService: ParkingService,
    private cdr: ChangeDetectorRef
  ) {}

  // 🔵 Initialisation des données (cycle Angular correct)
  ngOnInit(): void {
    this.selectedParking =
      this.parkingService.selectedParking ?? PARKINGS[0];
  }

  // 🔵 Initialisation Leaflet (manipulation DOM)

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([48.1173, -1.6778], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    PARKINGS.forEach(parking => {
      L.marker([parking.lat, parking.lng])
        .addTo(this.map)
        .bindPopup(parking.name)
        .on('click', () => {
          this.zone.run(() => {
            this.parkingService.selectedParking = parking;
            this.selectedParking = parking;
            this.cdr.detectChanges(); // 🔥 force la mise à jour
          });
        });
    });
  }

  goToDetail() {
    this.router.navigate(['/parking', this.selectedParking.id]);
  }
}

const PARKINGS = [
  {
    id: 'republique',
    name: 'Parking République',
    free: 120,
    total: 300,
    status: 'Disponible',
    lat: 48.1173,
    lng: -1.6778
  },
  {
    id: 'charles-de-gaulle',
    name: 'Parking Charles de Gaulle',
    free: 15,
    total: 250,
    status: 'Complet',
    lat: 48.1115,
    lng: -1.6805
  }
];
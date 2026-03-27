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
    distance?: number;
  };

  constructor(
    private zone: NgZone,
    private router: Router,
    private parkingService: ParkingService,
    private cdr: ChangeDetectorRef
  ) {}

  //  Initialisation des données (cycle Angular correct)
  ngOnInit(): void {
    this.selectedParking =
      this.parkingService.selectedParking ?? PARKINGS[0];
  }

  //  Initialisation Leaflet (manipulation DOM)

  ngAfterViewInit(): void {
    this.initMap();
    this.locateUser();
  }

  private initMap(): void {
    this.map = L.map('map').setView([48.1173, -1.6778], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    PARKINGS.forEach(parking => {
      L.marker(
        [parking.lat, parking.lng],
        { icon: this.getMarkerIcon(parking) }
      )
        .addTo(this.map)
        .bindPopup(parking.name)
        .on('click', () => {
          this.zone.run(() => {
            this.parkingService.selectedParking = parking;
            this.selectedParking = parking;
            this.cdr.detectChanges(); //  force la mise à jour
          });
        });
    });
  }

  goToDetail() {
    this.router.navigate(['/parking', this.selectedParking.id]);
  }
  getMarkerIcon(parking: any) {

    let color = 'green';
  
    if (parking.free < 20) {
      color = 'red';
    } else if (parking.free < 50) {
      color = 'orange';
    }
  
    return L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
  
  }
  locateUser() {

    if (!navigator.geolocation) {
      console.log("Géolocalisation non supportée");
      return;
    }
  
    navigator.geolocation.getCurrentPosition(position => {
  
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
  
      // centrer la carte
      this.map.setView([lat, lng], 15);
  
      // marker utilisateur
      L.marker(
        [lat, lng],
        { icon: this.getUserIcon() }
      )
      .addTo(this.map)
      .bindPopup(" Vous êtes ici")
      .openPopup();
  
      // cercle autour de l'utilisateur
      L.circle([lat, lng], {
        radius: 200,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2
      }).addTo(this.map);
      this.findClosestParkings(lat, lng);
      this.cdr.detectChanges();
    });
    
  
  }
  getUserIcon() {
    return L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {

    const R = 6371; // rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
    this.cdr.detectChanges();
  }
  
  findClosestParkings(userLat: number, userLng: number) {

    PARKINGS.forEach(parking => {
  
      const distance = this.calculateDistance(
        userLat,
        userLng,
        parking.lat,
        parking.lng
      );
  
      // on ajoute la distance directement dans le parking
      (parking as any).distance = distance;
  
    });
  
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
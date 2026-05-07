import { Component, AfterViewInit, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Router } from '@angular/router';
import { ParkingService } from '../../services/parking.service';
import { ButtonModule } from 'primeng/button';

type ParkingType = 'car' | 'bike';

interface Parking {
  id: string;
  name: string;
  free: number;
  total: number;
  status: string;
  lat: number;
  lng: number;
  type: ParkingType;
  distance?: number;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, ButtonModule, FormsModule],
  templateUrl: './map.html',
  styleUrls: ['./map.css'],
})
export class MapComponent implements OnInit, AfterViewInit {
  private map!: L.Map;

  // Markers visibles sur la carte
  private visibleMarkers: L.Marker[] = [];

  // Marker et cercle utilisateur
  private userMarker?: L.Marker;
  private userCircle?: L.Circle;

  // Filtres d'affichage
  showCars = true;
  showBikes = true;

  // Recherche autocomplete
  searchTerm = '';
  showSuggestions = false;
  filteredParkings: Parking[] = [];

  // Parking sélectionné
  selectedParking!: Parking;

  constructor(
    private zone: NgZone,
    private router: Router,
    private parkingService: ParkingService,
    private cdr: ChangeDetectorRef
  ) {}

  // Initialisation Angular
  ngOnInit(): void {
    this.selectedParking = this.parkingService.selectedParking ?? PARKINGS[0];
    this.filteredParkings = [...PARKINGS];
  }

  // Initialisation Leaflet après rendu du DOM
  ngAfterViewInit(): void {
    this.initMap();
    this.refreshMarkers();
    this.locateUser();
  }

  // Création de la carte
  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([48.1173, -1.6778], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  // Recrée les markers selon les cases cochées
  private refreshMarkers(): void {
    this.visibleMarkers.forEach(marker => this.map.removeLayer(marker));
    this.visibleMarkers = [];

    PARKINGS.forEach(parking => {
      const shouldShow =
        (parking.type === 'car' && this.showCars) ||
        (parking.type === 'bike' && this.showBikes);

      if (!shouldShow) return;

      const marker = L.marker([parking.lat, parking.lng], {
        icon: this.getMarkerIcon(parking)
      })
        .addTo(this.map)
        .bindPopup(parking.name)
        .on('click', () => {
          this.zone.run(() => {
            this.onParkingSelected(parking);
          });
        });

      this.visibleMarkers.push(marker);
    });
  }

  // Quand on coche/décoche voitures
  toggleCars(event: Event): void {
    this.showCars = (event.target as HTMLInputElement).checked;
    this.refreshMarkers();
  }

  // Quand on coche/décoche vélos
  toggleBikes(event: Event): void {
    this.showBikes = (event.target as HTMLInputElement).checked;
    this.refreshMarkers();
  }

  // Navigation vers la page détail
  goToDetail(): void {
    this.router.navigate(['/parking', this.selectedParking.id]);
  }

  // Sélection centralisée d’un parking
  private onParkingSelected(parking: Parking): void {
    this.parkingService.selectedParking = parking;
    this.selectedParking = parking;

    // Synchroniser les checkboxes avec le type sélectionné
    if (parking.type === 'car') {
      this.showCars = true;
      this.showBikes = false;
    } else {
      this.showCars = false;
      this.showBikes = true;
    }

    // Mettre à jour la recherche
    this.searchTerm = parking.name;
    this.showSuggestions = false;

    // Recentrer la carte
    this.map.setView([parking.lat, parking.lng], 16);

    // Recréer les markers selon le type actif
    this.refreshMarkers();
    this.cdr.detectChanges();
  }

  // Icône personnalisée avec carré arrondi symétrique
  private getMarkerIcon(parking: Parking): L.DivIcon {
    const bg =
      parking.type === 'bike'
        ? '#22c55e'
        : parking.free < 20
        ? '#ef4444'
        : parking.free < 50
        ? '#f59e0b'
        : '#3b82f6';

    const iconSvg =
      parking.type === 'bike'
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="18" height="18">
            <path fill="white" d="M331.7 107.3C336 100.3 343.7 96 352 96L456 96C469.3 96 480 106.7 480 120C480 133.3 469.3 144 456 144L390.4 144L462.6 292.4C473.3 289.5 484.5 288 496 288C566.7 288 624 345.3 624 416C624 486.7 566.7 544 496 544C425.3 544 368 486.7 368 416C368 374 388.2 336.8 419.4 313.4L399 271.5L325.5 418.5C323.2 423.3 319.2 427.3 314.1 429.7C313.5 430 312.9 430.2 312.3 430.4C309.4 431.5 306.4 432 303.4 431.9L271 432C263.1 495.1 209.3 544 144 544C73.3 544 16 486.7 16 416C16 345.3 73.3 288 144 288C154.8 288 165.2 289.3 175.2 291.8L203.7 234.9L192.2 208L152 208C138.7 208 128 197.3 128 184C128 170.7 138.7 160 152 160L208 160C217.6 160 226.3 165.7 230.1 174.5L244.4 208L368.1 208L330.4 130.5C326.8 123.1 327.2 114.3 331.6 107.3z"/>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="18" height="18">
            <path fill="white" d="M147 170.7L117.2 256L240.1 256L240.1 160L162.2 160C155.4 160 149.3 164.3 147.1 170.7zM48.6 257.9L86.5 149.6C97.8 117.5 128.1 96 162.1 96L360 96C385.2 96 408.9 107.9 424 128L520.2 256.3C587.1 260.5 640 316.1 640 384L640 400C640 435.3 611.3 464 576 464L559.6 464C555.6 508.9 517.9 544 472 544C426.1 544 388.4 508.9 384.4 464L239.7 464C235.7 508.9 198 544 152.1 544C106.2 544 68.5 508.9 64.5 464L64.1 464C28.8 464 .1 435.3 .1 400L.1 320C.1 289.9 20.8 264.7 48.7 257.9zM440 256L372.8 166.4C369.8 162.4 365 160 360 160L288 160L288 256L440 256zM152 496C174.1 496 192 478.1 192 456C192 433.9 174.1 416 152 416C129.9 416 112 433.9 112 456C112 478.1 129.9 496 152 496zM512 456C512 433.9 494.1 416 472 416C449.9 416 432 433.9 432 456C432 478.1 449.9 496 472 496C494.1 496 512 478.1 512 456z"/>
          </svg>`;

    return L.divIcon({
      className: 'custom-marker-wrapper',
      html: `
        <div class="custom-marker" style="background:${bg}">
          ${iconSvg}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  // Position utilisateur
  locateUser(): void {
    if (!navigator.geolocation) {
      console.log('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      this.map.setView([lat, lng], 15);

      if (this.userMarker) {
        this.map.removeLayer(this.userMarker);
      }
      if (this.userCircle) {
        this.map.removeLayer(this.userCircle);
      }

      this.userMarker = L.marker([lat, lng], {
        icon: this.getUserIcon()
      })
        .addTo(this.map)
        .bindPopup('Vous êtes ici');

      this.userCircle = L.circle([lat, lng], {
        radius: 200,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15
      }).addTo(this.map);

      this.findClosestParkings(lat, lng);
      this.cdr.detectChanges();
    });
  }

  // Icône utilisateur
  private getUserIcon(): L.DivIcon {
    return L.divIcon({
      className: 'user-marker-wrapper',
      html: `
        <div class="user-marker-pulse"></div>
        <div class="user-marker-dot"></div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  }

  // Calcul de distance entre deux coordonnées
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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
  }

  // Ajoute la distance à chaque parking
  findClosestParkings(userLat: number, userLng: number): void {
    PARKINGS.forEach(parking => {
      parking.distance = this.calculateDistance(
        userLat,
        userLng,
        parking.lat,
        parking.lng
      );
    });
  }

  // Autocomplete : filtre les résultats
  onSearchChange(): void {
    const query = this.searchTerm.trim().toLowerCase();

    if (!query) {
      this.filteredParkings = [...PARKINGS];
      this.showSuggestions = true;
      return;
    }

    this.filteredParkings = PARKINGS.filter(parking =>
      parking.name.toLowerCase().includes(query)
    );
    this.showSuggestions = true;
  }

  // Sélection autocomplete
  selectParking(parking: Parking): void {
    this.zone.run(() => {
      this.onParkingSelected(parking);
    });
  }

  // Ferme la suggestion sans casser le clic souris
  onSearchBlur(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }
}

// ===== Données : 10 parkings / stations =====
const PARKINGS: Parking[] = [
  {
    id: 'republique',
    name: 'Parking République',
    free: 120,
    total: 300,
    status: 'Disponible',
    lat: 48.1173,
    lng: -1.6778,
    type: 'car'
  },
  {
    id: 'charles-de-gaulle',
    name: 'Parking Charles de Gaulle',
    free: 15,
    total: 250,
    status: 'Complet',
    lat: 48.1115,
    lng: -1.6805,
    type: 'car'
  },
  {
    id: 'gare-sud',
    name: 'Parking Gare Sud',
    free: 34,
    total: 180,
    status: 'Disponible',
    lat: 48.1059,
    lng: -1.6737,
    type: 'car'
  },
  {
    id: 'colombier',
    name: 'Parking Colombier',
    free: 48,
    total: 220,
    status: 'Disponible',
    lat: 48.1048,
    lng: -1.6756,
    type: 'car'
  },
  {
    id: 'hoche',
    name: 'Parking Hoche',
    free: 12,
    total: 90,
    status: 'Complet',
    lat: 48.1152,
    lng: -1.6689,
    type: 'car'
  },
  {
    id: 'saint-anne',
    name: 'Parking Saint-Anne',
    free: 60,
    total: 140,
    status: 'Disponible',
    lat: 48.1158,
    lng: -1.6888,
    type: 'car'
  },
  {
    id: 'bike-republique',
    name: 'Station Vélo République',
    free: 22,
    total: 40,
    status: 'Disponible',
    lat: 48.1112,
    lng: -1.6712,
    type: 'bike'
  },
  {
    id: 'bike-saint-anne',
    name: 'Station Vélo Sainte-Anne',
    free: 9,
    total: 24,
    status: 'Disponible',
    lat: 48.1147,
    lng: -1.6808,
    type: 'bike'
  },
  {
    id: 'bike-colombier',
    name: 'Station Vélo Colombier',
    free: 17,
    total: 30,
    status: 'Disponible',
    lat: 48.1071,
    lng: -1.6838,
    type: 'bike'
  },
  {
    id: 'bike-gare',
    name: 'Station Vélo Gare',
    free: 14,
    total: 26,
    status: 'Disponible',
    lat: 48.1049,
    lng: -1.6719,
    type: 'bike'
  }
];
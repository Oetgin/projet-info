import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Parking, ParkingService } from '../../services/parking.service';
import { ParkingDetailComponent } from '../parking-detail/parking-detail';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, ButtonModule, FormsModule, ParkingDetailComponent],
  templateUrl: './map.html',
  styleUrls: ['./map.css'],
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('searchContainer') searchContainer?: ElementRef<HTMLElement>;

  private map!: L.Map;
  private visibleMarkers: L.Marker[] = [];
  private userMarker?: L.Marker;
  private userCircle?: L.Circle;
  private removeDocumentClickListener?: () => void;
  private recenterControl?: L.Control;

  private readonly defaultCenter: L.LatLngExpression = [48.1173, -1.6778];
  private readonly defaultZoom = 14;
  private readonly focusZoom = 17;

  showCars = true;
  showBikes = true;

  searchTerm = '';
  showSuggestions = false;
  filteredParkings: Parking[] = [];

  selectedParking!: Parking;
  remoteParkings: Parking[] = [];
  isLoadingParkings = true;
  showDetailPanel = false;

  constructor(
    private zone: NgZone,
    private router: Router,
    private parkingService: ParkingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchRemoteParkings();
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.locateUser();
    this.setupOutsideClickListener();
  }

  ngOnDestroy(): void {
    if (this.removeDocumentClickListener) {
      this.removeDocumentClickListener();
    }

    if (this.map) {
      this.map.remove();
    }
  }

  private setupOutsideClickListener(): void {
    this.removeDocumentClickListener = this.zone.runOutsideAngular(() =>
      this.listenDocumentClick(),
    );
  }

  private listenDocumentClick(): () => void {
    const handler = (event: MouseEvent) => {
      const container = this.searchContainer?.nativeElement;
      const target = event.target as Node | null;

      if (!container || !target) {
        return;
      }

      if (!container.contains(target)) {
        this.zone.run(() => {
          this.showSuggestions = false;
          this.cdr.detectChanges();
        });
      }
    };

    document.addEventListener('click', handler, true);

    return () => {
      document.removeEventListener('click', handler, true);
    };
  }

  private fetchRemoteParkings(): void {
    this.isLoadingParkings = true;
    this.parkingService.getRemoteParkings().subscribe({
      next: (items) => {
        this.remoteParkings = items;
        this.filteredParkings = [...items];

        if (items.length > 0) {
          this.selectedParking = this.parkingService.selectedParking ?? items[0];
          this.refreshMarkers();
        } else {
          console.warn("Aucun parking récupéré de l'API");
        }

        this.isLoadingParkings = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur récupération données distantes :', error);
        this.isLoadingParkings = false;
        this.cdr.detectChanges();
      },
    });
  }

  private getDisplayedParkings(): Parking[] {
    return this.remoteParkings;
  }

  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
    }).setView(this.defaultCenter, this.defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.addRecenterControl();
  }

  private addRecenterControl(): void {
    const component = this;

    const RecenterControl = L.Control.extend({
      options: {
        position: 'bottomright',
      },

      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control recenter-control');
        const button = L.DomUtil.create('button', 'recenter-btn', container);

        button.type = 'button';
        button.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zm0-5a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 18.93 11H20a1 1 0 1 1 0 2h-1.07A7.002 7.002 0 0 1 13 18.93V20a1 1 0 1 1-2 0v-1.07A7.002 7.002 0 0 1 5.07 13H4a1 1 0 1 1 0-2h1.07A7.002 7.002 0 0 1 11 5.07V4a1 1 0 0 1 1-1z"/>
          </svg>
        `;
        button.setAttribute('aria-label', 'Recentrer la carte');
        button.setAttribute('title', 'Recentrer la carte');

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        L.DomEvent.on(button, 'click', (event: Event) => {
          L.DomEvent.stop(event);
          component.zone.run(() => {
            component.recenterMap();
          });
        });

        return container;
      },
    });

    this.recenterControl = new RecenterControl();
    this.recenterControl.addTo(this.map);
  }

  recenterMap(): void {
    if (this.selectedParking) {
      this.map.flyTo([this.selectedParking.lat, this.selectedParking.lng], this.focusZoom, {
        duration: 0.8,
      });
      return;
    }

    this.map.flyTo(this.defaultCenter, this.defaultZoom, {
      duration: 0.8,
    });
  }

  private refreshMarkers(): void {
    if (!this.map) return;

    this.visibleMarkers.forEach((marker) => this.map.removeLayer(marker));
    this.visibleMarkers = [];

    this.getDisplayedParkings().forEach((parking) => {
      const shouldShow =
        (parking.type === 'car' && this.showCars) || (parking.type === 'bike' && this.showBikes);

      if (!shouldShow) return;

      const marker = L.marker([parking.lat, parking.lng], {
        icon: this.getMarkerIcon(parking),
      })
        .addTo(this.map)
        .bindPopup(parking.name)
        .bindTooltip(parking.name, {
          permanent: false,
          direction: 'top',
          offset: [0, -18],
          opacity: 0.96,
          className: 'parking-marker-tooltip',
        })
        .on('click', () => {
          this.zone.run(() => {
            this.onParkingSelected(parking);
          });
        });

      this.visibleMarkers.push(marker);
    });
  }

  toggleCars(event: Event): void {
    this.showCars = (event.target as HTMLInputElement).checked;
    this.refreshMarkers();
  }

  toggleBikes(event: Event): void {
    this.showBikes = (event.target as HTMLInputElement).checked;
    this.refreshMarkers();
  }

  goToDetail(): void {
    this.parkingService.setReferenceTime(new Date().toISOString());
    this.parkingService.selectedParking = this.selectedParking;
    this.showDetailPanel = true;
  }

  private onParkingSelected(parking: Parking): void {
    this.parkingService.selectedParking = parking;
    this.selectedParking = parking;
    this.parkingService.setReferenceTime(new Date().toISOString());

    if (parking.type === 'car') {
      this.showCars = true;
      this.showBikes = false;
    } else {
      this.showCars = false;
      this.showBikes = true;
    }

    this.searchTerm = parking.name;
    this.showSuggestions = false;

    this.map.flyTo([parking.lat, parking.lng], this.focusZoom, {
      duration: 0.8,
    });

    this.refreshMarkers();
    this.cdr.detectChanges();
  }

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
        <div class="custom-marker ${parking.type}" style="background:${bg}">
          ${iconSvg}
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
      popupAnchor: [0, -40],
    });
  }

  locateUser(): void {
    if (!navigator.geolocation) {
      console.log('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
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
        icon: this.getUserIcon(),
      })
        .addTo(this.map)
        .bindPopup('Vous êtes ici');

      this.userCircle = L.circle([lat, lng], {
        radius: 200,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
      }).addTo(this.map);

      this.parkingService.setUserLocation(lat, lng);
      this.findClosestParkings(lat, lng);
      this.cdr.detectChanges();
    });
  }

  private getUserIcon(): L.DivIcon {
    return L.divIcon({
      className: 'user-marker-wrapper',
      html: `
        <div class="user-marker-pulse"></div>
        <div class="user-marker-dot"></div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  findClosestParkings(userLat: number, userLng: number): void {
    this.getDisplayedParkings().forEach((parking) => {
      parking.distance = this.calculateDistance(userLat, userLng, parking.lat, parking.lng);
    });
  }

  onSearchChange(): void {
    const query = this.searchTerm.trim().toLowerCase();

    if (!query) {
      this.filteredParkings = [...this.getDisplayedParkings()];
      this.showSuggestions = true;
      return;
    }

    this.filteredParkings = this.getDisplayedParkings().filter((parking) =>
      parking.name.toLowerCase().includes(query),
    );
    this.showSuggestions = true;
  }

  onSearchFocus(): void {
    this.filteredParkings = this.searchTerm.trim()
      ? this.getDisplayedParkings().filter((parking) =>
          parking.name.toLowerCase().includes(this.searchTerm.trim().toLowerCase()),
        )
      : [...this.getDisplayedParkings()];

    this.showSuggestions = this.filteredParkings.length > 0;
  }

  selectParking(parking: Parking): void {
    this.zone.run(() => {
      this.onParkingSelected(parking);
    });
  }
}

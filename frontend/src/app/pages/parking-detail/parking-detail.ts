import { Component, EventEmitter, Input, OnInit, Output, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ParkingService,
  HistoryRecord,
  PredictionRecord,
  Parking,
} from '../../services/parking.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-parking-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parking-detail.html',
  styleUrls: ['./parking-detail.css'],
})
export class ParkingDetailComponent implements OnInit, AfterViewInit {
  @Input() parking!: Parking;
  @Output() close = new EventEmitter<void>();

  activeTab: 'history' | 'predictions' = 'history';
  history: HistoryRecord[] = [];
  predictions: PredictionRecord[] = [];
  isLoadingHistory = false;
  isLoadingPredictions = false;
  historyChart: Chart | null = null;
  predictionsChart: Chart | null = null;
  selectedHorizon = 6;
  horizonOptions = [1, 3, 6, 12, 24];

  constructor(
    private router: Router,
    private parkingService: ParkingService,
  ) {}

  ngOnInit(): void {
    if (this.parking?.id) {
      this.loadHistory();
      this.loadPredictions();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.activeTab === 'history') {
        this.renderHistoryChart();
      } else {
        this.renderPredictionsChart();
      }
    }, 0);
  }

  get filteredPredictions(): PredictionRecord[] {
    if (!this.predictions.length) {
      return [];
    }

    const startTime = new Date(this.predictions[0].time).getTime();
    const horizonMs = this.selectedHorizon * 60 * 60 * 1000;

    return this.predictions.filter((record) => {
      const timestamp = new Date(record.time).getTime();
      return timestamp - startTime <= horizonMs;
    });
  }

  get previewHistory(): HistoryRecord[] {
    return this.history.slice(-6);
  }

  get routeAvailable(): boolean {
    return !!this.parkingService.userLocation;
  }

  get routeDistance(): number | null {
    return this.parking.distance ?? null;
  }

  openRoute(): void {
    if (!this.parking || !this.routeAvailable) {
      return;
    }
    const url = this.parkingService.getDrivingDirectionsUrl(this.parking);
    if (url) {
      window.open(url, '_blank');
    }
  }

  selectTab(tab: 'history' | 'predictions'): void {
    this.activeTab = tab;

    if (tab === 'history') {
      this.renderHistoryChart();
    }

    if (tab === 'predictions') {
      setTimeout(() => this.renderPredictionsChart(), 0);
    }
  }

  selectHorizon(hours: number): void {
    this.selectedHorizon = hours;
    if (this.activeTab === 'predictions') {
      setTimeout(() => this.renderPredictionsChart(), 0);
    }
  }

  private loadHistory(): void {
    this.isLoadingHistory = true;
    this.parkingService.getHistory(this.parking.id, 48).subscribe({
      next: (data) => {
        this.history = data.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        this.isLoadingHistory = false;
        setTimeout(() => this.renderHistoryChart(), 0);
      },
      error: (error) => {
        console.error('Erreur chargement historique:', error);
        this.isLoadingHistory = false;
      },
    });
  }

  private loadPredictions(): void {
    this.isLoadingPredictions = true;
    this.parkingService.getPredictions(this.parking.id, 48).subscribe({
      next: (data) => {
        this.predictions = data.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        );
        this.isLoadingPredictions = false;
        setTimeout(() => this.renderPredictionsChart(), 0);
      },
      error: (error) => {
        console.error('Erreur chargement prédictions:', error);
        this.isLoadingPredictions = false;
      },
    });
  }

  private renderHistoryChart(): void {
    const canvas = document.getElementById('historyChart') as HTMLCanvasElement | null;
    if (!canvas || this.history.length === 0) return;

    if (this.historyChart) {
      this.historyChart.destroy();
    }

    const labels = this.history.map((record) => {
      const date = new Date(record.time);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    });

    const occupiedData = this.history.map((record) => record.occupied_spaces);

    this.historyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Places occupées',
            data: occupiedData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.13)',
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: this.parking.total,
            ticks: { font: { size: 12 } },
          },
          x: {
            ticks: { font: { size: 11 } },
          },
        },
      },
    });
  }

  private renderPredictionsChart(): void {
    const canvas = document.getElementById('predictionsChart') as HTMLCanvasElement | null;
    if (!canvas || this.predictions.length === 0) return;

    if (this.predictionsChart) {
      this.predictionsChart.destroy();
    }

    const filtered = this.filteredPredictions;
    if (filtered.length === 0) return;

    const labels = filtered.map((record) => {
      const date = new Date(record.time);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    });

    const predicted = filtered.map((record) => record.predicted_occupied);
    const lower = filtered.map((record) => record.predicted_lower_bound);
    const upper = filtered.map((record) => record.predicted_upper_bound);

    this.predictionsChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Borne basse',
            data: lower,
            borderColor: 'transparent',
            backgroundColor: 'rgba(59, 130, 246, 0.18)',
            fill: '+1',
            pointRadius: 0,
            tension: 0.35,
          },
          {
            label: 'Prédiction',
            data: predicted,
            borderColor: '#1d4ed8',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#1d4ed8',
          },
          {
            label: 'Borne haute',
            data: upper,
            borderColor: 'transparent',
            backgroundColor: 'rgba(59, 130, 246, 0.18)',
            pointRadius: 0,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: Math.max(...upper, 100),
            ticks: { font: { size: 12 } },
          },
          x: {
            ticks: { font: { size: 11 } },
          },
        },
      },
    });
  }

  get occupancyRate(): number {
    return Math.round(((this.parking.total - this.parking.free) / this.parking.total) * 100);
  }

  get freePercentage(): number {
    return 100 - this.occupancyRate;
  }

  get predictionAdvice(): string {
    const next = this.filteredPredictions[0]?.predicted_occupied ?? 0;
    if (next >= 80) {
      return 'Affluence élevée : pensez à choisir un parking alternatif.';
    }
    if (next >= 60) {
      return 'Affluence modérée : partez un peu plus tôt.';
    }
    return 'Bonne disponibilité prévue pour les prochaines heures.';
  }

  closePanel(): void {
    this.close.emit();
  }

  get statusLabel(): string {
    if (this.parking?.status === 'OUVERT') return 'Ouvert';
    if (this.parking?.status === 'FERME') return 'Fermé';
    return this.parking?.status || 'Inconnu';
  }

  get statusBadgeClass(): string {
    if (this.occupancyRate >= 80) return 'status-critical';
    if (this.occupancyRate >= 60) return 'status-warning';
    return 'status-good';
  }

  goToHistory(): void {
    if (!this.parking?.id) return;
    this.parkingService.selectedParking = this.parking;
    this.router.navigate(['/history', this.parking.id]);
  }

  goToPredictions(): void {
    if (!this.parking?.id) return;
    this.parkingService.selectedParking = this.parking;
    this.router.navigate(['/predictions', this.parking.id]);
  }
}

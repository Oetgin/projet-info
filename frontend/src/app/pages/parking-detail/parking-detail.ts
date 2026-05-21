// import { Component, EventEmitter, Input, OnInit, Output, AfterViewInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import {
//   ParkingService,
//   HistoryRecord,
//   PredictionRecord,
//   Parking,
// } from '../../services/parking.service';
// import Chart from 'chart.js/auto';

// @Component({
//   selector: 'app-parking-detail',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './parking-detail.html',
//   styleUrls: ['./parking-detail.css'],
// })
// export class ParkingDetailComponent implements OnInit, AfterViewInit {
//   @Input() parking!: Parking;
//   @Output() close = new EventEmitter<void>();

//   activeTab: 'history' | 'predictions' = 'history';
//   history: HistoryRecord[] = [];
//   predictions: PredictionRecord[] = [];
//   historyLoaded = false;
//   predictionsLoaded = false;
//   isLoadingHistory = false;
//   isLoadingPredictions = false;
//   historyChart: Chart | null = null;
//   predictionsChart: Chart | null = null;
//   selectedHorizon = 0.5;
//   horizonOptions = [0.5, 1, 2, 3, 4, 5];
//   readonly historyWindowHours = 5;

//   get horizonLabel(): string {
//     if (this.selectedHorizon === 0.5) return '30 min';
//     if (this.selectedHorizon === 1) return '1h';
//     return `${this.selectedHorizon}h`;
//   }

//   constructor(
//     private router: Router,
//     private parkingService: ParkingService,
//   ) {}

//   ngOnInit(): void {
//     if (this.parking?.id) {
//       // Ne pas charger automatiquement l’historique à l’ouverture du panneau de détails.
//       // Les données sont chargées à la demande lorsque l’utilisateur clique sur l’onglet correspondant.
//       if (this.activeTab === 'predictions') {
//         this.loadPredictions();
//       }
//     }
//   }

//   ngAfterViewInit(): void {
//     setTimeout(() => {
//       if (this.activeTab === 'history') {
//         this.renderHistoryChart();
//       } else {
//         this.renderPredictionsChart();
//       }
//     }, 0);
//   }

//   get filteredPredictions(): PredictionRecord[] {
//     if (!this.predictions.length) {
//       return [];
//     }
//     const refIso = this.parkingService.referenceTime ?? this.predictions[0].time;
//     const startTime = new Date(refIso).getTime();
//     const horizonMs = this.selectedHorizon * 60 * 60 * 1000;

//     return this.predictions.filter((record) => {
//       const timestamp = new Date(record.time).getTime();
//       return timestamp - startTime <= horizonMs;
//     });
//   }

//   get previewHistory(): HistoryRecord[] {
//     return this.history.slice(0, 6);
//   }

//   get routeAvailable(): boolean {
//     return !!this.parkingService.userLocation;
//   }

//   get routeDistance(): number | null {
//     return this.parking.distance ?? null;
//   }

//   openRoute(): void {
//     if (!this.parking || !this.routeAvailable) {
//       return;
//     }
//     const url = this.parkingService.getDrivingDirectionsUrl(this.parking);
//     if (url) {
//       window.open(url, '_blank');
//     }
//   }

//   selectTab(tab: 'history' | 'predictions'): void {
//     this.activeTab = tab;

//     if (tab === 'history') {
//       if (!this.historyLoaded) {
//         this.loadHistory();
//       } else {
//         setTimeout(() => this.renderHistoryChart(), 0);
//       }
//       return;
//     }

//     if (tab === 'predictions') {
//       if (!this.predictionsLoaded) {
//         this.loadPredictions();
//       } else {
//         setTimeout(() => this.renderPredictionsChart(), 0);
//       }
//     }
//   }

//   selectHorizon(hours: number): void {
//     this.selectedHorizon = hours;
//     if (this.activeTab === 'predictions') {
//       setTimeout(() => this.renderPredictionsChart(), 0);
//     }
//   }

//   private loadHistory(): void {
//     this.isLoadingHistory = true;
//     const refIso = this.parkingService.referenceTime ?? new Date().toISOString();
//     const refTs = new Date(refIso).getTime();

//     this.parkingService.getHistory(this.parking.id, 48, refIso).subscribe({
//       next: (data) => {
//         this.historyLoaded = true;
//         // align timestamps if backend timestamps appear shifted relative to ref
//         const aligned = this.alignTimestampsToRef(data, refTs, 'past');
//         // keep records from the last 5 hours until the reference time, descending
//         const windowMs = this.historyWindowHours * 60 * 60 * 1000;
//         this.history = aligned
//           .filter((r) => {
//             const ts = new Date(r.time).getTime();
//             return ts <= refTs && ts >= refTs - windowMs;
//           })
//           .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
//         this.isLoadingHistory = false;
//         setTimeout(() => this.renderHistoryChart(), 0);
//       },
//       error: (error) => {
//         console.error('Erreur chargement historique:', error);
//         this.isLoadingHistory = false;
//       },
//     });
//   }

//   private loadPredictions(): void {
//     this.isLoadingPredictions = true;
//     const refIso = this.parkingService.referenceTime ?? new Date().toISOString();
//     const refTs = new Date(refIso).getTime();

//     this.parkingService.getPredictions(this.parking.id, 48, refIso).subscribe({
//       next: (data) => {
//         this.predictionsLoaded = true;
//         // align timestamps if backend timestamps appear shifted relative to ref
//         const aligned = this.alignTimestampsToRef(data, refTs, 'future');
//         // keep records from the reference time forward and order ascending (projections futures)
//         this.predictions = aligned
//           .filter((r) => new Date(r.time).getTime() >= refTs)
//           .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
//         this.isLoadingPredictions = false;
//         setTimeout(() => this.renderPredictionsChart(), 0);
//       },
//       error: (error) => {
//         console.error('Erreur chargement prédictions:', error);
//         this.isLoadingPredictions = false;
//       },
//     });
//   }

//   private renderHistoryChart(): void {
//     const canvas = document.getElementById('historyChart') as HTMLCanvasElement | null;
//     if (!canvas || this.history.length === 0) return;

//     if (this.historyChart) {
//       this.historyChart.destroy();
//     }

//     const labels = this.history.map((record) => {
//       const date = new Date(record.time);
//       return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
//     });

//     const occupiedData = this.history.map((record) => record.occupied_spaces);

//     this.historyChart = new Chart(canvas, {
//       type: 'line',
//       data: {
//         labels,
//         datasets: [
//           {
//             label: 'Places occupées',
//             data: occupiedData,
//             borderColor: '#2563eb',
//             backgroundColor: 'rgba(37, 99, 235, 0.13)',
//             borderWidth: 2,
//             fill: true,
//             tension: 0.35,
//             pointRadius: 0,
//             pointHoverRadius: 6,
//           },
//         ],
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: {
//           legend: { display: false },
//         },
//         scales: {
//           y: {
//             beginAtZero: true,
//             max: this.parking.total,
//             ticks: { font: { size: 12 } },
//           },
//           x: {
//             ticks: { font: { size: 11 } },
//           },
//         },
//       },
//     });
//   }

//   private renderPredictionsChart(): void {
//     const canvas = document.getElementById('predictionsChart') as HTMLCanvasElement | null;
//     if (!canvas || this.predictions.length === 0) return;

//     if (this.predictionsChart) {
//       this.predictionsChart.destroy();
//     }

//     const filtered = this.filteredPredictions;
//     if (filtered.length === 0) return;

//     const labels = filtered.map((record) => {
//       const date = new Date(record.time);
//       return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
//     });

//     const predicted = filtered.map((record) => record.predicted_occupied);
//     const lower = filtered.map((record) => record.predicted_lower_bound);
//     const upper = filtered.map((record) => record.predicted_upper_bound);

//     this.predictionsChart = new Chart(canvas, {
//       type: 'line',
//       data: {
//         labels,
//         datasets: [
//           {
//             label: 'Borne basse',
//             data: lower,
//             borderColor: 'transparent',
//             backgroundColor: 'rgba(59, 130, 246, 0.18)',
//             fill: '+1',
//             pointRadius: 0,
//             tension: 0.35,
//           },
//           {
//             label: 'Prédiction',
//             data: predicted,
//             borderColor: '#1d4ed8',
//             backgroundColor: 'rgba(37, 99, 235, 0.08)',
//             borderWidth: 2,
//             fill: false,
//             tension: 0.35,
//             pointRadius: 3,
//             pointBackgroundColor: '#1d4ed8',
//           },
//           {
//             label: 'Borne haute',
//             data: upper,
//             borderColor: 'transparent',
//             backgroundColor: 'rgba(59, 130, 246, 0.18)',
//             pointRadius: 0,
//             tension: 0.35,
//           },
//         ],
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: {
//           legend: { display: false },
//         },
//         scales: {
//           y: {
//             beginAtZero: true,
//             max: Math.max(...upper, 100),
//             ticks: { font: { size: 12 } },
//           },
//           x: {
//             ticks: { font: { size: 11 } },
//           },
//         },
//       },
//     });
//   }

//   get occupancyRate(): number {
//     return Math.round(((this.parking.total - this.parking.free) / this.parking.total) * 100);
//   }

//   get freePercentage(): number {
//     return 100 - this.occupancyRate;
//   }

//   get predictionAdvice(): string {
//     const next = this.filteredPredictions[0]?.predicted_occupied ?? 0;
//     if (next >= 80) {
//       return 'Affluence élevée : pensez à choisir un parking alternatif.';
//     }
//     if (next >= 60) {
//       return 'Affluence modérée : partez un peu plus tôt.';
//     }
//     return 'Bonne disponibilité prévue pour les prochaines heures.';
//   }

//   closePanel(): void {
//     this.close.emit();
//   }

//   private alignTimestampsToRef<T extends { time: string }>(records: T[], refTs: number, mode: 'future' | 'past'): T[] {
//     if (!records || !records.length) return records;

//     const times = records.map((r) => new Date(r.time).getTime());
//     const first = times[0];
//     const last = times[times.length - 1];

//     // For predictions (future), ensure first record >= refTs (allow small tolerance)
//     // For history (past), ensure last record <= refTs
//     const tolerance = 5 * 60 * 1000; // 5 minutes

//     let offset = 0;
//     if (mode === 'future') {
//       if (first < refTs - tolerance) {
//         offset = refTs - first;
//       }
//     } else {
//       if (last > refTs + tolerance) {
//         offset = refTs - last;
//       }
//     }

//     if (offset === 0) return records;

//     // Apply offset (ms) to all records
//     return records.map((r) => ({ ...r, time: new Date(new Date(r.time).getTime() + offset).toISOString() }));
//   }

//   get statusLabel(): string {
//     if (this.parking?.status === 'OUVERT') return 'Ouvert';
//     if (this.parking?.status === 'FERME') return 'Fermé';
//     return this.parking?.status || 'Inconnu';
//   }

//   get statusBadgeClass(): string {
//     if (this.occupancyRate >= 80) return 'status-critical';
//     if (this.occupancyRate >= 60) return 'status-warning';
//     return 'status-good';
//   }

//   goToHistory(): void {
//     if (!this.parking?.id) return;
//     this.parkingService.setReferenceTime(new Date().toISOString());
//     this.parkingService.selectedParking = this.parking;
//     this.router.navigate(['/history', this.parking.id]);
//   }

//   goToPredictions(): void {
//     if (!this.parking?.id) return;
//     this.parkingService.setReferenceTime(new Date().toISOString());
//     this.parkingService.selectedParking = this.parking;
//     this.router.navigate(['/predictions', this.parking.id]);
//   }
// }

import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import {
  HistoryRecord,
  Parking,
  ParkingService,
  PredictionRecord,
} from '../../services/parking.service';

@Component({
  selector: 'app-parking-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parking-detail.html',
  styleUrls: ['./parking-detail.css'],
})
export class ParkingDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() parking!: Parking;
  @Output() close = new EventEmitter<void>();

  @ViewChild('historyCanvas') historyCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('predictionsCanvas') predictionsCanvas?: ElementRef<HTMLCanvasElement>;

  activeTab: 'history' | 'predictions' = 'history';
  history: HistoryRecord[] = [];
  predictions: PredictionRecord[] = [];
  historyLoaded = false;
  predictionsLoaded = false;
  isLoadingHistory = false;
  isLoadingPredictions = false;
  historyChart: Chart | null = null;
  predictionsChart: Chart | null = null;
  selectedHorizon = 0.5;
  horizonOptions = [0.5, 1, 2, 3, 4, 5];
  readonly historyWindowHours = 5;

  constructor(
    private router: Router,
    private parkingService: ParkingService,
  ) {}

  ngOnInit(): void {
    if (this.parking?.id && this.activeTab === 'predictions') {
      this.loadPredictions();
    }
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'history' && !this.historyLoaded) {
      this.loadHistory();
    } else if (this.activeTab === 'history') {
      this.queueHistoryRender();
    } else if (this.activeTab === 'predictions' && this.predictionsLoaded) {
      this.queuePredictionsRender();
    }
  }

  ngOnDestroy(): void {
    this.destroyHistoryChart();
    this.destroyPredictionsChart();
  }

  get horizonLabel(): string {
    if (this.selectedHorizon === 0.5) return '30 min';
    if (this.selectedHorizon === 1) return '1h';
    return `${this.selectedHorizon}h`;
  }

  get filteredPredictions(): PredictionRecord[] {
    if (!this.predictions.length) {
      return [];
    }

    const refIso = this.parkingService.referenceTime ?? this.predictions[0].time;
    const startTime = new Date(refIso).getTime();
    const horizonMs = this.selectedHorizon * 60 * 60 * 1000;

    return this.predictions.filter((record) => {
      const timestamp = new Date(record.time).getTime();
      return timestamp - startTime <= horizonMs;
    });
  }

  get previewHistory(): HistoryRecord[] {
    return this.history.slice(0, 6);
  }

  get routeAvailable(): boolean {
    return !!this.parkingService.userLocation;
  }

  get routeDistance(): number | null {
    return this.parking.distance ?? null;
  }

  get occupancyRate(): number {
    if (!this.parking?.total) return 0;
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
      this.destroyPredictionsChart();

      if (!this.historyLoaded) {
        this.loadHistory();
      } else {
        this.queueHistoryRender();
      }
      return;
    }

    this.destroyHistoryChart();

    if (!this.predictionsLoaded) {
      this.loadPredictions();
    } else {
      this.queuePredictionsRender();
    }
  }

  selectHorizon(hours: number): void {
    this.selectedHorizon = hours;

    if (this.activeTab === 'predictions') {
      this.queuePredictionsRender();
    }
  }

  closePanel(): void {
    this.close.emit();
  }

  goToHistory(): void {
    if (!this.parking?.id) return;
    this.parkingService.setReferenceTime(new Date().toISOString());
    this.parkingService.selectedParking = this.parking;
    this.router.navigate(['/history', this.parking.id]);
  }

  goToPredictions(): void {
    if (!this.parking?.id) return;
    this.parkingService.setReferenceTime(new Date().toISOString());
    this.parkingService.selectedParking = this.parking;
    this.router.navigate(['/predictions', this.parking.id]);
  }

  private loadHistory(): void {
    this.isLoadingHistory = true;
    const refIso = this.parkingService.referenceTime ?? new Date().toISOString();
    const refTs = new Date(refIso).getTime();

    this.parkingService.getHistory(this.parking.id, 48, refIso).subscribe({
      next: (data) => {
        this.historyLoaded = true;

        const aligned = this.alignTimestampsToRef(data, refTs, 'past');
        const windowMs = this.historyWindowHours * 60 * 60 * 1000;

        this.history = aligned
          .filter((r) => {
            const ts = new Date(r.time).getTime();
            return ts <= refTs && ts >= refTs - windowMs;
          })
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        this.isLoadingHistory = false;
        this.queueHistoryRender();
      },
      error: (error) => {
        console.error('Erreur chargement historique:', error);
        this.isLoadingHistory = false;
        this.historyLoaded = true;
        this.destroyHistoryChart();
      },
    });
  }

  private loadPredictions(): void {
    this.isLoadingPredictions = true;
    const refIso = this.parkingService.referenceTime ?? new Date().toISOString();
    const refTs = new Date(refIso).getTime();

    this.parkingService.getPredictions(this.parking.id, 48, refIso).subscribe({
      next: (data) => {
        this.predictionsLoaded = true;

        const aligned = this.alignTimestampsToRef(data, refTs, 'future');

        this.predictions = aligned
          .filter((r) => new Date(r.time).getTime() >= refTs)
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        this.isLoadingPredictions = false;
        this.queuePredictionsRender();
      },
      error: (error) => {
        console.error('Erreur chargement prédictions:', error);
        this.isLoadingPredictions = false;
        this.predictionsLoaded = true;
        this.destroyPredictionsChart();
      },
    });
  }

  private queueHistoryRender(): void {
    setTimeout(() => this.renderHistoryChart(), 0);
  }

  private queuePredictionsRender(): void {
    setTimeout(() => this.renderPredictionsChart(), 0);
  }

  private renderHistoryChart(): void {
    const canvas = this.historyCanvas?.nativeElement;
    if (!canvas || this.history.length === 0 || this.activeTab !== 'history') {
      this.destroyHistoryChart();
      return;
    }

    this.destroyHistoryChart();

    const labels = this.history.map((record) =>
      new Date(record.time).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );

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
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: this.parking.total,
            ticks: { font: { size: 12 } },
            grid: { color: 'rgba(148, 163, 184, 0.16)' },
          },
          x: {
            ticks: {
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
            },
            grid: { display: false },
          },
        },
      },
    });
  }

  private renderPredictionsChart(): void {
    const canvas = this.predictionsCanvas?.nativeElement;
    const filtered = this.filteredPredictions;

    if (!canvas || filtered.length === 0 || this.activeTab !== 'predictions') {
      this.destroyPredictionsChart();
      return;
    }

    this.destroyPredictionsChart();

    const labels = filtered.map((record) =>
      new Date(record.time).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );

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
            backgroundColor: 'rgba(59, 130, 246, 0.14)',
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
            pointRadius: 2,
            pointHoverRadius: 5,
            pointBackgroundColor: '#1d4ed8',
          },
          {
            label: 'Borne haute',
            data: upper,
            borderColor: 'transparent',
            backgroundColor: 'rgba(59, 130, 246, 0.14)',
            pointRadius: 0,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(...upper, this.parking.total, 100),
            ticks: { font: { size: 12 } },
            grid: { color: 'rgba(148, 163, 184, 0.16)' },
          },
          x: {
            ticks: {
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
            },
            grid: { display: false },
          },
        },
      },
    });
  }

  private destroyHistoryChart(): void {
    if (this.historyChart) {
      this.historyChart.destroy();
      this.historyChart = null;
    }
  }

  private destroyPredictionsChart(): void {
    if (this.predictionsChart) {
      this.predictionsChart.destroy();
      this.predictionsChart = null;
    }
  }

  private alignTimestampsToRef<T extends { time: string }>(
    records: T[],
    refTs: number,
    mode: 'future' | 'past',
  ): T[] {
    if (!records?.length) return records;

    const times = records.map((r) => new Date(r.time).getTime());
    const first = times[0];
    const last = times[times.length - 1];
    const tolerance = 5 * 60 * 1000;

    let offset = 0;

    if (mode === 'future') {
      if (first < refTs - tolerance) {
        offset = refTs - first;
      }
    } else {
      if (last > refTs + tolerance) {
        offset = refTs - last;
      }
    }

    if (offset === 0) return records;

    return records.map((r) => ({
      ...r,
      time: new Date(new Date(r.time).getTime() + offset).toISOString(),
    }));
  }
}

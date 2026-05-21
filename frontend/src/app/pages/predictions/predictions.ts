import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import Chart from 'chart.js/auto';
import { ParkingService, PredictionRecord } from '../../services/parking.service';

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predictions.html',
  styleUrls: ['./predictions.css'],
})
export class PredictionsComponent implements OnInit, AfterViewInit {
  parkingId = '';
  parkingName = '';
  predictions: PredictionRecord[] = [];
  isLoading = false;
  selectedHorizon = 0.5;
  horizonOptions = [0.5, 1, 2, 3, 4, 5];
  private chart?: Chart;
  private parkingTotal = 0;
  private parkingFree = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private parkingService: ParkingService,
  ) {}

  private alignTimestampsToRef<T extends { time: string }>(
    records: T[],
    refTs: number,
    mode: 'future' | 'past',
  ): T[] {
    if (!records || !records.length) return records;

    const times = records.map((r) => new Date(r.time).getTime());
    const first = times[0];
    const last = times[times.length - 1];

    const tolerance = 5 * 60 * 1000; // 5 minutes
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

  ngOnInit(): void {
    this.parkingId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.parkingService.selectedParking?.id === this.parkingId) {
      this.parkingName = this.parkingService.selectedParking.name;
      this.parkingTotal = this.parkingService.selectedParking.total;
      this.parkingFree = this.parkingService.selectedParking.free;
    }
    this.loadPredictions();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderChart(), 0);
  }

  get displayPredictions(): PredictionRecord[] {
    if (!this.predictions.length) {
      return [];
    }
    const refIso = this.parkingService.referenceTime ?? this.predictions[0].time;
    const startTime = new Date(refIso).getTime();
    const horizonMs = this.selectedHorizon * 60 * 60 * 1000;

    return this.predictions.filter((record) => {
      const recordTime = new Date(record.time).getTime();
      return recordTime - startTime <= horizonMs;
    });
  }

  get currentFree(): number {
    if (this.parkingFree) {
      return this.parkingFree;
    }
    if (!this.predictions.length) {
      return 0;
    }
    const firstTotal = this.predictions[0].total_spaces ?? 0;
    const firstOccupied = this.predictions[0].predicted_occupied ?? 0;
    return Math.max(firstTotal - firstOccupied, 0);
  }

  get meanOccupied(): number {
    const target = this.displayPredictions.length ? this.displayPredictions : this.predictions;
    if (!target.length) return 0;
    return Math.round(
      target.reduce((sum, item) => sum + item.predicted_occupied, 0) / target.length,
    );
  }

  get minBound(): number {
    const target = this.displayPredictions.length ? this.displayPredictions : this.predictions;
    if (!target.length) return 0;
    return Math.min(...target.map((p) => p.predicted_lower_bound));
  }

  get maxBound(): number {
    const target = this.displayPredictions.length ? this.displayPredictions : this.predictions;
    if (!target.length) return 0;
    return Math.max(...target.map((p) => p.predicted_upper_bound));
  }

  get advice(): string {
    const next =
      this.displayPredictions[0]?.predicted_occupied ??
      this.predictions[0]?.predicted_occupied ??
      0;
    if (next >= 80) {
      return 'Affluence élevée prévue : privilégier les parkings alternatifs.';
    }
    if (next >= 60) {
      return 'Affluence modérée : partez un peu plus tôt.';
    }
    return 'Disponibilité stable prévue.';
  }

  get horizonLabel(): string {
    if (this.selectedHorizon === 0.5) return '30 min';
    if (this.selectedHorizon === 1) return '1h';
    return `${this.selectedHorizon}h`;
  }

  getLevelClass(occ: number): 'good' | 'mid' | 'high' {
    if (occ >= 80) return 'high';
    if (occ >= 60) return 'mid';
    return 'good';
  }

  getLevelLabel(occ: number): string {
    if (occ >= 80) return 'Élevée';
    if (occ >= 60) return 'Modérée';
    return 'Bonne';
  }

  goBack(): void {
    this.router.navigate(['/map']);
  }

  selectHorizon(hours: number): void {
    this.selectedHorizon = hours;
    setTimeout(() => this.renderChart(), 0);
  }

  private loadPredictions(): void {
    if (!this.parkingId) return;
    this.isLoading = true;
    const refIso = this.parkingService.referenceTime ?? new Date().toISOString();
    const refTs = new Date(refIso).getTime();

    this.parkingService.getPredictions(this.parkingId, 48, refIso).subscribe({
      next: (items: PredictionRecord[]) => {
        // align timestamps if backend timestamps appear shifted relative to ref
        const aligned = this.alignTimestampsToRef(items, refTs, 'future');
        // keep records from the reference time forward and order ascending
        this.predictions = aligned
          .filter((r) => new Date(r.time).getTime() >= refTs)
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        this.parkingFree = this.parkingService.selectedParking?.free ?? this.parkingFree;
        this.parkingTotal = this.parkingService.selectedParking?.total ?? this.parkingTotal;
        this.isLoading = false;
        setTimeout(() => this.renderChart(), 0);
      },
      error: (error: unknown) => {
        console.error('Erreur chargement des prédictions :', error);
        this.isLoading = false;
      },
    });
  }

  private renderChart(): void {
    const canvas = document.getElementById('occChart') as HTMLCanvasElement | null;
    if (!canvas || !this.predictions.length) return;

    const labels = this.displayPredictions.map((item) =>
      new Date(item.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    );
    const occupiedData = this.displayPredictions.map((item) => item.predicted_occupied);
    const lowerData = this.displayPredictions.map((item) => item.predicted_lower_bound);
    const upperData = this.displayPredictions.map((item) => item.predicted_upper_bound);

    this.chart?.destroy();

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Borne basse',
            data: lowerData,
            borderColor: 'transparent',
            backgroundColor: 'rgba(37, 99, 235, 0.16)',
            fill: '+1',
            pointRadius: 0,
            tension: 0.35,
          },
          {
            label: 'Prédiction',
            data: occupiedData,
            borderColor: '#1d4ed8',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#1d4ed8',
          },
          {
            label: 'Borne haute',
            data: upperData,
            borderColor: 'transparent',
            backgroundColor: 'rgba(37, 99, 235, 0.16)',
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
          x: {
            ticks: { font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            max: Math.max(...upperData, 100),
            ticks: { font: { size: 12 } },
          },
        },
      },
    });
  }
}

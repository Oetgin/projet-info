import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { ParkingService, HistoryRecord } from '../../services/parking.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.html',
  styleUrls: ['../predictions/predictions.css'],
})
export class HistoryComponent implements OnInit, AfterViewInit {
  parkingId = '';
  parkingName = '';
  history: HistoryRecord[] = [];
  isLoading = false;
  private chart?: Chart;
  private readonly historyWindowHours = 5;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parkingService: ParkingService,
  ) {}

  ngOnInit(): void {
    this.parkingId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.parkingService.selectedParking?.id === this.parkingId) {
      this.parkingName = this.parkingService.selectedParking.name;
    }
    this.loadHistory();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderChart(), 0);
  }

  get displayHistory(): HistoryRecord[] {
    return this.history;
  }

  get currentFreePlaces(): number {
    if (!this.history.length) return 0;
    const latest = this.history[0];
    return latest.total_spaces - latest.occupied_spaces;
  }

  get minOccupied(): number {
    if (!this.displayHistory.length) return 0;
    return Math.min(...this.displayHistory.map((h) => h.occupied_spaces));
  }

  get maxOccupied(): number {
    if (!this.displayHistory.length) return 0;
    return Math.max(...this.displayHistory.map((h) => h.occupied_spaces));
  }

  get averageOccupied(): number {
    if (!this.displayHistory.length) return 0;
    return Math.round(
      this.displayHistory.reduce((sum, item) => sum + item.occupied_spaces, 0) /
        this.displayHistory.length,
    );
  }

  get periodLabel(): string {
    return `${this.historyWindowHours}h`;
  }

  goBack(): void {
    this.router.navigate(['/map']);
  }

  private loadHistory(): void {
    if (!this.parkingId) return;
    this.isLoading = true;
    const refIso = this.parkingService.referenceTime ?? new Date().toISOString();
    const refTs = new Date(refIso).getTime();
    const windowMs = this.historyWindowHours * 60 * 60 * 1000;

    this.parkingService.getHistory(this.parkingId, 96, refIso).subscribe({
      next: (items) => {
        this.history = items
          .map((record) => ({
            ...record,
            time: this.parkingService.normalizeApiTime(record.time).toISOString(),
          }))
          .filter((r) => {
            const ts = new Date(r.time).getTime();
            return ts <= refTs && ts >= refTs - windowMs;
          })
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        this.isLoading = false;
        setTimeout(() => this.renderChart(), 0);
      },
      error: (error) => {
        console.error('Erreur chargement historique :', error);
        this.isLoading = false;
      },
    });
  }

  private renderChart(): void {
    const canvas = document.getElementById('historyChart') as HTMLCanvasElement | null;
    if (!canvas || !this.displayHistory.length) return;

    const labels = this.displayHistory.map((item) =>
      new Date(item.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    );
    const occupiedData = this.displayHistory.map((item) => item.occupied_spaces);

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Places occupées',
            data: occupiedData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
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
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(...occupiedData, 100),
            ticks: { font: { size: 12 } },
          },
          x: {
            ticks: { font: { size: 11 } },
          },
        },
      },
    });
  }
}

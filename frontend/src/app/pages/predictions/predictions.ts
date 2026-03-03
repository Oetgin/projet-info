import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import Chart from 'chart.js/auto';

type Point = { hour: string; occupancy: number };

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predictions.html',
  styleUrls: ['./predictions.css'],
})
export class PredictionsComponent implements AfterViewInit, OnInit {

  private chart?: Chart;
  parkingId!: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.parkingId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  // ===== MOCK DATA =====

  history: Point[] = [
    { hour: '00h', occupancy: 35 },
    { hour: '03h', occupancy: 22 },
    { hour: '06h', occupancy: 28 },
    { hour: '09h', occupancy: 78 },
    { hour: '12h', occupancy: 66 },
    { hour: '15h', occupancy: 72 },
    { hour: '18h', occupancy: 88 },
    { hour: '21h', occupancy: 55 },
    { hour: '23h', occupancy: 40 },
  ];

  forecast: Point[] = [
    { hour: '+1h', occupancy: 62 },
    { hour: '+2h', occupancy: 74 },
    { hour: '+3h', occupancy: 81 },
    { hour: '+4h', occupancy: 69 },
  ];

  // ===== NAVIGATION =====

  goBack() {
    this.router.navigate(['/parking', this.parkingId]);
  }

  // ===== KPI =====

  get globalRate(): number {
    const avg =
      this.history.reduce((sum, p) => sum + p.occupancy, 0) /
      this.history.length;
    return Math.round(avg);
  }

  get peakHour(): string {
    const peak = [...this.history].sort(
      (a, b) => b.occupancy - a.occupancy
    )[0];
    return peak?.hour ?? '--';
  }

  get advice(): string {
    const next = this.forecast[0]?.occupancy ?? 0;

    if (next >= 80)
      return 'Affluence élevée : privilégier les parkings en périphérie.';
    if (next >= 60)
      return 'Affluence modérée : prévoir un peu d’avance.';
    return 'Bonne disponibilité : conditions favorables pour se garer.';
  }

  // ===== COULEUR LOGIQUE =====

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

  // ===== CHART =====

  private renderChart() {
    const canvas = document.getElementById('occChart') as HTMLCanvasElement | null;
    if (!canvas) return;

    const labels = this.history.map(p => p.hour);
    const data = this.history.map(p => p.occupancy);

    this.chart?.destroy();

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Occupation (%) - 24h',
            data,
            tension: 0.35,
            borderWidth: 2,
            fill: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100
          }
        }
      }
    });
  }
}
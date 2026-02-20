import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';

type Point = { hour: string; occupancy: number };

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predictions.html',
  styleUrls: ['./predictions.css'],
})
export class PredictionsComponent implements AfterViewInit {

  private chart?: Chart;

  // Mock: 24h historique
  history: Point[] = [
    { hour: '00h', occupancy: 35 }, { hour: '03h', occupancy: 22 },
    { hour: '06h', occupancy: 28 }, { hour: '09h', occupancy: 78 },
    { hour: '12h', occupancy: 66 }, { hour: '15h', occupancy: 72 },
    { hour: '18h', occupancy: 88 }, { hour: '21h', occupancy: 55 },
    { hour: '23h', occupancy: 40 },
  ];

  // Mock: prochaines heures
  forecast: Point[] = [
    { hour: '+1h', occupancy: 62 },
    { hour: '+2h', occupancy: 74 },
    { hour: '+3h', occupancy: 81 },
    { hour: '+4h', occupancy: 69 },
  ];

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.renderChart();
  }

  goBack() {
    this.router.navigate(['/map']);
  }

  // KPI: taux global moyen
  get globalRate(): number {
    const avg = this.history.reduce((s, p) => s + p.occupancy, 0) / this.history.length;
    return Math.round(avg);
  }

  // KPI: heure de pointe
  get peakHour(): string {
    const peak = [...this.history].sort((a, b) => b.occupancy - a.occupancy)[0];
    return peak?.hour ?? '--';
  }

  // KPI: conseil simple
  get advice(): string {
    const next = this.forecast[0]?.occupancy ?? 0;
    if (next >= 80) return 'Affluence élevée : privilégier les parkings en périphérie.';
    if (next >= 60) return 'Affluence modérée : prévoir un peu d’avance.';
    return 'Bonne disponibilité : conditions favorables pour se garer.';
  }

  // Couleurs (good / mid / high)
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
        datasets: [{
          label: 'Occupation (%) - 24h',
          data,
          tension: 0.35,
          fill: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100 }
        }
      }
    });
  }
}
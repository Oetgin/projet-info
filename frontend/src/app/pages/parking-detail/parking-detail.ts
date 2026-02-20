import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ParkingService } from '../../services/parking.service';

@Component({
  selector: 'app-parking-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parking-detail.html',
  styleUrls: ['./parking-detail.css'],
})
export class ParkingDetailComponent implements OnInit {

  parking: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parkingService: ParkingService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.parking = this.parkingService.selectedParking;

    // Sécurité si refresh direct
    if (!this.parking || this.parking.id !== id) {
      this.router.navigate(['/map']);
    }
  }

  get occupancyRate(): number {
    return Math.round(
      ((this.parking.total - this.parking.free) / this.parking.total) * 100
    );
  }

  goBack() {
    this.router.navigate(['/map']);
  }
}

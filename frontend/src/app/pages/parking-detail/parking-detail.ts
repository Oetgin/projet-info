import { Component, EventEmitter, Input, input, OnInit, Output } from '@angular/core';
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
export class ParkingDetailComponent {
  @Input() parking: any;
  @Output() close = new EventEmitter<void>();

  get occupancyRate(): number {
    return Math.round(((this.parking.total - this.parking.free) / this.parking.total) * 100);
  }

  closePanel() {
    this.close.emit();
  }

  get statusLabel(): string {
    return this.parking?.status === 'Disponible' ? 'Available' : 'Full';
  }
}

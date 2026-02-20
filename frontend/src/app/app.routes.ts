import { Routes } from '@angular/router';
import { MapComponent } from './pages/map/map';
import { ParkingDetailComponent } from './pages/parking-detail/parking-detail';
import { PredictionsComponent } from './pages/predictions/predictions';

export const routes: Routes = [
  { path: '', redirectTo: 'map', pathMatch: 'full' },
  { path: 'map', component: MapComponent },
  { path: 'parking/:id', component: ParkingDetailComponent },
  { path: 'predictions', component: PredictionsComponent }
];


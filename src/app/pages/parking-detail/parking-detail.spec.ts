import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParkingDetailComponent } from './parking-detail';

describe('ParkingDetail', () => {
  let component: ParkingDetailComponent;
  let fixture: ComponentFixture<ParkingDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParkingDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParkingDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

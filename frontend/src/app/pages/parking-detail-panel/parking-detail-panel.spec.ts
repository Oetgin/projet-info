import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParkingDetailPanel } from './parking-detail-panel';

describe('ParkingDetailPanel', () => {
  let component: ParkingDetailPanel;
  let fixture: ComponentFixture<ParkingDetailPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParkingDetailPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParkingDetailPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

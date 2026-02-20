import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictionsComponent } from './predictions';

describe('Predictions', () => {
  let component: PredictionsComponent;
  let fixture: ComponentFixture<PredictionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictionsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

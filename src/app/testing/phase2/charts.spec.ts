import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { GraficosComponent } from '../../components/graficos/graficos.component';
describe('Statistics integrity',()=>{
 const url='https://api-j6b4.onrender.com/api/sessions/stats';
 beforeEach(()=>TestBed.configureTestingModule({imports:[GraficosComponent],providers:[provideHttpClient(),provideHttpClientTesting()]}));
 afterEach(()=>TestBed.inject(HttpTestingController).verify());
 it('does not turn missing API values into invented zeroes',()=>{const fixture=TestBed.createComponent(GraficosComponent);fixture.detectChanges();TestBed.inject(HttpTestingController).expectOne(url).flush({Boxeo:2});expect(fixture.componentInstance.barChartData.datasets[0].data).toEqual([2,null,null,null,null]);expect(fixture.componentInstance.totalSessions).toBe(2);});
 it('keeps the last real data and timestamp when a later refresh fails',()=>{const fixture=TestBed.createComponent(GraficosComponent);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne(url).flush({Boxeo:2});const date=fixture.componentInstance.lastUpdate;fixture.componentInstance.load();http.expectOne(url).flush(null,{status:503,statusText:'Unavailable'});expect(fixture.componentInstance.hasData).toBeTrue();expect(fixture.componentInstance.error).toBeTrue();expect(fixture.componentInstance.lastUpdate).toBe(date);expect(fixture.componentInstance.totalSessions).toBe(2);});
});

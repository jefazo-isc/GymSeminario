import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  imports: [
    CommonModule 
  ],
  selector: 'app-responsables',
  templateUrl: './responsables.component.html',
  styleUrls: ['./responsables.component.css']
})
export class ResponsablesComponent {
  
  defaultStyle = {
    'background-color': '#333333',
    'color': '#ffffff',
    'transform': 'scale(1)',
    'transition': 'transform 0.3s ease, background-color 0.3s ease'
  };

  hoverStyle = {
    'background-color': '#f39c12',
    'color': '#333333',
    'transform': 'scale(1.05)',
    'transition': 'transform 0.3s ease, background-color 0.3s ease'
  };

  currentStylePepe = { ...this.defaultStyle };
  currentStyleLuis = { ...this.defaultStyle };
  currentStyleRicardo = { ...this.defaultStyle };

  onMouseEnterPepe() {
    this.currentStylePepe = this.hoverStyle;
  }

  onMouseLeavePepe() {
    this.currentStylePepe = this.defaultStyle;
  }

  onMouseEnterLuis() {
    this.currentStyleLuis = this.hoverStyle;
  }

  onMouseLeaveLuis() {
    this.currentStyleLuis = this.defaultStyle;
  }

  onMouseEnterRicardo() {
    this.currentStyleRicardo = this.hoverStyle;
  }

  onMouseLeaveRicardo() {
    this.currentStyleRicardo = this.defaultStyle;
  }
}

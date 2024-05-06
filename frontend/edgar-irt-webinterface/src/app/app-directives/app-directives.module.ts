import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollIntoDirective } from './scroll-into/scroll-into.directive';
import { GradientDirective } from './gradient/gradient.directive';

@NgModule({
  declarations: [
    ScrollIntoDirective,
    GradientDirective,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ScrollIntoDirective,
    GradientDirective,
  ]
})
export class AppDirectivesModule { }

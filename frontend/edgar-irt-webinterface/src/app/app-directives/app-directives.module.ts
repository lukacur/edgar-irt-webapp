import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollIntoDirective } from './scroll-into/scroll-into.directive';
import { GradientDirective } from './gradient/gradient.directive';
import { BadgeDirective } from './badge/badge.directive';

@NgModule({
  declarations: [
    ScrollIntoDirective,
    GradientDirective,
    BadgeDirective,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ScrollIntoDirective,
    GradientDirective,
    BadgeDirective,
  ]
})
export class AppDirectivesModule { }

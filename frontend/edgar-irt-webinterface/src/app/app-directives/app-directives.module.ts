import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollIntoDirective } from './scroll-into/scroll-into.directive';

@NgModule({
  declarations: [
    ScrollIntoDirective,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ScrollIntoDirective
  ]
})
export class AppDirectivesModule { }

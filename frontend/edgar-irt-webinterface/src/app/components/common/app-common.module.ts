import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchableSelectComponent } from './searchable-select/searchable-select.component';
import { MatIconModule } from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SingleVariableFunctionVisualizerComponent } from './single-variable-function-visualizer/single-variable-function-visualizer.component';



@NgModule({
  declarations: [
    SearchableSelectComponent,
    SingleVariableFunctionVisualizerComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  exports: [
    SearchableSelectComponent,
    SingleVariableFunctionVisualizerComponent,
  ]
})
export class AppCommonModule { }

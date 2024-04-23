import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchableSelectComponent } from './searchable-select/searchable-select.component';
import { MatIconModule } from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    SearchableSelectComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  exports: [
    SearchableSelectComponent,
  ]
})
export class AppCommonModule { }

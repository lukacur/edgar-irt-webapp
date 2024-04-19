import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarModule } from './navbar/navbar.module';
import { MatButtonModule, MatIconModule } from '@angular/material';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NavbarModule,
    MatIconModule,
    MatButtonModule,
    HttpClientModule,
    BrowserAnimationsModule.withConfig({ disableAnimations: false }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

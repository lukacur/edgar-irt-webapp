import { Component, Input, OnInit } from '@angular/core';
import { IMenuItem } from '../models/menu-item.model.js';

@Component({
  selector: 'app-navbar-item',
  templateUrl: './navbar-item.component.html',
})
export class NavbarItemComponent implements OnInit {
  @Input("menuItem")
  menuItem: IMenuItem = null!;

  constructor() { }

  ngOnInit(): void {
  }

}

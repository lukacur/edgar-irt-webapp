import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { IMenuItem } from '../models/menu-item.model.js';

@Component({
  selector: 'app-navbar-menu',
  templateUrl: './navbar-menu.component.html',
})
export class NavbarMenuComponent implements OnInit {
    menuItems: IMenuItem[] = [];

    @Output("itemSelected")
    itemSelected: EventEmitter<IMenuItem> = new EventEmitter();

    constructor() { }

    ngOnInit(): void {
        this.menuItems.push(
            {
                title: "Jobs",
                navigateTo: ["jobs"],
                tooltip: "Overview, manage and start jobs"
            },
            {
                title: "Statistics",
                navigateTo: ["statistics"],
                tooltip: "Overview question calculation statistics"
            }
        );
    }
}

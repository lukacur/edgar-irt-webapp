import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'edgar-irt-webinterface';

    menuHidden: boolean = false;
    toggleMenu() {
        this.menuHidden = !this.menuHidden;
    }
}

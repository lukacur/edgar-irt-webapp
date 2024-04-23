import { Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-searchable-select',
  templateUrl: './searchable-select.component.html',
})
export class SearchableSelectComponent implements OnInit {
  @Input("selectableItems")
  selectableItems: any[] = null!;

  @Input("valueKey")
  valueKey: string = null!;

  @Input("textKey")
  textKey: string = null!;

  @Input("labelText")
  labelText: string = null!;

  @Input("ngClassObj")
  ngClassObj: { [classes: string]: boolean } = null!;

  @Input("control")
  control: AbstractControl<any, any> = null!;

  @Input("searchable")
  searchable: boolean = false;

  @HostListener('window:keyup', ['$event'])
  listenForEscape(event: KeyboardEvent) {
    if (event.key.toLocaleLowerCase() === "escape") {
      this.clearSearch();
    }
  }

  @HostListener('window:click', ['$event.target'])
  listenForOutClick(clickTarget: HTMLElement) {
    if ((this.choiceList ?? null) !== null && !this.choiceList?.nativeElement.contains(clickTarget)) {
      this.optionsExpanded = false;
    }
  }


  @ViewChild("searchInput")
  searchInput?: ElementRef<HTMLInputElement> | null = null;

  @ViewChild("choiceList")
  choiceList?: ElementRef<HTMLDivElement> | null = null;


  searchTerm: string | null = null;

  selectValue: any = null;
  selectText: any = null;

  optionsExpanded: boolean = false;

  constructor() { }

  ngOnInit(): void {}

  getFilteredItems() {
    return this.selectableItems.filter(
      it => it[this.textKey].toLocaleLowerCase().includes(this.searchTerm?.toLocaleLowerCase() ?? "")
    );
  }

  clearSearch() {
    this.searchTerm = "";
    this.searchInput?.nativeElement.focus();
  }
}
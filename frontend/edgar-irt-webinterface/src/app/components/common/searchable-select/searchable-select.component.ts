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

    @Input("multi")
    multi: boolean = false;

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

    selectedItems: any[] = [];

    selectText: any = null;

    optionsExpanded: boolean = false;

    constructor() { }

    ngOnInit(): void {
        if (this.multi) {
            this.control.setValue(this.selectedItems);
        }
    }

    select(value: any): void {
        if (this.selectedItems.includes(value)) {
            return;
        }

        if (!this.multi) {
            this.selectedItems.splice(0, this.selectedItems.length);
        }

        this.selectedItems.push(value);
    }

    remove(value: any): void {
        const idx = this.selectedItems.indexOf(value);

        if (idx === -1) {
            return;
        }

        this.selectedItems.splice(idx, 1);
    }

    getSelectedItemValues() {
        return (this.multi) ?
            (this.selectedItems.map(it => it[this.valueKey])) :
            ((this.selectedItems.length <= 0) ? null : this.selectedItems[0][this.valueKey]);
    }

    getFilteredItems(): any[] {
        return this.selectableItems
            .filter(
                it => it[this.textKey].toLocaleLowerCase().includes(this.searchTerm?.toLocaleLowerCase() ?? "")
            )
            .filter(it => !this.multi || !this.selectedItems.includes(it));
    }

    clearSearch(): void {
        this.searchTerm = "";
        this.searchInput?.nativeElement.focus();
    }
}

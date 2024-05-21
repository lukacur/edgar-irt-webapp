import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { BehaviorSubject, Subscription } from 'rxjs';

@Component({
    selector: 'app-searchable-select',
    templateUrl: './searchable-select.component.html',
})
export class SearchableSelectComponent<TItem extends { [k: string]: any }> implements OnInit, OnDestroy {
    @Input("selectableItems")
    selectableItems: TItem[] = null!;

    @Output("selectionUpdated")
    selectionUpdated = new BehaviorSubject<TItem[] | null>(null);

    @Input("valueKey")
    valueKey: string = null!;

    @Input("useObjectAsValue")
    useObjectAsValue: boolean = false;

    @Input("textKey")
    textKey: string | null = null;

    @Input("textCallback")
    textCallback: ((item: TItem) => string) | null = null;

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

    @Input("noItemsText")
    noItemsText: string = "No items to select";

    @HostListener('window:keyup', ['$event'])
    listenForEscape(event: KeyboardEvent) {
        if (event.key.toLocaleLowerCase() === "escape") {
            this.clearSearch(event);
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

    selectedItems: TItem[] = [];

    optionsExpanded: boolean = false;

    private readonly subscriptions: Subscription = new Subscription();

    constructor() { }

    ngOnInit(): void {
        if (this.multi) {
            this.control.setValue([]);
        }

        this.subscriptions.add(
            this.control.valueChanges
                .subscribe(vl => {
                    if (vl === null || (Array.isArray(vl) && vl.length === 0 && this.multi)) {
                        this.selectedItems = [];
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    select(value: TItem): void {
        if (this.selectedItems.includes(value)) {
            return;
        }

        if (!this.multi) {
            this.selectedItems.splice(0, this.selectedItems.length);
        }

        this.selectedItems.push(value);

        this.selectionUpdated.next(this.selectedItems);
    }

    remove(value: any): void {
        const idx = this.selectedItems.indexOf(value);

        if (idx === -1) {
            return;
        }

        this.selectedItems.splice(idx, 1);
    }

    getItemText(item: TItem | undefined | null): string {
        if ((item ?? null) === null) {
            return "";
        }

        if (this.textCallback !== null) {
            return this.textCallback(item!);
        }

        if (this.textKey === null) {
            throw new Error("Either a text key or a text callback must be defined");
        }

        return item![this.textKey];
    }

    getSelectedItemValues() {
        return (this.multi) ?
            (this.selectedItems.map(it => (this.useObjectAsValue) ? it : it[this.valueKey])) :
            (
                (this.selectedItems.length <= 0) ?
                    null :
                    ((this.useObjectAsValue) ? this.selectedItems[0] : this.selectedItems[0][this.valueKey])
            );
    }

    getFilteredItems(): any[] {
        return this.selectableItems
            .filter(
                it => this.getItemText(it).toLocaleLowerCase().includes(this.searchTerm?.toLocaleLowerCase() ?? "")
            )
            .filter(it => !this.multi || !this.selectedItems.includes(it));
    }

    clearSearch(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        this.searchTerm = "";
        this.searchInput?.nativeElement.focus();
    }
}

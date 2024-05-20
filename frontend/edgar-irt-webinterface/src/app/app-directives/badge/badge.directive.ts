import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[appBadge]'
})
export class BadgeDirective implements AfterViewInit {
    @Input('textColorClass')
    textColorClass: string = "";

    @Input('backgroundColorClass')
    backgroundColorClass: string = "";

    constructor(
        private readonly element: ElementRef<HTMLElement>
    ) { }

    ngAfterViewInit(): void {
        this.element.nativeElement.classList.add("rounded-lg", "p-3");
        if (this.textColorClass !== "") {
            this.element.nativeElement.classList.add(this.textColorClass);
        }

        if (this.backgroundColorClass !== "") {
            this.element.nativeElement.classList.add(this.backgroundColorClass);
        }
    }
}

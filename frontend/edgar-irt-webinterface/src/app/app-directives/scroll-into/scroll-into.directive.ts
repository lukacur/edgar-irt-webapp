import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[appScrollInto]'
})
export class ScrollIntoDirective implements AfterViewInit {
    @Input("appScrollInto")
    appScrollInto: boolean = true;

    constructor(
        private readonly elRef: ElementRef<HTMLElement>
    ) { }

    ngAfterViewInit(): void {
        console.log("YEA?");
        if (this.appScrollInto) {
            this.elRef.nativeElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }
}

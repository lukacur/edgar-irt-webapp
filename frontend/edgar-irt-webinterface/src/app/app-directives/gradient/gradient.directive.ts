import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

type ColorDescriptor = {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a?: number;
};

@Directive({
    selector: '[appGradient]'
})
export class GradientDirective implements AfterViewInit {
    @Input("appGradient")
    gradientPercentage: number = 0;

    @Input("gradientStart")
    gradientStart: ColorDescriptor = { r: 0, g: 0, b: 0, a: 1.0 };

    @Input("gradientEnd")
    gradientEnd: ColorDescriptor = { r: 0, g: 0, b: 0, a: 1.0 };

    @Input("gradientType")
    gradientType: "background" | "text" = "text";

    constructor(
        private readonly elRef: ElementRef<HTMLElement>
    ) { }

    private static isValidColorDescriptor(cd: ColorDescriptor): boolean {
        for (const key of (Object.keys(cd) as (keyof ColorDescriptor)[])) {
            if (key === "a" && cd[key] === undefined) {
                continue;
            }

            if (cd[key]! < 0) {
                return false;
            }

            if (key === "a" && cd[key]! > 1.0) {
                return false;
            } else if (cd[key]! > 255 || !Number.isInteger(cd[key])) {
                return false;
            }
        }

        return true;
    }

    private static interpolate(
        startColor: ColorDescriptor,
        endColor: ColorDescriptor,
        percent: number
    ): ColorDescriptor {
        return {
            r: startColor.r + percent * (endColor.r - startColor.r),
            g: startColor.g + percent * (endColor.g - startColor.g),
            b: startColor.b + percent * (endColor.b - startColor.b),
            a: startColor.a ?? 1.0,
        };
    }

    ngAfterViewInit(): void {
        if (!GradientDirective.isValidColorDescriptor(this.gradientStart) ||
            !GradientDirective.isValidColorDescriptor(this.gradientEnd)) {
            throw new Error("Invalid color input");
        }

        const color = GradientDirective.interpolate(this.gradientStart, this.gradientEnd, this.gradientPercentage);
        const rgbaString = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1.0})`;

        switch (this.gradientType) {
            case 'background': {
                this.elRef.nativeElement.style.backgroundColor = rgbaString;
                break;
            }

            case 'text': {
                this.elRef.nativeElement.style.color = rgbaString;
                break;
            }

            default: throw new Error(`Unknown gradient type: ${this.gradientType}`);
        }
    }
}

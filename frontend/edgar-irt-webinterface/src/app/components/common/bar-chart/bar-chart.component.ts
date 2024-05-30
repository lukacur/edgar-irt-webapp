import { AfterViewInit, Component, ElementRef, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Component({
    selector: 'app-bar-chart',
    templateUrl: './bar-chart.component.html',
})
export class BarChartComponent<TData extends { [ky: string]: any }> implements AfterViewInit, OnDestroy {
    @Input('classes')
    classes: string[] = [];

    @Input('classColors')
    classColors: string[] = [];

    private dataValue: TData[] = [];

    @Input('data')
    set data(val: TData[]) {
        this.dataValue = val;
        if ((this.barChartBase ?? null) !== null) {
            this.barChartBase!.nativeElement.childNodes.forEach(cn => cn.remove());
            this.displayChart();
        }
    }

    get data() {
        return this.dataValue;
    }


    //#region Selection
    @Input('selectable')
    selectable: boolean = false;
    
    @Output('dataSelected')
    dataSelected$ = new BehaviorSubject<{ data: TData, dataClass: string } | null>(null);

    @Input('selectionChannel')
    selectionChannel: string = "default-channel";

    @Input('clearSelection')
    clearSelection$: Observable<"ALL" | string> | null = null;
    //#endregion


    @Input('dataClassKey')
    dataClassKey: string = "";

    @Input('dataValueKey')
    dataValueKey: string = "";


    @Input('chartWidth')
    chartWidth: number = 460;

    @Input('chartHeight')
    chartHeight: number = 480;


    @ViewChild('barChartBase')
    private readonly barChartBase?: ElementRef<SVGSVGElement> = null!;

    @ViewChild("tooltip")
    private readonly tooltip?: ElementRef<HTMLDivElement> = null!;

    private readonly subscriptions: Subscription[] = [];

    constructor() { }

    private extractValueFromObj<TReturn>(obj: TData, keyMap: string[]): TReturn | null {
        if (obj === undefined || obj === null) {
            return null;
        }

        let ret: any = obj;

        for (const key of keyMap) {
            ret = ret[key];
        }

        return ret;
    }

    private displayChart() {
        const classMapArray = this.dataClassKey?.split('.') ?? [];
        const valueMapArray = this.dataValueKey?.split('.') ?? [];
        const maxValue = this.extractValueFromObj<number>(
            this.dataValue.reduce(
                (acc, vl) =>
                    (
                        this.extractValueFromObj<number>(
                            vl,
                            valueMapArray
                        )! > this.extractValueFromObj<number>(acc, valueMapArray)!
                    ) ? vl : acc,
                this.dataValue[0]
            ),
            valueMapArray
        )!;

        const margin = { top: 30, right: 30, bottom: 70, left: 60 };

        const width = this.chartWidth - margin.left - margin.right;
        const height = this.chartHeight - margin.top - margin.bottom;

        const graphData = this.dataValue ?? [];

        const color =
            (this.classColors.length !== 0) ?
                d3.scaleOrdinal<string>()
                    .domain(this.classes)
                    .range(this.classColors) :
                null;

        const svg = d3.select(this.barChartBase!.nativeElement)
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .range([0, width])
            .domain(this.classes)
            .padding(0.2);

        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

        const y = d3.scaleLinear()
            .domain([0, maxValue])
            .range([height, 0]);

        svg.append("g")
            .call(d3.axisLeft(y));
        const outerThis = this;

        const mousemove = function (this: any, d: any) {
            if (outerThis.tooltip) {
                const barInfo: any = (d3.select(this).data()[0]);
                const pointerData = d3.pointer(d, d3.select(outerThis.barChartBase!.nativeElement));

                d3.select(outerThis.tooltip?.nativeElement)
                    .html(
                        "Value: " + outerThis.extractValueFromObj(barInfo, valueMapArray) + "<br/>" +
                        "Class: " + outerThis.extractValueFromObj(barInfo, classMapArray)
                    )
                    .style("left", (pointerData[0] + 10) + "px")
                    .style("top", (pointerData[1] - 80) + "px")
                    .style("width", "140px");

                outerThis.tooltip.nativeElement.style.display = "block";
            }
        };

        const mouseleave = function (d: any) {
            if (outerThis.tooltip) {
                outerThis.tooltip.nativeElement.style.display = "none";
            }
        };

        
        let highlightedEl: d3.BaseType | null = null;
        if (this.clearSelection$ !== null) {
            this.subscriptions.push(
                this.clearSelection$.subscribe(clearChannel => {
                    if (highlightedEl !== null && (clearChannel === this.selectionChannel || clearChannel === "ALL")) {
                        const highlighted = d3.select<d3.BaseType, TData>(highlightedEl);
                        const classVal = outerThis.extractValueFromObj<string>(highlighted.data()[0], classMapArray);

                        highlighted
                            .attr(
                                "fill",
                                (color !== null && classVal !== null) ? color(classVal) : "#69b3a2"
                            );

                        highlightedEl = null;
                    }
                })
            );
        }

        const click = function (this: d3.BaseType, ev: MouseEvent, d: any) {
            const data: any = d3.select<d3.BaseType, any[]>(this).data()[0];

            if (highlightedEl !== null) {
                const highlighted = d3.select<d3.BaseType, TData>(highlightedEl);
                const classVal = outerThis.extractValueFromObj<string>(highlighted.data()[0], classMapArray);

                highlighted.attr(
                    "fill",
                    (color !== null && classVal !== null) ? color(classVal) : "#69b3a2"
                );
            }

            if (this !== highlightedEl) {
                d3.select(this).attr("fill", "#F97316B3");
                highlightedEl = this;

                const classVal = outerThis.extractValueFromObj<string>(
                    d3.select<d3.BaseType, TData>(highlightedEl).data()[0],
                    classMapArray,
                );

                outerThis.dataSelected$.next({ data, dataClass: classVal! });
            } else {
                highlightedEl = null;
                outerThis.dataSelected$.next(null);
            }
        };

        const join = svg.selectAll("rect")
            .data(graphData)
            .join("rect")
                .attr("x", d => x(this.extractValueFromObj<string>(d, classMapArray)!)!)
                .attr("y", d => y(this.extractValueFromObj<number>(d, valueMapArray)!)!)
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(this.extractValueFromObj<number>(d, valueMapArray)!)!)
                .attr(
                    "fill",
                    d => (color !== null) ? color(this.extractValueFromObj<string>(d, classMapArray)!) : "#69b3a2"
                )
                .on("mousemove", mousemove)
                .on("mouseleave", mouseleave);

        if (this.selectable) {
            join.on("click", click);
        }
    }

    ngAfterViewInit(): void {
        this.displayChart();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
}

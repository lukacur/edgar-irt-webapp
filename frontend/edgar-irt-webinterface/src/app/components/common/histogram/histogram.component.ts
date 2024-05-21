import { Component, ViewChild, ElementRef, Input, AfterViewInit, Output, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

type BinInfo = (any[]) & { x0: number, x1: number };

@Component({
    selector: 'app-histogram',
    templateUrl: './histogram.component.html',
})
export class HistogramComponent<TData extends { [ky: string]: any }> implements AfterViewInit, OnDestroy {
    @Input('data')
    data: TData[] = [];


    //#region Selection
    @Input('selectable')
    selectable: boolean = false;

    @Output('dataSelected')
    dataSelected$ = new BehaviorSubject<TData[]>([]);

    @Input('selectionChannel')
    selectionChannel: string = "default-channel";

    @Input('clearSelection')
    clearSelection$: Observable<"ALL" | string> | null = null;
    //#endregion


    /**
     * A dot-separated accessor for all data in the input data array
     */
    @Input('mappingKey')
    mappingKey: string | null = null;

    @Input('domainStart')
    domainStart: number = 0;

    @Input('domainEnd')
    domainEnd: number = 10;

    @Input('binCount')
    binCount: number = 10;


    @Input('chartWidth')
    chartWidth: number = 460;

    @Input('chartHeight')
    chartHeight: number = 480;


    @ViewChild('histogramBase')
    private readonly histogramBase?: ElementRef<SVGSVGElement> = null!;

    @ViewChild("tooltip")
    private readonly tooltip?: ElementRef<HTMLDivElement> = null!;

    private readonly subscriptions: Subscription[] = [];

    constructor() { }

    private mapDataWithKey(data: TData) {
        const mapArray = this.mappingKey?.split('.') ?? [];

        if (mapArray.length === 0) {
            return data;
        }

        let ret: any = data;

        for (const mapKey of mapArray) {
            ret = ret[mapKey];
        }

        return ret;
    }

    ngAfterViewInit(): void {
        const outerThis = this;

        // Data validity check 
        {
            const mappedData =
                (this.mappingKey === null || this.mappingKey.trim() === "") ?
                    this.data :
                    this.data.map(el => {
                        return this.mapDataWithKey(el);
                    });

            if (mappedData.some(el => typeof(el) !== "number")) {
                throw new Error("Histogram can only be built for number values!");
            }
        }

        const margin = { top: 10, right: 30, bottom: 30, left: 40 };

        const width = this.chartWidth - margin.left - margin.right;
        const height = this.chartHeight - margin.top - margin.bottom;

        const svg = d3.select(this.histogramBase!.nativeElement)
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([this.domainStart, this.domainEnd])
            .range([0, width]);

        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x));

        const histogram = d3.bin<TData, number>()
            .value(function (d) { return outerThis.mapDataWithKey(d); })
            .thresholds(d3.range(this.domainStart, x.domain()[1], (x.domain()[1] - this.domainStart) / this.binCount));

        const bins = histogram(this.data);
        const [min, max] = d3.extent(bins.map(b => b.x1!));

        const y = d3.scaleLinear()
            .range([height, 0]);
        y.domain([0, d3.max(bins, function (d) { return d.length; })!]);
    
        const mousemove = function (this: d3.BaseType, d: any) {
            if (outerThis.tooltip) {
                const binInfo: BinInfo = (d3.select(this).data()[0] as BinInfo);
                const pointerData = d3.pointer(d, d3.select(outerThis.histogramBase!.nativeElement));

                d3.select(outerThis.tooltip?.nativeElement)
                    .html(
                        "Count: " + binInfo.length + "<br/>" +
                        "Bin: [" + [binInfo.x0.toFixed(2), binInfo.x1.toFixed(2)].join(", ") +
                        ((binInfo.x1 === max) ? "]" : ">")
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
                        d3.select(highlightedEl)
                            .style("fill", "#3125EF");

                        highlightedEl = null;
                    }
                })
            );
        }

        const click = function (this: d3.BaseType, ev: MouseEvent, d: d3.Bin<TData, number>) {
            const data: any[] = d3.select<d3.BaseType, any[]>(this).data()[0] ?? [];

            if (highlightedEl !== null) {
                const highlighted = d3.select(highlightedEl);
                highlighted.style("fill", "#3125EF");
            }

            if (this !== highlightedEl) {
                d3.select(this).style("fill", "#F97316");
                highlightedEl = this;

                outerThis.dataSelected$.next(data);
            } else {
                highlightedEl = null;
                outerThis.dataSelected$.next([]);
            }
        };

        const join = svg.selectAll("rect")
            .data(bins)
            .join("rect")
                .attr("x", 1)
                .attr("transform", function (d) { return `translate(${x(d.x0!)} , ${y(d.length)})` })
                .attr("width", function (d) { return x(d.x1!) - x(d.x0!) - 1 })
                .attr("height", function (d) { return height - y(d.length); })
                .style("fill", "#3125EF")
                .on("mousemove", mousemove)
                .on("mouseleave", mouseleave);

        if (this.selectable) {
            join.on("click", click);
        }

        const yAxisTranslation =
            (this.domainStart < 0) ? ((-this.domainStart / (this.domainEnd - this.domainStart)) * width) : "0";

        svg.append("g")
            .attr("transform", `translate(${yAxisTranslation},0)`)
            .call(d3.axisLeft(y));
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
}

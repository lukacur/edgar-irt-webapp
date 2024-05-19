import { Component, ViewChild, ElementRef, Input, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';

type BinInfo = (any[]) & { x0: number, x1: number };

@Component({
    selector: 'app-histogram',
    templateUrl: './histogram.component.html',
})
export class HistogramComponent implements AfterViewInit {
    @Input('data')
    data: any[] = [];

    /**
     * A dot-separated accessor for all data in the input data array
     */
    @Input('mappingKey')
    mappingKey: string | null = null;

    @Input('domainStart')
    domainStart: number = 0;

    @Input('domainEnd')
    domainEnd: number = 10;

    @Input('thresholdCount')
    thresholdCount: number = 10;


    @Input('chartWidth')
    chartWidth: number = 460;

    @Input('chartHeight')
    chartHeight: number = 480;


    @ViewChild('histogramBase')
    private readonly histogramBase?: ElementRef<SVGSVGElement> = null!;

    @ViewChild("tooltip")
    private readonly tooltip?: ElementRef<HTMLDivElement> = null!;

    constructor() { }

    ngAfterViewInit(): void {
        const mapArray = this.mappingKey?.split('.') ?? [];

        const mappedData =
            (mapArray.length === 0) ?
                this.data :
                this.data.map(el => {
                    let ret: any = el;

                    for (const mapKey of mapArray) {
                        ret = ret[mapKey];
                    }

                    return ret;
                });

        if (mappedData.some(el => typeof(el) !== "number")) {
            throw new Error("Histogram can only be built for number values!");
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

        const histogram = d3.bin()
            .value(function (d) { return d; })
            .thresholds(this.thresholdCount);

        const bins = histogram(mappedData);

        const y = d3.scaleLinear()
            .range([height, 0]);
        y.domain([0, d3.max(bins, function (d) { return d.length; })!]);

        const outerThis = this;
    
        const mousemove = function (this: any, d: any) {
            if (outerThis.tooltip) {
                const binInfo: BinInfo = (d3.select(this).data()[0] as BinInfo);
                const pointerData = d3.pointer(d, d3.select(outerThis.histogramBase!.nativeElement));

                d3.select(outerThis.tooltip?.nativeElement)
                    .html(
                        "Count: " + binInfo.length + "<br/>" + "Bin: [" + [binInfo.x0, binInfo.x1].join(", ") + ">"
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

        svg.selectAll("rect")
            .data(bins)
            .join("rect")
                .attr("x", 1)
                .attr("transform", function (d) { return `translate(${x(d.x0!)} , ${y(d.length)})` })
                .attr("width", function (d) { return x(d.x1!) - x(d.x0!) - 1 })
                .attr("height", function (d) { return height - y(d.length); })
                .style("fill", "#3125ef")
                .on("mousemove", mousemove)
                .on("mouseleave", mouseleave);

        const yAxisTranslation =
            (this.domainStart < 0) ? ((-this.domainStart / (this.domainEnd - this.domainStart)) * width) : "0";

        svg.append("g")
            .attr("transform", `translate(${yAxisTranslation},0)`)
            .call(d3.axisLeft(y));
    }
}

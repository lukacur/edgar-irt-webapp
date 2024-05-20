import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
    selector: 'app-bar-chart',
    templateUrl: './bar-chart.component.html',
})
export class BarChartComponent implements AfterViewInit {
    @Input('classes')
    classes: string[] = [];

    @Input('classColors')
    classColors: string[] = [];

    private dataValue: any[] = [];

    @Input('data')
    set data(val: any[]) {
        this.dataValue = val;
        if ((this.barChartBase ?? null) !== null) {
            this.barChartBase!.nativeElement.innerHTML = "";
            this.displayChart();
        }
    }

    get data() {
        return this.dataValue;
    }

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

    constructor() { }

    private extractValueFromObj(obj: any, keyMap: string[]) {
        if (obj === undefined || obj === null) {
            return null;
        }

        let ret = obj;

        for (const key of keyMap) {
            ret = ret[key];
        }

        return ret;
    }

    private displayChart() {
        const classMapArray = this.dataClassKey?.split('.') ?? [];
        const valueMapArray = this.dataValueKey?.split('.') ?? [];
        const maxValue = this.extractValueFromObj(
            this.data.reduce(
                (acc, vl) =>
                    (this.extractValueFromObj(vl, valueMapArray) > this.extractValueFromObj(acc, valueMapArray)) ?
                        vl :
                        acc,
                this.data[0]
            ),
            valueMapArray
        );

        const margin = { top: 30, right: 30, bottom: 70, left: 60 };

        const width = this.chartWidth - margin.left - margin.right;
        const height = this.chartHeight - margin.top - margin.bottom;

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

        svg.selectAll("mybar")
            .data(this.data ?? [])
            .join("rect")
            .attr("x", d => x(this.extractValueFromObj(d, classMapArray))!)
            .attr("y", d => y(this.extractValueFromObj(d, valueMapArray))!)
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(this.extractValueFromObj(d, valueMapArray))!)
            .attr("fill", d => (color !== null) ? color(this.extractValueFromObj(d, classMapArray)) : "#69b3a2")
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);
    }

    ngAfterViewInit(): void {
        this.displayChart();
    }
}

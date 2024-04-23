import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
    selector: 'app-single-variable-function-visualizer',
    templateUrl: './single-variable-function-visualizer.component.html',
})
export class SingleVariableFunctionVisualizerComponent implements OnInit {
    @Input("visualizedFunction")
    visualizedFunction: (x: number) => number = (x) => 5 * x;

    @Input("fnMinValue")
    fnMinValue: number = -10;

    @Input("fnMaxValue")
    fnMaxValue: number = 10;

    @Input("fnArgMinValue")
    fnArgMinValue: number = 0;

    @Input("fnArgMaxValue")
    fnArgMaxValue: number = 15;

    @Input("fnDrawStep")
    fnDrawStep: number = 1;


    @ViewChild("tooltip")
    tooltip?: ElementRef<HTMLDivElement> = null!;

    constructor() { }

    ngOnInit(): void {
        const margin = { top: 10, right: 50, bottom: 50, left: 50 };
        const width = 450 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#svf-viz-svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Define chart area
        svg
            .append("clipPath")
                .attr("id", "chart-area")
                .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", width)
                .attr("height", height);

        // Add Axes
        const xMin = this.fnArgMinValue;
        const xMax = this.fnArgMaxValue;

        const yMin = this.fnMinValue;
        const yMax = this.fnMaxValue;

        let xScale = d3.scaleLinear([xMin, xMax], [0, width])
        let yScale = d3.scaleLinear([yMin, yMax], [height, 0])

        let xAxis = d3.axisBottom(xScale)
        let yAxis = d3.axisLeft(yScale)
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
        svg.append("g")
            .attr("transform", `translate(${width / 2},0)`)
            .call(yAxis)

        // Axes label
        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("x", width / 2 + 40)
            .attr("y", height + 35)
            .text("Theta (Θ)");

        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("y", -35)
            .attr("x", -height / 8)
            .attr("transform", "rotate(-90)")
            .html("Probability of correct answer (%)");

        const data: [number, number][] = this.graphFunction();

        let line = d3.line()
            .x(d => xScale(d[0]))
            .y(d => yScale(d[1]))
        svg.append("path")
            .datum(data)
            .attr("clip-path", "url(#chart-area)")
            .attr("fill", "none")
            .attr("stroke", "teal")
            .attr("stroke-width", 2)
            .attr("d", line as any);

        const outerThis = this;
        
        const mousemove = function (this: any, d: any) {
            if (outerThis.tooltip) {
                const point: [number, number] = (d3.select(this).data() as [number, number][])[0];

                d3.select(outerThis.tooltip?.nativeElement)
                    .html(
                        "Theta: " + point[0].toFixed(2) + "<br/>" + "Correct answer probability: " + point[1].toFixed(2)
                    )
                    .style("left", (d3.pointer(d)[0] + 50) + "px")
                    .style("top", (d3.pointer(d)[1] + 50) + "px");

                outerThis.tooltip.nativeElement.style.display = "block";
            }
        };
    
        // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
        const mouseleave = function (d: any) {
            if (outerThis.tooltip) {
                console.log("LEFT");
                
                outerThis.tooltip.nativeElement.style.display = "none";
            }
        };

        // plot a circle at each data point
        svg.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("cx", function(d: any) { return xScale(d[0]); } )
            .attr("cy", function(d: any) { return yScale(d[1]); } )
            .attr("r", 3)
            .attr("opacity", "0.01")
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);
    }
      
    graphFunction() {
        const data: [number, number][] = [];
        let x = this.fnArgMinValue;

        while (x <= this.fnArgMaxValue) {
            const y = this.visualizedFunction(x);
            data.push([x, y])
            x += this.fnDrawStep;
        }

        return data;
    }
}

// Set the dimensions and margins of the map and plots
const width = 800;
const height = 700;
const plotWidth = 350; // Width for each plot
const plotHeight = 200; // Height for each plot
const margin = { top: 20, right: 20, bottom: 30, left: 40 };

// Global Variables
let selectedNeighborhoods = {};
// Define an array of RGB triplets
const rgbTriplets = [
    "rgb(240, 163, 255)",
    "rgb(0, 117, 220)",
    "rgb(153, 63, 0)",
    "rgb(76, 0, 92)",
    "rgb(25, 25, 25)",
    "rgb(0, 92, 49)",
    "rgb(43, 206, 72)",
    "rgb(255, 204, 153)",
    "rgb(128, 128, 128)",
    "rgb(148, 255, 181)",
    "rgb(143, 124, 0)",
    "rgb(157, 204, 0)",
    "rgb(194, 0, 136)",
    "rgb(0, 51, 128)",
    "rgb(255, 164, 5)",
    "rgb(255, 168, 187)",
    "rgb(66, 102, 0)",
    "rgb(255, 0, 16)",
    "rgb(94, 241, 242)",
    "rgb(0, 153, 143)",
    "rgb(224, 255, 102)",
    "rgb(116, 10, 255)",
    "rgb(153, 0, 0)",
    "rgb(255, 255, 128)",
    "rgb(255, 255, 0)",
    "rgb(255, 80, 5)"
];const colorScale = d3.scaleOrdinal(rgbTriplets);

// Load external data (GeoJSON and CSV)
Promise.all([
    d3.json("barris.geojson"),
    d3.csv("final_dataset_15_19.csv")
]).then(function(files) {
    const geoData = files[0];
    const csvData = files[1];

    // Process CSV data
    let neighborhoodData = {};
    csvData.forEach(row => {
        const year = row.Any;
        const neighborhood = row.Codi_Barri;

        if (!neighborhoodData[neighborhood]) {
            neighborhoodData[neighborhood] = {};
        }
        neighborhoodData[neighborhood][year] = row;
    });

    // Append the svg object to the map container
    const mapSvg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Map and projection
    const projection = d3.geoMercator()
        .center([2.1734, 41.3851]) // GPS of location to zoom on (Barcelona)
        .scale(190000)
        .translate([(width + 200) / 2, (height + 80) / 2]);

    // Draw the map
    mapSvg.append("g")
        .selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", d3.geoPath().projection(projection))
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("class", d => "neighborhood-path-" + d) // Assign a unique class based on the neighborhood code
        .on("mouseover", function(event, d) {
            console.log("Neighborhood number on mouseover:", d);
            // console.log("Neighborhood data: ", neighborhoodData[d]["2015"]["Nom_Barri"])
            currNum = d + 1
            const neighborhoodInfo = neighborhoodData[currNum]["2015"]; 

            barriTip.show(neighborhoodInfo, this);
            // Increase the border size and change the color when hovering
            d3.select(this)
                .transition() // Transition for smooth change
                .duration(200) // Time in milliseconds
                .attr("stroke-width", 4) // Increased border size
                .attr("stroke", "black"); // Change to desired border color on hover
        })
        .on("mouseout", function(event, d) {
            // Reset the border size and color when not hovering
            barriTip.hide(d, this);
            d3.select(this)
                .transition() // Transition for smooth change
                .duration(200) // Time in milliseconds
                .attr("stroke-width", 1) // Reset to original border size
                .attr("stroke", "black"); // Reset to original border color
        })    
        .on("click", function(event, d) {
            const neighborhoodCode = d+1; // Assuming 'd' is the neighborhood code

            // Toggle neighborhood selection
            if (selectedNeighborhoods[neighborhoodCode]) {
                delete selectedNeighborhoods[neighborhoodCode];
                d3.select(this).attr("fill", "white"); // Directly update the fill of the clicked path
            } else {
                // console.error("No data found for this neighborhood:", neighborhoodCode);
                selectedNeighborhoods[neighborhoodCode] = neighborhoodData[neighborhoodCode];
                d3.select(this).attr("fill", colorScale(neighborhoodCode)); // Directly update the fill of the clicked path
            }

            // Update plots
            updateTitle(selectedNeighborhoods);
            updatePlots();
        });

        // Create a tooltip instance with d3.tip()
        const barriTip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0]) // Position the tooltip above the cursor
            .html(function(d) {
                // Check if the neighborhood data for this code and a specific year exists
                // console.log("d barri is: ", d)
                // console.log("neighborhoodData[d]: ", neighborhoodData[d])
                // console.log("neighborhoodData[d][2015]: ", neighborhoodData[d]["2015"])
                // if (neighborhoodData[d] && neighborhoodData[d]["2015"]) {
                    return `<strong>District:</strong> ${d.Nom_Districte}<br>
                            <strong>Neighborhood:</strong> ${d.Nom_Barri}`;
                // } else {
                //     return "Data not available";
                // }
            });

        mapSvg.call(barriTip);

    // Define the keys for the attributes to plot
    // const attributeKeys = ['Birth_Rates_Per1000', 'Unemployment_Rate', 'Avg_Household_Income', 
    //                         'Index_Gini', 'Population', 'Immigration_Per1000'];

        // Define a mapping of attribute keys to display names
    const attributeDisplayNames = {
        'Birth_Rates_Per1000': 'Birth Rates (per 1000 Inhabitants)',
        'Unemployment_Rate': 'Unemployment Rates',
        'Avg_Household_Income': 'Average Annual Household Income (in €)',
        'Index_Gini': 'Gini Index',
        'Population': 'Population',
        'Immigration_Per1000': 'Immigration Rates (per 1000 Inhabitants)'
    };

    // Update the attributeKeys array with the display names
    const attributeKeys = Object.keys(attributeDisplayNames);


    // Create div containers for the plots
    const plotContainers = d3.select("#plots")
        .selectAll("div.plot-container")
        .data(attributeKeys) // Create placeholders for the 6 plots
        .enter()
        .append("div")
        .classed("plot-container", true);

        // Define the updateLegend function
    function updateLegend() {
        const legendContainer = d3.select("#legend");

        // Check if there are selected neighborhoods
        if (Object.keys(selectedNeighborhoods).length === 0) {
            // If no neighborhoods are selected, display a message
            legendContainer.html("<p>This legend will grow as you select more neighborhoods</p>");
        } else {
            // If neighborhoods are selected, create/update the legend
            const legendData = Object.keys(selectedNeighborhoods).map((code, index) => ({
                code: code,
                name: selectedNeighborhoods[code].somePropertyName, // Replace with the actual property name
                color: colorScale(code)
            }));

            const legendItems = legendContainer.selectAll(".legend-item")
                .data(legendData, d => d.code);

            // Enter: create new legend items
            const newLegendItems = legendItems.enter().append("div")
                .classed("legend-item", true);

            newLegendItems.append("div")
                .classed("legend-color", true)
                .style("background-color", d => d.color);

            newLegendItems.append("div")
                .classed("legend-text", true)
                .text(d => d.name);

            // Exit: remove any legend items that are no longer needed
            legendItems.exit().remove();
        }
    }

    // Call the updateLegend function to create the initial legend
    updateLegend();


        // Initial empty plots (optional)
    plotContainers.each(function() {
        d3.select(this)
            .append("svg")
            .attr("width", plotWidth)
            .attr("height", plotHeight)
            .append("text")
            .attr("x", plotWidth / 2)
            .attr("y", plotHeight / 2)
            .attr("text-anchor", "middle")
            .text(attribute => attributeDisplayNames[attribute]);
    });

    function updateTitle(selectedNeighborhoods) {
        const title = d3.select("#plots-title");
        if (Object.keys(selectedNeighborhoods).length === 0) {
            // No neighborhoods selected
            title.text("Select one or several neighborhoods");
        } else {
            // Neighborhoods selected
            title.text("Hover over data points for more information");
        }
    }
    


    // Update plots function
    function updatePlots() {
        // Clear existing plots
        d3.selectAll(".plot-container svg").remove();

        // Add or update the common title above the plots
        const plotsTitle = d3.select("#plots-title");
        plotsTitle.select("h2").text("Select one or several neighborhoods");


        // Determine the global min and max for the y-axis across all selected neighborhoods
        let globalMin = Infinity;
        let globalMax = -Infinity;


            // Check if there are selected neighborhoods
        if (Object.keys(selectedNeighborhoods).length === 0) {
            // If no neighborhoods are selected, display initial empty plots
            displayInitialPlots();
            return;
        } else {
            // If neighborhoods are selected, update the title
            updateTitle(selectedNeighborhoods);
        }

        Object.values(selectedNeighborhoods).forEach(data => {
            attributeKeys.forEach(attribute => {
                const values = Object.keys(data).map(year => ({                    
                    barri: data[year],
                    year: +year,
                    value: +data[year][attribute]
                }));
                const localMin = Math.min(...values);
                const localMax = Math.max(...values);
                globalMin = Math.min(globalMin, localMin);
                globalMax = Math.max(globalMax, localMax);        
            });

            
        });

        // Iterate over each plot-container and update its data
        plotContainers.each(function(_, i) {
            const attribute = attributeKeys[i];
            createPlot(this, attribute, globalMin, globalMax);
        });
    }
    // Create a tooltip
    const tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            console.log("D is ",d)
            return `<strong>District:</strong> ${d.barri.Nom_Districte}<br>
                    <strong>Neighborhood:</strong> ${d.barri.Nom_Barri}<br>
                    <strong>Year:</strong> ${d.year}<br>
                    <strong>Value:</strong> ${d.value}`;
        });


    function createPlot(container, attribute) {
        // Prepare the SVG
        const svg = d3.select(container)
            .append("svg")
            .attr("width", plotWidth)
            .attr("height", plotHeight)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

            // Add a title to the plot
        svg.append("text")
        .attr("class", "plot-title")
        .attr("x", (plotWidth - margin.left - margin.right) / 2)
        .attr("y", -margin.top+20)
        .attr("text-anchor", "middle")
        .text(attributeDisplayNames[attribute]);

    
        // Determine the min and max for the y-axis for this specific attribute
        let attributeValues = [];
        Object.values(selectedNeighborhoods).forEach(neighborhood => {
            Object.keys(neighborhood).forEach(year => {
                const val = +neighborhood[year][attribute];

                if (!isNaN(val)) {
                    attributeValues.push(val);
                }
            });
        });

    
        // Add some padding to the y-axis range
        const padding = (d3.max(attributeValues) - d3.min(attributeValues)) * 0.1; // 10% padding
        const yMin = d3.min(attributeValues) - padding;
        const yMax = d3.max(attributeValues) + padding;
    
        // Define scales
        const xScale = d3.scaleBand()
            .domain(d3.range(2015, 2020)) // Assuming years range from 2015 to 2019
            .range([0, plotWidth - margin.left - margin.right])
            .padding(0.1);
    
        const yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([plotHeight - margin.top - margin.bottom, 0]);
    
        // Define and append the x-axis
        const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
        svg.append("g")
            .attr("transform", `translate(0, ${plotHeight - margin.top - margin.bottom})`)
            .call(xAxis);
    
        // Define and append the y-axis
        const yAxis = d3.axisLeft(yScale);
        svg.append("g").call(yAxis).selectAll("text").attr("transform", "translate(2,0)");
    
        // Draw lines and points for each selected neighborhood
        Object.entries(selectedNeighborhoods).forEach(([code, neighborhood]) => {
            // Prepare data for line
            let lineData = Object.keys(neighborhood).map(year => {
                return {
                    year: year,
                    value: +neighborhood[year][attribute],
                    barri: neighborhood[year],
                    year: +year,
                };
            }).filter(d => !isNaN(d.value));
            console.log("LINE DATA IS:", lineData)
    
            // Define line generator
            const line = d3.line()
                .x(d => xScale(d.year) + xScale.bandwidth() / 2) // Center the line in the band
                .y(d => yScale(d.value));
    
            // Draw the line
            svg.append("path")
                .datum(lineData)
                .attr("fill", "none")
                .attr("stroke", colorScale(code))
                .attr("stroke-width", 1.5)
                .attr("d", line);


            // Draw points for each data point on the line
            svg.selectAll(`.point-${code}`)
            .data(lineData)
            .enter()
            .append("circle")
            .attr("class", `point-${code}`)
            .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2) // Center the point in the band
            .attr("cy", d => yScale(d.value))
            .attr("r", 3)
            .attr("fill", colorScale(code))
            .on("mouseover", function(d) {
                tip.show(d, this)
                d3.select(this)
                    .transition() // Transition for smooth change
                    .duration(200) // Time in milliseconds
                    .attr("r", 6) // Increased border size
                    .attr("fill", colorScale(code)); // Change to desired border color on hover

            })
            .on("mouseout", function(d) {
                tip.hide(d, this)
                d3.select(this)
                    .transition() // Transition for smooth change
                    .duration(200) // Time in milliseconds
                    .attr("r", 3) // Reset to original border size
                    .attr("fill", colorScale(code)); // Reset to original border color
            });
        });
                    // Create a tooltip
        const tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            const roundedValue = d3.format(".1f")(d.value);
            console.log("D is ",d)
            return `<strong>District:</strong> ${d.barri.Nom_Districte}<br>
                    <strong>Neighborhood:</strong> ${d.barri.Nom_Barri}<br>
                    <strong>Year:</strong> ${d.year}<br>
                    <strong>Value:</strong> ${roundedValue}`;
        });

        // Apply the tooltip to the plotContainers
        plotContainers.selectAll("svg")
            .call(tip);


        
    }


    function displayInitialPlots() {
        // Clear existing plots
        d3.selectAll(".plot-container svg").remove();
    
        // Iterate over each plot-container and display the initial placeholder
        plotContainers.each(function(_, i) {
            const attribute = attributeKeys[i];
            const attributeName = attributeDisplayNames[attribute];
            createInitialPlot(this, attributeName);
        });
    }
    
    function createInitialPlot(container, attributeName) {
        // Prepare the SVG
        const svg = d3.select(container)
            .append("svg")
            .attr("width", plotWidth)
            .attr("height", plotHeight);
    
        // Add a title to the plot
        svg.append("text")
            .attr("class", "plot-title")
            .attr("x", plotWidth / 2)
            .attr("y", plotHeight / 2)
            .attr("text-anchor", "middle")
            .text(attributeName);
    }
    
    
});

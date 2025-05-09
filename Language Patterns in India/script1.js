d3.csv("data.csv").then(function(data) {
    console.log("✅ Data loaded successfully:", data);

    data.forEach(d => {
        d["1991_Per"] = +d["1991_Per"];
        d["2001_Per"] = +d["2001_Per"];
        d["2011_Per"] = +d["2011_Per"];
    });

    let categories = [...new Set(data.map(d => d.Category))];
    let regions = [...new Set(data.map(d => d.Region))];

    const regionColors = {
        "Non-Hindi, South": "#ff6b6b",
        "Non-Hindi, North": "#4ecdc4",
        "Hindi Belt": "#45b7d1",
		"Non-Hindi, East": "#f0ad4e",
		"Non-Hindi, West": "#5bc0de",
		"Non-Hindi, North East": "#b276b2"
    };

    let categoryContainer = d3.select("#category-buttons");
    categories.forEach(category => {
        categoryContainer.append("button")
            .text(category)
            .attr("data-category", category)
            .classed("active", category === "Monolinguals")
            .on("click", function() {
                categoryContainer.selectAll("button").classed("active", false);
                d3.select(this).classed("active", true);					
                updateChart(currentRegion, currentState);
				highlightStates(currentRegion);	
            });
    });

    let regionContainer = d3.select("#region-buttons");
    regions.forEach(region => {
        regionContainer.append("button")
            .attr("data-region", region)
            .style("background-color", regionColors[region] || "#555")
            .text(region)
            .on("click", () => {
                currentRegion = region;
                currentState = "All";
                highlightStates(region);
                updateChart(region, currentState);
            }
			);
    });

    let currentRegion = regions[0];
    let currentState = "All";
    const tooltip = d3.select("#tooltip");

    // Replace state buttons with India Map
    const width = 800, height = 600;
    const svg = d3.select("#state-container").html("").append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "#222");

    const mapGroup = svg.append("g");

    d3.json("IndiaMap-All.geojson").then(geojson => {
        const projection = d3.geoMercator().fitSize([width, height], geojson);
        const path = d3.geoPath().projection(projection);

        mapGroup.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => regionColors[getRegion(d.properties.st_nm)] || "#222")
            .attr("stroke", "white")
            .attr("class", "state")
            .on("mouseover", function() { d3.select(this).classed("hovered", true); })
            .on("mouseout", function() { d3.select(this).classed("hovered", false); })
            .on("click", function(event, d) {
                currentState = d.properties.st_nm;
                d3.selectAll(".state").classed("selected", false);
                d3.select(this).classed("selected", true);
			    highlightStates(getRegion(currentState));				
                updateChart(getRegion(currentState), currentState);
            });
			
		  const seen = new Set();
		  const labelOffsets = {
			"Delhi": [10, -10],
			"Goa": [10, 10],
			"Tripura": [-10, -10],
			"Nagaland": [0, 12],
			"Mizoram": [10, 10],
			"Manipur": [10, 10],
			"Assam":[-50,20],
			"Dadra and Nagar Haveli and Daman and Diu": [-50, 10],
			"Gujarat": [-40,-30],
			"Uttarakhand": [20,10],
			"Uttar Pradesh":[40,30],
			"Bihar":[20,20],
			"Jharkhand":[-40,30],
			"West Bengal":[0,-20],
			"Odisha":[-20,0],
			"Tamil Nadu":[-10,50],
			"Kerala":[30,50],
			"Karnataka":[-20,40],
			"Jammu and Kashmir":[-20,30],
			"Punjab":[0,15],
			"Haryana":[-5,-15],
			"Delhi":[5,10],
			"Rajasthan":[0,40],
			"Madhya Pradesh":[20,-30],
			"Maharashtra":[-80,30],
			"Telangana":[5,40],
			"Andhra Pradesh":[-80,80]
		  };

        mapGroup.selectAll("text")
            .data(geojson.features.filter(d => {
			  if (seen.has(d.properties.st_nm)) return false;
			  seen.add(d.properties.st_nm);
			  return true;
			}))
            .enter()
            .append("text")
            .attr("x", d => path.centroid(d)[0] + (labelOffsets[d.properties.st_nm]?.[0] || 0))
			.attr("y", d => path.centroid(d)[1] + (labelOffsets[d.properties.st_nm]?.[1] || 0))
			.attr("dy", "0.35em")
            .text(d => d.properties.st_nm)
			.attr("class", "state-label")
			.style("cursor", "pointer")
			.on("mouseover", function() {
			  d3.select(this).classed("hovered", true);
			})
			.on("mouseout", function() {
			  d3.select(this).classed("hovered", false);
			})
			.on("click", function(event, d) {
			  currentState = d.properties.st_nm;
			  d3.selectAll(".state").classed("selected", false);
			  d3.selectAll(".state-label").classed("selected", false);
			  d3.selectAll(".state").filter(s => s.properties.st_nm === d.properties.st_nm)
             .classed("selected", true);
			  d3.select(this).classed("selected", true);
			  updateChart(getRegion(currentState), currentState);
			  console.log("Selected state:", d.properties.st_nm);
			});
    });

    function getRegion(state) {
        if (["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Goa", "Lakshadweep", "Puducherry", "Andaman and Nicobar Islands"].includes(state)) return "Non-Hindi, South";
        if (["Jammu and Kashmir", "Ladakh", "Punjab"].includes(state)) return "Non-Hindi, North";
        if (["Chandigarh", "Uttar Pradesh", "Madhya Pradesh", "Bihar", "Rajasthan", "Chhattisgarh", "Jharkhand", "Haryana", "Himachal Pradesh", "Uttarakhand", "Delhi"].includes(state)) return "Hindi Belt";
        if (["West Bengal", "Odisha"].includes(state)) return "Non-Hindi, East";
        if (["Gujarat", "Dadra and Nagar Haveli and Daman and Diu", "Maharashtra"].includes(state)) return "Non-Hindi, West";
        if (["Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura", "Arunachal Pradesh", "Sikkim"].includes(state)) return "Non-Hindi, North East";
        return "All";
    }
	
	function getStatesInRegion(region) {
    return d3.selectAll(".state")
        .filter(d => getRegion(d.properties.st_nm) === region)
        .data()
        .map(d => d.properties.st_nm);
	}
	
    function highlightStates(region) {
		console.log("Selected region colour:", regionColors[region]);
		d3.selectAll(".state")
            .classed("selected", d => getRegion(d.properties.st_nm) === region)
			.attr("fill", d => { return getRegion(d.properties.st_nm) === region ? regionColors[region] :"#222" })
			;
    }

    d3.select("#reset-button").on("click", () => {
        categoryContainer.selectAll("button").classed("active", d => d === "Monolinguals");
        regionContainer.selectAll("button").classed("active", false)
            .filter(function() { return d3.select(this).attr("data-region") === regions[0]; })
            .classed("active", true);
        currentRegion = regions[0];
        currentState = "All";
		highlightStates(currentRegion);
        d3.select("#chart").html("");
    });

    function updateChart(region, state) {
        let selectedCategory = d3.select("#category-buttons button.active").attr("data-category");
        
        let filteredData = data.filter(d => 
            d.Region === region && 
            (state === "All" || d.State === state) &&
            d.Category === selectedCategory
        );		

        if (filteredData.length === 0) {
            console.warn("⚠️ No data available for selected filters!");
            return;
        }

        let yMin, yMax;
        if (selectedCategory === "Monolinguals") {
            yMin = 50;
            yMax = 100;
        } else {
            let values = filteredData.flatMap(d => [d["1991_Per"], d["2001_Per"], d["2011_Per"]]);
            yMin = Math.floor(Math.min(...values) / 5) * 5;
            yMax = Math.ceil(Math.max(...values) / 5) * 5;
        }

        let width = document.getElementById("chart-container").clientWidth - 40;
        let height = 600;
        let margin = {top: 50, right: 80, bottom: 70, left: 80}; 

        let svg = d3.select("#chart").html("")
            .attr("width", width)
            .attr("height", height);

        let xScale = d3.scalePoint()
            .domain(["1991", "2001", "2011"])
            .range([margin.left, width - margin.right]);

        let yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height - margin.bottom, margin.top]);

        let lineGenerator = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.percentage));

        let statesList = [...new Set(filteredData.map(d => d.State))];

        statesList.forEach((stateName, index) => {
            let stateData = [
                {year: "1991", percentage: filteredData.find(d => d.State === stateName)["1991_Per"]},
                {year: "2001", percentage: filteredData.find(d => d.State === stateName)["2001_Per"]},
                {year: "2011", percentage: filteredData.find(d => d.State === stateName)["2011_Per"]}
            ];

            let lineColor = regionColors[region] || "#777";

            // Create line
            let path = svg.append("path")
                .datum(stateData)
                .attr("fill", "none")
                .attr("stroke", lineColor)
                .attr("stroke-width", 4)
                .attr("d", lineGenerator)
                .style("cursor", currentState === "All" ? "pointer" : "default");

            // Add dots
            svg.selectAll(`.dot-${index}`)
                .data(stateData)
                .enter()
                .append("circle")
                .attr("cx", d => xScale(d.year))
                .attr("cy", d => yScale(d.percentage))
                .attr("r", 10) // Larger dots for TV visibility
                .attr("fill", lineColor)
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .on("mouseover", function(event, d) {
                    if (currentState === "All") {
                        tooltip.style("display", "block")
                            .html(`${stateName}<br>${d.year}: ${d.percentage.toFixed(1)}`)
                            .style("left", (event.pageX + 15) + "px")
                            .style("top", (event.pageY - 30) + "px");
                    }
                })
                .on("mouseout", function() {
                    tooltip.style("display", "none");
                });

            // Add labels (only when specific state is selected)
            if (currentState !== "All") {
                svg.selectAll(`.label-${index}`)
                    .data(stateData)
                    .enter().append("text")
                    .attr("x", d => xScale(d.year))
                    .attr("y", d => yScale(d.percentage) - 25)
                    .attr("text-anchor", "middle")
                    .attr("fill", "white")
                    .attr("font-size", "16px")
                    .text(d => d.percentage.toFixed(1));
            }

            // Animation
            let totalLength = path.node().getTotalLength();
            path.attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(4000)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0);
        });

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickSize(8))
            .selectAll("text")
            .style("font-size", "18px");

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).tickSize(8))
            .selectAll("text")
            .style("font-size", "18px");
    }
});
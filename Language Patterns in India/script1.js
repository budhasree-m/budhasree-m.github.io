d3.csv("data.csv").then(function(data) {
    console.log("✅ Data loaded successfully:", data);

    data.forEach(d => {
        d["1991_Per"] = +d["1991_Per"];
        d["2001_Per"] = +d["2001_Per"];
        d["2011_Per"] = +d["2011_Per"];
    });
    
	let isFirstLoad = true;
    let categories = [...new Set(data.map(d => d.Category))];
    let regions = [...new Set(data.map(d => d.Region))];
    let regionsOrder = [
        "Non-Hindi, South West",		
		"Non-Hindi, West",       
        "Hindi, North & West",
		"Hindi, Central & East",	
		"Non-Hindi, North",		
		"Non-Hindi, East",
		"Non-Hindi, North East",
		"Non-Hindi, South East"
    ];
    const regionColors = {
        "Non-Hindi, South West": "#3A6351",
		"Non-Hindi, South East": "#2C6E72",
		"Non-Hindi, West": "#A0522D",
        "Non-Hindi, North": "#354F52",
        "Hindi, North & West": "#5A5A3A" ,
		"Hindi, Central & East": "#5D3A58",			
		"Non-Hindi, East": "#6B3E3E",
		"Non-Hindi, North East": "#8A5E3B"
    };
	
	const highlightRegionColors = {
        "Non-Hindi, South West": "#5D8B75",
		"Non-Hindi, South East": "#5FA8AD",
		"Non-Hindi, West": "#C4744D",
        "Non-Hindi, North": "#5B7A7D",
        "Hindi, North & West": "#84845C",		
		"Hindi, Central & East": "#865C81",	
		"Non-Hindi, East":  "#A67171",
		"Non-Hindi, North East": "#B27F5E"
    };
	
	let currentRegion = "Non-Hindi, South West";
    let currentState = "All";
	let currentStateBeforeReorg = "All";
	let statesToHighlight = "All";
    const tooltip = d3.select("#tooltip");	
	

    let categoryContainer = d3.select("#category-buttons");
    categories.forEach(category => {
        categoryContainer.append("button")
            .text(category)
            .attr("data-category", category)
            .classed("active", category === "Monolinguals")
            .on("click", function() {
                note = "";
				isFirstLoad = false;
				categoryContainer.selectAll("button").classed("active", false)
						.filter(function() {
									return d3.select(this).attr("data-category") === category;
								})
								.classed("active", true);				
                if(currentStateBeforeReorg != "All" && getRegion(currentStateBeforeReorg) === currentRegion) {						
					statesToHighlight = normalizeStateClick(currentStateBeforeReorg);
					updateChart(currentRegion, currentStateBeforeReorg);
				} else 
				{ 
					statesToHighlight = normalizeStateClick(currentState);
					updateChart(currentRegion, currentState);
				};				
				highlightStates(currentRegion);	
				if(currentState != "All") {					
					highlightSelectedStates(statesToHighlight);
				}
            });
    });

    let regionContainer = d3.select("#region-buttons");
    regionsOrder.forEach(region => {
        if (!regions.includes(region)) return;  // ensure region exists in data
		regionContainer.append("button")
            .attr("data-region", region)
			.classed("active", region === "Non-Hindi, South West")
            .style("background-color", regionColors[region] || "#555")
            .text(region)
            .on("click", () => {
                note = "";
				isFirstLoad = false;
				regionContainer.selectAll("button").classed("active", false)
				               .filter(function() {
									return d3.select(this).attr("data-region") === region;
								})
								.classed("active", true);
				currentState = "All";
				currentRegion = region;
				highlightStates(currentRegion);
                updateChart(currentRegion, currentState);
            }
			);
    });

    // Replace state buttons with India Map
    let width = document.getElementById("map-container").clientWidth;
    let height = document.getElementById("map-container").clientHeight;
    const svg = d3.select("#map-container").html("").append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "#222");
    let note = "";	  
    const mapGroup = svg.append("g");

    d3.json("IndiaMap-All.geojson").then(geojson => {
        const projection = d3.geoMercator().fitSize([width, height], geojson);
        const path = d3.geoPath().projection(projection);

        mapGroup.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => regionColors[getRegion(d.properties.st_nm)] || "#777")
            .attr("stroke", "white")
			.attr("stroke-width", 2)
            .attr("class", "state")
			.on("mouseover", function(event, d) {
				d3.select(this)
				  .attr("fill", highlightRegionColors[getRegion(d.properties.st_nm)] || "#AAA")
				  .attr("stroke-width", 2.05);
			})
			.on("mouseout", function(event, d) {
				d3.select(this)
				  .attr("fill", regionColors[getRegion(d.properties.st_nm)] || "#777")
				  .attr("stroke-width", 2);
			})
            .on("click", function(event, d) {
                note = "";
				isFirstLoad = false;
				currentState = d.properties.st_nm;
				currentRegion = getRegion(currentState);
				statesToHighlight = normalizeStateClick(currentState);
				regionContainer.selectAll("button").classed("active", false);
				 // Pass multiple states into highlight function				  
				highlightSelectedStates(statesToHighlight);
				// Chart
				currentStateBeforeReorg= StateBeforeReorg(currentState);
			    updateChart(getRegion(StateBeforeReorg(currentState)), StateBeforeReorg(currentState));	
				console.log("Selected state:", currentState);				
            });
			
		function zoomed(event) {
			mapGroup.attr("transform", event.transform);
		}
		
		const zoom = d3.zoom()
					.filter(function(event) {
						if (event.type === "mousedown") return true; // Allow mouse drag
						if (event.type === "touchstart" && event.touches && event.touches.length > 1) return true; // Allow pinch start
						if (event.type === "touchmove" && event.touches && event.touches.length > 1) return true; // Allow pinch move
						return false; // Block wheel & single touch
					})
					.scaleExtent([1, 8])
					.translateExtent([[0, 0], [width, height]])
					.on("zoom", zoomed);

		svg.call(zoom);
		
		// Optional: Prevent double click zoom
		svg.on("dblclick.zoom", null);
			
		  const seen = new Set();
		  let labelOffsets = {"All":[0,0]};
		  
		  if (window.innerWidth >=1025) {
		  labelOffsets = {
			"Delhi": [10, -10],
			"Goa": [-15, 10],
			"Tripura": [-10, -10],
			"Nagaland": [0, 12],
			"Mizoram": [10, 10],
			"Manipur": [10, 10],
			"Assam":[-50,20],
			"Dadra and Nagar Haveli and Daman and Diu": [-50, 20],
			"Gujarat": [-40,-30],
			"Uttarakhand": [50,10],
			"Uttar Pradesh":[40,30],
			"Bihar":[20,20],
			"Jharkhand":[-40,30],
			"West Bengal":[0,-20],
			"Odisha":[-20,0],
			"Tamil Nadu":[-10,50],
			"Kerala":[20,50],
			"Karnataka":[-20,40],
			"Jammu and Kashmir":[-20,30],
			"Punjab":[-20,15],
			"Haryana":[-5,-15],
			"Delhi":[5,10],
			"Rajasthan":[0,40],
			"Madhya Pradesh":[20,-30],
			"Maharashtra":[-80,30],
			"Telangana":[5,40],
			"Andhra Pradesh":[-80,80],
			"Himachal Pradesh":[50,10],
			"Puducherry":[30,0]
		  }
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
            .text(d => {
						let name = d.properties.st_nm;
						if (name === "Dadra and Nagar Haveli and Daman and Diu") {
							return "Dadra & Nagar Haveli and Daman & Diu";
						}
						return name;
					})
			.attr("class", "state-label")
			.style("cursor", "pointer")
			.on("mouseover", function() {
			  d3.select(this).classed("hovered", true);
			})
			.on("mouseout", function() {
			  d3.select(this).classed("hovered", false);
			})
			.on("click", function(event, d) {
			  note = "";
			  isFirstLoad = false;
			  currentState = d.properties.st_nm;
			  currentRegion = getRegion(currentState);
			  statesToHighlight = normalizeStateClick(currentState);
			  regionContainer.selectAll("button").classed("active", false);
			  // Pass multiple states into highlight function 
			  highlightSelectedStates(statesToHighlight);
			  // Chart
			  currentStateBeforeReorg= StateBeforeReorg(currentState);
			  updateChart(getRegion(StateBeforeReorg(currentState)), StateBeforeReorg(currentState));
			  console.log("Selected state:", currentState);			
		   });	   
	
	if (isFirstLoad) {
			highlightStates(currentRegion);
			updateChart(currentRegion, currentState);
		}	
	});

   
		
    function getRegion(state) {
        if (["Kerala", "Karnataka", "Goa", "Lakshadweep"].includes(state)) return "Non-Hindi, South West";
		if (["Tamil Nadu", "Andhra Pradesh", "Telangana", "Puducherry", "Andaman and Nicobar Islands"].includes(state)) return "Non-Hindi, South East";
        if (["Jammu and Kashmir", "Ladakh", "Punjab"].includes(state)) return "Non-Hindi, North";
        if (["Chandigarh", "Rajasthan", "Haryana", "Himachal Pradesh", "Uttarakhand", "Delhi"].includes(state)) return "Hindi, North & West";
		if (["Uttar Pradesh", "Madhya Pradesh", "Bihar", "Chhattisgarh", "Jharkhand"].includes(state)) return "Hindi, Central & East";
        if (["West Bengal", "Odisha"].includes(state)) return "Non-Hindi, East";
        if (["Gujarat", "Dadra and Nagar Haveli and Daman and Diu", "Maharashtra"].includes(state)) return "Non-Hindi, West";
        if (["Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura", "Arunachal Pradesh", "Sikkim"].includes(state)) return "Non-Hindi, North East";
        return "All";
    }
		
	function normalizeStateClick(stateName) {
		if (stateName === "Telangana" || stateName === "Andhra Pradesh") {
			return ["Telangana", "Andhra Pradesh"];
		}
		if (stateName === "Jammu and Kashmir" || stateName === "Ladakh") {
			return ["Jammu and Kashmir", "Ladakh"];
		}
		return [stateName];
	}
	
	function StateBeforeReorg(stateName) {
		if (stateName === "Telangana" || stateName === "Andhra Pradesh") {
			return "Andhra Pradesh";
		}
		if (stateName === "Jammu and Kashmir" || stateName === "Ladakh") {
			return "Jammu and Kashmir";
		}
		return stateName;
	}
	
    function  highlightStates (region) {
		console.log("Selected region colour:", regionColors[region]);
		d3.selectAll(".state").classed("selected", false);
	    d3.selectAll(".state").classed("selectedRegion", false);
	    d3.selectAll(".state-label").classed("selected", false);
		mapGroup.selectAll("path")
            .attr("fill", d => regionColors[getRegion(d.properties.st_nm)])
			.attr("stroke-width", 2);
		d3.selectAll(".state").filter(s => getRegion(s.properties.st_nm) === region)
            .classed("selectedRegion", true);
		d3.selectAll(".state").filter(s => getRegion(s.properties.st_nm) === region)
            .classed("selected", true);
		d3.selectAll(".state-label").filter(s => getRegion(s.properties.st_nm) === region)
            .classed("selected", true);
		mapGroup.selectAll("path").filter(s => getRegion(s.properties.st_nm) === region)
            .attr("fill", d => highlightRegionColors[region])
			.attr("stroke-width", 2.05 );
		console.log("Selected highlight region colour:", highlightRegionColors[region]);
    }
	
	function highlightSelectedStates(stateList) {
		    d3.selectAll(".state").classed("selected", false);
			d3.selectAll(".state").classed("selectedRegion", false);
			d3.selectAll(".state-label").classed("selected", false);
			mapGroup.selectAll("path")
            .attr("fill", d => regionColors[getRegion(d.properties.st_nm)])
			.attr("stroke-width", 2);
			if (stateList.includes("Telangana") && stateList.includes("Andhra Pradesh")) {
				note = "Note: Andhra Pradesh and Telangana are shown together as they were a unified state till 2014.";
			} else if (stateList.includes("Jammu and Kashmir") && stateList.includes("Ladakh")) {
				note = "Note: Jammu & Kashmir and Ladakh UTs are shown together as they were a unified state till 2019. 1991 data is unavailable due to unrest.";
			} else if (stateList.includes("Uttarakhand")) {
				note = "Note: Uttarakhand was carved out of Uttar Pradesh in 2000. For 1991 data, UP figures are used for Uttarakhand.";
			} else if (stateList.includes("Jharkhand")) {
				note = "Note: Jharkhand was carved out of Bihar in 2000. For 1991 data, Bihar figures are used for Jharkhand.";
			} else if (stateList.includes("Chhattisgarh")) {
				note = "Note: Chhattisgarh was carved out of Madhya Pradesh in 2000. For 1991 data, MP figures are used for Chhattisgarh.";
			} else if (stateList.includes("Manipur")) {
				note = "Note: For 1991 data, category information for 5,00,000 speakers in Manipur is unavailable. They're assumed to be Monolingual.";
			} else if (stateList.includes("Dadra and Nagar Haveli and Daman and Diu")) {
				note = "Note: Dadra & Nagar Haveli and Daman & Diu, merged in 2020, are shown together with data consolidated under Gujarati as the major language.";
			}
			d3.select("#chart-note").text(note);
			stateList.forEach(state => {			
			d3.selectAll(".state").filter(s => s.properties.st_nm === state)
            .classed("selected", true);
			d3.selectAll(".state-label").filter(s => s.properties.st_nm === state)
            .classed("selected", true);
			mapGroup.selectAll("path").filter(s => s.properties.st_nm === state)
            .attr("fill", d => highlightRegionColors[getRegion(d.properties.st_nm)])
			.attr("stroke-width", 2.05);
		});
	}

    d3.select("#reset-button").on("click", () => {
        currentRegion = "Non-Hindi, South West";
        currentState = "All";
		categoryContainer.selectAll("button").classed("active", d => d === "Monolinguals");
        regionContainer.selectAll("button").classed("active", false)
            .filter(function() { return d3.select(this).attr("data-region") === currentRegion; })
            .classed("active", true); 
		d3.selectAll(".state").classed("selected", false);
	    d3.selectAll(".state").classed("selectedRegion", false);
	    d3.selectAll(".state-label").classed("selected", false);
		mapGroup.selectAll("path")
            .attr("fill", d => regionColors[getRegion(d.properties.st_nm)])
			.attr("stroke-width", 2);
        d3.select("#chart").html("");
		note = "";
    });	

    function updateChart(region, state) {
        let selectedCategory = d3.select("#category-buttons button.active").attr("data-category");
         console.log("region:", region);
		 console.log("state:", state);
        let filteredData = data.filter(d => 
            (d.Region === region) && 
            (state === "All" || d.State === state) &&
            d.Category === selectedCategory
        );		
		
		function sanitizeValue(value) {
			return (value === "" || value === 0 || value === null || isNaN(value)) ? null : value;
		}

        if (filteredData.length === 0) {
            console.warn("⚠️ No data available for selected filters!");
            return;
        }

        let yMin, yMax;
        let values = filteredData.flatMap(d => [d["1991_Per"], d["2001_Per"], d["2011_Per"]]);
		yMin = Math.floor(Math.min(...values) / 10) * 10;
		yMax = Math.ceil(Math.max(...values) / 10) * 10;

        let width = document.getElementById("chart-container").clientWidth - 20;
        let height = document.getElementById("chart-container").clientHeight - 20;
		const marginLeft   = parseFloat(getComputedStyle(document.getElementById("chart-container")).getPropertyValue('margin-left'));
		const marginTop    = parseFloat(getComputedStyle(document.getElementById("chart-container")).getPropertyValue('margin-top'));
		const marginBottom = parseFloat(getComputedStyle(document.getElementById("chart-container")).getPropertyValue('margin-bottom'));
		const marginRight  = parseFloat(getComputedStyle(document.getElementById("chart-container")).getPropertyValue('margin-right'));

		console.log("Margin Left :" , marginLeft);
        let margin = { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft };

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
            .defined(d => d.percentage != null && !isNaN(d.percentage))  // Skip null/NaN points
			.x(d => xScale(d.year))
            .y(d => yScale(d.percentage));

        let statesList = [...new Set(filteredData.map(d => d.State))];
		
		// Add axes
		let axisLabelFontSize;
		let axisScaleFontSize;
		let labelsFontSize;

		if (window.innerWidth <= 375) {
			axisLabelFontSize = "8px";
			axisScaleFontSize = "7px";
			labelsFontSize = "6px";
		} else if (window.innerWidth <= 768) {
			axisLabelFontSize = "10px";
			axisScaleFontSize = "8px";
			labelsFontSize = "8px";
		} else {
			axisLabelFontSize = "12px";
			axisScaleFontSize = "10px";
			labelsFontSize = "9px";
		}
				

        statesList.forEach((stateName, index) => {
            let stateData = [
                {year: "1991", percentage: sanitizeValue(filteredData.find(d => d.State === stateName)["1991_Per"])},
                {year: "2001", percentage: sanitizeValue(filteredData.find(d => d.State === stateName)["2001_Per"])},
                {year: "2011", percentage: sanitizeValue(filteredData.find(d => d.State === stateName)["2011_Per"])}
            ];

            let lineColor = regionColors[region] || "#777";

            // Create line
            let path = svg.append("path")
                .datum(stateData)
				.attr("class", "state-line")
				.attr("data-state", stateName)
                .attr("fill", "none")
                .attr("stroke", lineColor)
                .attr("stroke-width", 1.2)
                .attr("d", lineGenerator)
                .style("cursor", currentState === "All" ? "pointer" : "default")
				.on("mouseover", function(event, d) {
                    d3.select(this)
					  .style("stroke-width", 2)
					  .style("opacity", 1);
					d3.selectAll(`.state-line-label[data-state='${stateName}']`).select("text")
							.style("font-weight", "bold")
							.style("opacity", 1)
							.style("font-size",axisLabelFontSize);
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
					  .style("stroke-width", 1.2)
					  .style("opacity", 0.6);
					d3.selectAll(`.state-line-label[data-state='${stateName}']`).select("text")
							.style("font-weight", "normal")
							.style("opacity", 0.9)
							.style("font-size",labelsFontSize);
                });

            // Add dots
			let circleRadius;

			if (window.innerWidth <= 375) {
				circleRadius = 3;
			} else if (window.innerWidth <= 768) {
				circleRadius = 5;
			} else if (window.innerWidth <= 1024) {
				circleRadius = 7;
			} else {
				circleRadius = 9;
			}
            svg.selectAll(`.dot-${index}`)
                .data(stateData.filter(d => d.percentage != null && !isNaN(d.percentage)))
                .enter()
                .append("circle")
                .attr("cx", d => xScale(d.year))
                .attr("cy", d => yScale(d.percentage))
                .attr("r", circleRadius) // Larger dots for TV visibility
                .attr("fill", lineColor)
                .attr("stroke", "white")
                .attr("stroke-width", 1.2)
                .on("mouseover", function(event, d) {
                    tooltip.style("display", "block")
						.html(`${stateName}<br>${d.year}: ${d.percentage.toFixed(1)}%`)
						.style("left", (event.pageX + 15) + "px")
						.style("top", (event.pageY - 30) + "px");
					d3.selectAll(`.state-line[data-state='${stateName}']`)
					  .style("stroke-width", 2)
					  .style("opacity", 1);
					d3.selectAll(`.state-line-label[data-state='${stateName}']`).select("text")
							.style("font-weight", "bold")
							.style("opacity", 1)
							.style("font-size",axisLabelFontSize);
                })
                .on("mouseout", function() {
                    tooltip.style("display", "none");
					d3.selectAll(`.state-line[data-state='${stateName}']`)
					  .style("stroke-width", 1.2)
					  .style("opacity", 0.6);
					d3.selectAll(`.state-line-label[data-state='${stateName}']`).select("text")
							.style("font-weight", "normal")
							.style("opacity", 0.9)
							.style("font-size",labelsFontSize);
                }); 
			
			svg.selectAll(".state-line-label").remove();
			
			// Add labels to data points when state is selected
            if (currentState !== "All") {
                svg.selectAll(`.label-${index}`)
                    .data(stateData.filter(d => d.percentage != null && !isNaN(d.percentage)))
                    .enter().append("text")
                    .attr("x", d => xScale(d.year) + 20)
                    .attr("y", d => yScale(d.percentage)-20)
                    .attr("text-anchor", "middle")
                    .attr("fill", "white")
                    .attr("font-size", labelsFontSize)
                    .text(d => d.percentage.toFixed(1) + "%" );
            }
			
			// Animation
            let totalLength = path.node().getTotalLength();
            path.attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(1500)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0)
				.on("end", function() {
					addStateLabels();  // Call label rendering after animation
				});				
			
			function addStateLabels() {				
				// Add labels to the line graph
				stateData = filteredData.find(d => d.State === stateName);
				if (stateData && stateData["2011_Per"] != null && stateData["2011_Per"] !== "") {
					
					// Get coordinates for 2001 and 2011 points
					let x2001 = xScale("2001");
					let y2001 = yScale(stateData["2001_Per"]);
					let x2011 = xScale("2011");
					let y2011 = yScale(stateData["2011_Per"]);	

					// Alternate placement
					const use2011 = index % 2 === 0;
					
					const xPos = use2011 ? x2011 - 20 : x2001 - 20;
					const yPos = use2011 ? y2011 + 20 : y2001 + 20;
					
					const labelGroup = svg.append("g")
						.attr("class", "state-line-label")
						.attr("data-state", stateName);

					// Invisible rect to increase hit area
					labelGroup.append("rect")
						.attr("x", xPos)
						.attr("y", yPos)
						.attr("width", 50)
						.attr("height", 15)
						.style("fill", "transparent");

					// Actual visible text
					labelGroup.append("text")
						.attr("x", xPos)
						.attr("y", yPos)
						.text(`${stateName}`)
						.style("text-anchor", "middle")
						.style("fill", "white")
						.style("font-size", labelsFontSize)
						.style("opacity", 0)  // Initially invisible
						.text(`${stateName}`)
						.transition()        // Transition for smooth fade-in
						.duration(400)
						.delay(100)          // Small delay for nicer effect
						.style("opacity", 1);

					// Mouseover on group
					labelGroup
						.on("mouseover", function() {
							const state = d3.select(this).attr("data-state");

							d3.selectAll(`.state-line[data-state='${state}']`)
								.style("stroke-width", 2)
								.style("opacity", 1);

							d3.select(this).select("text")
								.style("font-weight", "bold")
								.style("opacity", 1)
								.style("font-size",axisLabelFontSize);
						})
						.on("mouseout", function() {
							const state = d3.select(this).attr("data-state");

							d3.selectAll(`.state-line[data-state='${state}']`)
								.style("stroke-width", 1.2)
								.style("opacity", 0.6);

							d3.select(this).select("text")
								.style("font-weight", "normal")
								.style("opacity", 0.9)
								.style("font-size",labelsFontSize);
						});
				}
			};
            
        });
		
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickSize(8))
            .selectAll("text")
            .style("font-size", axisScaleFontSize);

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).tickValues(d3.range(yMin, yMax + 10, 10)))
            .selectAll("text")
            .style("font-size", axisScaleFontSize);
			
		// Y-axis Label
		svg.append("text")
		   .attr("class", "y-axis-label")
		   .attr("transform", "rotate(-90)")
		   .attr("y", margin.left / 4)
		   .attr("x", -(height / 2))
		   .style("text-anchor", "middle")
		   .style("fill", "white")
		   .style("font-size", axisLabelFontSize)
		   .text("Percentage of Speakers");

		// X-axis Label
		svg.append("text")
		   .attr("class", "x-axis-label")
		   .attr("x", (width + margin.right - margin.left) / 2)
		   .attr("y", height - (margin.bottom / 4))
		   .style("text-anchor", "middle")
		   .style("fill", "white")
		   .style("font-size", axisLabelFontSize)
		   .text("Census Year");

    }
	
	window.addEventListener("resize", () => {
		updateChart(currentRegion, currentState);
	});
});


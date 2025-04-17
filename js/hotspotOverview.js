// Hotspot Overview handler for detailed area analysis
class HotspotOverviewHandler {
    constructor() {
        this.map = null;
        this.hotspots = [];
        this.activeHotspot = null;
        this.highlightedAreas = [];
        this.overviewActive = false;
        this.sidebarOpen = false;
    }

    // Initialize the handler
    init(map) {
        this.map = map;
        this.setupEventListeners();
        
        // Add sources and layers for hotspots
        this.setupMapLayers();
    }

    // Setup overview button and event listeners
    setupEventListeners() {
        // Create and add overview button to map
        const overviewButton = document.createElement('button');
        overviewButton.id = 'overview-button';
        overviewButton.className = 'map-control-button';
        overviewButton.innerHTML = '<span>Show Hotspots </span><span class="analysis-icon">&#x2192;</span>';
        
        const mapContainer = document.querySelector('.map-container');
        mapContainer.appendChild(overviewButton);
        
        // Add event listener for overview button
        overviewButton.addEventListener('click', () => {
            this.toggleOverview();
        });
        
        // Create hotspot sidebar for analysis
        const hotspotSidebar = document.createElement('div');
        hotspotSidebar.id = 'hotspot-sidebar';
        hotspotSidebar.className = 'hotspot-sidebar';
        
        const sidebarContent = `
            <div class="hotspot-sidebar-header">
                <h3>Hotspot Analysis</h3>
                <button id="close-hotspot-sidebar">×</button>
            </div>
            <div class="hotspot-sidebar-content">
                <div id="hotspot-stats"></div>
                <div id="hotspot-charts"></div>
                <div id="hotspot-crash-list"></div>
            </div>
        `;
        
        hotspotSidebar.innerHTML = sidebarContent;
        mapContainer.appendChild(hotspotSidebar);
        
        // Add event listener for close button
        document.getElementById('close-hotspot-sidebar').addEventListener('click', () => {
            this.closeSidebar();
        });
    }

    // Toggle overview mode
    toggleOverview() {
        this.overviewActive = !this.overviewActive;
        
        if (this.overviewActive) {
            document.getElementById('overview-button').classList.add('active');
            this.identifyHotspots();
            this.highlightHotspots();
            
            // Open the sidebar with a help message
            this.openSidebarWithHelp();
        } else {
            document.getElementById('overview-button').classList.remove('active');
            this.clearHotspotHighlights();
            this.closeSidebar();
        }
    }

    // Identify hotspots based on crash data
    identifyHotspots() {
        // Get current filtered data using the app's getSelectedCheckboxValues function
        const type = getSelectedCheckboxValues('crash-type');
        const severity = getSelectedCheckboxValues('crash-severity');
        const year = getSelectedCheckboxValues('crash-year');
        
        const data = dataProcessor.getFilteredData(type, severity, year);
        
        // Find hotspots using grid-based analysis
        this.hotspots = this.findHotspots(data, 0.3); // 300m radius
        
        // Sort hotspots by number of points
        this.hotspots.sort((a, b) => b.points.length - a.points.length);
    }

    // Highlight hotspots on the map
    highlightHotspots() {
        this.clearHotspotHighlights();
        
        // Create features for hotspots
        const features = this.hotspots.map(hotspot => {
            // Create a circular polygon for each hotspot
            const center = hotspot.center;
            const radius = 0.3; // 300 meters
            const points = 64; // Number of points to make the circle smoother
            
            const polygon = this.createCircle(center, radius, points);
            
            return {
                type: 'Feature',
                properties: {
                    id: hotspot.id,
                    count: hotspot.points.length
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [polygon]
                }
            };
        });
        
        // Update the GeoJSON source
        this.map.getSource('hotspot-areas').setData({
            type: 'FeatureCollection',
            features: features
        });
        
        // Add click event for hotspot areas
        if (!this.clickHandlerSet) {
            this.map.on('click', 'hotspot-areas-fill', (e) => {
                if (e.features.length > 0) {
                    const feature = e.features[0];
                    const hotspotId = feature.properties.id;
                    
                    // Find the hotspot
                    const hotspot = this.hotspots.find(h => h.id === hotspotId);
                    if (hotspot) {
                        this.showHotspotAnalysis(hotspot);
                    }
                }
            });
            
            // Change cursor on hover
            this.map.on('mouseenter', 'hotspot-areas-fill', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            
            this.map.on('mouseleave', 'hotspot-areas-fill', () => {
                this.map.getCanvas().style.cursor = '';
            });
            
            this.clickHandlerSet = true;
        }
    }
    
    // Clear hotspot highlights from the map
    clearHotspotHighlights() {
        // Clear regular hotspots
        if (this.map.getSource('hotspot-areas')) {
            this.map.getSource('hotspot-areas').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
        
        // Clear selected hotspot
        if (this.map.getSource('selected-hotspot')) {
            this.map.getSource('selected-hotspot').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    }
    
    // Show detailed analysis for a hotspot
    showHotspotAnalysis(hotspot) {
        this.activeHotspot = hotspot;
        
        // Fly to the hotspot
        this.map.flyTo({
            center: hotspot.center,
            zoom: 15,
            essential: true
        });
        
        // Highlight the selected hotspot
        const center = hotspot.center;
        const radius = 0.3; // 300 meters
        const points = 64; // Number of points to make the circle smoother
        
        const polygon = this.createCircle(center, radius, points);
        
        // Update the selected hotspot source
        this.map.getSource('selected-hotspot').setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    id: hotspot.id,
                    count: hotspot.points.length
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [polygon]
                }
            }]
        });
        
        // Open the sidebar
        this.openSidebar();
        
        // Populate sidebar with hotspot data
        this.populateHotspotSidebar(hotspot);
    }
    
    // Open the analysis sidebar
    openSidebar() {
        document.getElementById('hotspot-sidebar').classList.add('open');
        this.sidebarOpen = true;
        
        // Clear the help message if it exists
        const sidebarContent = document.querySelector('.hotspot-sidebar-content');
        if (sidebarContent && sidebarContent.querySelector('.hotspot-help-message')) {
            sidebarContent.innerHTML = `
                <div id="hotspot-stats"></div>
                <div id="hotspot-charts"></div>
                <div id="hotspot-crash-list"></div>
            `;
        }
    }
    
    // Close the analysis sidebar
    closeSidebar() {
        document.getElementById('hotspot-sidebar').classList.remove('open');
        this.sidebarOpen = false;
        this.activeHotspot = null;
        
        // Clear the selected hotspot highlight
        if (this.map && this.map.getSource('selected-hotspot')) {
            this.map.getSource('selected-hotspot').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    }
    
    // Populate sidebar with hotspot data
    populateHotspotSidebar(hotspot) {
        const statsElement = document.getElementById('hotspot-stats');
        const chartsElement = document.getElementById('hotspot-charts');
        const crashListElement = document.getElementById('hotspot-crash-list');
        
        // Get common street names without any speed limit numbers
        const streets = this.getCommonStreets(hotspot.points);
        
        // Filter out any remaining numeric-only items that might be speed limits
        const cleanStreetNames = streets.filter(street => 
            // Filter out anything that's just numbers or looks like a speed limit
            !/^\d+$/.test(street) && 
            !/^Speed Limit \d+$/.test(street)
        );
        
        let location = 'Unknown Area';
        if (cleanStreetNames.length > 0) {
            location = cleanStreetNames.join(' & ');
        }
        
        // Calculate statistics
        const severityCounts = this.getSeverityCounts(hotspot.points);
        const typeCounts = this.getTypeCounts(hotspot.points);
        const yearCounts = this.getYearCounts(hotspot.points);
        const speedLimitCounts = this.getSpeedLimitCounts(hotspot.points);
        
        // Populate stats section - with no street speed limits at the top
        statsElement.innerHTML = `
            <div class="hotspot-summary">
                <div class="hotspot-stat">
                    <div class="hotspot-stat-value">${hotspot.points.length}</div>
                    <div class="hotspot-stat-label">Total Crashes</div>
                </div>
                <div class="hotspot-stat">
                    <div class="hotspot-stat-value">${severityCounts.K}</div>
                    <div class="hotspot-stat-label">Fatalities</div>
                </div>
                <div class="hotspot-stat">
                    <div class="hotspot-stat-value">${severityCounts.A + severityCounts.B + severityCounts.C}</div>
                    <div class="hotspot-stat-label">Injuries</div>
                </div>
            </div>
        `;
        
        // Charts and detailed info
        let chartsHTML = `
            <div class="hotspot-location">
                <h4>Location</h4>
                <p>${location}</p>
            </div>
            
            <div class="chart-container">
                <h5>Severity Breakdown</h5>
                <div class="bar-chart">
        `;
        
        // Get the maximum count for scaling
        const maxSeverityCount = Math.max(
            severityCounts.K || 0,
            severityCounts.A || 0,
            severityCounts.B || 0,
            severityCounts.C || 0
        );
        
        const severities = [
            { code: 'K', label: 'Fatal' },
            { code: 'A', label: 'Suspected Serious' },
            { code: 'B', label: 'Suspected Minor' },
            { code: 'C', label: 'Possible Injury' }
        ];
        
        severities.forEach(severity => {
            const count = severityCounts[severity.code] || 0;
            if (count > 0) {
                const barWidth = maxSeverityCount > 0 ? (count / maxSeverityCount * 100) : 0;
                
                let fillClass = '';
                switch(severity.code) {
                    case 'K': fillClass = 'fatal'; break;
                    case 'A': fillClass = 'serious'; break;
                    case 'B': fillClass = 'minor'; break;
                    case 'C': fillClass = 'possible'; break;
                }
                
                chartsHTML += `
                    <div class="chart-bar">
                        <div class="chart-label">${severity.label}</div>
                        <div class="chart-bar-container">
                            <div class="chart-bar-fill ${fillClass}" style="width: ${barWidth}%"></div>
                        </div>
                        <div class="chart-value">${count}</div>
                    </div>
                `;
            }
        });
        
        chartsHTML += `
                </div>
            </div>
        `;
        
        // Add speed limit breakdown
        if (Object.keys(speedLimitCounts).length > 0) {
            chartsHTML += `
                <div class="chart-container">
                    <h5>Speed Limits</h5>
                    <p class="chart-description">Posted speed limits where crashes occurred</p>
                    <div class="bar-chart">
            `;
            
            // Get the maximum count for scaling
            const maxSpeedLimitCount = Math.max(...Object.values(speedLimitCounts));
            
            // Define speed limit groups with colors
            const speedLimits = [
                { range: '0-25', label: '0-25 mph', class: 'speed-low' },
                { range: '30-35', label: '30-35 mph', class: 'speed-medium' },
                { range: '40-45', label: '40-45 mph', class: 'speed-high' },
                { range: '50+', label: '50+ mph', class: 'speed-very-high' },
                { range: 'Unknown', label: 'Unknown', class: 'speed-unknown' }
            ];
            
            speedLimits.forEach(speedLimit => {
                const count = speedLimitCounts[speedLimit.range] || 0;
                if (count > 0) {
                    const barWidth = maxSpeedLimitCount > 0 ? (count / maxSpeedLimitCount * 100) : 0;
                    
                    chartsHTML += `
                        <div class="chart-bar">
                            <div class="chart-label">${speedLimit.label}</div>
                            <div class="chart-bar-container">
                                <div class="chart-bar-fill ${speedLimit.class}" style="width: ${barWidth}%"></div>
                            </div>
                            <div class="chart-value">${count}</div>
                        </div>
                    `;
                }
            });
            
            chartsHTML += `
                    </div>
                </div>
            `;
            
            // If there are fatalities, show a fatality rate by speed limit chart
            const fatalCrashes = severityCounts.K || 0;
            if (fatalCrashes > 0) {
                chartsHTML += `
                    <div class="chart-container">
                        <h5>Fatalities by Speed Limit</h5>
                        <p class="chart-description">Fatal crashes by speed limit</p>
                        <div class="fatality-chart">
                `;
                
                // Calculate fatalities by speed limit
                const fatalitiesBySpeed = {};
                let maxFatalityCount = 0;
                
                // Count fatal crashes by speed limit
                hotspot.points.filter(p => p.severity === 'K').forEach(crash => {
                    const speedRange = this.getSpeedLimitRange(crash.speedLimit);
                    fatalitiesBySpeed[speedRange] = (fatalitiesBySpeed[speedRange] || 0) + 1;
                    maxFatalityCount = Math.max(maxFatalityCount, fatalitiesBySpeed[speedRange]);
                });
                
                speedLimits.forEach(speedLimit => {
                    const count = fatalitiesBySpeed[speedLimit.range] || 0;
                    if (count > 0) {
                        const barWidth = maxFatalityCount > 0 ? (count / maxFatalityCount * 100) : 0;
                        
                        chartsHTML += `
                            <div class="chart-bar">
                                <div class="chart-label">${speedLimit.label}</div>
                                <div class="chart-bar-container">
                                    <div class="chart-bar-fill ${speedLimit.class}" style="width: ${barWidth}%"></div>
                                </div>
                                <div class="chart-value">${count}</div>
                            </div>
                        `;
                    }
                });
                
                chartsHTML += `
                        </div>
                    </div>
                `;
            }
        }
        
        // Add type breakdown if we have different types
        if (typeCounts.pedestrian > 0 && typeCounts.cyclist > 0) {
            const maxTypeCount = Math.max(typeCounts.pedestrian, typeCounts.cyclist);
            
            chartsHTML += `
                <div class="chart-container">
                    <h5>Crash Type</h5>
                    <div class="bar-chart">
                        <div class="chart-bar">
                            <div class="chart-label">Pedestrian</div>
                            <div class="chart-bar-container">
                                <div class="chart-bar-fill pedestrian" style="width: ${(typeCounts.pedestrian / maxTypeCount) * 100}%"></div>
                            </div>
                            <div class="chart-value">${typeCounts.pedestrian}</div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-label">Cyclist</div>
                            <div class="chart-bar-container">
                                <div class="chart-bar-fill cyclist" style="width: ${(typeCounts.cyclist / maxTypeCount) * 100}%"></div>
                            </div>
                            <div class="chart-value">${typeCounts.cyclist}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Year breakdown
        const years = Object.keys(yearCounts).sort();
        if (years.length > 1) {
            const maxYearCount = Math.max(...Object.values(yearCounts));
            
            chartsHTML += `
                <div class="chart-container">
                    <h5>Year Breakdown</h5>
                    <div class="bar-chart">
            `;
            
            years.forEach(year => {
                const count = yearCounts[year];
                if (count > 0) {
                    const barWidth = maxYearCount > 0 ? (count / maxYearCount * 100) : 0;
                    
                    chartsHTML += `
                        <div class="chart-bar">
                            <div class="chart-label">${year}</div>
                            <div class="chart-bar-container">
                                <div class="chart-bar-fill" style="width: ${barWidth}%; background-color: #6c757d;"></div>
                            </div>
                            <div class="chart-value">${count}</div>
                        </div>
                    `;
                }
            });
            
            chartsHTML += `
                    </div>
                </div>
            `;
        }
        
        chartsElement.innerHTML = chartsHTML;
        
        // Populate crash list with details of each crash
        let crashListHTML = `
            <h4>Individual Crashes (${hotspot.points.length})</h4>
            <div class="crash-list">
        `;
        
        // Sort crashes by severity and date (most severe and recent first)
        const sortedCrashes = [...hotspot.points].sort((a, b) => {
            // First sort by severity (K > A > B > C)
            const severityOrder = { 'K': 0, 'A': 1, 'B': 2, 'C': 3, 'U': 4 };
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            
            if (severityDiff !== 0) return severityDiff;
            
            // Then sort by date (most recent first)
            return new Date(b.date) - new Date(a.date);
        });
        
        sortedCrashes.forEach(crash => {
            // Debug crash data
            
            // Get severity text and class
            let severityText = '';
            let severityClass = '';
            
            switch(crash.severity) {
                case 'K':
                    severityText = 'Fatal';
                    severityClass = 'fatal';
                    break;
                case 'A':
                    severityText = 'Serious';
                    severityClass = 'serious';
                    break;
                case 'B':
                    severityText = 'Minor';
                    severityClass = 'minor';
                    break;
                case 'C':
                    severityText = 'Possible';
                    severityClass = 'possible';
                    break;
                default:
                    severityText = 'Unknown';
                    severityClass = '';
            }
            
            // Format the time
            let timeDisplay = crash.time || '';
            if (timeDisplay) {
                // Convert 24-hour time to 12-hour format with AM/PM
                const timeParts = timeDisplay.split(':');
                if (timeParts.length >= 2) {
                    const hour = parseInt(timeParts[0]);
                    const minute = timeParts[1];
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
                    timeDisplay = `${hour12}:${minute} ${ampm}`;
                }
            }
            
            // Get speed limit text
            let speedLimitText = '';
            if (crash.speedLimit) {
                speedLimitText = `<span class="crash-speed-limit">Speed limit: ${crash.speedLimit} mph</span>`;
            }
            
            // Format conditions for display - use only the conditions we want
            const lightCondition = crash.lightCondition ? `<span class="crash-light-condition">${crash.lightCondition}</span>` : '';
            const intersection = crash.intersectionDetails ? `<span class="crash-intersection">${crash.intersectionDetails}</span>` : '';
            
            // Get formatted weather
            const weatherDisplay = crash.weather || '';
            
            // Build custom HTML without any reference to the atIntersection flag
            crashListHTML += `
                <div class="crash-item">
                    <div class="crash-severity ${severityClass}">${severityText}</div>
                    <div class="crash-info">
                        <div class="crash-date">${crash.date} at ${timeDisplay}</div>
                        
                        <div class="crash-details">
                            <span class="crash-type ${crash.type}">${crash.type === 'pedestrian' ? 'Pedestrian' : 'Cyclist'}</span>
                            ${speedLimitText}
                        </div>
                        
                        <div class="crash-conditions">
                            ${lightCondition}
                            ${intersection}
                        </div>
                        <div class="crash-factors">${crash.factors || 'No factors reported'}</div>
                    </div>
                </div>
            `;
        });
        
        crashListHTML += `</div>`;
        
        // Update the crash list element
        crashListElement.innerHTML = crashListHTML;
    }
    
    // Find hotspots using a grid-based density analysis
    findHotspots(data, radiusKm = 0.3) {
        if (data.length < 4) return []; // Not enough data for valid hotspots
        
        const hotspots = [];
        let hotspotId = 1;
        
        // For each point, check if it has enough neighbors within radius
        data.forEach((point, i) => {
            // Skip points that are already part of a hotspot
            if (point.inHotspot) return;
            
            // Find neighbors within radius
            const neighbors = data.filter((p, j) => {
                if (i === j || p.inHotspot) return false;
                
                // Calculate distance between points
                const distance = this.haversineDistance(
                    point.coordinates, 
                    p.coordinates
                );
                
                return distance <= radiusKm;
            });
            
            // If there are enough neighbors, create a hotspot
            if (neighbors.length >= 3) { // At least 4 points total (current + 3 neighbors)
                const hotspotPoints = [point, ...neighbors];
                
                // Mark points as part of a hotspot
                hotspotPoints.forEach(p => { p.inHotspot = true; });
                
                // Calculate center of the hotspot
                const center = this.calculateCentroid(hotspotPoints);
                
                hotspots.push({
                    id: `hotspot-${hotspotId++}`,
                    center: center,
                    points: hotspotPoints,
                    radius: radiusKm
                });
            }
        });
        
        // Clean up the inHotspot flag
        data.forEach(p => { delete p.inHotspot; });
        
        return hotspots;
    }
    
    // Calculate the centroid of a group of points
    calculateCentroid(points) {
        let sumLat = 0;
        let sumLng = 0;
        
        points.forEach(p => {
            sumLng += p.coordinates[0];
            sumLat += p.coordinates[1];
        });
        
        return [sumLng / points.length, sumLat / points.length];
    }
    
    // Create a circle polygon given center, radius in km, and number of points
    createCircle(center, radiusKm, numPoints) {
        const coordinates = [];
        const radiusInDegrees = this.kmToLngDegrees(radiusKm, center[1]);
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i * 2 * Math.PI) / numPoints;
            const dx = radiusInDegrees * Math.cos(angle);
            const dy = radiusInDegrees * Math.sin(angle);
            coordinates.push([center[0] + dx, center[1] + dy]);
        }
        
        // Close the loop
        coordinates.push(coordinates[0]);
        
        return coordinates;
    }
    
    // Convert km to degrees of longitude at a given latitude
    kmToLngDegrees(km, latitude) {
        return km / (111.32 * Math.cos(this.toRadians(latitude)));
    }
    
    // Calculate haversine distance between two coordinate pairs
    haversineDistance(coord1, coord2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(coord2[1] - coord1[1]);
        const dLon = this.toRadians(coord2[0] - coord1[0]);
        
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(coord1[1])) * Math.cos(this.toRadians(coord2[1])) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }
    
    // Get common streets in a hotspot
    getCommonStreets(points) {
        const streetCounts = {};
        
        points.forEach(p => {
            // Only use the clean street name without speed limits
            const street = p.streetName || 'Unknown';
            if (street !== 'Unknown') {
                streetCounts[street] = (streetCounts[street] || 0) + 1;
            }
        });
        
        // Get top 3 most common streets
        return Object.entries(streetCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => entry[0]);
    }
    
    // Get severity counts for a list of points
    getSeverityCounts(points) {
        return {
            K: points.filter(p => p.severity === 'K').length,
            A: points.filter(p => p.severity === 'A').length,
            B: points.filter(p => p.severity === 'B').length,
            C: points.filter(p => p.severity === 'C').length
        };
    }
    
    // Get type counts for a list of points
    getTypeCounts(points) {
        return {
            pedestrian: points.filter(p => p.type === 'pedestrian').length,
            cyclist: points.filter(p => p.type === 'cyclist').length
        };
    }
    
    // Get year counts for a list of points
    getYearCounts(points) {
        const yearCounts = {};
        
        points.forEach(point => {
            if (point.year) {
                if (!yearCounts[point.year]) {
                    yearCounts[point.year] = 0;
                }
                yearCounts[point.year]++;
            }
        });
        
        return yearCounts;
    }
    
    // Convert degrees to radians
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Setup map layers for hotspots
    setupMapLayers() {
        // Add source for hotspot areas if it doesn't exist
        if (!this.map.getSource('hotspot-areas')) {
            this.map.addSource('hotspot-areas', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
            
            // Add fill layer for hotspots
            this.map.addLayer({
                id: 'hotspot-areas-fill',
                type: 'fill',
                source: 'hotspot-areas',
                paint: {
                    'fill-color': '#ffffff',
                    'fill-opacity': 0.2
                }
            });
            
            // Add outline layer for hotspots
            this.map.addLayer({
                id: 'hotspot-areas-outline',
                type: 'line',
                source: 'hotspot-areas',
                paint: {
                    'line-color': '#f7a156',
                    'line-width': 2,
                    'line-opacity': 0.9
                }
            });
        }
        
        // Add source for selected hotspot
        if (!this.map.getSource('selected-hotspot')) {
            this.map.addSource('selected-hotspot', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
            
            // Add fill layer for selected hotspot
            this.map.addLayer({
                id: 'selected-hotspot-fill',
                type: 'fill',
                source: 'selected-hotspot',
                paint: {
                    'fill-color': '#f7a156',
                    'fill-opacity': 0.3
                }
            });
            
            // Add outline layer for selected hotspot
            this.map.addLayer({
                id: 'selected-hotspot-outline',
                type: 'line',
                source: 'selected-hotspot',
                paint: {
                    'line-color': '#f7a156',
                    'line-width': 3,
                    'line-opacity': 1
                }
            });
        }
    }

    // Open the sidebar with a help message
    openSidebarWithHelp() {
        // Open the sidebar
        document.getElementById('hotspot-sidebar').classList.add('open');
        this.sidebarOpen = true;
        
        // Add help message to the sidebar
        const sidebarContent = document.querySelector('.hotspot-sidebar-content');
        if (sidebarContent) {
            sidebarContent.innerHTML = `
                <div class="hotspot-help-message">
                    <h4>Crash Hotspots</h4>
                    <p>These are areas with a high concentration of pedestrian and cyclist crashes.</p>
                    <p>Zoom in and click on a highlighted area to see detailed analysis.</p>
                    <div class="help-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" height="64" width="64" viewBox="0 0 24 24" fill="#2c3e50">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"/>
                        </svg>
                    </div>
                </div>
            `;
        }
    }

    // Get speed limit counts grouped into ranges
    getSpeedLimitCounts(points) {
        const counts = {
            '0-25': 0,
            '30-35': 0,
            '40-45': 0,
            '50+': 0,
            'Unknown': 0
        };
        
        points.forEach(point => {
            if (point.speedLimit === null) {
                counts['Unknown']++;
            } else if (point.speedLimit <= 25) {
                counts['0-25']++;
            } else if (point.speedLimit >= 30 && point.speedLimit <= 35) {
                counts['30-35']++;
            } else if (point.speedLimit >= 40 && point.speedLimit <= 45) {
                counts['40-45']++;
            } else if (point.speedLimit >= 50) {
                counts['50+']++;
            }
        });
        
        return counts;
    }

    // Helper method to determine speed limit range
    getSpeedLimitRange(speedLimit) {
        if (speedLimit === null) {
            return 'Unknown';
        } else if (speedLimit <= 25) {
            return '0-25';
        } else if (speedLimit >= 30 && speedLimit <= 35) {
            return '30-35';
        } else if (speedLimit >= 40 && speedLimit <= 45) {
            return '40-45';
        } else if (speedLimit >= 50) {
            return '50+';
        }
        return 'Unknown';
    }
}

// Create instance
const hotspotOverview = new HotspotOverviewHandler(); 
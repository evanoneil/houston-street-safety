// Analysis handler for crash data clustering and visualization
class AnalysisHandler {
    constructor() {
        this.currentType = 'all';
        this.currentSeverity = 'all';
        this.currentYear = 'all';
    }

    // Update filters and analyze data
    updateFilters(type, severity, year) {
        this.currentType = type;
        this.currentSeverity = severity;
        this.currentYear = year;
        
        // Update overview
        this.updateOverview();
        
        // Update hotspot analysis
        this.updateHotspots();
    }

    // Update overview in the UI
    updateOverview() {
        const stats = dataProcessor.getStatistics(this.currentType, this.currentSeverity, this.currentYear);
        const statsElement = document.getElementById('stats-content');
        
        if (statsElement) {
            // Show active filters information with more descriptive labels
            let filterInfoHTML = '<div class="active-filters">';
            
            // Type filter info with improved formatting
            filterInfoHTML += '<p><strong>Type:</strong> ';
            if (this.currentType === 'all') {
                filterInfoHTML += '<span class="filter-value">All Types</span>';
            } else if (Array.isArray(this.currentType)) {
                const typeLabels = this.currentType.map(t => 
                    `<span class="filter-value ${t}">${t === 'pedestrian' ? 'Pedestrian' : 'Cyclist'}</span>`
                );
                filterInfoHTML += typeLabels.join(', ');
            } else {
                filterInfoHTML += `<span class="filter-value ${this.currentType}">${this.currentType === 'pedestrian' ? 'Pedestrian' : 'Cyclist'}</span>`;
            }
            filterInfoHTML += '</p>';
            
            // Severity filter info with improved formatting
            filterInfoHTML += '<p><strong>Severity:</strong> ';
            if (this.currentSeverity === 'all') {
                filterInfoHTML += '<span class="filter-value">All Severities</span>';
            } else if (Array.isArray(this.currentSeverity)) {
                const severityLabels = this.currentSeverity.map(s => {
                    let label = '';
                    switch (s) {
                        case 'K': label = 'Fatal'; break;
                        case 'A': label = 'Suspected Serious'; break;
                        case 'B': label = 'Suspected Minor'; break;
                        case 'C': label = 'Possible Injury'; break;
                        default: label = s;
                    }
                    return `<span class="filter-value severity-${s.toLowerCase()}">${s} - ${label}</span>`;
                });
                filterInfoHTML += severityLabels.join(', ');
            } else {
                let label = '';
                switch (this.currentSeverity) {
                    case 'K': label = 'Fatal'; break;
                    case 'A': label = 'Suspected Serious'; break;
                    case 'B': label = 'Suspected Minor'; break;
                    case 'C': label = 'Possible Injury'; break;
                    default: label = this.currentSeverity;
                }
                filterInfoHTML += `<span class="filter-value severity-${this.currentSeverity.toLowerCase()}">${this.currentSeverity} - ${label}</span>`;
            }
            filterInfoHTML += '</p>';
            
            // Year filter info with improved formatting
            filterInfoHTML += '<p><strong>Year:</strong> ';
            if (this.currentYear === 'all') {
                filterInfoHTML += '<span class="filter-value">All Years (2020-2025)</span>';
            } else if (Array.isArray(this.currentYear)) {
                const yearLabels = this.currentYear.map(y => 
                    `<span class="filter-value">${y}</span>`
                );
                filterInfoHTML += yearLabels.join(', ');
            } else {
                filterInfoHTML += `<span class="filter-value">${this.currentYear}</span>`;
            }
            filterInfoHTML += '</p>';
            
            filterInfoHTML += '</div>';
            
            // Populate stats section - with no street speed limits at the top
            let statsHTML = filterInfoHTML + `
                <div class="stat-summary">
                    <p>Total crashes: <strong>${stats.totalCount}</strong></p>
                </div>
            `;
            
            // Add severity breakdown
            const severities = [
                { code: 'K', label: 'Fatal' },
                { code: 'A', label: 'Suspected Serious' },
                { code: 'B', label: 'Suspected Minor' },
                { code: 'C', label: 'Possible Injury' }
            ];
            
            // Replace table with bar chart
            statsHTML += `
                <div class="chart-container">
                    <h5>Severity Breakdown</h5>
                    <div class="bar-chart">
            `;
            
            // Get the maximum count for scaling
            const maxSeverityCount = Math.max(
                stats.countBySeverity['K'],
                stats.countBySeverity['A'],
                stats.countBySeverity['B'],
                stats.countBySeverity['C']
            );
            
            severities.forEach(severity => {
                const count = stats.countBySeverity[severity.code];
                const barWidth = maxSeverityCount > 0 ? (count / maxSeverityCount * 100) : 0;
                
                let fillClass = '';
                switch(severity.code) {
                    case 'K': fillClass = 'fatal'; break;
                    case 'A': fillClass = 'serious'; break;
                    case 'B': fillClass = 'minor'; break;
                    case 'C': fillClass = 'possible'; break;
                }
                
                statsHTML += `
                    <div class="chart-bar">
                        <div class="chart-label">${severity.label}</div>
                        <div class="chart-bar-container">
                            <div class="chart-bar-fill ${fillClass}" style="width: ${barWidth}%"></div>
                        </div>
                        <div class="chart-value">${count}</div>
                    </div>
                `;
            });
            
            statsHTML += `
                    </div>
                </div>
            `;
            
            // Add speed limit breakdown
            statsHTML += `
                <div class="chart-container">
                    <h5>Speed Limit Analysis</h5>
                    <div class="bar-chart">
            `;
            
            // Get the maximum count for scaling
            const speedLimitGroups = Object.values(stats.speedLimitGroups);
            const maxSpeedLimitCount = Math.max(...speedLimitGroups);
            
            // Define speed limit groups with colors
            const speedLimits = [
                { range: '0-25', label: '0-25 mph', class: 'speed-low' },
                { range: '30-35', label: '30-35 mph', class: 'speed-medium' },
                { range: '40-45', label: '40-45 mph', class: 'speed-high' },
                { range: '50+', label: '50+ mph', class: 'speed-very-high' },
                { range: 'Unknown', label: 'Unknown', class: 'speed-unknown' }
            ];
            
            speedLimits.forEach(speedLimit => {
                const count = stats.speedLimitGroups[speedLimit.range];
                if (count > 0) {
                    const barWidth = maxSpeedLimitCount > 0 ? (count / maxSpeedLimitCount * 100) : 0;
                    
                    statsHTML += `
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
            
            statsHTML += `
                    </div>
                </div>
            `;
            
            // Add type breakdown if showing all types
            if (this.currentType === 'all') {
                const pedestrianCount = stats.countByType.pedestrian;
                const cyclistCount = stats.countByType.cyclist;
                
                // Get the maximum count for scaling
                const maxTypeCount = Math.max(pedestrianCount, cyclistCount);
                
                statsHTML += `
                    <div class="chart-container">
                        <h5>Crash Type Breakdown</h5>
                        <div class="bar-chart">
                            <div class="chart-bar">
                                <div class="chart-label">Pedestrian</div>
                                <div class="chart-bar-container">
                                    <div class="chart-bar-fill pedestrian" style="width: ${maxTypeCount > 0 ? (pedestrianCount / maxTypeCount * 100) : 0}%"></div>
                                </div>
                                <div class="chart-value">${pedestrianCount}</div>
                            </div>
                            <div class="chart-bar">
                                <div class="chart-label">Cyclist</div>
                                <div class="chart-bar-container">
                                    <div class="chart-bar-fill cyclist" style="width: ${maxTypeCount > 0 ? (cyclistCount / maxTypeCount * 100) : 0}%"></div>
                                </div>
                                <div class="chart-value">${cyclistCount}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Add year breakdown if showing all years
            if (this.currentYear === 'all') {
                const years = Object.keys(stats.countByYear).sort();
                
                // Get the maximum count for scaling
                const maxYearCount = Math.max(...years.map(year => stats.countByYear[year]));
                
                statsHTML += `
                    <div class="chart-container">
                        <h5>Year Breakdown</h5>
                        <div class="bar-chart">
                    `;
                    
                years.forEach(year => {
                    const count = stats.countByYear[year];
                    const barWidth = maxYearCount > 0 ? (count / maxYearCount * 100) : 0;
                    
                    statsHTML += `
                        <div class="chart-bar">
                            <div class="chart-label">${year}</div>
                            <div class="chart-bar-container">
                                <div class="chart-bar-fill" style="width: ${barWidth}%; background-color: #6c757d;"></div>
                            </div>
                            <div class="chart-value">${count}</div>
                        </div>
                    `;
                });
                
                statsHTML += `
                        </div>
                    </div>
                `;
            }
            
            // Update the content
            statsElement.innerHTML = statsHTML;
            
            // Update speed limit analysis tab if it exists
            const speedLimitElement = document.getElementById('speed-limit-content');
            if (speedLimitElement) {
                this.updateSpeedLimitAnalysis(speedLimitElement, stats);
            }
        }
    }
    
    // Update the speed limit analysis tab
    updateSpeedLimitAnalysis(element, stats) {
        let speedLimitHTML = `
            <div class="active-filters">
                <p>This analysis shows the relationship between speed limits and crash severity.</p>
            </div>
            
            <div class="chart-container">
                <h5>Crashes by Speed Limit</h5>
                <div class="bar-chart">
        `;
        
        // Get the maximum count for scaling
        const speedLimitGroups = Object.values(stats.speedLimitGroups);
        const maxSpeedLimitCount = Math.max(...speedLimitGroups);
        
        // Define speed limit groups with colors
        const speedLimits = [
            { range: '0-25', label: '0-25 mph', class: 'speed-low' },
            { range: '30-35', label: '30-35 mph', class: 'speed-medium' },
            { range: '40-45', label: '40-45 mph', class: 'speed-high' },
            { range: '50+', label: '50+ mph', class: 'speed-very-high' },
            { range: 'Unknown', label: 'Unknown', class: 'speed-unknown' }
        ];
        
        speedLimits.forEach(speedLimit => {
            const count = stats.speedLimitGroups[speedLimit.range];
            if (count > 0) {
                const barWidth = maxSpeedLimitCount > 0 ? (count / maxSpeedLimitCount * 100) : 0;
                
                speedLimitHTML += `
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
        
        speedLimitHTML += `
                </div>
            </div>
            
            <div class="chart-container">
                <h5>Fatalities by Speed Limit</h5>
                <p class="chart-description">This chart shows the count of fatal crashes at different posted speed limits.</p>
                <div class="bar-chart">
        `;
        
        // Get the maximum count for scaling
        const fatalityCounts = Object.values(stats.fatalitiesBySpeedLimit);
        const maxFatalityCount = Math.max(...fatalityCounts);
        
        speedLimits.forEach(speedLimit => {
            const count = stats.fatalitiesBySpeedLimit[speedLimit.range];
            if (count > 0) {
                const barWidth = maxFatalityCount > 0 ? (count / maxFatalityCount * 100) : 0;
                
                speedLimitHTML += `
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
        
        speedLimitHTML += `
                </div>
            </div>
            
            <div class="chart-container">
                <h5>Fatality Rate by Speed Limit</h5>
                <p class="chart-description">This chart shows the percentage of crashes that resulted in fatalities at each speed limit range.</p>
                <div class="bar-chart">
        `;
        
        // Calculate fatality rates
        const fatalityRates = {};
        let maxRate = 0;
        
        speedLimits.forEach(speedLimit => {
            const totalCrashes = stats.speedLimitGroups[speedLimit.range];
            const fatalCrashes = stats.fatalitiesBySpeedLimit[speedLimit.range];
            
            if (totalCrashes > 0) {
                const rate = (fatalCrashes / totalCrashes) * 100;
                fatalityRates[speedLimit.range] = rate;
                maxRate = Math.max(maxRate, rate);
            } else {
                fatalityRates[speedLimit.range] = 0;
            }
        });
        
        speedLimits.forEach(speedLimit => {
            const rate = fatalityRates[speedLimit.range];
            if (rate > 0) {
                const barWidth = maxRate > 0 ? (rate / maxRate * 100) : 0;
                
                speedLimitHTML += `
                    <div class="chart-bar">
                        <div class="chart-label">${speedLimit.label}</div>
                        <div class="chart-bar-container">
                            <div class="chart-bar-fill ${speedLimit.class}" style="width: ${barWidth}%"></div>
                        </div>
                        <div class="chart-value">${rate.toFixed(1)}%</div>
                    </div>
                `;
            }
        });
        
        speedLimitHTML += `
                </div>
            </div>

            <div class="chart-container">
                <h5>Speed-Related Crashes</h5>
                <p class="chart-description">Number of crashes where the crash report mentions speed or speeding as a contributing factor.</p>
                <div class="speed-related-stats">
                    <div class="stat-summary">
                        <div>
                            <h3>${stats.speedRelatedCount}</h3>
                            <p>Total speed-related crashes</p>
                        </div>
                        <div>
                            <h3>${stats.speedRelatedFatalities}</h3>
                            <p>Fatal speed-related crashes</p>
                        </div>
                        <div>
                            <h3>${stats.speedRelatedCount > 0 ? ((stats.speedRelatedCount / stats.totalCount) * 100).toFixed(1) : 0}%</h3>
                            <p>of all crashes</p>
                        </div>
                    </div>
                    <div class="speed-related-actions">
                        <button id="filter-speed-crashes" class="speed-filter-btn">Show only speed-related crashes</button>
                        <button id="reset-speed-filter" class="speed-filter-btn reset" style="display: none;">Show all crashes</button>
                    </div>
                </div>
            </div>
        `;
        
        element.innerHTML = speedLimitHTML;
        
        // Add event listeners to speed filter buttons
        const filterSpeedBtn = document.getElementById('filter-speed-crashes');
        const resetSpeedBtn = document.getElementById('reset-speed-filter');
        
        if (filterSpeedBtn) {
            filterSpeedBtn.addEventListener('click', () => {
                this.filterSpeedRelatedCrashes();
                filterSpeedBtn.style.display = 'none';
                resetSpeedBtn.style.display = 'block';
            });
        }
        
        if (resetSpeedBtn) {
            resetSpeedBtn.addEventListener('click', () => {
                this.resetSpeedFilter();
                resetSpeedBtn.style.display = 'none';
                filterSpeedBtn.style.display = 'block';
            });
        }
    }
    
    // Filter map to show only speed-related crashes
    filterSpeedRelatedCrashes() {
        // Get current filter values
        const typeFilter = this.currentType;
        const severityFilter = this.currentSeverity;
        const yearFilter = this.currentYear;
        
        // Get filtered data
        const filteredData = dataProcessor.getFilteredData(typeFilter, severityFilter, yearFilter);
        
        // Filter for speed-related crashes only
        const speedRelatedData = filteredData.filter(d => {
            if (!d.factors) return false;
            const factorsLower = d.factors.toLowerCase();
            return factorsLower.includes('speed') || 
                   factorsLower.includes('speeding') || 
                   factorsLower.includes('unsafe speed') ||
                   factorsLower.includes('over the limit');
        });
        
        // Convert to GeoJSON for map display
        const features = speedRelatedData.map(d => {
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: d.coordinates
                },
                properties: {
                    ...d.properties,
                    id: d.id,
                    type: d.type,
                    severity: d.severity
                }
            };
        });
        
        const geoJSON = {
            type: 'FeatureCollection',
            features
        };
        
        // Update map with filtered data
        mapHandler.updateMapData(geoJSON);
        
        // Add active filter indicator
        const filterIndicator = document.createElement('div');
        filterIndicator.id = 'speed-filter-indicator';
        filterIndicator.className = 'speed-filter-indicator';
        filterIndicator.innerHTML = `<p>Showing ${speedRelatedData.length} speed-related crashes</p>`;
        
        const existingIndicator = document.getElementById('speed-filter-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const speedLimitTab = document.getElementById('speed-limit-content');
        if (speedLimitTab) {
            speedLimitTab.prepend(filterIndicator);
        }
    }
    
    // Reset filter to show all crashes
    resetSpeedFilter() {
        // Get current filter values
        const typeFilter = this.currentType;
        const severityFilter = this.currentSeverity;
        const yearFilter = this.currentYear;
        
        // Get GeoJSON for all data with current filters
        const geoJSON = dataProcessor.getGeoJSON(typeFilter, severityFilter, yearFilter);
        
        // Update map with all data
        mapHandler.updateMapData(geoJSON);
        
        // Remove active filter indicator
        const filterIndicator = document.getElementById('speed-filter-indicator');
        if (filterIndicator) {
            filterIndicator.remove();
        }
    }

    // Update hotspot analysis
    updateHotspots() {
        const clustersElement = document.getElementById('clusters-content');
        
        if (clustersElement) {
            // Get filtered data
            const data = dataProcessor.getFilteredData(this.currentType, this.currentSeverity, this.currentYear);
            
            // Find hotspots using simple density analysis
            const hotspots = this.findHotspots(data, 0.5); // 0.5 km radius
            
            // Sort hotspots by density (descending)
            hotspots.sort((a, b) => b.density - a.density);
            
            // Display top hotspots
            let hotspotsHTML = '';
            
            if (hotspots.length === 0) {
                hotspotsHTML = '<p class="placeholder-text">No significant high-density areas found with current filters</p>';
            } else {
                hotspotsHTML = `
                    <p>Found ${hotspots.length} high-density areas with crash points</p>
                    <div class="hotspots-list">
                `;
                
                // Show all hotspots
                hotspots.forEach((hotspot, index) => {
                    // Get common street names
                    const streets = this.getCommonStreets(hotspot.points);
                    
                    // Count severities in this hotspot
                    const severityCounts = this.getSeverityCounts(hotspot.points);
                    
                    // Store additional data for precise cell visualization
                    const hotspotData = JSON.stringify({
                        bounds: hotspot.bounds,
                        pointCount: hotspot.points.length,
                        center: hotspot.center
                    });
                    
                    // Create hotspot item HTML with improved styling
                    hotspotsHTML += `
                        <div class="hotspot-item" data-lng="${hotspot.center[0]}" data-lat="${hotspot.center[1]}" data-hotspot='${hotspotData}'>
                            <h4>High-density Area #${index + 1}: ${hotspot.points.length} crashes</h4>
                            <div class="hotspot-content">
                                <div class="crash-severity-breakdown">
                                    <p><strong>Severity:</strong></p>
                                    <div class="chart-container">
                                        <div class="bar-chart">
                    `;
                    
                    // Get the maximum count for scaling
                    const maxSeverityCount = Math.max(
                        severityCounts.K || 0,
                        severityCounts.A || 0,
                        severityCounts.B || 0,
                        severityCounts.C || 0
                    );
                    
                    // Add severity bars
                    const severities = [
                        { code: 'K', label: 'Fatal' },
                        { code: 'A', label: 'Serious' },
                        { code: 'B', label: 'Minor' },
                        { code: 'C', label: 'Possible' }
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
                            
                            hotspotsHTML += `
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
                    
                    hotspotsHTML += `
                                        </div>
                                    </div>
                                </div>
                                
                                <button class="focus-hotspot-btn">Focus on This Area</button>
                            </div>
                        </div>
                    `;
                });
                
                hotspotsHTML += `</div>`;
            }
            
            // Update the content
            clustersElement.innerHTML = hotspotsHTML;
            
            // Add event listeners to focus buttons
            const focusButtons = document.querySelectorAll('.focus-hotspot-btn');
            focusButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const hotspotItem = e.target.closest('.hotspot-item');
                    const lng = parseFloat(hotspotItem.dataset.lng);
                    const lat = parseFloat(hotspotItem.dataset.lat);
                    const hotspotData = JSON.parse(hotspotItem.dataset.hotspot);
                    
                    // Add a highlighted outline to the hotspot with exact bounds
                    mapHandler.highlightHotspotWithBounds(lng, lat, hotspotData.bounds, hotspotData.pointCount);
                });
            });
        }
    }

    // Find hotspots using a grid-based density analysis
    findHotspots(data, cellSizeKm = 0.5) {
        if (data.length < 8) return []; // Not enough data for valid hotspots
        
        // Create a grid to store point counts
        const grid = {};
        const hotspots = [];
        
        // Determine grid size based on data bounds
        const bounds = this.getBounds(data);
        const latRatio = this.kmToLatDegrees(cellSizeKm);
        const lngRatio = this.kmToLngDegrees(cellSizeKm, bounds.centerLat);
        
        // Assign points to grid cells
        data.forEach(point => {
            const cellLat = Math.floor(point.coordinates[1] / latRatio) * latRatio;
            const cellLng = Math.floor(point.coordinates[0] / lngRatio) * lngRatio;
            const cellKey = `${cellLat},${cellLng}`;
            
            if (!grid[cellKey]) {
                grid[cellKey] = {
                    points: [],
                    center: [cellLng + lngRatio/2, cellLat + latRatio/2],
                    bounds: {
                        minLng: cellLng,
                        maxLng: cellLng + lngRatio,
                        minLat: cellLat,
                        maxLat: cellLat + latRatio
                    }
                };
            }
            
            grid[cellKey].points.push(point);
        });
        
        // Filter and calculate grid cell densities
        for (const cellKey in grid) {
            const cell = grid[cellKey];
            if (cell.points.length >= 4) { // Only consider cells with at least 4 crashes
                const areaSqKm = this.calculateAreaSqKm(cell.bounds);
                const density = cell.points.length / areaSqKm;
                
                hotspots.push({
                    center: cell.center,
                    points: cell.points,
                    density: density,
                    bounds: cell.bounds, // Add bounds for visualization
                    cellKey: cellKey // Add cell key for reference
                });
            }
        }
        
        return hotspots;
    }

    // Calculate area of a grid cell in square kilometers
    calculateAreaSqKm(bounds) {
        const latDistance = this.haversineDistance(
            [bounds.minLng, bounds.minLat],
            [bounds.minLng, bounds.maxLat]
        );
        
        const lngDistance = this.haversineDistance(
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.minLat]
        );
        
        return latDistance * lngDistance;
    }
    
    // Get bounding box of all data points
    getBounds(data) {
        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLng = Infinity;
        let maxLng = -Infinity;
        
        data.forEach(point => {
            const lat = point.coordinates[1];
            const lng = point.coordinates[0];
            
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        });
        
        const centerLat = (minLat + maxLat) / 2;
        
        return {
            minLat, maxLat, minLng, maxLng, centerLat
        };
    }
    
    // Convert kilometers to approximate latitude degrees
    kmToLatDegrees(km) {
        return km / 111; // 1 degree latitude is approximately 111 km
    }
    
    // Convert kilometers to approximate longitude degrees at a given latitude
    kmToLngDegrees(km, lat) {
        return km / (111 * Math.cos(this.toRadians(lat)));
    }
    
    // Calculate haversine distance between two points in km
    haversineDistance(coord1, coord2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(coord2[1] - coord1[1]);
        const dLon = this.toRadians(coord2[0] - coord1[0]);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(coord1[1])) * Math.cos(this.toRadians(coord2[1])) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Get common streets in a hotspot
    getCommonStreets(points) {
        const streetCounts = {};
        
        points.forEach(p => {
            const street = p.streetName || 'Unknown';
            streetCounts[street] = (streetCounts[street] || 0) + 1;
        });
        
        // Get top 3 most common streets
        return Object.entries(streetCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => entry[0]);
    }
    
    // Count crashes by severity
    getSeverityCounts(points) {
        return {
            'K': points.filter(p => p.severity === 'K').length,
            'A': points.filter(p => p.severity === 'A').length,
            'B': points.filter(p => p.severity === 'B').length,
            'C': points.filter(p => p.severity === 'C').length
        };
    }

    // Helper function to convert degrees to radians
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}

// Create instance
const analysisHandler = new AnalysisHandler(); 

function updateOverview() {
    // Update the overview in the UI
    const stats = document.getElementById('stats-content');
    const activeFilters = getActiveFilters();
    
    if (activeFilters.length === 0) {
        stats.innerHTML = '<p class="placeholder-text">Select filters to see overview</p>';
        return;
    }
    
    // ... existing code ...
} 
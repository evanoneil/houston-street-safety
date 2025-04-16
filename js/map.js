// Map handler for crash data visualization
class MapHandler {
    constructor() {
        this.map = null;
        this.mapLoaded = false;
        this.currentType = 'all';
        this.currentSeverity = 'all';
        this.currentYear = 'all';
        this.showHeatmap = false;
        this.supercluster = null;
        this.markers = [];
        this.clickedFeature = null;
        this.hotspotCenter = null;
        this.hotspotRadiusKm = null;
        this.hotspotBounds = null;
    }

    // Initialize the map
    async initMap() {
        // Set Mapbox access token
        mapboxgl.accessToken = config.mapboxToken;

        // Create the map instance - always use Streets style
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12', // Fixed to Streets style
            center: config.mapConfig.center,
            zoom: config.mapConfig.zoom,
            minZoom: config.mapConfig.minZoom,
            maxZoom: config.mapConfig.maxZoom
        });

        // Wait for map to load
        await new Promise(resolve => {
            this.map.on('load', () => {
                this.mapLoaded = true;
                resolve();
            });
        });

        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geolocate control
        this.map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true
            }),
            'top-right'
        );

        // Set up event listeners
        this.setupEventListeners();

        // Set up map layers
        this.setupLayers();

        return this.map;
    }

    // Set up map event listeners
    setupEventListeners() {
        // Click on crash point
        this.map.on('click', 'crashes-layer', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                this.showCrashDetails(feature);
            }
        });

        // Change cursor on hover
        this.map.on('mouseenter', 'crashes-layer', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'crashes-layer', () => {
            this.map.getCanvas().style.cursor = '';
        });
        
        // Clear hotspot highlight when clicking elsewhere on the map
        this.map.on('click', (e) => {
            // Check if we clicked on a marker
            const features = this.map.queryRenderedFeatures(e.point, { 
                layers: ['crashes-layer', 'hotspot-highlight-layer', 'hotspot-outline-layer', 'hotspot-label-layer'] 
            });
            
            // If we didn't click on a marker or highlight, remove the highlight
            if (features.length === 0) {
                this.removeHotspotHighlight();
            }
        });
    }

    // Set up map layers
    setupLayers() {
        // Add base sources for data - disable clustering
        this.map.addSource('crashes', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            },
            cluster: false // Disable clustering to show individual points
        });

        // Add heatmap source
        this.map.addSource('crashes-heat', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Add unclustered points layer
        this.map.addLayer({
            id: 'crashes-layer',
            type: 'circle',
            source: 'crashes',
            paint: {
                'circle-color': [
                    'match',
                    ['get', 'severity'],
                    'K', config.severityColors['K'],
                    'A', config.severityColors['A'],
                    'B', config.severityColors['B'],
                    'C', config.severityColors['C'],
                    '#ccc'
                ],
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 4,
                    12, 6,
                    15, 10
                ],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
                'circle-opacity': 0.9
            }
        });

        // Add heatmap layer (hidden by default)
        this.map.addLayer({
            id: 'crashes-heatmap',
            type: 'heatmap',
            source: 'crashes-heat',
            paint: {
                'heatmap-weight': [
                    'match',
                    ['get', 'severity'],
                    'K', 1.0,
                    'A', 0.8,
                    'B', 0.6,
                    'C', 0.4,
                    0.2
                ],
                'heatmap-intensity': config.heatmapConfig.intensity,
                'heatmap-radius': config.heatmapConfig.radius,
                'heatmap-color': config.heatmapConfig.colorScale,
                'heatmap-opacity': 0.8
            },
            layout: {
                'visibility': 'none'
            }
        });

        // Remove the external icon loading that's failing and just use circle markers with different colors
        this.map.addLayer({
            id: 'crash-type-symbol',
            type: 'circle',
            source: 'crashes',
            paint: {
                'circle-radius': 6,
                'circle-color': [
                    'match',
                    ['get', 'type'],
                    'pedestrian', '#4e73df',  // Blue for pedestrian
                    'cyclist', '#36b9cc',     // Cyan for cyclist
                    '#888888'  // Default gray
                ],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8
            },
            layout: {
                'visibility': 'none', // Hide by default to match the legend
                'text-field': ['get', 'description'],
                'text-font': ['Public Sans Medium', 'Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 14,
                'text-anchor': 'center',
                'text-allow-overlap': true
            }
        });
    }

    // Update the map data with filtered results
    updateMapData(geoJSON) {
        // Apply a slight jitter to points at the same coordinates
        const processedGeoJSON = this.applyCoordinateJitter(geoJSON);
        
        if (this.map.getSource('crashes')) {
            this.map.getSource('crashes').setData(processedGeoJSON);
        }

        if (this.map.getSource('crashes-heat')) {
            this.map.getSource('crashes-heat').setData(processedGeoJSON);
        }
    }
    
    // Apply a slight jitter to points at the same coordinates
    applyCoordinateJitter(geoJSON) {
        // Create a deep copy of the geoJSON
        const processedGeoJSON = JSON.parse(JSON.stringify(geoJSON));
        
        // Create a map to track coordinates and count occurrences
        const coordMap = new Map();
        
        // First pass: count occurrences of each coordinate pair
        processedGeoJSON.features.forEach(feature => {
            const coordKey = feature.geometry.coordinates.join(',');
            if (!coordMap.has(coordKey)) {
                coordMap.set(coordKey, { 
                    count: 1, 
                    originalCoord: [...feature.geometry.coordinates]
                });
            } else {
                const entry = coordMap.get(coordKey);
                entry.count += 1;
            }
        });
        
        // Second pass: apply jitter based on count
        processedGeoJSON.features.forEach(feature => {
            const coordKey = feature.geometry.coordinates.join(',');
            const entry = coordMap.get(coordKey);
            
            // Only apply jitter if there are multiple points at the same location
            if (entry.count > 1) {
                // Maximum jitter in degrees (approx 2-5 meters)
                const maxJitter = 0.00003;
                
                // Create a deterministic but varied jitter for each point
                // Use the feature ID or a property to create consistent jitter
                const featureId = feature.properties.id || Math.random().toString();
                const idHash = this.simpleHash(featureId);
                
                // Calculate jitter amount (different for each feature)
                const jitterLng = maxJitter * Math.cos(idHash * Math.PI * 2) * (0.5 + 0.5 * Math.random());
                const jitterLat = maxJitter * Math.sin(idHash * Math.PI * 2) * (0.5 + 0.5 * Math.random());
                
                // Apply the jitter
                feature.geometry.coordinates[0] += jitterLng;
                feature.geometry.coordinates[1] += jitterLat;
                
                // Store the original coordinates for use in popups
                if (!feature.properties.originalCoordinates) {
                    feature.properties.originalCoordinates = entry.originalCoord;
                }
            }
        });
        
        return processedGeoJSON;
    }
    
    // Simple string hash function to generate a number from a string
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) / 2147483647; // Normalize to 0-1
    }

    // Show/hide heatmap
    toggleHeatmap(show) {
        this.showHeatmap = show;
        this.map.setLayoutProperty(
            'crashes-heatmap',
            'visibility',
            show ? 'visible' : 'none'
        );
    }

    // Toggle the display of crash type symbols
    toggleCrashTypeSymbols(show) {
        if (this.map) {
            this.map.setLayoutProperty(
                'crash-type-symbol',
                'visibility',
                show ? 'visible' : 'none'
            );
        }
    }

    // Change the map style
    changeMapStyle(styleUrl) {
        if (!this.map) return;
        
        // Store current map center and zoom
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        
        // Store current layer visibility states
        const heatmapVisible = this.showHeatmap;
        const iconsVisible = this.map.getLayoutProperty('crash-type-symbol', 'visibility') === 'visible';
        
        // Change the map style
        this.map.setStyle(styleUrl);
        
        // Re-add sources and layers when style is loaded
        this.map.once('style.load', () => {
            // Restore center and zoom
            this.map.setCenter(center);
            this.map.setZoom(zoom);
            
            // Set up map layers again
            this.setupLayers();
            
            // Reload data if we have filters set
            const typeFilter = document.getElementById('crash-type').value;
            const severityFilter = document.getElementById('crash-severity').value;
            const yearFilter = document.getElementById('crash-year').value;
            
            const geoJSON = dataProcessor.getGeoJSON(typeFilter, severityFilter, yearFilter);
            this.updateMapData(geoJSON);
            
            // Restore layer visibility states
            if (heatmapVisible) {
                this.toggleHeatmap(true);
            }
            
            if (iconsVisible) {
                this.toggleCrashTypeSymbols(true);
            }
        });
    }

    // Show popup with crash details
    showCrashDetails(feature) {
        this.clickedFeature = feature;
        
        // Create popup content
        const properties = feature.properties;
        const severity = this.getSeverityText(properties.severity);
        const crashType = properties.type === 'pedestrian' ? 'Pedestrian' : 'Cyclist';
        
        // Determine severity class for header color
        const severityClass = properties.severity.toLowerCase();
        
        // Extract speed limit from street name
        let speedLimitText = '';
        if (properties.streetName) {
            const match = properties.streetName.match(/\s+(\d+)$/);
            if (match && match[1]) {
                speedLimitText = `<span class="crash-speed-limit">Speed limit: ${match[1]}</span>`;
            }
        }
        
        // Format light conditions and weather if available
        let conditionsHTML = '';
        if (properties.lightCondition) {
            conditionsHTML += `<span class="crash-light-condition">${properties.lightCondition}</span>`;
        }
        if (properties.intersectionDetails) {
            conditionsHTML += `<span class="crash-intersection">${properties.intersectionDetails}</span>`;
        }
        if (properties.weather) {
            conditionsHTML += `<span class="crash-weather">${properties.weather}</span>`;
        }
        
        let popupContent = `
            <div class="popup-container">
                <div class="popup-header ${severityClass}">${crashType} Crash - ${severity}</div>
                <div class="popup-content">
                    <div class="crash-date"><strong>Date:</strong> ${properties.date} at ${this.formatTime(properties.time)}</div>
                    <div class="crash-details">
                        <span class="crash-type ${properties.type}">${crashType}</span>
                        ${speedLimitText}
                    </div>
                    <div class="crash-conditions">
                        ${conditionsHTML}
                    </div>
                    <div class="crash-factors">${properties.factors || 'No factors reported'}</div>
                </div>
            </div>
        `;
        
        // Use original coordinates if available (in case jitter was applied)
        const coordinates = properties.originalCoordinates || feature.geometry.coordinates;
        
        // Create and show popup
        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(this.map);
        
        // Update sidebar with details
        const detailsElement = document.getElementById('crash-details-content');
        if (detailsElement) {
            detailsElement.innerHTML = `
                <h4 class="${severityClass}">${crashType} Crash #${properties.id}</h4>
                <div class="crash-details">
                    <span class="crash-type ${properties.type}">${crashType}</span>
                    ${speedLimitText}
                </div>
                <div class="crash-date"><strong>Date:</strong> ${properties.date} at ${this.formatTime(properties.time)}</div>
                <div class="crash-conditions">
                    ${conditionsHTML}
                </div>
                <div class="crash-factors">${properties.factors || 'No factors reported'}</div>
            `;
        }
    }

    // Helper function to format crash time
    formatTime(timeString) {
        if (!timeString) return 'Unknown';
        
        // Handle HHMM format (e.g., 1430)
        if (timeString.length === 4) {
            const hours = parseInt(timeString.substring(0, 2));
            const minutes = timeString.substring(2, 4);
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes} ${period}`;
        }
        
        return timeString;
    }

    // Helper function to get severity text
    getSeverityText(severityCode) {
        switch (severityCode) {
            case 'K': return 'Fatal Injury';
            case 'A': return 'Suspected Serious Injury';
            case 'B': return 'Suspected Minor Injury';
            case 'C': return 'Possible Injury';
            default: return 'Unknown Severity';
        }
    }

    // Fly to a specific location
    flyTo(lng, lat, zoom = 14) {
        if (this.map) {
            this.map.flyTo({
                center: [lng, lat],
                zoom: zoom,
                essential: true
            });
        }
    }

    // Reset map view to default
    resetView() {
        this.map.flyTo({
            center: config.mapConfig.center,
            zoom: config.mapConfig.zoom,
            essential: true
        });
    }

    // Check if map is loaded
    isMapLoaded() {
        return this.mapLoaded;
    }

    // Create a GeoJSON polygon for a grid cell given center point and cell size
    createGridCellPolygon(centerLng, centerLat, cellSizeKm) {
        // Convert kilometers to degrees based on latitude
        const latRatio = cellSizeKm / 111; // 1 degree latitude is approximately 111 km
        const lngRatio = cellSizeKm / (111 * Math.cos(centerLat * (Math.PI / 180)));
        
        // Calculate cell bounds based on the center (this matches the analysis.js grid cell logic)
        const cellLat = Math.floor(centerLat / latRatio) * latRatio;
        const cellLng = Math.floor(centerLng / lngRatio) * lngRatio;
        
        // Create a simple rectangular polygon
        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [cellLng, cellLat], 
                    [cellLng + lngRatio, cellLat],
                    [cellLng + lngRatio, cellLat + latRatio],
                    [cellLng, cellLat + latRatio],
                    [cellLng, cellLat] // Close the polygon
                ]]
            },
            properties: {}
        };
    }
    
    // Highlight a hotspot with an outlined grid cell
    highlightHotspot(lng, lat, radiusKm) {
        // Remove any existing highlight
        this.removeHotspotHighlight();
        
        // First zoom to the location
        this.map.flyTo({
            center: [lng, lat],
            zoom: 15,
            essential: true
        });
        
        // Add the highlight after the zoom animation completes
        this.map.once('moveend', () => {
            // Store the parameters for later use
            this.hotspotCenter = [lng, lat];
            this.hotspotRadiusKm = radiusKm;
            
            // Add a source for the hotspot outline
            this.map.addSource('hotspot-highlight', {
                type: 'geojson',
                data: this.createGridCellPolygon(lng, lat, radiusKm)
            });
            
            // Add a fill layer for the hotspot
            this.map.addLayer({
                id: 'hotspot-highlight-layer',
                type: 'fill',
                source: 'hotspot-highlight',
                paint: {
                    'fill-color': '#aaaaaa',
                    'fill-opacity': 0.3
                }
            });
            
            // Add an outline layer for the hotspot
            this.map.addLayer({
                id: 'hotspot-outline-layer',
                type: 'line',
                source: 'hotspot-highlight',
                paint: {
                    'line-color': '#2c3e50',
                    'line-width': 3,
                    'line-opacity': 0.8
                }
            });
            
            // Add a handler for zoom changes to maintain the correct size
            this.map.on('zoom', this.updateHotspotCircleOnZoom.bind(this));
        });
    }
    
    // Update the hotspot highlight on zoom
    updateHotspotCircleOnZoom() {
        if (!this.hotspotCenter || !this.hotspotRadiusKm || !this.map.getSource('hotspot-highlight')) {
            return;
        }
        
        // Update the grid cell polygon with the stored parameters
        const cellData = this.createGridCellPolygon(
            this.hotspotCenter[0], 
            this.hotspotCenter[1], 
            this.hotspotRadiusKm
        );
        
        this.map.getSource('hotspot-highlight').setData(cellData);
    }
    
    // Remove hotspot highlight
    removeHotspotHighlight() {
        if (this.map.getLayer('hotspot-outline-layer')) {
            this.map.removeLayer('hotspot-outline-layer');
        }
        
        if (this.map.getLayer('hotspot-highlight-layer')) {
            this.map.removeLayer('hotspot-highlight-layer');
        }
        
        if (this.map.getSource('hotspot-highlight')) {
            this.map.removeSource('hotspot-highlight');
        }
        
        // Remove the zoom handler
        this.map.off('zoom', this.updateHotspotCircleOnZoom);
        
        // Clear stored values
        this.hotspotCenter = null;
        this.hotspotRadiusKm = null;
    }

    // Highlight a hotspot with exact bounds
    highlightHotspotWithBounds(lng, lat, bounds, pointCount) {
        // Remove any existing highlight
        this.removeHotspotHighlight();
        
        // First zoom to the location
        this.map.flyTo({
            center: [lng, lat],
            zoom: 15,
            essential: true
        });
        
        // Add the highlight after the zoom animation completes
        this.map.once('moveend', () => {
            // Store the information for later reference
            this.hotspotCenter = [lng, lat];
            this.hotspotBounds = bounds;
            
            // Create a polygon for the bounds
            const polygon = {
                type: 'Feature',
                properties: {
                    pointCount: pointCount
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [bounds.minLng, bounds.minLat],
                        [bounds.maxLng, bounds.minLat],
                        [bounds.maxLng, bounds.maxLat],
                        [bounds.minLng, bounds.maxLat],
                        [bounds.minLng, bounds.minLat] // Close the polygon
                    ]]
                }
            };
            
            // Add source
            this.map.addSource('hotspot-highlight', {
                type: 'geojson',
                data: polygon
            });
            
            // Add fill layer
            this.map.addLayer({
                id: 'hotspot-highlight-layer',
                type: 'fill',
                source: 'hotspot-highlight',
                paint: {
                    'fill-color': '#aaaaaa',
                    'fill-opacity': 0.3
                }
            });
            
            // Add outline layer
            this.map.addLayer({
                id: 'hotspot-outline-layer',
                type: 'line',
                source: 'hotspot-highlight',
                paint: {
                    'line-color': '#2c3e50',
                    'line-width': 3,
                    'line-opacity': 0.8
                }
            });
        });
    }
    
    // Remove hotspot highlight
    removeHotspotHighlight() {
        if (this.map.getLayer('hotspot-label-layer')) {
            this.map.removeLayer('hotspot-label-layer');
        }
        
        if (this.map.getSource('hotspot-label')) {
            this.map.removeSource('hotspot-label');
        }
        
        if (this.map.getLayer('hotspot-outline-layer')) {
            this.map.removeLayer('hotspot-outline-layer');
        }
        
        if (this.map.getLayer('hotspot-highlight-layer')) {
            this.map.removeLayer('hotspot-highlight-layer');
        }
        
        if (this.map.getSource('hotspot-highlight')) {
            this.map.removeSource('hotspot-highlight');
        }
        
        // Clear stored values
        this.hotspotCenter = null;
        this.hotspotBounds = null;
    }
}

// Create instance
const mapHandler = new MapHandler(); 
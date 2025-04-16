// Mapbox configuration
const config = {
    // Replace with your actual Mapbox access token
    mapboxToken: 'pk.eyJ1IjoiZXZhbm9uZWlsIiwiYSI6ImNpb3VmOXc2NzAwcjh1MG00dndoOTdtdHAifQ.nxlgs0B-hsKhDjqdwBYWnA',
    
    // Map configuration
    mapConfig: {
        center: [-95.3698, 29.7604], // Houston, Harris County
        zoom: 10,
        style: 'mapbox://styles/mapbox/streets-v12',
        minZoom: 8,
        maxZoom: 18
    },
    
    // Cluster configuration
    clusterConfig: {
        radius: 50,
        maxZoom: 14
    },
    
    // Heatmap configuration
    heatmapConfig: {
        radius: 20,
        intensity: 0.7,
        colorScale: [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 255, 0)',
            0.1, 'rgba(0, 0, 255, 0.1)',
            0.3, 'rgba(0, 255, 255, 0.3)',
            0.5, 'rgba(0, 255, 0, 0.5)',
            0.7, 'rgba(255, 255, 0, 0.7)',
            1, 'rgba(255, 0, 0, 1)'
        ]
    },
    
    // Updated colors to match the legend in the image
    severityColors: {
        'C': '#f8cb50', // Hazard - yellow
        'B': '#ef9b4f', // Near Miss - orange
        'A': '#e45d51', // Collision - red-orange
        'K': '#333333'  // Fatality - dark gray/black
    },
    
    // Icon sizes based on zoom level
    iconSizeScale: [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 2,
        12, 4,
        15, 8
    ]
}; 
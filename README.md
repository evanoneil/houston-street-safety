# Harris County Pedestrian & Cyclist Crash Map

An interactive web map that visualizes pedestrian and cyclist crashes in Harris County, Texas from 2020 to the present. The application allows users to filter crashes by type, severity, and year, and provides statistical analysis and cluster identification.

## Features

- Interactive map with crash locations
- Filtering by crash type (pedestrian/cyclist), severity, and year
- Crash clustering to identify high-risk areas
- Statistical analysis of crash patterns
- Heatmap visualization option
- Detailed popup information for each crash
- Responsive design for desktop and mobile

## Getting Started

### Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server for development

### Installation

1. Clone or download this repository
2. Replace the placeholder Mapbox token in `js/config.js` with your own Mapbox access token
3. Serve the application with a local web server

For example, using Python:

```bash
# Python 3
python -m http.server

# Python 2
python -m SimpleHTTPServer
```

Then open `http://localhost:8000` in your web browser.

### Data Sources

The application uses two datasets:

- `pedestrian.csv` - Pedestrian crash data from TxDOT
- `pedacyclist.csv` - Cyclist crash data from TxDOT

The data includes crashes from 2020 to the present in Harris County.

## Usage

- Use the dropdown filters at the top to filter by crash type, severity, and year
- Click on individual crash points to view detailed information
- Click on crash clusters to see a summary and zoom in
- Toggle the heatmap view to see crash density
- View crash statistics and identified clusters in the sidebar
- Use the "Focus on Cluster" buttons to zoom to cluster areas

## Technical Details

The application is built with:

- HTML5, CSS3, and JavaScript
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/) for map rendering
- [Supercluster](https://github.com/mapbox/supercluster) for client-side clustering

The codebase is organized as follows:

- `index.html` - Main HTML page
- `css/styles.css` - Styling for the application
- `js/config.js` - Configuration settings
- `js/dataProcessor.js` - Data loading and processing
- `js/map.js` - Map rendering and interaction
- `js/analysis.js` - Crash data analysis
- `js/app.js` - Main application logic

## License

This project uses crash data from the Texas Department of Transportation (TxDOT).

## Acknowledgements

- TxDOT for providing the crash data
- Mapbox for the mapping platform 
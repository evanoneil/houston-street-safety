// Data processor for crash data
class DataProcessor {
    constructor() {
        this.pedestrianData = [];
        this.cyclistData = [];
        this.combinedData = [];
        this.years = [];
        this.dataLoaded = false;
        this.onDataLoadedCallbacks = [];
    }

    // Load data from CSV files
    async loadData() {
        try {
            console.log('Starting data loading...');
            
            // Load both datasets in parallel
            const [pedestrianData, cyclistData] = await Promise.all([
                this.fetchCSV('pedestrian.csv'),
                this.fetchCSV('pedacyclist.csv')
            ]);

            console.log(`Loaded raw data: ${pedestrianData.length} pedestrian records, ${cyclistData.length} cyclist records`);
            
            // Process the data
            this.pedestrianData = this.processData(pedestrianData, 'pedestrian');
            this.cyclistData = this.processData(cyclistData, 'cyclist');
            
            console.log(`Processed data: ${this.pedestrianData.length} pedestrian records, ${this.cyclistData.length} cyclist records`);
            
            // Combine the datasets
            this.combinedData = [...this.pedestrianData, ...this.cyclistData];
            
            // Extract unique years
            this.years = [...new Set(this.combinedData.map(d => d.year))].sort();
            console.log(`Available years: ${this.years.join(', ')}`);
            
            // Mark data as loaded
            this.dataLoaded = true;
            
            // Call any registered callbacks
            this.onDataLoadedCallbacks.forEach(callback => callback());
            
            return this.combinedData;
        } catch (error) {
            console.error('Error loading crash data:', error);
            return [];
        }
    }

    // Fetch and parse CSV data
    async fetchCSV(filename) {
        const response = await fetch(filename);
        const text = await response.text();
        return this.parseCSV(text, filename);
    }

    // Parse CSV text to objects
    parseCSV(csvText, filename) {
        // Split by lines
        let lines = csvText.split('\n');
        
        // Handle different formats based on file
        if (filename === 'pedestrian.csv') {
            // Find the actual header row (contains "Crash ID" at the beginning)
            let headerRowIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith('"Crash ID"')) {
                    headerRowIndex = i;
                    break;
                }
            }
            
            if (headerRowIndex === -1) {
                console.error('Could not find header row in pedestrian.csv');
                return [];
            }
            
            // Extract only data rows and header
            lines = lines.slice(headerRowIndex);
        }
        
        // Clean all lines - remove quotes
        lines = lines.map(line => {
            // Replace quoted CSV values (handles quoted fields with commas inside them)
            let cleanLine = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && inQuotes) {
                    // Replace commas inside quotes with a temporary placeholder
                    cleanLine += '|COMMA|';
                } else {
                    cleanLine += char;
                }
            }
            
            // Now remove all quotes and restore commas
            return cleanLine.replace(/"/g, '').replace(/\|COMMA\|/g, ',');
        });
        
        // Get headers
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Parse data rows
        return lines.slice(1)
            .filter(line => line.trim()) // Remove empty lines
            .map(line => {
                const values = line.split(',');
                const obj = {};
                
                headers.forEach((header, i) => {
                    obj[header] = values[i] ? values[i].trim() : '';
                });
                
                return obj;
            });
    }

    // Process data into a standardized format
    processData(data, crashType) {
        return data.map(d => {
            // Extract relevant fields
            const id = d['Crash ID'];
            const latitude = parseFloat(d['Latitude']);
            const longitude = parseFloat(d['Longitude']);
            
            // Handle severity - extract the first character (K, A, B, C)
            let severity = 'U'; // Default to Unknown
            if (d['Crash Severity']) {
                // Extract the first character (K, A, B, C) regardless of format
                const severityField = d['Crash Severity'].trim();
                if (severityField.includes('-')) {
                    // Format like "K - FATAL INJURY"
                    severity = severityField.split('-')[0].trim();
                } else if (severityField.length > 0) {
                    // Just use the first character
                    severity = severityField.charAt(0);
                }
            }
            
            // Format date consistently
            let date = d['Crash Date'];
            if (date && date.includes('/')) { // MM/DD/YY format
                const parts = date.split('/');
                date = `20${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
            
            const year = parseInt(d['Crash Year']);
            const month = parseInt(d['Crash Month']);
            const time = d['Crash Time'];
            const location = d['City'] || 'Unknown';
            
            // Clean up factors to be more readable
            let factors = d['Contributing Factors'] || '';
            if (factors) {
                // Convert to title case for better readability
                factors = factors.toLowerCase().split(';')
                    .map(f => f.trim())
                    .filter(f => f && f !== 'none' && f !== 'unknown' && f !== 'no data')
                    .map(f => f.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
                    .join('; ');
            }
            
            const atIntersection = d['At Intersection Flag'] && 
                (d['At Intersection Flag'].toLowerCase() === 'true' || 
                 d['At Intersection Flag'].toLowerCase() === 'yes');
            
            // Parse intersection details
            let intersectionDetails = '';
            if (d['Intersection Related']) {
                const intersectionValue = d['Intersection Related'].toLowerCase();
                if (intersectionValue.includes('intersection')) {
                    intersectionDetails = 'At Intersection';
                } else if (intersectionValue.includes('non')) {
                    intersectionDetails = 'Not at Intersection';
                }
            }
            
            const streetName = d['Street Name'] || 'Unknown';
            
            // Parse and clean weather condition
            let weather = d['Weather Condition'] || '';
            if (weather) {
                // Format like "1 - CLEAR" to just "Clear"
                if (weather.includes('-')) {
                    weather = weather.split('-')[1].trim().toLowerCase();
                    weather = weather.charAt(0).toUpperCase() + weather.slice(1);
                }
            }
            
            // Parse light condition
            let lightCondition = d['Light Condition'] || '';
            if (lightCondition) {
                // Format like "2 - DARK, NOT LIGHTED" to "Dark, Not Lighted"
                if (lightCondition.includes('-')) {
                    lightCondition = lightCondition.split('-')[1].trim().toLowerCase();
                    lightCondition = lightCondition.charAt(0).toUpperCase() + lightCondition.slice(1);
                }
            }
            
            // Skip entries with invalid coordinates
            if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
                return null;
            }
            
            // Return standardized format
            return {
                id,
                type: crashType,
                coordinates: [longitude, latitude], // GeoJSON format
                severity,
                date,
                year,
                month,
                time,
                location,
                factors,
                atIntersection,
                intersectionDetails,
                streetName,
                weather,
                lightCondition,
                // Additional information for popup
                properties: {
                    id,
                    type: crashType,
                    severity,
                    date,
                    time,
                    location,
                    factors,
                    streetName,
                    weather,
                    lightCondition,
                    intersectionDetails
                }
            };
        }).filter(d => d !== null); // Remove invalid entries
    }

    // Get data filtered by type, severity, and year
    getFilteredData(type = 'all', severity = 'all', year = 'all') {
        let filteredData = this.combinedData;
        
        console.log(`Filtering data - Type: ${type}, Severity: ${severity}, Year: ${year}`);
        console.log(`Starting with ${filteredData.length} total records`);
        
        // Filter by crash type
        if (type !== 'all') {
            if (Array.isArray(type)) {
                filteredData = filteredData.filter(d => type.includes(d.type));
            } else {
                filteredData = filteredData.filter(d => d.type === type);
            }
            console.log(`After type filter: ${filteredData.length} records`);
        }
        
        // Filter by crash severity
        if (severity !== 'all') {
            if (Array.isArray(severity)) {
                filteredData = filteredData.filter(d => severity.includes(d.severity));
            } else {
                filteredData = filteredData.filter(d => d.severity === severity);
            }
            console.log(`After severity filter: ${filteredData.length} records`);
        }
        
        // Filter by year
        if (year !== 'all') {
            if (Array.isArray(year)) {
                // Convert year strings to numbers for comparison
                const yearNums = year.map(y => parseInt(y));
                filteredData = filteredData.filter(d => yearNums.includes(d.year));
            } else {
                const yearNum = parseInt(year);
                filteredData = filteredData.filter(d => d.year === yearNum);
            }
            console.log(`After year filter: ${filteredData.length} records`);
        }
        
        return filteredData;
    }

    // Get data in GeoJSON format for map display
    getGeoJSON(type = 'all', severity = 'all', year = 'all') {
        const features = this.getFilteredData(type, severity, year).map(d => {
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
        
        return {
            type: 'FeatureCollection',
            features
        };
    }

    // Register a callback to be called when data is loaded
    onDataLoaded(callback) {
        if (this.dataLoaded) {
            callback();
        } else {
            this.onDataLoadedCallbacks.push(callback);
        }
    }

    // Get statistics for the current filtered data
    getStatistics(type = 'all', severity = 'all', year = 'all') {
        const data = this.getFilteredData(type, severity, year);
        
        // Get total count
        const totalCount = data.length;
        
        // Count by severity
        const countBySeverity = {
            'K': data.filter(d => d.severity === 'K').length,
            'A': data.filter(d => d.severity === 'A').length,
            'B': data.filter(d => d.severity === 'B').length,
            'C': data.filter(d => d.severity === 'C').length
        };
        
        // Count by type
        const countByType = {
            'pedestrian': data.filter(d => d.type === 'pedestrian').length,
            'cyclist': data.filter(d => d.type === 'cyclist').length
        };
        
        // Count by year
        const countByYear = {};
        this.years.forEach(year => {
            countByYear[year] = data.filter(d => d.year === year).length;
        });
        
        // Count by month
        const countByMonth = {};
        for (let i = 1; i <= 12; i++) {
            countByMonth[i] = data.filter(d => d.month === i).length;
        }
        
        // Count at intersections
        const countAtIntersection = data.filter(d => d.atIntersection).length;
        
        return {
            totalCount,
            countBySeverity,
            countByType,
            countByYear,
            countByMonth,
            countAtIntersection,
            percentAtIntersection: totalCount > 0 ? (countAtIntersection / totalCount * 100).toFixed(1) : 0
        };
    }
}

// Create instance
const dataProcessor = new DataProcessor(); 
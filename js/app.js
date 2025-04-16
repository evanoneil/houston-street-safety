// Main application entry point
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize the map
        await mapHandler.initMap();
        
        // Load crash data
        await dataProcessor.loadData();
        
        // Initialize UI elements
        initializeUI();
        
        // Initialize hotspot overview
        hotspotOverview.init(mapHandler.map);
        
        // Initial data display
        updateDisplay();
        
        // Setup sidebar toggle
        setupSidebarToggle();
        
    } catch (error) {
        console.error('Error initializing application:', error);
        document.getElementById('map').innerHTML = `
            <div class="error-message">
                <h3>Error Loading Map</h3>
                <p>There was a problem loading the application. Please check your connection and try again.</p>
                <p class="error-details">${error.message}</p>
            </div>
        `;
    }
});

// Initialize UI elements and event listeners
function initializeUI() {
    // Add event listeners for checkboxes
    const typeCheckboxes = document.querySelectorAll('input[name="crash-type"]');
    const severityCheckboxes = document.querySelectorAll('input[name="crash-severity"]');
    const yearCheckboxes = document.querySelectorAll('input[name="crash-year"]');
    const heatmapToggle = document.getElementById('toggle-heatmap');
    
    // Setup dropdown toggles
    setupDropdownToggles();
    
    // Add event listeners for filter checkboxes
    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleTypeCheckboxChange);
    });
    
    severityCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleSeverityCheckboxChange);
    });
    
    yearCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleYearCheckboxChange);
    });
    
    // Add event listener for heatmap toggle
    heatmapToggle.addEventListener('change', (e) => {
        mapHandler.toggleHeatmap(e.target.checked);
    });
    
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });
    
    // Populate year dropdown with available years from data
    if (dataProcessor.years.length > 0) {
        // Clear the year checkboxes container
        const yearCheckboxGroup = document.getElementById('year-checkbox-group');
        // Keep the "All Years" option
        const allYearsOption = yearCheckboxGroup.querySelector('label:first-child').cloneNode(true);
        yearCheckboxGroup.innerHTML = '';
        yearCheckboxGroup.appendChild(allYearsOption);
        
        // Add all years from data
        dataProcessor.years.forEach(year => {
            const checkboxContainer = document.createElement('label');
            checkboxContainer.className = 'checkbox-container';
            checkboxContainer.innerHTML = `
                <input type="checkbox" name="crash-year" value="${year}"> <span>${year}</span>
            `;
            yearCheckboxGroup.appendChild(checkboxContainer);
            
            // Add event listener
            checkboxContainer.querySelector('input').addEventListener('change', handleYearCheckboxChange);
        });
    }
    
    // Apply URL parameters if they exist
    applyUrlParams();
    
    // Update dropdown button text based on selections
    updateDropdownLabels();
}

// Setup dropdown toggles functionality
function setupDropdownToggles() {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdown = this.closest('.dropdown-filter');
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-filter.active').forEach(activeDrop => {
                if (activeDrop !== dropdown) {
                    activeDrop.classList.remove('active');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('active');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown-filter')) {
            document.querySelectorAll('.dropdown-filter.active').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
    
    // Prevent closing when clicking inside dropdown content
    document.querySelectorAll('.dropdown-content').forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
}

// Update dropdown button text based on selected checkboxes
function updateDropdownLabels() {
    // Type dropdown
    updateDropdownLabel('crash-type', 'Select Crash Types');
    
    // Severity dropdown
    updateDropdownLabel('crash-severity', 'Select Severity');
    
    // Year dropdown
    updateDropdownLabel('crash-year', 'Select Years');
}

// Update a specific dropdown's label based on checked options
function updateDropdownLabel(name, defaultText) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    const dropdown = document.querySelector(`input[name="${name}"]`).closest('.dropdown-filter');
    const toggle = dropdown.querySelector('.dropdown-toggle');
    
    // If "all" is checked, use that text
    if (Array.from(checkboxes).some(cb => cb.value === 'all')) {
        if (name === 'crash-type') toggle.textContent = 'All Crashes';
        else if (name === 'crash-severity') toggle.textContent = 'All Severities';
        else if (name === 'crash-year') toggle.textContent = 'All Years';
        return;
    }
    
    // If multiple checkboxes checked, show count
    if (checkboxes.length > 1) {
        toggle.textContent = `${checkboxes.length} selected`;
    } 
    // If one checkbox, show its label
    else if (checkboxes.length === 1) {
        toggle.textContent = checkboxes[0].nextElementSibling.textContent.trim();
    } 
    // Otherwise show default text
    else {
        toggle.textContent = defaultText;
    }
}

// Handle "All" checkbox for Type filters
function handleTypeCheckboxChange(e) {
    const typeCheckboxes = document.querySelectorAll('input[name="crash-type"]');
    const allCheckbox = document.querySelector('input[name="crash-type"][value="all"]');
    
    if (e.target.value === 'all' && e.target.checked) {
        // If "All" is checked, uncheck others
        typeCheckboxes.forEach(cb => {
            if (cb.value !== 'all') cb.checked = false;
        });
    } else if (e.target.value !== 'all' && e.target.checked) {
        // If any other is checked, uncheck "All"
        allCheckbox.checked = false;
    }
    
    // If no checkboxes are checked, check "All"
    const anyChecked = Array.from(typeCheckboxes).some(cb => cb.checked);
    if (!anyChecked) {
        allCheckbox.checked = true;
    }
    
    // Update dropdown label
    updateDropdownLabel('crash-type', 'Select Crash Types');
    
    updateDisplay();
}

// Handle "All" checkbox for Severity filters
function handleSeverityCheckboxChange(e) {
    const severityCheckboxes = document.querySelectorAll('input[name="crash-severity"]');
    const allCheckbox = document.querySelector('input[name="crash-severity"][value="all"]');
    
    if (e.target.value === 'all' && e.target.checked) {
        // If "All" is checked, uncheck others
        severityCheckboxes.forEach(cb => {
            if (cb.value !== 'all') cb.checked = false;
        });
    } else if (e.target.value !== 'all' && e.target.checked) {
        // If any other is checked, uncheck "All"
        allCheckbox.checked = false;
    }
    
    // If no checkboxes are checked, check "All"
    const anyChecked = Array.from(severityCheckboxes).some(cb => cb.checked);
    if (!anyChecked) {
        allCheckbox.checked = true;
    }
    
    // Update dropdown label
    updateDropdownLabel('crash-severity', 'Select Severity');
    
    updateDisplay();
}

// Handle "All" checkbox for Year filters
function handleYearCheckboxChange(e) {
    const yearCheckboxes = document.querySelectorAll('input[name="crash-year"]');
    const allCheckbox = document.querySelector('input[name="crash-year"][value="all"]');
    
    if (e.target.value === 'all' && e.target.checked) {
        // If "All" is checked, uncheck others
        yearCheckboxes.forEach(cb => {
            if (cb.value !== 'all') cb.checked = false;
        });
    } else if (e.target.value !== 'all' && e.target.checked) {
        // If any other is checked, uncheck "All"
        allCheckbox.checked = false;
    }
    
    // If no checkboxes are checked, check "All"
    const anyChecked = Array.from(yearCheckboxes).some(cb => cb.checked);
    if (!anyChecked) {
        allCheckbox.checked = true;
    }
    
    // Update dropdown label
    updateDropdownLabel('crash-year', 'Select Years');
    
    updateDisplay();
}

// Update map display based on current filters
function updateDisplay() {
    // Get current filter values as arrays for multiple selection
    const typeFilter = getSelectedCheckboxValues('crash-type');
    const severityFilter = getSelectedCheckboxValues('crash-severity');
    const yearFilter = getSelectedCheckboxValues('crash-year');
    
    // Get filtered GeoJSON data
    const geoJSON = dataProcessor.getGeoJSON(typeFilter, severityFilter, yearFilter);
    
    // Update map data
    mapHandler.updateMapData(geoJSON);
    
    // Update statistics and analysis
    analysisHandler.updateFilters(typeFilter, severityFilter, yearFilter);
    
    // Update filter state in URL for easy sharing
    updateUrlParams(typeFilter, severityFilter, yearFilter);
}

// Helper function to get selected values from checkboxes
function getSelectedCheckboxValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    const values = Array.from(checkboxes).map(cb => cb.value);
    
    // If "all" is selected, just return that
    if (values.includes('all')) {
        return 'all';
    }
    
    // If nothing is selected, default to "all"
    if (values.length === 0) {
        // Auto-check the "all" option
        const allOption = document.querySelector(`input[name="${name}"][value="all"]`);
        if (allOption) allOption.checked = true;
        return 'all';
    }
    
    return values;
}

// Make the function globally available for other scripts
window.getSelectedCheckboxValues = getSelectedCheckboxValues;

// Update URL parameters with current filter state
function updateUrlParams(type, severity, year) {
    const url = new URL(window.location);
    
    // Clear existing params
    url.searchParams.delete('type');
    url.searchParams.delete('severity');
    url.searchParams.delete('year');
    
    // Set or update query parameters
    if (type !== 'all' && Array.isArray(type)) {
        type.forEach(t => url.searchParams.append('type', t));
    }
    
    if (severity !== 'all' && Array.isArray(severity)) {
        severity.forEach(s => url.searchParams.append('severity', s));
    }
    
    if (year !== 'all' && Array.isArray(year)) {
        year.forEach(y => url.searchParams.append('year', y));
    }
    
    // Update URL without reloading the page
    window.history.replaceState({}, '', url);
}

// Apply URL parameters on page load
function applyUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Apply type filter
    const typeParams = urlParams.getAll('type');
    if (typeParams.length > 0) {
        // Uncheck "all" option
        document.querySelector('input[name="crash-type"][value="all"]').checked = false;
        
        typeParams.forEach(typeParam => {
            const checkbox = document.querySelector(`input[name="crash-type"][value="${typeParam}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    // Apply severity filter
    const severityParams = urlParams.getAll('severity');
    if (severityParams.length > 0) {
        // Uncheck "all" option
        document.querySelector('input[name="crash-severity"][value="all"]').checked = false;
        
        severityParams.forEach(severityParam => {
            const checkbox = document.querySelector(`input[name="crash-severity"][value="${severityParam}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    // Apply year filter
    const yearParams = urlParams.getAll('year');
    if (yearParams.length > 0) {
        // We have to wait for years to be populated
        dataProcessor.onDataLoaded(() => {
            // Uncheck "all" option
            document.querySelector('input[name="crash-year"][value="all"]').checked = false;
            
            yearParams.forEach(yearParam => {
                const checkbox = document.querySelector(`input[name="crash-year"][value="${yearParam}"]`);
                if (checkbox) checkbox.checked = true;
            });
            
            updateDisplay();
        });
    }
}

// Add sidebar toggle functionality
function setupSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarShow = document.getElementById('sidebar-show');
    const layerToggles = document.querySelector('.layer-toggles');
    const mapCredits = document.querySelector('.map-credits');
    
    // Add the hide sidebar functionality
    sidebarClose.addEventListener('click', function() {
        sidebar.classList.add('hidden');
        sidebarShow.classList.add('visible');
        if (layerToggles) {
            layerToggles.style.left = '80px';
        }
        if (mapCredits) {
            mapCredits.style.left = '70px';
        }
    });
    
    // Add the show sidebar functionality
    sidebarShow.addEventListener('click', function() {
        sidebar.classList.remove('hidden');
        sidebarShow.classList.remove('visible');
        if (layerToggles) {
            layerToggles.style.left = '400px';
        }
        if (mapCredits) {
            mapCredits.style.left = '20px';
        }
    });
} 
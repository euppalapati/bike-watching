// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZXVwcGFsYXBhdGkiLCJhIjoiY203ZTJ3M2wxMGIzOTJscHZtenFhdXNpdSJ9.5skcqhZ58h9sikhlG17BuQ';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/euppalapati/cm7e3dilm009301r629ekagb4',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18
});

// Global variables
let trips = [];
let stations = [];
let radiusScale;

// Create an SVG overlay for D3 elements
const container = map.getCanvasContainer();
const svg = d3.select(container).append('svg').attr('id', 'stations-overlay');

map.on('load', async () => {
    // Load trip data
    trips = await d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv', d => {
        d.started_at = new Date(d.started_at);
        d.ended_at = new Date(d.ended_at);
        return d;
    });

    // Load and display bike lanes
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
    });
    map.addLayer({
        id: 'bike-lanes-boston',
        type: 'line',
        source: 'boston_route',
        paint: { 'line-color': 'purple', 'line-width': 3, 'line-opacity': 0.4 }
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });
    map.addLayer({
        id: 'bike-lanes-cambridge',
        type: 'line',
        source: 'cambridge_route',
        paint: { 'line-color': 'purple', 'line-width': 3, 'line-opacity': 0.4 }
    });

    // Load station data
    const jsonData = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');
    stations = computeStationTraffic(jsonData.data.stations, trips);

    // Initialize radius scale
    radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(stations, d => d.totalTraffic)])
        .range([3, 25]);

    let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

    // Append circles to SVG
    const circles = svg.selectAll('circle')
        .data(stations, d => d.short_name)
        .enter()
        .append('circle')
        .attr('r', d => radiusScale(d.totalTraffic))
        .attr('fill', 'palevioletred')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .style('pointer-events', 'auto')
        .style("--departure-ratio", d => stationFlow(d.departures / d.totalTraffic));

        circles.append('title')
        .text(d => `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    
        function getCoords(station) {
        const point = new mapboxgl.LngLat(+station.lon, +station.lat);
        const { x, y } = map.project(point);
        return { cx: x, cy: y };
    }

    function updatePositions() {
        circles
            .attr('cx', d => getCoords(d).cx)
            .attr('cy', d => getCoords(d).cy);
    }

    updatePositions();
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);

    // Time filtering logic
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('time-display'); 
    const anyTimeLabel = document.getElementById('no-filter');  

    function formatTime(minutes) {
        const date = new Date(0, 0, 0, 0, minutes);
        return date.toLocaleString('en-US', { timeStyle: 'short' });
    }

    function updateTimeDisplay() {
        let timeFilter = Number(timeSlider.value);

        if (timeFilter === -1) {
            selectedTime.textContent = '';
            anyTimeLabel.style.display = 'block';
        } else {
            selectedTime.textContent = formatTime(timeFilter);
            anyTimeLabel.style.display = 'none';
        }

        updateScatterPlot(timeFilter);
    }

    function computeStationTraffic(stations, trips) {
        const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
        const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

        return stations.map(station => ({
            ...station,
            departures: departures.get(station.short_name) ?? 0,
            arrivals: arrivals.get(station.short_name) ?? 0,
            totalTraffic: (departures.get(station.short_name) ?? 0) + (arrivals.get(station.short_name) ?? 0)
        }));
    }

    function minutesSinceMidnight(date) {
        return date.getHours() * 60 + date.getMinutes();
    }

    function filterTripsByTime(trips, timeFilter) {
        return timeFilter === -1 ? trips : trips.filter(trip => {
            const startedMinutes = minutesSinceMidnight(trip.started_at);
            const endedMinutes = minutesSinceMidnight(trip.ended_at);
            return (
                Math.abs(startedMinutes - timeFilter) <= 60 ||
                Math.abs(endedMinutes - timeFilter) <= 60
            );
        });
    }

    function updateScatterPlot(timeFilter) {
        const filteredTrips = filterTripsByTime(trips, timeFilter);
        const filteredStations = computeStationTraffic(stations, filteredTrips);

        radiusScale.domain([0, d3.max(filteredStations, d => d.totalTraffic)]);

        circles.data(filteredStations, d => d.short_name)
            .join('circle')
            .transition().duration(500)
            .attr('r', d => radiusScale(d.totalTraffic))
            .attr('fill', 'palevioletred')
            .style('--departure-ratio', (d) =>
                stationFlow(d.departures / d.totalTraffic),
              );
    }

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
});
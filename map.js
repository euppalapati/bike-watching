// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiZXVwcGFsYXBhdGkiLCJhIjoiY203ZTJ3M2wxMGIzOTJscHZtenFhdXNpdSJ9.5skcqhZ58h9sikhlG17BuQ';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/euppalapati/cm7e3dilm009301r629ekagb4', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18 // Maximum allowed zoom
});
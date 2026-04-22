// ═══════════════════════════════════════════
// GEOCODE.JS — City lookup via Nominatim
// Free, no API key needed
// ═══════════════════════════════════════════

let geocodeTimeout = null;
let selectedCity = null;

async function lookupCity(query){
  if(!query || query.length < 3) return;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&featuretype=city&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' }
    });
    const results = await res.json();
    return results.map(r => ({
      display: formatCityName(r),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      country: r.address?.country || '',
      countryCode: r.address?.country_code?.toUpperCase() || '',
    }));
  } catch(e){
    console.error('Geocode error:', e);
    return [];
  }
}

function formatCityName(r){
  const parts = [];
  const a = r.address || {};
  if(a.city) parts.push(a.city);
  else if(a.town) parts.push(a.town);
  else if(a.village) parts.push(a.village);
  else if(a.municipality) parts.push(a.municipality);
  else parts.push(r.display_name.split(',')[0]);
  if(a.state) parts.push(a.state);
  if(a.country) parts.push(a.country);
  return parts.join(', ');
}

function showSuggestions(results){
  removeSuggestions();
  if(!results || !results.length) return;

  const input = document.getElementById('city');
  const wrapper = input.parentElement;

  const dropdown = document.createElement('div');
  dropdown.id = 'city-suggestions';
  dropdown.style.cssText = `
    position:absolute;
    top:100%;
    left:0;right:0;
    background:#0d0b1f;
    border:1px solid rgba(201,168,76,0.3);
    z-index:100;
    max-height:200px;
    overflow-y:auto;
  `;

  results.forEach(r => {
    const item = document.createElement('div');
    item.textContent = r.display;
    item.style.cssText = `
      padding:12px 16px;
      cursor:pointer;
      font-family:'Cormorant Garamond',serif;
      font-size:15px;
      color:#d4c5a9;
      border-bottom:1px solid rgba(201,168,76,0.08);
    `;
    item.addEventListener('mouseenter', () => item.style.background = 'rgba(201,168,76,0.08)');
    item.addEventListener('mouseleave', () => item.style.background = 'transparent');
    item.addEventListener('click', () => selectCity(r));
    dropdown.appendChild(item);
  });

  wrapper.style.position = 'relative';
  wrapper.appendChild(dropdown);
}

function removeSuggestions(){
  const existing = document.getElementById('city-suggestions');
  if(existing) existing.remove();
}

function selectCity(city){
  selectedCity = city;
  document.getElementById('city').value = city.display;
  document.getElementById('city-lat').value = city.lat;
  document.getElementById('city-lng').value = city.lng;
  document.getElementById('city-country').value = city.country;
  removeSuggestions();
  showCityConfirmed(city);
}

function showCityConfirmed(city){
  const existing = document.getElementById('city-confirmed');
  if(existing) existing.remove();
  const input = document.getElementById('city');
  const confirmed = document.createElement('div');
  confirmed.id = 'city-confirmed';
  confirmed.style.cssText = `
    font-family:'Cinzel',serif;
    font-size:9px;
    letter-spacing:0.2em;
    color:#88d4a0;
    text-transform:uppercase;
    margin-top:6px;
  `;
  confirmed.textContent = `✓ ${city.lat.toFixed(4)}° N, ${city.lng.toFixed(4)}° E`;
  input.parentElement.appendChild(confirmed);
}

function initCityAutocomplete(){
  const input = document.getElementById('city');
  if(!input) return;

  input.setAttribute('autocomplete','off');
  input.placeholder = 'Start typing your city…';

  input.addEventListener('input', (e) => {
    clearTimeout(geocodeTimeout);
    selectedCity = null;
    const existing = document.getElementById('city-confirmed');
    if(existing) existing.remove();

    const val = e.target.value.trim();
    if(val.length < 3){
      removeSuggestions();
      return;
    }

    // Debounce 400ms
    geocodeTimeout = setTimeout(async () => {
      const results = await lookupCity(val);
      showSuggestions(results);
    }, 400);
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if(!e.target.closest('#city') && !e.target.closest('#city-suggestions')){
      removeSuggestions();
    }
  });
}

// Validate city is selected before calculation
function getCityData(){
  if(selectedCity) return selectedCity;
  // Fallback — use whatever was typed
  const val = document.getElementById('city')?.value?.trim();
  if(val) return { display: val, lat: null, lng: null, country: '' };
  return null;
}

window.Geocode = { initCityAutocomplete, getCityData, selectedCity: () => selectedCity };

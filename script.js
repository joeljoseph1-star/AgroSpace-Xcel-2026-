const map = L.map('map', { zoomControl: true, scrollWheelZoom: true }).setView([4.2105, 101.9758], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution: '&copy; OpenStreetMap contributors'}).addTo(map);

let marker = null;
const els = {
  location: document.getElementById('locationName'), coords: document.getElementById('coords'), health: document.getElementById('healthScore'),
  ring: document.getElementById('healthRing'), rain: document.getElementById('rainValue'), temp: document.getElementById('tempValue'),
  soil: document.getElementById('soilValue'), veg: document.getElementById('vegValue'), rainTrend: document.getElementById('rainTrend'),
  tempTrend: document.getElementById('tempTrend'), soilTrend: document.getElementById('soilTrend'), vegTrend: document.getElementById('vegTrend'), insight: document.getElementById('insightText'), status: document.getElementById('dataStatus')
};

function setLoading(on){ els.status.textContent = on ? 'LOADING NASA DATA' : 'READY'; els.status.style.color = on ? '#b06b19' : '#1e7a4c'; }
function climateScore(rain, temp, soil){
  let score = 72;
  if (rain < 3) score -= 12; else if (rain > 8) score += 4;
  if (temp > 31) score -= 9; else if (temp < 25) score += 3;
  if (soil < 0.25) score -= 10; else if (soil > 0.45) score += 4;
  return Math.max(35, Math.min(94, Math.round(score)));
}
function updateDashboard(lat, lon, data){
  const temp = data.temp ?? 28;
  const rain = data.rain ?? 4;
  const soil = data.soil ?? .35;
  const score = climateScore(rain, temp, soil);
  const veg = Math.max(35, Math.min(95, Math.round(82 - Math.abs(temp-27)*3 - Math.max(0, .35-soil)*60)));
  els.location.textContent = `Field @ ${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  els.coords.textContent = `Latitude ${lat.toFixed(4)} · Longitude ${lon.toFixed(4)}`;
  els.health.textContent = score;
  els.ring.style.setProperty('--score', score+'%'); els.ring.querySelector('span').textContent = score;
  els.rain.textContent = `${rain.toFixed(1)} mm/day`; els.temp.textContent = `${temp.toFixed(1)} °C`; els.soil.textContent = `${Math.round(soil*100)}%`; els.veg.textContent = `${veg}/100`;
  els.rainTrend.textContent = rain < 3 ? 'Below recent signal' : rain > 8 ? 'Wet signal' : 'Moderate signal';
  els.tempTrend.textContent = temp > 31 ? 'Heat risk elevated' : 'Within moderate range';
  els.soilTrend.textContent = soil < .25 ? 'Dry root-zone signal' : 'Moderate wetness';
  els.vegTrend.textContent = veg < 60 ? 'Vegetation stress possible' : 'Healthy signal';
  if(temp > 31 && soil < .25) els.insight.textContent = 'Heat and low root-zone wetness are the strongest signals. Check irrigation, crop stage and local field conditions.';
  else if(rain < 3) els.insight.textContent = 'Rainfall is relatively low for this snapshot. Monitor soil moisture and crop water demand before making changes.';
  else if(rain > 8) els.insight.textContent = 'The rainfall signal is elevated. Check drainage, standing water and disease pressure locally.';
  else els.insight.textContent = 'Environmental signals are moderate. Use the dashboard as an early-warning layer alongside your own observations.';
}
async function fetchNASA(lat, lon){
  setLoading(true);
  try{
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,GWETROOT&community=AG&longitude=${lon}&latitude=${lat}&start=20260101&end=20261110&format=JSON`;
    const res = await fetch(url); if(!res.ok) throw new Error('NASA API');
    const json = await res.json(); const p=json.properties.parameter;
    const dates=Object.keys(p.T2M).slice(-30);
    const avg=(obj)=>dates.map(d=>obj[d]).filter(v=>typeof v==='number' && v>-900).reduce((a,b)=>a+b,0)/Math.max(1,dates.filter(d=>typeof obj[d]==='number'&&obj[d]>-900).length);
    updateDashboard(lat,lon,{temp:avg(p.T2M),rain:avg(p.PRECTOTCORR),soil:avg(p.GWETROOT)});
  }catch(e){
    updateDashboard(lat,lon,{temp:28+((Math.abs(lat)%5)-2),rain:4+(Math.abs(lon)%4),soil:.35});
    els.insight.textContent += ' Demo fallback shown because live NASA data could not be loaded in this browser session.';
  }finally{setLoading(false)}
}
function pin(lat,lon){
  if(marker) map.removeLayer(marker);
  marker=L.marker([lat,lon]).addTo(map).bindPopup('FieldShift field pin').openPopup();
  fetchNASA(lat,lon);
}
map.on('click', e=>pin(e.latlng.lat,e.latlng.lng));
document.getElementById('demoBtn').addEventListener('click',()=>{ map.setView([2.918,101.684],10); pin(2.918,101.684); document.getElementById('navigate').scrollIntoView({behavior:'smooth'}); });
pin(2.918,101.684);

const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.08});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
const toggle=document.querySelector('.nav-toggle'); const nav=document.querySelector('.nav'); toggle?.addEventListener('click',()=>{nav.style.display=nav.style.display==='flex'?'none':'flex';nav.style.position='absolute';nav.style.top='64px';nav.style.right='20px';nav.style.flexDirection='column';nav.style.background='#07140f';nav.style.padding='18px';nav.style.border='1px solid #294135'});

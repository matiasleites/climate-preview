/* ES5 para máxima compatibilidad (iOS 12 / Safari 12). Sin dependencias. */
(function () {
  'use strict';

  var KEY = 'miniclock.v1';
  var WEATHER_EVERY = 10 * 60 * 1000;
  var HOURS_SHOWN = 6;

  var UF = { AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',
    ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',
    PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',
    RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins' };

  var defaults = { cep: '', layout: 'auto', hour12: '24', theme: 'dark', loc: null, weather: null };
  var S = load();

  function $(id) { return document.getElementById(id); }
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); for (var k in defaults) if (!(k in o)) o[k] = defaults[k]; return o; }
    catch (e) { var d = {}; for (var k2 in defaults) d[k2] = defaults[k2]; return d; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ---------- fetch JSON con timeout ----------
  function getJSON(url, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.timeout = 15000;
    x.onload = function () {
      if (x.status >= 200 && x.status < 300) { try { return cb(null, JSON.parse(x.responseText)); } catch (e) { return cb(e); } }
      cb(new Error('HTTP ' + x.status));
    };
    x.onerror = x.ontimeout = function () { cb(new Error('Sin conexión')); };
    x.send();
  }

  // ---------- Layout / tema ----------
  function applyLayout() {
    var l = S.layout === 'auto' ? (window.innerWidth >= window.innerHeight ? 'h' : 'v') : S.layout;
    $('app').setAttribute('data-layout', l);
  }
  function applyTheme() { document.documentElement.setAttribute('data-theme', S.theme); }

  // ---------- Reloj ----------
  var DAYS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  var MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function tick() {
    var d = new Date(), h = d.getHours(), suffix = '';
    if (S.hour12 === '12') { suffix = h >= 12 ? ' pm' : ' am'; h = h % 12 || 12; }
    var t = (S.hour12 === '12' ? h : pad(h)) + ':' + pad(d.getMinutes());
    if ($('time').textContent !== t + suffix) $('time').textContent = t + suffix;
    $('date').textContent = DAYS[d.getDay()] + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()];
    setTimeout(tick, 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
  }

  // ---------- Códigos WMO -> emoji/texto ----------
  function wmo(code, day) {
    var m = { 0:[day?'☀️':'🌙','Despejado'],1:[day?'🌤️':'🌙','Mayormente despejado'],2:['⛅','Parcialmente nublado'],3:['☁️','Nublado'],
      45:['🌫️','Niebla'],48:['🌫️','Niebla'],51:['🌦️','Llovizna'],53:['🌦️','Llovizna'],55:['🌦️','Llovizna intensa'],
      61:['🌧️','Lluvia leve'],63:['🌧️','Lluvia'],65:['🌧️','Lluvia fuerte'],66:['🌧️','Lluvia helada'],67:['🌧️','Lluvia helada'],
      71:['🌨️','Nieve'],73:['🌨️','Nieve'],75:['🌨️','Nieve fuerte'],77:['🌨️','Nieve'],
      80:['🌦️','Chubascos'],81:['🌧️','Chubascos'],82:['⛈️','Chubascos fuertes'],85:['🌨️','Nieve'],86:['🌨️','Nieve'],
      95:['⛈️','Tormenta'],96:['⛈️','Tormenta c/ granizo'],99:['⛈️','Tormenta c/ granizo'] };
    return m[code] || ['❔', '—'];
  }

  // ---------- CEP -> coordenadas ----------
  function resolveCep(cep, cb) {
    getJSON('https://viacep.com.br/ws/' + cep + '/json/', function (e, v) {
      if (e || !v || v.erro) return cb(new Error('CEP no encontrado'));
      var city = v.localidade, uf = v.uf;
      var url = 'https://geocoding-api.open-meteo.com/v1/search?count=20&language=pt&countryCode=BR&name=' + encodeURIComponent(city);
      getJSON(url, function (e2, g) {
        if (e2 || !g || !g.results || !g.results.length) return cb(new Error('No pude ubicar "' + city + '"'));
        var r = g.results, pick = r[0], i;
        for (i = 0; i < r.length; i++) if (r[i].admin1 === UF[uf]) { pick = r[i]; break; }
        cb(null, { cep: cep, city: city, uf: uf, lat: pick.latitude, lon: pick.longitude, tz: pick.timezone });
      });
    });
  }

  // ---------- Clima ----------
  function fetchWeather() {
    if (!S.loc) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + S.loc.lat + '&longitude=' + S.loc.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation' +
      '&hourly=temperature_2m,precipitation_probability,weather_code,is_day' +
      '&daily=temperature_2m_max,temperature_2m_min&forecast_days=2&timezone=auto';
    getJSON(url, function (e, w) {
      if (e || !w || !w.current) { setStatus(S.weather ? 'Sin conexión · datos guardados' : 'Error de red'); return; }
      S.weather = { at: Date.now(), data: w }; save(); render(); setStatus('');
    });
  }
  function setStatus(t) { $('status').textContent = t; }

  function render() {
    $('place').textContent = S.loc ? '📍 ' + S.loc.city + ' - ' + S.loc.uf : 'Configura tu CEP ⚙';
    var W = S.weather && S.weather.data;
    if (!W) return;
    var c = W.current, info = wmo(c.weather_code, c.is_day === 1);
    $('nowIcon').textContent = info[0];
    $('nowTemp').textContent = Math.round(c.temperature_2m) + '°';
    $('nowDesc').textContent = info[1];
    var dl = W.daily;
    $('details').innerHTML =
      '<span>🌡 ' + Math.round(c.apparent_temperature) + '°</span>' +
      '<span>⬆' + Math.round(dl.temperature_2m_max[0]) + '° ⬇' + Math.round(dl.temperature_2m_min[0]) + '°</span>' +
      '<span>💧' + c.relative_humidity_2m + '%</span>' +
      '<span>💨' + Math.round(c.wind_speed_10m) + 'km/h</span>';

    // la hora actual de la ubicación viene en c.time ("YYYY-MM-DDTHH:00")
    var H = W.hourly, start = 0, i, out = '';
    for (i = 0; i < H.time.length; i++) { if (H.time[i] > c.time.slice(0, 13) + ':00') { start = i; break; } }
    for (i = start; i < start + HOURS_SHOWN && i < H.time.length; i++) {
      var hh = parseInt(H.time[i].slice(11, 13), 10), label = S.hour12 === '12' ? ((hh % 12 || 12) + (hh >= 12 ? 'pm' : 'am')) : pad(hh) + 'h';
      var p = H.precipitation_probability[i];
      out += '<div class="hour"><div class="h">' + label + '</div><div class="i">' + wmo(H.weather_code[i], H.is_day[i] === 1)[0] +
        '</div><div class="t">' + Math.round(H.temperature_2m[i]) + '°</div><div class="p">' + (p > 0 ? '💧' + p + '%' : '') + '</div></div>';
    }
    $('hours').innerHTML = out;
  }

  // ---------- Configuración ----------
  function openModal() {
    $('cep').value = S.cep; $('layout').value = S.layout; $('hour12').value = S.hour12; $('theme').value = S.theme;
    $('err').textContent = ''; $('modal').hidden = false;
  }
  function closeModal() { $('modal').hidden = true; }

  $('gear').onclick = openModal;
  $('cancel').onclick = closeModal;
  $('cep').oninput = function () {
    var d = this.value.replace(/\D/g, '').slice(0, 8);
    this.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  };
  $('form').onsubmit = function (ev) {
    ev.preventDefault();
    var cep = $('cep').value.replace(/\D/g, '');
    S.layout = $('layout').value; S.hour12 = $('hour12').value; S.theme = $('theme').value;
    applyLayout(); applyTheme(); tickNow();
    if (cep === S.cep && S.loc) { save(); render(); return closeModal(); }
    if (cep.length !== 8) { $('err').textContent = 'El CEP debe tener 8 dígitos'; return; }
    $('err').textContent = 'Buscando…';
    resolveCep(cep, function (e, loc) {
      if (e) { $('err').textContent = e.message; return; }
      S.cep = cep; S.loc = loc; S.weather = null; save(); closeModal(); render(); setStatus('Cargando…'); fetchWeather();
    });
  };
  function tickNow() { $('time').textContent = ''; var d = new Date(); var h = d.getHours(); if (S.hour12 === '12') h = h % 12 || 12; else h = pad(h); $('time').textContent = h + ':' + pad(d.getMinutes()) + (S.hour12 === '12' ? (d.getHours() >= 12 ? ' pm' : ' am') : ''); }

  // ---------- Init ----------
  applyTheme(); applyLayout(); tick(); render();
  window.addEventListener('resize', applyLayout);
  window.addEventListener('orientationchange', function () { setTimeout(applyLayout, 200); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { fetchWeather(); } });
  if (S.loc) fetchWeather(); else openModal();
  setInterval(fetchWeather, WEATHER_EVERY);
})();

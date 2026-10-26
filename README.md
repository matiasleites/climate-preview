# Mini Reloj + Clima

Sitio 100 % estático (HTML + CSS + JS ES5, sin build, sin dependencias, sin backend, sin login).
Diseñado para iPhone 5s / iOS 12 (Safari 12) y pantallas de cualquier tamaño.

- **CEP → ciudad**: [ViaCEP](https://viacep.com.br) (gratis, CORS)
- **Ciudad → coordenadas** y **clima**: [Open-Meteo](https://open-meteo.com) (gratis, sin API key; uso no comercial)
- Configuración guardada en `localStorage`; el último clima queda en caché para uso offline.

## Probar local
```
npx serve .        # o: python3 -m http.server 8080
```

## Publicar (gratis)
Supabase **no** ofrece hosting estático. Opciones gratuitas: **Cloudflare Pages** (recomendado), GitHub Pages o Netlify.
Basta con subir esta carpeta tal cual (no hay build).

## En el iPhone
1. Abrir la URL en Safari → Compartir → *Añadir a pantalla de inicio* (pantalla completa).
2. Ajustes → Pantalla y brillo → Bloqueo automático → *Nunca* (iOS 12 no tiene Wake Lock).
3. Rotar horizontal, o forzar orientación con ⚙.

## Publicidad futura
Existe `<aside id="ad-slot" hidden>` en `index.html` (50 px abajo, fuera del contenido). Para activarla:
quitar `hidden` e insertar el script/banner del proveedor. Ideas no invasivas: banner discreto fijo
(sin popups ni animaciones) o un "Apoya el proyecto" enlazado a Ko-fi/Pix.

> Nota: Open-Meteo exige licencia comercial si el sitio genera ingresos; revisar antes de monetizar.

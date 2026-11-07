# Portada 3D guiada por scroll · Licores Palmira

La portada (`/`) usa el tema **"Bodega de noche"** y una botella 3D de la marca que se mueve con el scroll.
Catálogo, producto, checkout, calculadora y demás páginas **no cambian**.

## Poner a correr

```bash
cd frontend
npm install        # instala three y gsap (versiones fijas)
npm run dev        # http://127.0.0.1:5173
```

> El zip no trae `node_modules` (los anteriores eran binarios de Windows). `npm install` los genera para tu equipo.

## Dependencias nuevas

| Paquete | Versión | Para qué |
|---|---|---|
| `three` | 0.186.1 | Botella 3D (WebGL) |
| `gsap` | 3.15.0 | ScrollTrigger: pin + línea de tiempo atada al scroll |
| `@types/three` | 0.186.0 | Tipos para TypeScript (dev) |

Three.js se carga **aparte** (import dinámico, ~140 KB gzip) cuando la portada ya se pintó, así que no frena la primera carga.

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/pages/Home.tsx` | Orden de secciones de la portada |
| `src/components/home/noir/HeroBottle.tsx` | Hero fijo (pin) con capítulos y la línea de tiempo de GSAP |
| `src/components/home/noir/BottleScene.ts` | Escena Three.js: botella, etiquetas, líquido, luces, polvo dorado |
| `src/components/home/noir/bottleConfig.ts` | Colores de cada destilado y estado inicial (sin Three, liviano) |
| `src/components/home/noir/SpiritsMarquee.tsx` | Franja de categorías que se desliza con el scroll |
| `src/components/home/noir/Momentos.tsx` | "Para la fiesta / tu negocio / hoy mismo" (reemplaza las tarjetas de promo de colores) |
| `src/components/home/noir/ScrollVideo.tsx` | **Opcional**: vídeo sincronizado con el scroll (no se usa por defecto) |
| `src/hooks/useHomeTheme.ts` | Pone `body.is-home` solo mientras estás en la portada |
| `src/styles/home-noir.css` | Todo el estilo nuevo, limitado a `body.is-home` y `.home-noir` |

## Cómo funciona el hero

1. La sección se **fija** en pantalla durante ~4,6 alturas de pantalla en escritorio (3,8 en móvil).
2. GSAP convierte ese recorrido en una línea de tiempo de 0 a 10. Bajar el scroll la avanza y subirlo la **rebobina**.
3. La línea de tiempo anima un objeto `state` (`rotY`, `x`, `y`, `scale`, `tilt`, `liquid`, `dust`). La escena 3D lo lee en cada cuadro.

| Tiempo | Capítulo | Botella |
|---|---|---|
| 0 – 1,4 | "Licores Palmira" detrás de la botella | Al centro, de frente |
| 1,3 – 3,4 | Desde 1994 | Va a la derecha y gira (muestra la contraetiqueta) |
| 3,6 – 6,4 | Variedad | Va a la izquierda; el líquido cambia whisky → ron → aguardiente → tequila |
| 6,6 – 8,4 | Detal y mayor | Vuelve a la derecha con leve inclinación |
| 8,8 – 10 | Te lo llevamos hoy + botones | Sube al centro |

### Cambios frecuentes

- **Textos de los capítulos**: en el JSX de `HeroBottle.tsx`. Los conteos de referencias salen de `data.categorias`.
- **Duración del scroll**: `end: () => "+=" + window.innerHeight * (desk ? 4.6 : 3.8)`.
- **Colores del líquido**: arreglo `LICORES` en `bottleConfig.ts` (`deep` = bordes, `light` = centro iluminado, `alpha` = opacidad).
- **Resplandor de fondo por destilado**: arreglo `AMBIENTE` en el mismo archivo.
- **Etiqueta**: se dibuja en `<canvas>` en `texturaEtiqueta()` de `BottleScene.ts`. Usa `/assets/marca/logo-blanco.webp`; si cambias el logo, la etiqueta se actualiza sola.
- **Forma de la botella**: está modelada en código a partir de la botella de vidrio de referencia (TurboSquid 1654140): base angosta, cuerpo cónico, estrías en espiral desde la mitad hacia el hombro y el cuello, y corcho con cinta negra.
  - Silueta: puntos `[radio, altura]` de `PERFIL_VIDRIO` y `PERFIL_LIQUIDO` en `BottleScene.ts`.
  - Estrías: `ESTRIAS` (cantidad), `TORSION` (cuánto giran) y la amplitud en `estriar(..., 0.13)`. La función `envolvente()` define dónde empiezan.
  - Nivel del licor: el último punto de `PERFIL_LIQUIDO` (está al hombro para que la espiral se vea en vidrio vacío).
  - Reflejos del vidrio: los dos paneles de luz del shader `bordeFS` (`panel(r, -0.42, 0.11)` y `panel(r, 0.5, 0.07)`).
  - Como es geometría propia y no el archivo de TurboSquid, no hay modelo que descargar ni licencia de terceros en la web.

## Accesibilidad y respaldo

- **"Reducir movimiento"** (ajuste del sistema): no hay pin. La botella se dibuja quieta y los capítulos se muestran como texto normal debajo.
- **Sin WebGL**: se muestra `hero-bar.webp` de fondo y los textos animan igual.
- La escena solo dibuja cuando el hero está en pantalla y la pestaña está visible, para ahorrar batería.
- En móvil baja la resolución, el número de partículas y la geometría.

## CSP (infra/nginx)

No hay que cambiar nada: todo es mismo origen y las texturas se generan en canvas. Si algún día usas `ScrollVideo`, agrega `media-src 'self'` a `security-headers.conf`.

## Vídeo con scrub (opcional)

Si más adelante grabas o renderizas un giro real de la botella:

```tsx
import { ScrollVideo } from "@/components/home/noir/ScrollVideo";
<ScrollVideo src="/assets/video/botella.mp4" poster="/assets/video/botella.webp" alto={300} />
```

Codifícalo con todos los cuadros como clave para que avance y retroceda sin saltos:

```bash
ffmpeg -i entrada.mov -an -c:v libx264 -preset slow -crf 22 -g 1 -pix_fmt yuv420p -movflags +faststart botella.mp4
```

## Lo que se quitó de la portada (sigue en el proyecto)

- `PromoCard` con `promo-fiesta.webp` y `promo-whatsapp.webp`. El componente y `data.experiencias` siguen ahí por si se quieren volver a usar.
- El fondo de ondas blancas (`fondo-ondas.webp`) en la portada. En las demás páginas sigue igual.

# Licores Palmira — Sitio web (React + Vite + TypeScript)

Sitio web corporativo y de venta de licores para **Licores Palmira S.A.S.** (Palmira, Valle del Cauca, Colombia).
Esta versión **2.0** migra el sitio estático (HTML + JS vanilla) a **React 18 + Vite 7 + TypeScript (strict) + React Router 7**,
conservando la misma hoja de estilos, las mismas páginas, los mismos datos y el mismo comportamiento.

---

## Requisitos

- **Node.js 18.18 o superior** (recomendado Node 20 o 22 LTS) y npm.

## Puesta en marcha

```bash
npm install        # instala dependencias
npm run dev        # servidor de desarrollo → http://127.0.0.1:5173
npm run build      # verifica tipos y compila a /dist
npm run preview    # sirve /dist → http://127.0.0.1:4173
npm run typecheck  # solo verificación de TypeScript
```

---

## Páginas (rutas)

| Ruta | Página | Antes |
|------|--------|-------|
| `/` | Inicio: carrusel de pauta, categorías, ofertas con cuenta regresiva, lo más buscado, Selección, promos, premium, whisky, ron y aguardiente, beneficios, Top 5, fiesta, marcas, cifras, sede y reseñas | `index.html` |
| `/catalogo` | Catálogo con filtros (`?categoria=`, `?sub=`, `?q=`, `?filtro=ofertas\|nuevos\|regalo`), rango de precio, orden y "cargar más" | `catalogo.html` |
| `/producto/:id` | Ficha de producto + relacionados | `producto.html?id=` |
| `/calculadora` | Calculadora de licor para eventos (admite `?personas=40`) | `calculadora.html` |
| `/mayoristas` | Portal mayorista: login real contra el API, solicitud de cuenta cifrada, tabla de precios y CSV | `mayoristas.html` |
| `/seguimiento` | Seguimiento con referencia + celular (API) | `seguimiento.html` |
| `/ayuda` | Preguntas frecuentes y políticas (`#faq`, `#legal`) | `ayuda.html` |
| `/pauta` | Espacios publicitarios (uso interno, `noindex`) + informe de n8n | `pauta.html` |
| `/creditos` | Créditos fotográficos | `creditos.html` |
| `/checkout` | Finalizar pedido (pago en línea con Wompi o contra entrega) | nuevo |
| `/pago/resultado` | Retorno desde Wompi (el servidor confirma el estado) | nuevo |
| `*` | Página 404 | — |

**Compatibilidad:** las URL antiguas (`/catalogo.html?categoria=whisky`, `/producto.html?id=p01`, `/nosotros.html`, etc.)
redirigen automáticamente a las nuevas, conservando parámetros y anclas. `nosotros` sigue redirigiendo al inicio.

---

## Estructura

```
├── index.html                 # HTML base: metadatos, Open Graph, JSON-LD, fuentes
├── public/
│   ├── assets/img/ …          # imágenes (mismas rutas que antes: /assets/img/…)
│   ├── assets/marca/ …        # logos y favicons
├── src/
│   ├── main.tsx               # arranque: Router + proveedores + estilos
│   ├── App.tsx                # rutas (páginas internas con carga diferida)
│   ├── styles/styles.css      # hoja de estilos ORIGINAL (sin cambios de diseño)
│   ├── types/index.ts         # tipos del dominio (Producto, Categoria, Banner…)
│   ├── data/
│   │   ├── data.ts            # ← marca, productos, precios, categorías, pauta, calculadora, sedes…
│   │   ├── fichas.ts          # ← intro, grado de alcohol, cócteles por producto
│   │   ├── icons.ts           # íconos Lucide (subconjunto)
│   │   └── credits.json       # créditos de imágenes
│   ├── context/
│   │   ├── CartContext.tsx    # carrito (localStorage), precio mayorista, sesión mayorista
│   │   └── UIContext.tsx      # toast, paneles, modal de producto, puertas de entrada (edad y modo)
│   ├── lib/                   # utilidades puras: precio, WhatsApp, colores, tracking, storage
│   ├── hooks/                 # useInViewOnce, useScrollButtons, useAdImpression, usePageTitle
│   ├── components/
│   │   ├── ui/                # Icon, SmartLink, Reveal, BottleArt, Badge, Qty, ProductMedia
│   │   ├── layout/            # Header, SearchBar, MegaMenu, Footer, Extras (drawer, tabbar, edad…)
│   │   ├── product/           # ProductCard, Carousel, ProductCarousel, ProductDetail
│   │   └── home/              # AdCarousel, AdCard, SelectionBanner, Cards, Hero, Countdown…
│   └── pages/                 # una página por ruta
└── vite.config.ts             # alias "@/" → src/
```

---

## Mantenimiento (lo más común)

| Quiero… | Dónde |
|---|---|
| Cambiar precios, productos, stock, badges | `src/data/data.ts` → `productos` |
| Poner un producto en oferta | `src/data/data.ts` → `ofertas` (el precio anterior se calcula solo) |
| Cambiar banners del carrusel, vigencias, webhook | `src/data/data.ts` → `pauta` |
| Banners “Selección” / Top 5 | `src/data/data.ts` → `seleccion` |
| Fichas, grado de alcohol y cócteles | `src/data/fichas.ts` |
| Textos de la marca, teléfono, WhatsApp | `src/data/data.ts` → `marca` |
| Estilos | `src/styles/styles.css` |
| Agregar un ícono | `src/data/icons.ts` (pegar el contenido interno del SVG de lucide.dev) |

Si agregas un **campo nuevo** a un objeto de datos, decláralo en `src/types/index.ts` (TypeScript te avisará si falta).

### Agregar una página nueva

1. Crea `src/pages/MiPagina.tsx` con `export default function MiPagina() { … }` y usa `usePageTitle("…")`.
2. Regístrala en `src/App.tsx`: `const MiPagina = lazy(() => import("@/pages/MiPagina"));` y `<Route path="mi-pagina" element={<MiPagina />} />`.
3. Enlázala con `<Link to="/mi-pagina">` (o `SmartLink`, que también entiende `wa:pedido` y enlaces externos).

### Convenciones

- **Enlaces internos** con `Link`/`SmartLink` (no recargan la página). `SmartLink` resuelve `"wa:pedido"`, `"wa:mayor"`… a WhatsApp.
- **Imágenes** en `public/assets/…` y referenciadas como `/assets/…`.
- **Animación de aparición:** envuelve con `<Reveal>` (o `<Reveal stagger>` para hijos escalonados) en vez de `className="reveal"`.
- **Íconos:** `<Icon name="truck" size={18} />`. Usa `wrap` cuando el diseño original tenía el ícono dentro de un `<span>`.
- **Estilos con variables CSS:** `style={{ "--c1": "#ef1c25" } as CSSVars}` (tipo exportado desde `@/lib/colores`).

---

## Qué cambió frente a la versión estática

- Misma hoja de estilos; solo se ajustaron 3 rutas `url()` y el selector del botón **Mayoristas** (`a[href="/mayoristas"]`).
- El render por cadenas HTML (`innerHTML`) se reemplazó por componentes React: menos riesgo de inyección y estado predecible.
- Navegación sin recarga (SPA), carga diferida de páginas internas y título del documento por página.
- La página de pauta agrega `noindex` dinámicamente.
- El componente `Hero` (slider de `data.slides`) se conserva aunque la portada actual no lo usa, igual que en la versión anterior.
- El mapa del equipo (`TeamMap`) no se migró porque pertenecía a la sección "Nosotros", retirada a pedido del cliente.
- Las claves de `localStorage` `lp_carrito`, `lp_mayor_edad` y `lp_pauta_stats` se conservan. La antigua `lp_mayorista` (sesión demo) se borra automáticamente: la sesión ahora vive en una cookie HttpOnly del servidor.

**Verificación realizada:** compilación TypeScript estricta sin errores; las 9 páginas tienen la misma altura que la versión estática a
1366 px y a 390 px de ancho; prueba automatizada de carrito, precio mayorista, modal, buscador, filtros, redirecciones,
calculadora, login mayorista, seguimiento, anclas y 404 sin errores de JavaScript.

---

## Despliegue y seguridad

El frontend ya no se despliega solo: lo sirve Nginx junto con el API (ver `../README.md` e `../infra/`).
La arquitectura de seguridad, la pasarela de pago y el cumplimiento de la Ley 1581 están en `../docs/SEGURIDAD.md`.
En desarrollo, `npm run dev` redirige `/api` al backend local (`http://127.0.0.1:3000`).

## Créditos

Diseño y desarrollo: **Astronomical AI** (referenciado en el footer). Imágenes de categoría con licencia CC0 vía Openverse (ver `/creditos` y `src/data/credits.json`). Fotografías de producto y marca: propiedad de Licores Palmira S.A.S.

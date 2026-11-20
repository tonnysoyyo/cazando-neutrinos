# Cazando neutrinos en hielo

Simulador educativo de detección indirecta de neutrinos con luz Cherenkov, inspirado en IceCube.

## Inicio rápido

La simulación funciona sin instalación ni conexión: basta con abrir `index.html` en un navegador moderno y conservar la estructura de carpetas. El recorrido comienza en **Primer evento**, con el botón **Reproducir**.

## Actividades

| Pestaña | Procedimiento | Concepto |
| --- | --- | --- |
| **Primer evento** | Reproducir las llegadas, orientar la flecha y revelar la trayectoria. | Reconstrucción del sentido de movimiento a partir de posiciones y tiempos. |
| **Tres consultas** | Consultar el tiempo de hasta tres sensores distintos por caso y registrar un ángulo o **Información insuficiente**. | La estimación depende de dónde se mide y de cuánta evidencia hay. |
| **Energía** | Comparar el evento con un ejemplo, elegir un rango o **Solo se estima la energía depositada** y revelar el balance. | La luz no mide directamente la energía inicial: importan la geometría, el reparto de energía y si el muón escapa. |
| **Traza o cascada** | Reproducir y clasificar cada uno de los tres patrones por su forma. | Una traza es extendida; una cascada aislada produce un patrón más localizado. |
| **Comparar detectores** | Cambiar la separación o la longitud de absorción en B, manteniendo la otra variable fija. Comparar con A y exportar el CSV si se requieren datos. | La geometría del detector y la absorción cambian qué señales se registran para un mismo evento. |
| **Diseñar detector** | Seleccionar exactamente 25 posiciones. En cada uno de cinco eventos, registrar una respuesta para la cuadrícula extendida y otra para el diseño evaluado. | A igual presupuesto se comparan la fracción de eventos con estimación y el error medio de esas estimaciones. |

Los tiempos se expresan en nanosegundos. La flecha representa el sentido de movimiento del muón: 0° hacia la derecha y 90° hacia arriba. El detector es bidimensional y su respuesta óptica es didáctica, no una calibración de IceCube.

## Material de laboratorio

- [Fundamentos físicos](documentos/Fisica_de_la_simulacion.pdf): modelo de luz directa, balance energético y alcance.
- [Actividad de laboratorio](documentos/Actividad_propuesta.pdf): procedimiento, preguntas y resultados de referencia.
- [Ficha de la simulación](Ficha_simulacion.txt).

## Código y verificación

`src/physics.js` calcula geometría, luz directa y tiempos; `src/missions.js` define los casos y el balance energético; `src/detector.js` dibuja el visor; `src/app.js` coordina los controles. La aplicación utiliza HTML, CSS, JavaScript y Canvas 2D sin dependencias de ejecución.

Las pruebas numéricas se ejecutan desde la carpeta del proyecto con Node.js:

```sh
node pruebas/verificar_fisica.cjs
node pruebas/verificar_misiones.cjs
```

## Fuentes

- [IceCube: reconstrucción de la inelasticidad](https://icecube.wisc.edu/news/research/2018/08/understanding-inelasticity-in-high-energy-neutrino-interactions-with-icecube/)
- [IceCube Masterclass: detección de neutrinos](https://masterclass.icecube.wisc.edu/es/icecube-and-neutrinos-es/detecting-neutrinos-es/)
- [Particle Data Group: Passage of Particles Through Matter](https://pdg.lbl.gov/2025/reviews/rpp2025-rev-passage-particles-matter.pdf)
- [IceCube: catálogo de alertas hasta IceCube-170922A](https://icecube.wisc.edu/data-releases/2018/07/icecube-catalog-of-alert-events-up-through-icecube-170922a/)

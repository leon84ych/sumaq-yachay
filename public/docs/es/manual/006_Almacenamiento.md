# Storage Capacity and Feasibility Analysis for College Degree Notes (PWA) / Análisis de Capacidad y Viabilidad de Almacenamiento Local (PWA)

---

## Análisis de Capacidad y Viabilidad de Almacenamiento Local en IndexedDB

### 1. Cuota y Límites del Navegador (IndexedDB)
Los navegadores modernos (Chrome, Firefox, Safari, Edge) asignan espacio de almacenamiento local según el espacio disponible en el disco duro del dispositivo:
* **IndexedDB:** Otorga dinámicamente hasta un **50% - 60% del espacio libre del disco**. En un dispositivo con 100 GB libres, la PWA dispone de unos **50 GB** sin requerir permisos especiales del usuario.
* **LocalStorage:** Limitado a **5 MB** (debe reservarse solo para configuraciones o tokens de sesión).

---

### 2. Estimación de Volumen por Carrera (5 Años / ~40-60 Asignaturas)

El texto plano estructurado (JSON/Celdas) es sumamente ligero en comparación con archivos multimedia:

* **Carreras de Texto Masivo (Derecho, Sociología, Filosofía):**
  * ~50 asignaturas × 500 registros (fichas, pasajes, citas, glosarios).
  * **Total:** ~25,000 registros de texto.
  * **Peso estimado:** **25 MB – 50 MB** en total para toda la carrera.

* **Carreras Técnicas y de Ciencias (Medicina, Ingenierías):**
  * ~60 asignaturas × 1,000 registros (conceptos, fórmulas, preguntas de repaso, personajes/médicos).
  * **Total:** ~60,000 registros de texto.
  * **Peso estimado:** **60 MB – 120 MB** en total.

> **Conclusión:** Los apuntes completos de una carrera universitaria técnica o teórica rondan entre **50 MB y 150 MB**, representando menos del **0.3%** del espacio disponible en IndexedDB en un dispositivo estándar.

---

### 3. Dictamen de Viabilidad Arquitectónica

El enfoque **Offline-First** implementado en **SumaqYachay** (usando **Dexie.js** e **IndexedDB**) es **100% viable y óptimo**:
1. **Rendimiento Cero-Latencia:** Consultar 50,000 registros indexados toma entre **2 ms y 8 ms**.
2. **Autonomía Offline:** El estudiante puede estudiar y realizar repasos (*Quizzes*) sin conexión a internet.
3. **Respaldo Asíncrono:** Google Sheets/Drive actúa únicamente como réplica en la nube para sincronización diferida y respaldo.

---
# ADR-0002: Despliegue público de la API en Oracle Cloud (Always Free)

- **Estado:** Aceptado
- **Fecha:** 2026-08-09

## Contexto

El proyecto ha llegado al final de la Fase 6 (contrato API, DTOs validados, Swagger). La Fase 7 (frontend Angular) todavía no está construida. El objetivo ahora es tener una demo
pública del backend (interfaz Swagger/`/api/docs`) que cualquiera pueda probar, sin coste, y sin romper la restricción dura fijada en ADR-0001: cero llamadas a APIs de pago, todo el cómputo de IA corre en infraestructura propia.

**Problema principal:** la mayoría de servidores "gratis" (Render free, Railway sin tarjeta, Fly.io free allowance) ofrecen entre 256 MB y 1 GB de RAM, insuficiente para correr `qwen2.5:7b-instruct` vía Ollama, que necesita varios GB solo para cargar el modelo en memoria. Desplegar tal cual el `docker-compose.yml` actual no es viable en esos planes.

**Investigación de alternativas (agosto de 2026):**

- **Oracle Cloud Always Free — Ampere A1 (ARM):** infraestructura permanente y gratuita (no un trial con caducidad). El 15 de junio de 2026, Oracle redujo silenciosamente la
  asignación de 4 OCPU/24 GB a **2 OCPU / 12 GB de RAM**, sin aviso oficial. Aun con el recorte, 12 GB de RAM son suficientes para un modelo 7B cuantizado (GGUF Q4_K_M, ~5 GB
  en memoria), con un rendimiento estimado de 8-12 tokens/segundo en CPU ARM.
- Riesgo conocido: error "Out of host capacity" al crear la instancia en regiones muy demandadas; regiones como Frankfurt o Singapur suelen aprovisionar en minutos.
- Alternativas descartadas: ver sección siguiente.

## Decisiones

### 1. Proveedor: Oracle Cloud Always Free, instancia Ampere A1

Una única VM `VM.Standard.A1.Flex` (ARM64), Ubuntu 24.04 Minimal aarch64, con el máximo disponible dentro del free tier (actualmente 2 OCPU / 12 GB RAM). 200 GB de almacenamiento
en bloque incluidos, más que suficiente para el PDF, los modelos de Ollama y las imágenes Docker.

**Por qué:** es la única opción realmente gratuita (no trial) capaz de correr un LLM 7B sin degradar la arquitectura decidida en ADR-0001.

### 2. Misma arquitectura Docker Compose que en local, sin cambios en el backend

Se despliega el mismo `docker-compose.yml` (servicio `ollama` + servicio `api`) que se usa en desarrollo, en la VM en vez de en el portátil. No se toca código de la aplicación.

### 3. Modelo de generación: se mantiene `qwen2.5:7b-instruct`

Se descarta explícitamente cambiar a un modelo más pequeño (ej. `llama3.2:3b`) para ganar velocidad: se prioriza la calidad de respuesta sobre la latencia en esta demo. 8-12
tokens/segundo se considera aceptable para un portfolio público.

### 4. Exposición pública: Nginx como reverse proxy + Let's Encrypt (certbot)

Solo se abren los puertos 80/443 en el *security list* de Oracle Cloud. Ollama (puerto 11434) **no se expone nunca directamente a internet** — solo es accesible desde el
contenedor `api` dentro de la red interna de Docker Compose. Nginx enruta a la API (Swagger UI en `/api/docs`, endpoints bajo `/api`).

Si no hay dominio propio, se usa un subdominio gratuito (ej. DuckDNS) apuntando a la IP pública de la instancia, suficiente para emitir un certificado de Let's Encrypt.

### 5. Solo se despliega la API (sin frontend todavía)

La Fase 7 (Angular) sigue sin construirse. La interfaz pública de la demo es Swagger UI. Cuando exista el frontend, se añadirá como otro servicio (contenedor con build estático)
detrás del mismo Nginx, sirviendo en `/` mientras la API queda en `/api`.

## Alternativas descartadas

| Opción | Motivo de descarte |
|---|---|
| Render / Railway / Fly.io (free tier) | RAM insuficiente (≤1 GB) para cargar un modelo 7B vía Ollama |
| Hugging Face Spaces (CPU free) | Se duerme tras inactividad (cold start largo) y complica correr dos contenedores (Ollama + API) de forma persistente |
| Cambiar a `transformers.js` in-process | Revertiría la decisión ya cerrada en ADR-0001 (un único runtime Ollama para embeddings y generación) sin necesidad real |
| Modelo más pequeño (`llama3.2:3b`, `phi3`) | Descartado explícitamente: se prioriza calidad de respuesta para la demo |
| Túnel (ngrok/Cloudflare Tunnel) hacia el portátil local | Depende de que el portátil esté encendido; no es un despliegue real, solo válido como solución temporal |

## Consecuencias

- **Sin persistencia entre reinicios:** el vector store y el índice BM25 son in-memory (ADR-0001, decisión ya existente, no nueva). Si el contenedor `api` se reinicia, hay que
  volver a subir/indexar el PDF. Se documenta como paso manual en `docs/despliegue.md`, no se resuelve en este ADR — added como deuda técnica si se quiere persistencia real más
  adelante (ej. volumen montado con snapshot del índice, o migrar a `pgvector` en la Fase 9 futura).
- **Requisito de cuenta:** Oracle exige verificación con tarjeta de crédito para crear la cuenta, aunque no haya cargos dentro del free tier. Hay reportes de la comunidad de
  reclamación de instancias por inactividad prolongada; conviene mantener algo de tráfico o revisar la consola periódicamente.
- **Latencia esperada:** 8-12 tokens/segundo en generación (CPU ARM, sin GPU — el free tier de Oracle no incluye GPU). Aceptable para una demo, no para uso intensivo.
- **Seguridad:** Ollama nunca queda expuesto a internet directamente; solo Nginx expone 80/443. Sin autenticación en la API todavía (fuera de alcance, ver plan original §0) —  para una demo pública conviene documentar esta limitación de forma visible.
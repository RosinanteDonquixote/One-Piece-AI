import Groq from "groq-sdk";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- SONDAS DE EXPLORACIÓN ---

async function buscarWiki(tema, idioma = "es") {
  const base = idioma === "es" ? "https://onepiece.fandom.com/es" : "https://onepiece.fandom.com";
  const url = `${base}/api.php?action=parse&page=${encodeURIComponent(tema)}&prop=wikitext&format=json&redirects=1`;
  
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PythagorasBot/1.0" } });
    const datos = await res.json();
    return datos.parse?.wikitext["*"].substring(0, 7000) || "";
  } catch { return ""; }
}

// --- FUNCIÓN PARA DETECTAR SEGUNDO PERSONAJE ---
async function detectarSegundoPersonaje(pregunta, temaActual) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ 
        role: "system", 
        content: `Eres un extractor de nombres. Identifica si en la pregunta se menciona a un personaje de One Piece que NO sea "${temaActual}". Responde SOLO con el nombre del personaje o la palabra "NINGUNO".` 
      }, { 
        role: "user", content: pregunta 
      }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
    });
    const nombre = completion.choices[0]?.message?.content.trim();
    return (nombre === "NINGUNO" || nombre.length > 30) ? null : nombre;
  } catch { return null; }
}

// --- PROCESADOR CENTRAL ---

app.get("/preguntar", async (req, res) => {
  const { q, tema, larga, historialTemas } = req.query;

  if (!q || !tema) return res.send("Error: Faltan datos.");

  // 1. Detectar si hay un segundo personaje involucrado
  const segundoTema = await detectarSegundoPersonaje(q, tema);
  
  // 2. Lanzar todas las sondas necesarias (2 o 4)
  const promesas = [
    buscarWiki(tema, "es"),
    buscarWiki(tema, "en")
  ];

  if (segundoTema) {
    console.log(`🔍 Sincronizando datos adicionales de: ${segundoTema}`);
    promesas.push(buscarWiki(segundoTema, "es"));
    promesas.push(buscarWiki(segundoTema, "en"));
  }

  const resultados = await Promise.all(promesas);
  const infoTemaES = resultados[0];
  const infoTemaEN = resultados[1];
  const infoSegundoES = resultados[2] || "";
  const infoSegundoEN = resultados[3] || "";

  // 3. Instrucciones de Pythagoras con Doble Verificación
  const sistemaPythagoras = `
    Eres Punk-04 Pythagoras. Tu función es cruzar datos de múltiples archivos de la Wiki.
    
    PROTOCOLO DE VERIFICACIÓN CRUZADA:
    1. Tienes datos del TEMA PRINCIPAL (${tema}) y del SEGUNDO TEMA (${segundoTema || 'N/A'}).
    2. Compara ambas fuentes para describir relaciones. Si preguntas por una pelea o relación, verifica las habilidades y acciones en ambos archivos.
    3. PROHIBIDO INVENTAR: Si en el archivo de ${segundoTema} dice que usa láseres, no digas que usa cuchillos.
    
    REGLAS PERMANENTES:
    - NOMENCLATURA: Usa siempre términos de la fuente ESPAÑOLA.
    - DETALLES: Extrae la profundidad de la fuente INGLESA.
    - MEMORIA: El investigador ha visitado: [${historialTemas}].
    - EXTENSIÓN: ${larga === "true" ? "MODO DETALLADO (EXTENSO)." : "MODO CONCISO (BREVE)."}
    - ESTILO: Científico, analítico y amable.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: sistemaPythagoras },
        { 
          role: "user", 
          content: `
            ARCHIVOS TEMA PRINCIPAL (${tema}):
            ES: ${infoTemaES}
            EN: ${infoTemaEN}
            
            ${segundoTema ? `ARCHIVOS SEGUNDO TEMA (${segundoTema}):
            ES: ${infoSegundoES}
            EN: ${infoSegundoEN}` : ""}
            
            PREGUNTA: ${q}
          ` 
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1, // Precisión máxima para evitar inventos
    });

    res.send(chatCompletion.choices[0]?.message?.content);
  } catch (error) {
    res.send("Error en la conexión con los Archivos de Ohara.");
  }
});

app.listen(port, () => console.log(`🚀 Pythagoras operando en puerto ${port}`));
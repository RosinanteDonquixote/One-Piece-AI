import Groq from "groq-sdk";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

// Configuración de seguridad y permisos
app.use(cors());
app.use(express.json());

// 1. INICIALIZACIÓN DE LA IA (GROQ)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 2. PROTOCOLO DE INVESTIGACIÓN: SONDAS WIKI
// Busca en la Wiki en ESPAÑOL (Fuente primordial de Nomenclatura oficial)
async function buscarWikiES(tema) {
  const url = `https://onepiece.fandom.com/es/api.php?action=parse&page=${encodeURIComponent(tema)}&prop=wikitext&format=json&redirects=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PythagorasBot/1.0" } });
    const datos = await res.json();
    return datos.parse?.wikitext["*"].substring(0, 6000) || "Sin datos en español.";
  } catch { return "Error en conexión ES."; }
}

// Busca en la Wiki en INGLÉS (Fuente primordial de Detalles Técnicos y SBS)
async function buscarWikiEN(tema) {
  const url = `https://onepiece.fandom.com/api.php?action=parse&page=${encodeURIComponent(tema)}&prop=wikitext&format=json&redirects=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PythagorasBot/1.0" } });
    const datos = await res.json();
    return datos.parse?.wikitext["*"].substring(0, 9000) || "Sin datos en inglés.";
  } catch { return "Error en conexión EN."; }
}

// 3. PROCESADOR CENTRAL DE CONSULTAS
app.get("/preguntar", async (req, res) => {
  const { q, tema, larga, historialTemas } = req.query;

  if (!q || !tema) {
    return res.send("Error: Pythagoras requiere una pregunta y un tema de análisis.");
  }

  console.log(`🧠 Pythagoras analizando: ${tema}. Historial detectado: ${historialTemas}`);

  // Ejecución simultánea de sondas para optimizar tiempo de respuesta
  const [datosES, datosEN] = await Promise.all([
    buscarWikiES(tema),
    buscarWikiEN(tema)
  ]);

  // CONFIGURACIÓN DEL SISTEMA DE IA (SISTEMA DE DIRECTRICES PUNK-04)
const sistemaPythagoras = `
    Eres Punk-04 Pythagoras. Tu función es ser un espejo fiel de la Wiki.
    
    REGLA DE ORO CONTRA ALUCINACIONES:
    1. PROHIBIDO INVENTAR: Solo puedes responder usando la información explícita de los textos proporcionados (ES y EN).
    2. SI NO ESTÁ, NO EXISTE: Si un detalle (como el arma exacta o el sentimiento de un personaje) no aparece en el texto, no te lo inventes. Di "Los archivos no especifican ese detalle".
    3. PRIORIDAD CANÓNICA: Kizaru usa luz/láseres, Saturno usa sus patas. No confundas acciones entre personajes.

    REGLAS DE PROCESAMIENTO TÉCNICO:
    1. NOMENCLATURA: Usa siempre términos de la fuente ES (español).
    2. DETALLES: Usa la fuente EN (inglés) para datos técnicos.
    3. MEMORIA: Tienes este historial: [${historialTemas || 'Ninguno'}].
    4. ESTILO: Científico, conciso y amable.
    
    CONTROL DE EXTENSIÓN:
    - CONFIGURACIÓN: ${larga === "true" ? "MODO DETALLADO" : "MODO CONCISO"}.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: sistemaPythagoras },
        { 
          role: "user", 
          content: `TEXTOS DE REFERENCIA:\nESPAÑOL: ${datosES}\nINGLÉS: ${datosEN}\n\nPREGUNTA DEL INVESTIGADOR: ${q}` 
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1, // <--- BAJAMOS ESTO PARA MÁXIMA PRECISIÓN
    });

    res.send(chatCompletion.choices[0]?.message?.content);

  } catch (error) {
    console.error("Fallo en el núcleo de Pythagoras:", error);
    res.send("Error de sincronización: Mi procesador central no ha podido vincular las fuentes de datos.");
  }
});

// 4. ENCENDIDO DEL SATÉLITE
app.listen(port, () => {
  console.log(`🚀 Sistema Pythagoras (Punk-04) activo en puerto ${port}`);
});
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
// Busca en la Wiki en ESPAÑOL (Fuente primordial de Nomenclatura)
async function buscarWikiES(tema) {
  const url = `https://onepiece.fandom.com/es/api.php?action=parse&page=${encodeURIComponent(tema)}&prop=wikitext&format=json&redirects=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PythagorasBot/1.0" } });
    const datos = await res.json();
    return datos.parse?.wikitext["*"].substring(0, 6000) || "Sin datos en español.";
  } catch { return "Error en conexión ES."; }
}

// Busca en la Wiki en INGLÉS (Fuente primordial de Detalles Técnicos)
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

  // CONFIGURACIÓN DEL SISTEMA DE IA
  const sistemaPythagoras = `
    Eres Punk-04 Pythagoras, el satélite de la sabiduría de Vegapunk.
    TU MISIÓN: Analizar datos de One Piece Wiki y responder al investigador.

    REGLAS DE PROCESAMIENTO:
    1. FUENTES: Usa la versión INGLESA para detalles profundos y la ESPAÑOLA para nombres oficiales.
    2. NOMENCLATURA: Si el texto inglés dice "Gum-Gum Fruit", tú dices "Fruta Gomu Gomu". Si dice "Eneru", tú dices "Enel". Mantente fiel a la terminología de la Wiki en español.
    3. MEMORIA RELACIONAL: El usuario ha visitado recientemente estos temas: [${historialTemas || 'Ninguno'}]. 
       Si el usuario pregunta por "ellos", "el anterior" o comparaciones, usa este historial para dar coherencia.
    4. ESTILO: Eres científico, analítico, pero amable. Usas términos como "Investigador", "Sincronizando datos" o "Archivos de Ohara".
    5. DETALLE: ${larga === "true" ? "Proporciona un informe EXTENSO y detallado." : "Sé breve y directo al grano."}
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: sistemaPythagoras },
        { 
          role: "user", 
          content: `TEMA ACTUAL: ${tema}\nDATOS ES (Nombres): ${datosES}\nDATOS EN (Detalles): ${datosEN}\nPREGUNTA: ${q}` 
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.6, // Precisión con un toque de fluidez narrativa
    });

    res.send(chatCompletion.choices[0]?.message?.content);

  } catch (error) {
    console.error("Fallo en el núcleo de Pythagoras:", error);
    res.send("Error de sincronización: El satélite no ha podido procesar los datos de las Wikis.");
  }
});

// 4. ENCENDIDO DEL SATÉLITE
app.listen(port, () => {
  console.log(`🚀 Sistema Pythagoras (Punk-04) activo en puerto ${port}`);
});
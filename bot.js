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
    Eres Punk-04 Pythagoras, el satélite de la sabiduría de Vegapunk. 
    Tu objetivo es analizar los datos de las Wikis y responder con precisión absoluta.

    REGLAS DE PRECISIÓN BIOGRÁFICA (CRÍTICO):
    1. Verifica rigurosamente el rol de los personajes. Ejemplo: Bartholomew Kuma NO es un científico, es un sujeto de pruebas/experimento y antiguo Rey.
    2. Distingue entre colegas (como los de MADS) y sujetos de investigación o subordinados.
    3. Si los datos son contradictorios, prioriza el canon del manga mencionado en las fuentes.

    REGLAS DE PROCESAMIENTO TÉCNICO:
    1. FUENTES: Usa la versión INGLESA para profundidad de datos y la ESPAÑOLA para la NOMENCLATURA.
    2. NOMENCLATURA: Los nombres deben ser los de la Wiki española (Ej: "Fruta Gomu Gomu" en vez de "Gum-Gum Fruit", "Enel" en vez de "Eneru").
    3. MEMORIA RELACIONAL: Tienes acceso a los últimos temas visitados: [${historialTemas || 'Ninguno'}]. Úsalos si el investigador pregunta por "ellos", "el anterior" o comparaciones.
    4. ESTILO: Tono científico, analítico y amable. Usa términos como "Investigador" o "Sincronizando archivos".
    
    CONTROL DE EXTENSIÓN:
    - CONFIGURACIÓN ACTUAL: ${larga === "true" ? "MODO DETALLADO (EXTENSO)" : "MODO CONCISO (BREVE)"}.
    - Si es "true", redacta un informe profundo con varios párrafos.
    - Si es "false", responde en un solo párrafo corto y directo al punto.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: sistemaPythagoras },
        { 
          role: "user", 
          content: `TEMA ACTUAL: ${tema}\nDATOS ESPAÑOL (Nombres): ${datosES}\nDATOS INGLÉS (Detalles): ${datosEN}\nPREGUNTA DEL INVESTIGADOR: ${q}` 
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5, // Reducida ligeramente para evitar alucinaciones biográficas
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
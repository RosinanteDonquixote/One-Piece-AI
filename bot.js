import Groq from "groq-sdk";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

// Configuración de seguridad para Fandom
app.use(cors());
app.use(express.json());

// 1. CONEXIÓN CON EL SATÉLITE (GROQ)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 2. INSTRUCCIONES DE PROCESAMIENTO (Protocolo Pythagoras)
const instruccionesMaestras = `
Eres Pythagoras, el satélite de Vegapunk encargado de la base de datos de One Piece.
Tu misión es sintetizar información de dos fuentes: la Wiki en ESPAÑOL y la Wiki en INGLÉS.

REGLAS DE ORO:
1. Usa la fuente en INGLÉS para obtener los detalles más profundos, datos técnicos y curiosidades.
2. Usa la fuente en ESPAÑOL como filtro obligatorio de NOMENCLATURA. 
3. Debes traducir o adaptar los términos ingleses a los nombres oficiales en español encontrados en la fuente española.
   - Ejemplo: Si en inglés dice "Gum-Gum Fruit", tú escribes "Fruta Gomu Gomu".
   - Ejemplo: Si en inglés dice "Eneru", tú escribes "Enel".
4. Responde siempre en español, con un tono científico, analítico pero muy amable.
5. Usa el glosario oficial: Sombrero de Paja, Fruta del Diablo, Haki, Guerreros del Mar, Recompensa.
`;

// 3. SONDAS DE EXPLORACIÓN (MediaWiki API)

// Busca en la Wiki en ESPAÑOL (Para Nomenclatura)
async function buscarWikiES(tema) {
  const url = `https://onepiece.fandom.com/es/api.php?action=parse&page=${encodeURIComponent(tema)}&prop=wikitext&format=json&redirects=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PythagorasBot/1.0" } });
    const datos = await res.json();
    return datos.parse?.wikitext["*"].substring(0, 6000) || "No hay datos en español.";
  } catch { return "Error en conexión ES."; }
}

// Busca en la Wiki en INGLÉS (Para Detalles Profundos)
async function buscarWikiEN(tema) {
  // Intentamos buscar el mismo tema en inglés
  const url = `https://onepiece.fandom.com/api.php?action=parse&page=${encodeURIComponent(tema)}&prop=wikitext&format=json&redirects=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PythagorasBot/1.0" } });
    const datos = await res.json();
    return datos.parse?.wikitext["*"].substring(0, 9000) || "No hay datos en inglés.";
  } catch { return "Error en conexión EN."; }
}

// 4. PROCESADOR DE CONSULTAS
app.get("/preguntar", async (req, res) => {
  const { q, tema, larga } = req.query;

  if (!q || !tema) {
    return res.send("Error: Pythagoras requiere una pregunta y un tema.");
  }

  console.log(`🧠 Procesando datos de: ${tema}`);

  // Ejecutamos ambas búsquedas al mismo tiempo para ganar velocidad
  const [datosES, datosEN] = await Promise.all([
    buscarWikiES(tema),
    buscarWikiEN(tema)
  ]);

  // Configuramos el nivel de detalle
  const modoRespuesta = (larga === "true") 
    ? "Genera un reporte EXTENSO y detallado, analizando cada punto." 
    : "Genera una respuesta BREVE y directa al punto.";

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: instruccionesMaestras },
        { role: "user", content: `
          CONFIGURACIÓN: ${modoRespuesta}
          TERMINOLOGÍA ESPAÑOLA: """${datosES}"""
          DATOS DETALLADOS INGLÉS: """${datosEN}"""
          
          PREGUNTA DEL INVESTIGADOR: "${q}"
        ` }
      ],
      model: "llama-3.1-8b-instant", 
      temperature: 0.5, // Balance entre creatividad y precisión técnica
    });

    res.send(chatCompletion.choices[0]?.message?.content);
  } catch (error) {
    console.error("Error en el núcleo de la IA:", error);
    res.send("Lo siento, mi procesador central ha fallado al intentar sincronizar las Wikis.");
  }
});

// 5. ACTIVACIÓN DEL SISTEMA
app.listen(port, () => {
  console.log(`🚀 Pythagoras operativo en el puerto ${port}`);
});
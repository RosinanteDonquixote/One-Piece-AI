import Groq from "groq-sdk";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- SONDAS DE EXPLORACIÓN OPTIMIZADAS ---

async function buscarWiki(tema, idioma = "es") {
  // Ajuste inteligente: Si buscamos en inglés y el tema es "Cinco Ancianos", lo mapeamos a "Five Elders"
  let temaBusqueda = tema;
  if (idioma === "en") {
    if (tema.toLowerCase().includes("cinco ancianos")) temaBusqueda = "Five Elders";
    if (tema.toLowerCase().includes("gorosei")) temaBusqueda = "Five Elders";
  }

  const base = idioma === "es" ? "https://onepiece.fandom.com/es" : "https://onepiece.fandom.com";
  const url = `${base}/api.php?action=parse&page=${encodeURIComponent(temaBusqueda)}&prop=wikitext&format=json&redirects=1`;
  
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PythagorasBot/1.0" } });
    const datos = await res.json();
    return datos.parse?.wikitext["*"].substring(0, 8000) || "";
  } catch { return ""; }
}

// --- ESCÁNER DE ENTIDADES Y GRUPOS (MEJORADO) ---
async function detectarEntidades(pregunta, temaActual) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ 
        role: "system", 
        content: `Eres un experto en One Piece. Identifica si en la pregunta se menciona a un personaje, grupo o entidad (ej: Cinco Ancianos, CP0, Marina) que NO sea "${temaActual}". Responde SOLAMENTE con el nombre del sujeto en español o la palabra "NINGUNO".` 
      }, { 
        role: "user", content: pregunta 
      }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
    });
    const nombre = completion.choices[0]?.message?.content.trim().replace(/[".]/g, "");
    return (nombre === "NINGUNO" || nombre.length > 40) ? null : nombre;
  } catch { return null; }
}

// --- PROCESADOR CENTRAL ---

app.get("/preguntar", async (req, res) => {
  const { q, tema, larga, historialTemas } = req.query;

  if (!q || !tema) return res.send("Error de parámetros.");

  // 1. Detectar segundo sujeto (Personaje o Grupo como 'Cinco Ancianos')
  const segundoTema = await detectarEntidades(q, tema);
  
  // 2. Sincronizar Sondas
  const promesas = [buscarWiki(tema, "es"), buscarWiki(tema, "en")];
  if (segundoTema) {
    console.log(`🔍 Sincronizando entidad adicional: ${segundoTema}`);
    promesas.push(buscarWiki(segundoTema, "es"));
    promesas.push(buscarWiki(segundoTema, "en"));
  }

  const resultados = await Promise.all(promesas);
  const infoTemaES = resultados[0];
  const infoTemaEN = resultados[1];
  const infoSegundoES = resultados[2] || "";
  const infoSegundoEN = resultados[3] || "";

  // 3. Sistema de Directrices Punk-04 (Protocolo Anti-Errores)
  const sistemaPythagoras = `
    Eres Punk-04 Pythagoras. Cruza los datos de los archivos para dar una respuesta verídica.
    
    PROTOCOLO DE VERDAD:
    1. ANALIZA JERARQUÍAS: Vegapunk es el CREADOR de la tecnología (Pacifistas, Serafines). Los Cinco Ancianos son los CLIENTES/SUPERIORES que dan las órdenes, no los inventores. No confundas roles.
    2. RELACIÓN DIRECTA: Vegapunk tiene una relación constante con los Cinco Ancianos (Gorosei) como su principal activo científico. Si el archivo menciona "Gorosei" o "World Government", úsalo.
    3. NO ALUCINES: Si un dato no está en el texto (como que los Ancianos "crearon" algo que hizo Vegapunk), corrígelo mentalmente con la info del otro archivo.

    REGLAS PERMANENTES:
    - NOMENCLATURA: Siempre términos de la fuente ESPAÑOLA.
    - DETALLES: Profundidad de la fuente INGLESA.
    - HISTORIAL: [${historialTemas}].
    - EXTENSIÓN: ${larga === "true" ? "EXTENSO." : "CONCISO."}
    - TEMPERATURA DE PRECISIÓN: 0.1 (No inventar).
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: sistemaPythagoras },
        { 
          role: "user", 
          content: `ARCHIVOS PRINCIPALES (${tema}):\nES: ${infoTemaES}\nEN: ${infoTemaEN}\n\n${segundoTema ? `ARCHIVOS ADICIONALES (${segundoTema}):\nES: ${infoSegundoES}\nEN: ${infoSegundoEN}` : ""}\n\nPREGUNTA: ${q}` 
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1, 
    });

    res.send(chatCompletion.choices[0]?.message?.content);
  } catch (error) {
    res.send("Error de conexión con Ohara.");
  }
});

app.listen(port, () => console.log(`🚀 Pythagoras con Escáner de Entidades activo.`));
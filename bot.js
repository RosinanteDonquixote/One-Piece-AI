import Groq from "groq-sdk";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GROQ_API_KEY; 
const groq = new Groq({ apiKey: apiKey });

// Función que genera las instrucciones según lo que pida el usuario
const obtenerInstrucciones = (esLarga) => {
  const estilo = esLarga 
    ? "Tu objetivo es dar respuestas DETALLADAS, EXTENSAS y con muchos datos curiosos. Explica todo a fondo en varios párrafos." 
    : "Tu objetivo es ser muy BREVE y CONCISO. Responde en una sola frase o un párrafo muy corto.";

  return `Eres un asistente experto de la enciclopedia 'One Piece Wiki' en español. ${estilo}
  REGLAS: Usa el glosario (Fruta del Diablo, Sombrero de Paja, etc.) y sé amable.`;
};

async function buscarEnWiki(nombreDelTema) {
  const temaArreglado = encodeURIComponent(nombreDelTema);
  const direccionSecreta = `https://onepiece.fandom.com/api.php?action=parse&page=${temaArreglado}&prop=wikitext&redirects=1&format=json`;
  try {
    const respuesta = await fetch(direccionSecreta, { headers: { "User-Agent": "MiBotDeOnePiece/1.0" } });
    const datos = await respuesta.json();
    if (datos.error) return null;
    return datos.parse.wikitext["*"].substring(0, 8000);
  } catch (error) { return null; }
}

app.get("/preguntar", async (req, res) => {
  const { q, tema, larga } = req.query; // Recibimos el nuevo parámetro "larga"

  if (!q || !tema) return res.send("Falta q o tema.");
  
  const textoDeLaWiki = await buscarEnWiki(tema);
  if (!textoDeLaWiki) return res.send(`No encontré información sobre "${tema}".`);

  // El cocinero elige el libro de recetas según lo que pidió el usuario
  const modoLargo = (larga === "true"); 
  
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: obtenerInstrucciones(modoLargo) },
        { role: "user", content: `Texto: ${textoDeLaWiki}\nPregunta: ${q}` }
      ],
      model: "llama-3.1-8b-instant", 
    });
    res.send(chatCompletion.choices[0]?.message?.content);
  } catch (error) { res.send("Error en la IA."); }
});

app.listen(port, () => console.log(`🚀 Servidor listo en puerto ${port}`));
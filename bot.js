import Groq from "groq-sdk";
import express from "express";
import cors from "cors";

const app = express();
// Render nos asigna un puerto automáticamente, si no, usa el 3000
const port = process.env.PORT || 3000;

// Configuración de seguridad: Permite que la Wiki de Fandom hable con este servidor
app.use(cors());
app.use(express.json());

// 1. CONFIGURACIÓN DE LA IA
// La clave se lee de las "Environment Variables" de Render
const apiKey = process.env.GROQ_API_KEY; 
const groq = new Groq({ apiKey: apiKey });

const instruccionesWiki = `
Eres un asistente experto de la enciclopedia 'One Piece Wiki' en español.
Tu objetivo es responder a la pregunta del usuario utilizando ÚNICAMENTE la información proporcionada en el "Texto Extraído" a continuación.

REGLAS ESTRICTAS:
1. Responde siempre en español, con un tono amable de un fan de One Piece.
2. Si la respuesta no está en el "Texto Extraído", di amablemente que no tienes esa información. No inventes.
3. Adapta la traducción usando obligatoriamente este glosario oficial:
  - "Devil Fruit" -> "Fruta del Diablo"
  - "Straw Hat" -> "Sombrero de Paja"
  - "Bounty" -> "Recompensa"
  - "Warlord of the Sea" -> "Guerrero del Mar"
  - "Haki" -> "Haki"
`;

// 2. EL AYUDANTE: Busca la info en la Wiki (puerta trasera para evitar bloqueos)
async function buscarEnWiki(nombreDelTema) {
  const temaArreglado = encodeURIComponent(nombreDelTema);
  const direccionSecreta = `https://onepiece.fandom.com/api.php?action=parse&page=${temaArreglado}&prop=wikitext&redirects=1&format=json`;

  try {
    const respuesta = await fetch(direccionSecreta, {
        headers: { "User-Agent": "MiBotDeOnePiece/1.0" }
    });
    const datos = await respuesta.json();

    if (datos.error) return null;

    const textoBruto = datos.parse.wikitext["*"];
    if (!textoBruto) return null;

    // Pasamos un trozo grande de información a la IA (8000 caracteres)
    return textoBruto.substring(0, 8000);
  } catch (error) {
    console.error("Error al buscar en Wiki:", error);
    return null;
  }
}

// 3. EL COCINERO: La IA de Groq que procesa y traduce
async function cocinarRespuesta(pregunta, textoIngles) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: instruccionesWiki },
        { role: "user", content: `Texto Extraído (en inglés):\n"${textoIngles}"\n\nPregunta del usuario:\n"${pregunta}"` }
      ],
      model: "llama-3.1-8b-instant", 
    });
    return chatCompletion.choices[0]?.message?.content || "No pude generar una respuesta.";
  } catch (error) {
    console.error("Error en el Cocinero (Groq):", error);
    return "Lo siento, el cocinero está teniendo problemas con los ingredientes (Error de IA).";
  }
}

// 4. LA VENTANILLA: Ruta que recibe las preguntas desde la Wiki
app.get("/preguntar", async (req, res) => {
  const pregunta = req.query.q;
  const tema = req.query.tema;

  if (!pregunta || !tema) {
    return res.send("Error: Falta la pregunta o el tema de búsqueda.");
  }

  console.log(`🛎️ Pedido recibido: Pregunta "${pregunta}" sobre "${tema}"`);
  
  const textoDeLaWiki = await buscarEnWiki(tema);
  if (!textoDeLaWiki) {
    return res.send(`Lo siento, no he encontrado información sobre "${tema}" en la base de datos.`);
  }

  const respuestaFinal = await cocinarRespuesta(pregunta, textoDeLaWiki);
  res.send(respuestaFinal);
});

// 5. ENCENDIDO
app.listen(port, () => {
  console.log(`🚀 ¡El servidor de One Piece está vivo en el puerto ${port}!`);
});
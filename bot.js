import Groq from "groq-sdk";
import express from "express"; // 1. Importamos la herramienta de servidor

const app = express();
const port = process.env.PORT || 3000; // El puerto por donde escuchará nuestro servidor

// Esto permite que nuestro servidor entienda cuando le enviamos datos
app.use(express.json());

// ==========================================
// CONFIGURACIÓN DE IA Y WIKI (Igual que antes)
// ==========================================
const apiKey = process.env.GROQ_API_KEY; 
const groq = new Groq({ apiKey: apiKey });

const instruccionesWiki = `
Eres un asistente experto de la enciclopedia 'One Piece Wiki' en español.
Tu objetivo es responder a la pregunta del usuario utilizando ÚNICAMENTE la información proporcionada en el "Texto Extraído" a continuación.
REGLAS: Responde en español, usa el glosario oficial (Fruta del Diablo, Sombrero de Paja, etc.) y sé amable.
`;

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

async function cocinarRespuesta(pregunta, textoIngles) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: instruccionesWiki },
        { role: "user", content: `Texto: ${textoIngles}\nPregunta: ${pregunta}` }
      ],
      model: "llama-3.1-8b-instant", 
    });
    return chatCompletion.choices[0]?.message?.content;
  } catch (error) { return "Error en la IA."; }
}

// ==========================================
// 3. LA VENTANILLA DE PEDIDOS (Ruta del Servidor)
// ==========================================

// Esta es la dirección que "escuchará" las preguntas
app.get("/preguntar", async (req, res) => {
  // Sacamos la pregunta y el tema de la dirección web
  // Ejemplo: /preguntar?q=¿Cual es su sueño?&tema=Roronoa Zoro
  const pregunta = req.query.q;
  const tema = req.query.tema;

  if (!pregunta || !tema) {
    return res.send("Falta la pregunta (q) o el tema.");
  }

  console.log(`\n🛎️ Pedido online recibido: ${pregunta}`);
  
  const textoDeLaWiki = await buscarEnWiki(tema);
  if (!textoDeLaWiki) return res.send(`No encontré información sobre ${tema}`);

  const respuestaFinal = await cocinarRespuesta(pregunta, textoDeLaWiki);
  
  // Enviamos la respuesta de vuelta al navegador
  res.send(respuestaFinal);
});

// 4. Encendemos el servidor
app.listen(port, () => {
  console.log(`\n🚀 ¡El servidor de One Piece está vivo!`);
  console.log(`👂 Escuchando en: http://localhost:${port}`);
  console.log(`Prueba este enlace en tu navegador: http://localhost:${port}/preguntar?q=quien es&tema=Monkey D. Luffy`);
});
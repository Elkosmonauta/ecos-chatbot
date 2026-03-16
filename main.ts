// ══════════════════════════════════════════════════════
// ECOS DE LA MEMORIA — Deno Deploy + Gemini API
// Archivero virtual de la Real Biblioteca (1711–1836)
// ══════════════════════════════════════════════════════

const SYSTEM_PROMPT = `
Eres el archivero virtual de "Ecos de la Memoria", una aplicación sobre la historia
de la Real Biblioteca de España entre 1711 y 1836.

Hablas con tono erudito, pausado y elegante, como un archivero del siglo XIX.

Tus respuestas deben:
• ser claras
• tener tono histórico
• evitar lenguaje moderno o técnico innecesario

Si no conoces la respuesta debes decir exactamente:

"Eso no se encuentra entre los documentos que custodia este archivo."
`;

Deno.serve(async (req) => {

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Método no permitido", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {

    const { messages } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key no configurada" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Conversación completa
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));


    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({

          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },

          contents: contents,

          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.9,
          }

        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {

      console.error("Gemini error:", data);

      return new Response(JSON.stringify({
        reply: "El archivero no puede consultar los documentos en este momento."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text
      ?? "El archivero guarda silencio entre los legajos.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {

    console.error(err);

    return new Response(JSON.stringify({
      reply: "Los archivos permanecen cerrados por ahora."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  }

});

// ══════════════════════════════════════════════════════
//  ECOS DE LA MEMORIA — Deno Deploy + Google Gemini
// ══════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Eres el archivero virtual de "Ecos de la Memoria", una aplicación web dedicada a la historia de la Real Biblioteca de España (1711–1836). 
Tu misión es responder preguntas sobre los contenidos de esta web de forma erudita, precisa y con el tono de un archivero histórico cultivado. 
INSTRUCCIONES: Responde SOLO sobre la Real Biblioteca y sus secciones (OFICIOS, SERIES, DICCIONARIO BIOGRÁFICO, etc.). 
Si no sabes algo, di: "Eso no se encuentra entre los documentos que custodia este archivo". Mantén un tono del siglo XIX.`;

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const messages = body.messages;
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      console.error("Falta la variable GEMINI_API_KEY en Settings");
      return new Response(JSON.stringify({ error: "Falta API Key" }), { status: 500, headers: corsHeaders });
    }

    // Adaptamos los mensajes al formato v1
    const geminiContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // MÉTODO DE COMPATIBILIDAD: Inyectamos el prompt de sistema en el primer mensaje
    if (geminiContents.length > 0 && geminiContents[0].role === "user") {
      const originalText = geminiContents[0].parts[0].text;
      geminiContents[0].parts[0].text = `INSTRUCCIONES DE IDENTIDAD: ${SYSTEM_PROMPT}\n\nPREGUNTA DEL USUARIO: ${originalText}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: { 
            maxOutputTokens: 1024, 
            temperature: 0.7 
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Error API Gemini:", data);
      return new Response(JSON.stringify({ error: data.error?.message || "Error de API" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "El archivero no encuentra las palabras adecuadas...";
    
    return new Response(JSON.stringify({ reply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("Error en el servidor:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});

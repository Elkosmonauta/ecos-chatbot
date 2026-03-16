// ══════════════════════════════════════════════════════
//  ECOS DE LA MEMORIA — Deno Deploy + Google Gemini
// ══════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Eres el archivero virtual de "Ecos de la Memoria", una aplicación web dedicada a la historia de la Real Biblioteca de España (1711–1836). 
Responde de forma erudita y precisa, con el tono de un archivero histórico. 
Secciones disponibles: OFICIOS, SERIES, DICCIONARIO BIOGRÁFICO, CRONOLOGÍA DE ARCHIVEROS, PLANTILLA REAL, LA GACETA SECRETA, EL LIBRO ROJO, LAS INVISIBLES, LA RED, INCIDENTES, ECOS DE SOCIEDAD, ADQUISICIONES y SEDES.`;

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

    if (!apiKey) return new Response(JSON.stringify({ error: "Falta API Key" }), { status: 500, headers: corsHeaders });

    const geminiContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // CAMBIO CLAVE: Usamos /v1/ y el modelo "gemini-1.5-flash"
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: geminiContents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
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

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "El archivero no encuentra el legajo.";
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

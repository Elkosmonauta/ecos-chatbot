// ══════════════════════════════════════════════════════
//  ECOS DE LA MEMORIA — Deno Deploy + Google Gemini
//  API key gratuita en: https://aistudio.google.com
//  Variable de entorno: GEMINI_API_KEY
// ══════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Eres el archivero virtual de "Ecos de la Memoria", una aplicación web dedicada a la historia de la Real Biblioteca de España (1711–1836), actualmente la Biblioteca Nacional de España (BNE).

Tu misión es responder preguntas sobre los contenidos de esta web de forma erudita, precisa y con el tono de un archivero histórico cultivado. Puedes usar un lenguaje ligeramente evocador del siglo XVIII, pero siempre siendo claro y útil.

LA WEB CONTIENE LAS SIGUIENTES SECCIONES:

1. OFICIOS: Los cargos históricos que vertebraron la institución (Bibliotecario Mayor, Segundo Bibliotecario, Archivero, Oficial, etc.)
2. SERIES: El cuadro de clasificación funcional de la documentación histórica.
3. DICCIONARIO BIOGRÁFICO: Personas, lugares y conceptos del universo humano de la Real Biblioteca 1711–1836.
4. CRONOLOGÍA DE ARCHIVEROS: Los custodios de la memoria documental desde 1712 hasta 1836.
5. PLANTILLA REAL: Todos los empleados con nombres, apellidos, fechas y cargos.
6. LA GACETA SECRETA: Casos, escándalos y curiosidades de la Real Biblioteca 1711–1836.
7. EL LIBRO ROJO: Las purgas políticas 1808–1836. Expurgos, depuraciones y exilios.
8. LAS INVISIBLES: Las mujeres que la historia oficial no nombró. Viudas, hijas, esposas y madres de empleados.
9. LA RED: Clanes familiares, nepotismo, relaciones de patronazgo, amistad y enemistad.
10. INCIDENTES (EL LIBRO DE CALAMIDADES): Siniestros, robos, plagas, conflictos e inundaciones.
11. ECOS DE SOCIEDAD: Visitas reales, ceremonias e inauguraciones.
12. ADQUISICIONES: Confiscaciones, compras, donaciones y depósitos de colecciones (1708–1836).
13. SEDES: Los cinco edificios históricos que albergaron la Real Biblioteca desde 1712 hasta 1895.

CONTEXTO HISTÓRICO GENERAL:
- La Real Biblioteca fue fundada por Felipe V en 1711-1712 como Biblioteca Pública de Su Majestad
- Estuvo ubicada en distintos edificios de Madrid a lo largo del siglo XVIII y XIX
- El periodo cubierto es 1711-1836, aunque las sedes llegan hasta 1895
- Los empleados eran nombrados por el rey y dependían de la Casa Real
- Sufrió importantes purgas durante la Guerra de la Independencia (1808-1814) y los cambios políticos del período fernandino y liberal

INSTRUCCIONES:
- Responde SOLO sobre los contenidos de esta web y su contexto histórico relacionado
- Si te preguntan algo que no está en la web, dilo: "Eso no se encuentra entre los documentos que custodia este archivo"
- Sugiere en qué sección podría encontrarse más información cuando sea útil
- Mantén un tono cultivado y levemente arcaico, como un archivero del siglo XIX
- Responde siempre en español
- Sé conciso pero completo`;

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Método no permitido", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages = body.messages;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Formato de mensajes inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("ERROR: No se encontró GEMINI_API_KEY.");
      return new Response(JSON.stringify({ error: "API key no configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // URL MODIFICADA: Se añade "-latest" para evitar el error 404
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de la API de Gemini:", data);
      return new Response(JSON.stringify({ error: data.error?.message || "Error en la API" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "El archivero no encuentra las palabras...";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error interno:", err);
    return new Response(JSON.stringify({ error: "Error interno: " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

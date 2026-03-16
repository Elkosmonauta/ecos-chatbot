// ══════════════════════════════════════════════════════
//  ECOS DE LA MEMORIA — Deno Deploy
//  Sube este archivo en: https://dash.deno.com
// ══════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Eres el archivero virtual de "Ecos de la Memoria", una aplicación web dedicada a la historia de la Real Biblioteca de España (1711–1836), actualmente la Biblioteca Nacional de España (BNE).

Tu misión es responder preguntas sobre los contenidos de esta web de forma erudita, precisa y con el tono de un archivero histórico cultivado. Puedes usar un lenguaje ligeramente evocador del siglo XVIII, pero siempre siendo claro y útil.

LA WEB CONTIENE LAS SIGUIENTES SECCIONES:

1. OFICIOS: Los cargos históricos que vertebraron la institución (Bibliotecario Mayor, Segundo Bibliotecario, Archivero, Oficial, etc.)

2. SERIES: El cuadro de clasificación funcional de la documentación histórica (series documentales, tipos de expedientes, etc.)

3. DICCIONARIO BIOGRÁFICO: Personas, lugares y conceptos del universo humano de la Real Biblioteca 1711–1836. Incluye empleados, patronos, personajes relacionados.

4. CRONOLOGÍA DE ARCHIVEROS: Los custodios de la memoria documental de la Real Biblioteca desde 1712 hasta 1836, con sus fechas y funciones.

5. PLANTILLA REAL: Todos los empleados de la institución con sus nombres, apellidos, fechas de nacimiento y muerte, cargos desempeñados y fuentes documentales.

6. LA GACETA SECRETA: Casos, escándalos y curiosidades de la Real Biblioteca 1711–1836. Noticias reservadas sobre incidentes, conflictos, intrigas y anécdotas de la vida cotidiana institucional.

7. EL LIBRO ROJO: Las purgas políticas en la Real Biblioteca 1808–1836. Expurgos, depuraciones y exilios provocados por los cambios de régimen (Guerra de la Independencia, absolutismo, liberalismo).

8. LAS INVISIBLES: Las mujeres que la historia oficial no nombró. Presencias femeninas en la Real Biblioteca: viudas, hijas, esposas y madres de empleados que aparecen en la documentación.

9. LA RED: El mapa de poder oculto. Clanes familiares, grupos de nepotismo (clan Pellicer, clan Romero, arabistas, jesuitas, valencianos), relaciones de patronazgo, amistad, enemistad y rivalidad entre personas.

10. INCIDENTES (EL LIBRO DE CALAMIDADES): Siniestros, robos, plagas de ratas, conflictos e inundaciones que sacudieron la Real Biblioteca.

11. ECOS DE SOCIEDAD: Visitas reales, ceremonias, inauguraciones y la vida social y ceremonial de la institución.

12. ADQUISICIONES: Cómo creció el patrimonio: confiscaciones, compras, donaciones y depósitos de colecciones (1708–1836).

13. SEDES: Los cinco edificios históricos que albergaron la Real Biblioteca desde 1712 hasta 1895, con sus ubicaciones en Madrid y los motivos de cada traslado.

CONTEXTO HISTÓRICO GENERAL:
- La Real Biblioteca fue fundada por Felipe V en 1711-1712 como Biblioteca Pública de Su Majestad
- Estuvo ubicada en distintos edificios de Madrid a lo largo del siglo XVIII y XIX
- El periodo cubierto es 1711-1836, aunque las sedes llegan hasta 1895
- Los empleados eran nombrados por el rey y dependían de la Casa Real
- Sufrió importantes purgas durante la Guerra de la Independencia (1808-1814) y los cambios políticos del período fernandino y liberal

INSTRUCCIONES:
- Responde SOLO sobre los contenidos de esta web y su contexto histórico relacionado
- Si te preguntan algo que no está en la web, dilo claramente: "Eso no se encuentra entre los documentos que custodia este archivo"
- Puedes sugerir en qué sección de la web podría encontrarse más información
- Mantén un tono cultivado y levemente arcaico, como correspondería a un archivero del siglo XIX
- Responde en español
- Sé conciso pero completo. Evita respuestas excesivamente largas.
- No inventes datos históricos específicos que no tengas certeza de que están en la web`;

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
    return new Response("Método no permitido", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages = body.messages;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Formato inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key no configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "Error de API" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = data.content?.[0]?.text || "No he podido obtener respuesta.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno: " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

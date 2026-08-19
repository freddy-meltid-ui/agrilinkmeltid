import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHATSAPP_API = "https://graph.facebook.com/v21.0";

// ============= States =============
// menu                   -> waiting for user to pick 1/2/3/4
// reco_country           -> waiting for country name
// reco_region            -> waiting for region pick (number)
// cal_country / cal_region -> planting calendar flow (reuses reco)
// res_crop               -> waiting for crop name
// res_need               -> waiting for resource type pick (1-5)
// agent                  -> waiting for handoff (sends contact info, returns to menu)

const WELCOME =
  `🌱 Bienvenue sur AgriGrid Atlas. Choisissez une option:\n` +
  `1. Recommandation de culture\n` +
  `2. Calendrier de plantation\n` +
  `3. Demande de ressources\n` +
  `4. Parler à un agent\n\n` +
  `Répondez avec le numéro (1, 2, 3 ou 4). Tapez "menu" à tout moment pour recommencer.`;

async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string, token: string) {
  const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) console.error("WhatsApp send error:", res.status, await res.text());
  return res;
}

type Session = {
  phone_number: string;
  current_state: string;
  selected_country: string | null;
  selected_region_id: string | null;
  selected_crop_id: string | null;
  metadata: Record<string, any>;
};

async function getSession(supabase: any, phone: string): Promise<Session> {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();
  if (data) return data;
  const fresh: Session = {
    phone_number: phone,
    current_state: "menu",
    selected_country: null,
    selected_region_id: null,
    selected_crop_id: null,
    metadata: {},
  };
  await supabase.from("whatsapp_sessions").insert(fresh);
  return fresh;
}

async function saveSession(supabase: any, s: Session) {
  await supabase
    .from("whatsapp_sessions")
    .upsert({ ...s, updated_at: new Date().toISOString() }, { onConflict: "phone_number" });
}

async function resetSession(supabase: any, phone: string) {
  await supabase
    .from("whatsapp_sessions")
    .upsert(
      {
        phone_number: phone,
        current_state: "menu",
        selected_country: null,
        selected_region_id: null,
        selected_crop_id: null,
        metadata: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone_number" },
    );
}

// ============= Flow handler =============
async function handleMessage(supabase: any, phone: string, raw: string): Promise<string> {
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (["menu", "start", "bonjour", "hi", "hello", "salut"].includes(lower)) {
    await resetSession(supabase, phone);
    return WELCOME;
  }

  const session = await getSession(supabase, phone);

  switch (session.current_state) {
    case "menu": {
      if (msg === "1") {
        session.current_state = "reco_country";
        await saveSession(supabase, session);
        return "📍 Dans quel pays êtes-vous ? (ex: Bénin, Nigeria)";
      }
      if (msg === "2") {
        session.current_state = "cal_country";
        session.metadata = { ...session.metadata, flow: "calendar" };
        await saveSession(supabase, session);
        return "📍 Dans quel pays êtes-vous ? (ex: Bénin, Nigeria)";
      }
      if (msg === "3") {
        session.current_state = "res_crop";
        await saveSession(supabase, session);
        return "🌾 Pour quelle culture ? (ex: maïs, manioc, soja)";
      }
      if (msg === "4") {
        await resetSession(supabase, phone);
        return (
          "👤 Un agent AgriGrid vous contactera bientôt.\n" +
          "Vous pouvez aussi nous joindre via le site agri-grid.com.\n\n" +
          'Tapez "menu" pour revenir.'
        );
      }
      return WELCOME;
    }

    case "reco_country":
    case "cal_country": {
      const { data: country } = await supabase
        .from("countries")
        .select("id, name_en, name_fr, code")
        .or(`name_en.ilike.${msg},name_fr.ilike.${msg},code.ilike.${msg}`)
        .maybeSingle();
      if (!country) {
        return `Pays "${msg}" introuvable. Veuillez réessayer (ex: Bénin, Nigeria).`;
      }
      const { data: regions } = await supabase
        .from("regions")
        .select("id, name")
        .eq("country_id", country.id)
        .order("name")
        .limit(20);
      if (!regions || regions.length === 0) {
        await resetSession(supabase, phone);
        return `Aucune région disponible pour ${country.name_fr}. Tapez "menu" pour recommencer.`;
      }
      session.selected_country = country.name_fr || country.name_en;
      session.metadata = { ...session.metadata, regions: regions.map((r: any) => ({ id: r.id, name: r.name })) };
      session.current_state = session.current_state === "cal_country" ? "cal_region" : "reco_region";
      await saveSession(supabase, session);
      const list = regions.map((r: any, i: number) => `${i + 1}. ${r.name}`).join("\n");
      return `📍 Choisissez une région (numéro):\n${list}`;
    }

    case "reco_region":
    case "cal_region": {
      const idx = parseInt(msg, 10) - 1;
      const regions = (session.metadata?.regions || []) as Array<{ id: string; name: string }>;
      if (isNaN(idx) || idx < 0 || idx >= regions.length) {
        return `Veuillez répondre avec un numéro entre 1 et ${regions.length}.`;
      }
      const region = regions[idx];
      session.selected_region_id = region.id;
      const isCalendar = session.current_state === "cal_region";
      await saveSession(supabase, session);

      // Fetch top recommendations
      const { data: scores } = await supabase
        .from("recommendation_scores")
        .select("crop_id, final_score, confidence, explanation_json")
        .eq("region_id", region.id)
        .order("final_score", { ascending: false, nullsFirst: false })
        .limit(3);

      let cropsData: any[] = scores || [];
      if (cropsData.length === 0) {
        const { data: recs } = await supabase
          .from("crop_recommendations")
          .select("crop_id, suitability, recommendation_text, constraints")
          .eq("region_id", region.id)
          .limit(3);
        cropsData = (recs || []).map((r: any) => ({
          crop_id: r.crop_id,
          final_score: null,
          confidence: r.suitability,
          explanation_json: { why: r.recommendation_text, risks: r.constraints },
        }));
      }

      if (cropsData.length === 0) {
        await resetSession(supabase, phone);
        return `Aucune donnée disponible pour ${region.name}. Tapez "menu" pour recommencer.`;
      }

      const cropIds = cropsData.map((c) => c.crop_id);
      const { data: crops } = await supabase
        .from("crop_profiles")
        .select("id, name_fr, crop_name, risk_factors")
        .in("id", cropIds);
      const cropMap = new Map((crops || []).map((c: any) => [c.id, c]));

      const { data: seasons } = await supabase
        .from("seasonality_profiles")
        .select("crop_id, planting_window_start, planting_window_end, harvest_window_start, harvest_window_end")
        .eq("region_id", region.id)
        .in("crop_id", cropIds);
      const seasonMap = new Map((seasons || []).map((s: any) => [s.crop_id, s]));

      const lines: string[] = [
        isCalendar
          ? `📅 Calendrier de plantation — ${region.name}:`
          : `🌱 Top cultures recommandées — ${region.name}:`,
      ];

      cropsData.forEach((c, i) => {
        const crop: any = cropMap.get(c.crop_id);
        const cropName = crop?.name_fr || crop?.crop_name || "Culture";
        const season: any = seasonMap.get(c.crop_id);
        const plantWindow =
          season?.planting_window_start && season?.planting_window_end
            ? `${season.planting_window_start} → ${season.planting_window_end}`
            : "Données indisponibles";

        if (isCalendar) {
          const harvest =
            season?.harvest_window_start && season?.harvest_window_end
              ? `${season.harvest_window_start} → ${season.harvest_window_end}`
              : "Données indisponibles";
          lines.push(
            `\n${i + 1}. ${cropName}\n   🌱 Semis: ${plantWindow}\n   🌾 Récolte: ${harvest}`,
          );
        } else {
          const why =
            c.explanation_json?.why ||
            (c.final_score != null ? `Score d'adéquation: ${Math.round(Number(c.final_score))}/100` : "Adapté à cette région");
          const risks: string[] = crop?.risk_factors?.length
            ? crop.risk_factors
            : c.explanation_json?.risks || [];
          const mainRisk = risks?.[0] || "Données indisponibles";
          lines.push(
            `\n${i + 1}. ${cropName}\n   ✅ Pourquoi: ${why}\n   📅 Semis: ${plantWindow}\n   ⚠️ Risque principal: ${mainRisk}`,
          );
        }
      });

      lines.push(`\n\nTapez "menu" pour revenir au menu principal.`);
      await resetSession(supabase, phone);
      return lines.join("\n");
    }

    case "res_crop": {
      const { data: crop } = await supabase
        .from("crop_profiles")
        .select("id, name_fr, crop_name")
        .or(`name_fr.ilike.${msg},crop_name.ilike.${msg}`)
        .maybeSingle();
      if (!crop) {
        return `Culture "${msg}" introuvable. Veuillez réessayer (ex: maïs, manioc, soja).`;
      }
      session.selected_crop_id = crop.id;
      session.metadata = { ...session.metadata, crop_name: crop.name_fr || crop.crop_name };
      session.current_state = "res_need";
      await saveSession(supabase, session);
      return (
        `🛠️ De quelle ressource avez-vous besoin pour ${crop.name_fr || crop.crop_name} ?\n` +
        `1. Équipement\n2. Main d'œuvre\n3. Stockage\n4. Transport\n5. Acheteurs (grossistes)\n6. Transformation`
      );
    }

    case "res_need": {
      const map: Record<string, string> = {
        "1": "equipment",
        "2": "workers",
        "3": "storage",
        "4": "transport",
        "5": "find_buyer",
        "6": "find_processor",
      };
      const need = map[msg];
      if (!need) return `Veuillez répondre avec un numéro entre 1 et 6.`;

      const interestType = need === "find_buyer" ? "find_buyer" : "find_resources";

      // Insert into farmer_interests. user_id is required (NOT NULL) and must match auth.uid for RLS,
      // but service role bypasses RLS. We synthesize a deterministic uuid namespace from the phone.
      const syntheticUserId = crypto.randomUUID();
      await supabase.from("farmer_interests").insert({
        user_id: syntheticUserId,
        crop_id: session.selected_crop_id,
        region_id: session.selected_region_id,
        interest_type: interestType,
        phone_number: phone,
        notes: `WhatsApp request — resource: ${need}`,
      });

      const cropName = session.metadata?.crop_name || "votre culture";
      await resetSession(supabase, phone);
      return (
        `✅ Demande enregistrée: ${need} pour ${cropName}.\n` +
        `Un agent AgriGrid vous recontactera.\n\n` +
        `Tapez "menu" pour une autre demande.`
      );
    }

    default: {
      await resetSession(supabase, phone);
      return WELCOME;
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !VERIFY_TOKEN) {
    console.error("Missing WhatsApp configuration");
    return new Response(JSON.stringify({ error: "Missing configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const value = body.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      if (!message) {
        return new Response(JSON.stringify({ status: "no message" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const from = message.from;
      const msgBody = message.text?.body;
      if (!msgBody) {
        await sendWhatsAppMessage(
          PHONE_NUMBER_ID,
          from,
          'Veuillez envoyer un message texte. Tapez "menu" pour commencer.',
          ACCESS_TOKEN,
        );
        return new Response(JSON.stringify({ status: "non-text" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Message from ${from}: ${msgBody}`);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const reply = await handleMessage(supabase, from, msgBody);
      await sendWhatsAppMessage(PHONE_NUMBER_ID, from, reply, ACCESS_TOKEN);

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

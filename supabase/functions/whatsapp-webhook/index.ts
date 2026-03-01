import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHATSAPP_API = "https://graph.facebook.com/v21.0";

async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string, token: string) {
  const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp send error:", res.status, err);
  }
  return res;
}

async function getAIResponse(userMessage: string, conversationHistory: Array<{ role: string; content: string }>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch live data for context
  const { data: listings } = await supabase
    .from("listings")
    .select("title, type, price, price_unit, location, description")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: cropPrices } = await supabase
    .from("crop_prices")
    .select("crop_name, market_name, price, currency, unit, country")
    .order("recorded_at", { ascending: false })
    .limit(15);

  const listingsContext = listings?.length
    ? listings.map((l) => `- ${l.title} (${l.type}) at ${l.location}: ${l.price} ${l.price_unit}`).join("\n")
    : "No active listings currently.";

  const pricesContext = cropPrices?.length
    ? cropPrices.map((p) => `- ${p.crop_name} in ${p.market_name} (${p.country}): ${p.price} ${p.currency}/${p.unit}`).join("\n")
    : "No price data available.";

  const systemPrompt = `You are Agri Grid's AI assistant on WhatsApp. Agri Grid is the digital infrastructure powering Africa's agricultural economy — connecting producers, logistics, storage, equipment, and buyers.

You help users with:
1. Finding and browsing marketplace listings (produce, equipment, storage, transport, workforce)
2. Checking current crop/market prices
3. Understanding how the platform works
4. Getting started with the platform (sign up at the website)

CURRENT MARKETPLACE LISTINGS:
${listingsContext}

CURRENT MARKET PRICES:
${pricesContext}

GUIDELINES:
- Be friendly, concise, and helpful. Use emojis sparingly 🌱
- If someone asks about a listing, provide details from the data above
- If someone wants to post a listing or sign up, direct them to the Agri Grid website
- If you don't have info, say so honestly and suggest they check the platform
- Keep responses under 300 words (WhatsApp messages should be concise)
- Respond in the same language the user writes in (English, French, etc.)
- For price queries, share the latest data you have`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    if (response.status === 429) return "I'm receiving too many requests right now. Please try again in a moment. 🙏";
    if (response.status === 402) return "The AI service is temporarily unavailable. Please try again later.";
    return "Sorry, I'm having trouble processing your request. Please try again.";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";
}

// Simple in-memory conversation store (resets on cold start)
const conversations = new Map<string, Array<{ role: string; content: string }>>();

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    // GET = Webhook verification from Meta
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook verified successfully");
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    // POST = Incoming message
    if (req.method === "POST") {
      const body = await req.json();

      // Meta sends status updates too — ignore those
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.[0]) {
        return new Response(JSON.stringify({ status: "no message" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = value.messages[0];
      const from = message.from; // sender phone number
      const msgBody = message.text?.body;

      if (!msgBody) {
        await sendWhatsAppMessage(PHONE_NUMBER_ID, from, "I can only process text messages for now. Please send me a text message! 📝", ACCESS_TOKEN);
        return new Response(JSON.stringify({ status: "non-text message" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Message from ${from}: ${msgBody}`);

      // Get or create conversation history
      const history = conversations.get(from) || [];

      // Get AI response
      const aiResponse = await getAIResponse(msgBody, history);

      // Update conversation history
      history.push({ role: "user", content: msgBody });
      history.push({ role: "assistant", content: aiResponse });

      // Keep only last 20 messages
      if (history.length > 20) history.splice(0, history.length - 20);
      conversations.set(from, history);

      // Send reply via WhatsApp
      await sendWhatsAppMessage(PHONE_NUMBER_ID, from, aiResponse, ACCESS_TOKEN);

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200, // Return 200 to prevent Meta from retrying
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

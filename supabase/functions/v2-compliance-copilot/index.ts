// AGRI-GRID V2 — Phase 3C.1: Compliance Copilot analysis endpoint.
//
// SECURITY / ARCHITECTURE
// * All AI work is server-side. LOVABLE_API_KEY never reaches the browser.
// * The caller's JWT is used for every database RPC, so RLS + the membership
//   checks inside v2_ai_create_analysis decide access. Cross-organization
//   evidence is refused by the database BEFORE any byte is sent to the AI.
// * The private `compliance-evidence` bucket stays private: the file is read
//   server-side with the service role and inlined as base64. No public URL,
//   no long-lived signed URL is ever produced for the AI provider.
// * Data minimization: only the selected evidence file plus the requirement /
//   program context returned by the RPC is sent. No financial, supplier,
//   customer or unrelated compliance data.
// * The AI never writes a compliance answer: it can only produce advisory
//   observations that a human must review.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { promptFor, RESULT_SCHEMA, scrubVerdicts, type AnalysisType } from "./prompts.ts";

const BUCKET = "compliance-evidence";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ANALYSIS_TYPES: AnalysisType[] = ["document_requirement", "product_label", "facility_photo"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isUuid = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Never trust the file extension: sniff the magic bytes. */
function sniffMime(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
    return "image/webp";
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const started = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!aiKey) return json({ error: "AI_NOT_CONFIGURED" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "UNAUTHENTICATED" }, 401);

  // Runs as the caller: RLS and the RPC membership checks apply.
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "UNAUTHENTICATED" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const analysisType = body.analysis_type as AnalysisType;
  if (!ANALYSIS_TYPES.includes(analysisType)) return json({ error: "INVALID_ANALYSIS_TYPE" }, 400);
  if (!isUuid(body.organization_id)) return json({ error: "INVALID_ORGANIZATION_ID" }, 400);
  if (!isUuid(body.evidence_id)) return json({ error: "INVALID_EVIDENCE_ID" }, 400);
  for (const k of ["requirement_id", "org_program_id", "document_version_id"]) {
    const v = body[k];
    if (v !== undefined && v !== null && !isUuid(v)) return json({ error: `INVALID_${k.toUpperCase()}` }, 400);
  }
  const language: "fr" | "en" = body.language === "en" ? "en" : "fr";
  const userContext = typeof body.user_context === "string" ? body.user_context.slice(0, 1500) : null;

  // 1. Authorization, consent, ownership, program scope and throttling — in the DB.
  const { data: ctx, error: ctxErr } = await asUser.rpc("v2_ai_create_analysis", {
    _organization_id: body.organization_id,
    _evidence_id: body.evidence_id,
    _analysis_type: analysisType,
    _requirement_id: body.requirement_id ?? null,
    _org_program_id: body.org_program_id ?? null,
    _document_version_id: body.document_version_id ?? null,
    _user_context: userContext,
  });
  if (ctxErr || !ctx) {
    const msg = ctxErr?.message ?? "ANALYSIS_NOT_CREATED";
    const code = /NOT_AUTHORIZED|EVIDENCE_NOT_FOUND|CONSENT_REQUIRED|RATE_LIMITED|ANALYSIS_DISABLED|REQUIREMENT|PROGRAM|DOCUMENT_VERSION|EVIDENCE_HAS_NO_FILE/
      .exec(msg)?.[0];
    const status = code === "RATE_LIMITED" ? 429 : code === "CONSENT_REQUIRED" ? 428 : code ? 403 : 400;
    console.error("create_analysis refused:", msg);
    return json({ error: code ?? "ANALYSIS_NOT_CREATED", message: msg }, status);
  }

  const analysisId = (ctx as Record<string, unknown>).analysis_id as string;
  const cfg = (ctx as Record<string, unknown>).config as {
    model: string;
    prompt_version: string;
    max_file_bytes: number;
    supported_mime_types: string[];
  };
  const storagePath = (ctx as Record<string, unknown>).storage_path as string;

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const fail = async (code: string, message: string, status = 422) => {
    await asUser.rpc("v2_ai_fail_analysis", { _analysis_id: analysisId, _code: code, _message: message });
    await admin.from("v2_ai_usage_events").insert({
      organization_id: body.organization_id,
      analysis_id: analysisId,
      analysis_type: analysisType,
      provider: "lovable_ai_gateway",
      model: cfg.model,
      status: "failed",
      latency_ms: Date.now() - started,
    });
    console.error(`analysis ${analysisId} failed: ${code} ${message}`);
    return json({ error: code, message, analysis_id: analysisId }, status);
  };

  try {
    // 2. Read the private evidence file server-side. The bucket stays private.
    const dl = await admin.storage.from(BUCKET).download(storagePath);
    if (dl.error || !dl.data) return await fail("EVIDENCE_UNREADABLE", dl.error?.message ?? "download failed");
    const bytes = new Uint8Array(await dl.data.arrayBuffer());

    if (bytes.length === 0) return await fail("EVIDENCE_EMPTY", "the file is empty");
    if (bytes.length > cfg.max_file_bytes)
      return await fail("FILE_TOO_LARGE", `file is ${bytes.length} bytes, limit is ${cfg.max_file_bytes}`, 413);

    const mime = sniffMime(bytes);
    if (!mime) return await fail("UNSUPPORTED_FILE_TYPE", "file content is not a recognised PDF or image");
    if (!cfg.supported_mime_types.includes(mime))
      return await fail("UNSUPPORTED_FILE_TYPE", `${mime} is not supported for ${analysisType}`);

    await asUser.rpc("v2_ai_mark_processing", {
      _analysis_id: analysisId,
      _mime_type: mime,
      _file_bytes: bytes.length,
    });

    // 3. Build the versioned prompt from the requirement context only.
    const c = ctx as Record<string, unknown>;
    const { system, user, version } = promptFor(analysisType, {
      language,
      requirement: c.requirement as never,
      program: c.program as never,
      userContext,
    });
    // Reproducibility: record the exact prompt template + output contract used.
    await admin
      .from("v2_ai_compliance_analyses")
      .update({ prompt_version: version, analysis_schema_version: "AI_OBS_SCHEMA_V2" })
      .eq("id", analysisId);


    const dataUrl = `data:${mime};base64,${toBase64(bytes)}`;
    const filePart =
      mime === "application/pdf"
        ? { type: "file", file: { filename: "evidence.pdf", file_data: dataUrl } }
        : { type: "image_url", image_url: { url: dataUrl } };

    const aiRes = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": aiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: [{ type: "text", text: user }, filePart] },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "compliance_copilot_result", strict: true, schema: RESULT_SCHEMA },
        },
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error(`AI gateway ${aiRes.status}: ${errBody.slice(0, 500)}`);
      const code =
        aiRes.status === 429 ? "AI_RATE_LIMITED" : aiRes.status === 402 ? "AI_CREDITS_EXHAUSTED" : "AI_REQUEST_FAILED";
      return await fail(code, errBody.slice(0, 500), aiRes.status === 429 ? 429 : aiRes.status === 402 ? 402 : 502);
    }

    const payload = await aiRes.json();
    const raw = payload?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || raw.trim() === "") return await fail("AI_EMPTY_RESPONSE", "no content returned");

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(raw);
    } catch {
      return await fail("AI_INVALID_JSON", raw.slice(0, 500));
    }

    // 4. Post-generation guard: soften any verdict wording that slipped through.
    result.summary = scrubVerdicts(result.summary as string, language) ?? "";
    for (const key of ["observations", "potential_gaps", "missing_information", "suggested_actions"]) {
      const arr = result[key];
      if (Array.isArray(arr)) {
        result[key] = arr.map((item) =>
          item && typeof item === "object"
            ? {
                ...item,
                title: scrubVerdicts((item as Record<string, string>).title, language),
                description: scrubVerdicts((item as Record<string, string>).description, language),
              }
            : item,
        );
      }
    }

    const usage = payload?.usage ?? null;
    // 5. Deterministic schema validation happens inside v2_ai_store_result.
    const { data: stored, error: storeErr } = await asUser.rpc("v2_ai_store_result", {
      _analysis_id: analysisId,
      _result: result,
      _usage: usage,
      _model: payload?.model ?? cfg.model,
    });
    if (storeErr) return await fail("RESULT_REJECTED", storeErr.message);

    await admin.from("v2_ai_usage_events").insert({
      organization_id: body.organization_id,
      analysis_id: analysisId,
      analysis_type: analysisType,
      provider: "lovable_ai_gateway",
      model: payload?.model ?? cfg.model,
      status: "completed",
      input_tokens: usage?.prompt_tokens ?? null,
      output_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      latency_ms: Date.now() - started,
    });

    return json({
      analysis_id: analysisId,
      items: (stored as Record<string, unknown> | null)?.items ?? 0,
      prompt_version: cfg.prompt_version,
      model: payload?.model ?? cfg.model,
      mime_type: mime,
      result,
    });
  } catch (e) {
    // Evidence is never lost because an analysis failed: it stays untouched
    // and the failed analysis can be retried.
    return await fail("UNEXPECTED_ERROR", e instanceof Error ? e.message : String(e), 500);
  }
});

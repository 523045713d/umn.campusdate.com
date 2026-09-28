import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchUmnEvents } from "@/lib/umn-events-feed";
import { fetchTicketmasterEvents } from "@/lib/ticketmaster-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object"
    && error !== null
    && "message" in error
    && typeof error.message === "string"
  ) {
    return error.message;
  }
  return "UMN events sync failed";
}

function authorize(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = authorize(request);
  if (unauthorized) return unauthorized;

  try {
    const ticketmasterKey = process.env.TICKETMASTER_API_KEY?.trim();
    const [umnResult, ticketmasterResult] = await Promise.allSettled([
      fetchUmnEvents(),
      ticketmasterKey ? fetchTicketmasterEvents(ticketmasterKey) : Promise.resolve([]),
    ]);
    const warnings: string[] = [];
    if (umnResult.status === "rejected") warnings.push(`UMN feed: ${errorMessage(umnResult.reason)}`);
    if (ticketmasterResult.status === "rejected") warnings.push(`Ticketmaster: ${errorMessage(ticketmasterResult.reason)}`);
    if (warnings.length) console.error("Event import warning:", warnings);
    if (umnResult.status === "rejected" && (ticketmasterResult.status === "rejected" || !ticketmasterKey)) {
      throw new Error(warnings.join("; "));
    }
    const umnEvents = umnResult.status === "fulfilled" ? umnResult.value : [];
    const ticketmasterEvents = ticketmasterResult.status === "fulfilled" ? ticketmasterResult.value : [];
    // Never re-import rows that have already passed the 30-day retention window.
    const retentionCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const events = [...umnEvents, ...ticketmasterEvents].filter((event) => Date.parse(event.expires_at) >= retentionCutoff);
    const supabase = createSupabaseAdmin();

    for (let offset = 0; offset < events.length; offset += 100) {
      const { error } = await supabase
        .from("external_events")
        .upsert(events.slice(offset, offset + 100), {
          onConflict: "source,external_id",
        });
      if (error) throw error;
    }

    const now = new Date().toISOString();
    const { count: expired, error: expireError } = await supabase
      .from("external_events")
      .update({ status: "expired", updated_at: now }, { count: "exact" })
      .in("source", ["umn_calendar", "ticketmaster"])
      .in("status", ["active", "canceled"])
      .lt("expires_at", now);
    if (expireError) throw expireError;

    const { data: deleted, error: cleanupError } = await supabase
      .rpc("cleanup_expired_external_events");
    if (cleanupError) throw cleanupError;

    return NextResponse.json({
      fetched: { umn: umnEvents.length, ticketmaster: ticketmasterEvents.length },
      upserted: events.length,
      expired: expired ?? 0,
      deleted: typeof deleted === "number" ? deleted : 0,
      retentionDays: 30,
      ticketmaster: ticketmasterKey ? "configured" : "not_configured",
      warnings,
      syncedAt: now,
    });
  } catch (error) {
    console.error("UMN events sync failed:", error);
    return NextResponse.json(
      { error: errorMessage(error) },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchUmnEvents } from "@/lib/umn-events-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const events = await fetchUmnEvents();
    if (events.length === 0) {
      throw new Error("UMN Events feed returned no importable events");
    }
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
      .eq("source", "umn_calendar")
      .eq("status", "active")
      .lt("expires_at", now);
    if (expireError) throw expireError;

    return NextResponse.json({
      fetched: events.length,
      upserted: events.length,
      expired: expired ?? 0,
      syncedAt: now,
    });
  } catch (error) {
    console.error("UMN events sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "UMN events sync failed" },
      { status: 500 },
    );
  }
}

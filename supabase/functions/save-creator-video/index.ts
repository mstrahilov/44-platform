// Creates a library video and attaches its real YouTube upload date, used
// to sort Home's cross-creator Videos tab. The YouTube Data API v3 key is a
// server-only secret (YOUTUBE_API_KEY), so this lookup can't happen on the
// client or inside a plain Postgres RPC (no keyless endpoint returns
// snippet.publishedAt — the oEmbed endpoint the app already uses for
// thumbnails only returns title/author/thumbnail).
//
// Flow: verify the caller's JWT, extract the YouTube video id the same way
// `youtube_video_id_from_url` does, look up its publishedAt (best-effort —
// a lookup failure still creates the video, just without a date), then call
// `save_creator_video` as the caller (RLS-scoped) followed by
// `set_creator_video_published_at` as the service role.

import { createClient } from "jsr:@supabase/supabase-js@2";

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function parseYouTubeVideoID(rawURL: string): string | null {
  let url: URL;
  try {
    url = new URL(rawURL);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
    if (url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/")[2];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/")[2];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
  }
  return null;
}

async function fetchPublishedAt(videoID: string): Promise<string | null> {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return null;
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoID)}&key=${apiKey}`,
    );
    if (!response.ok) return null;
    const body = await response.json();
    const publishedAt = body?.items?.[0]?.snippet?.publishedAt;
    return typeof publishedAt === "string" ? publishedAt : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Sign in required." }), { status: 401 });
  }

  let title = "";
  let url = "";
  try {
    const body = await req.json();
    title = typeof body.title === "string" ? body.title : "";
    url = typeof body.url === "string" ? body.url : "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
  }

  const supabaseURL = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Runs the insert as the caller so ownership/RLS is enforced exactly like
  // any other client-driven RPC call.
  const callerClient = createClient(supabaseURL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const videoID = parseYouTubeVideoID(url);
  const publishedAt = videoID ? await fetchPublishedAt(videoID) : null;

  const { data, error } = await callerClient
    .rpc("save_creator_video", { p_title: title, p_url: url, p_published_at: publishedAt })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  // A lookup failure (missing/invalid key, video not found, network error)
  // still leaves the video created above with no date; ordering just falls
  // back to created_at for it.
  if (publishedAt && data?.id) {
    const serviceClient = createClient(supabaseURL, serviceRoleKey);
    await serviceClient.rpc("set_creator_video_published_at", {
      target_video_id: data.id,
      published_at: publishedAt,
    });
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

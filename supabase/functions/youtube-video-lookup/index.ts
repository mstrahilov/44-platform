// Looks up a YouTube video's real upload date as the creator pastes a URL
// into the Studio video editor, so "Release Date" can auto-fill live rather
// than only after Save. The YouTube Data API v3 key is a server-only secret
// (YOUTUBE_API_KEY) — there is no keyless endpoint that returns
// snippet.publishedAt (the oEmbed endpoint the app already uses for
// thumbnails only returns title/author/thumbnail), so this can't happen on
// the client or inside a plain Postgres RPC.
//
// This function is a pure lookup — it never touches the database. The
// actual create/update of a creator_videos row happens through the
// save_creator_video / update_creator_video RPCs directly, passing along
// the published_at this returns.

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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  // Any signed-in member may look up a video's date — this is a read-only
  // metadata fetch, not scoped to a particular creator or release.
  if (!req.headers.get("Authorization")) {
    return new Response(JSON.stringify({ error: "Sign in required." }), { status: 401 });
  }

  let url = "";
  try {
    const body = await req.json();
    url = typeof body.url === "string" ? body.url : "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
  }

  const videoID = parseYouTubeVideoID(url);
  if (!videoID) {
    return new Response(JSON.stringify({ published_at: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ published_at: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoID)}&key=${apiKey}`,
    );
    const body = response.ok ? await response.json() : null;
    const publishedAt = body?.items?.[0]?.snippet?.publishedAt ?? null;
    return new Response(JSON.stringify({ published_at: publishedAt }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ published_at: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      const accessToken = data.session.access_token;
      const refreshToken = data.session.refresh_token;

      // Render a fast inline transfer script to write token into localStorage and redirect to dashboard
      const targetUrl = `${origin}${next.startsWith("/") ? next : "/" + next}`;
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating...</title>
  <script>
    try {
      if ("${accessToken}") {
        localStorage.setItem("mynd_token", "${accessToken}");
        const sbKey = "sb-" + new URL("${supabaseUrl}").hostname.split(".")[0] + "-auth-token";
        localStorage.setItem(sbKey, JSON.stringify(${JSON.stringify(data.session)}));
      }
    } catch (e) {
      console.error(e);
    }
    window.location.replace("${targetUrl}");
  </script>
</head>
<body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
  <p style="opacity:0.7;">Authenticating your session, redirecting...</p>
</body>
</html>`;

      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  // Fallback redirect
  return NextResponse.redirect(`${origin}${next}`);
}

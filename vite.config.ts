import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function devApiPlugin() {
  return {
    name: "dev-api-handlers",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith("/api/send-email") && req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => { body += chunk; });
          req.on("end", async () => {
            try {
              const data = JSON.parse(body || "{}");
              console.log("[Dev Server API] /api/send-email triggered:", data.type, "recipients:", data.emails || data.email);
              
              if (process.env.RESEND_API_KEY) {
                try {
                  const { Resend } = await import("resend");
                  const resend = new Resend(process.env.RESEND_API_KEY);
                  const recipients = Array.isArray(data.emails) && data.emails.length > 0 
                    ? data.emails 
                    : Array.isArray(data.email) ? data.email : [data.email];
                  
                  for (const r of recipients) {
                    await resend.emails.send({
                      from: "EventSpark <eventspark@ajstudioz.co.in>",
                      to: r,
                      subject: data.subject || "EventSpark Update",
                      html: `<p>${(data.message || "Event update").replace(/\n/g, "<br/>")}</p>`,
                    });
                  }
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, sentCount: recipients.length }));
                  return;
                } catch (resendErr: any) {
                  console.warn("[Dev Server API] Resend attempt error, falling back to simulated success:", resendErr.message);
                }
              }

              const count = Array.isArray(data.emails) ? data.emails.length : 1;
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, sentCount: count, devMode: true }));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envDir: './',
  envPrefix: 'VITE_',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), devApiPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
}));

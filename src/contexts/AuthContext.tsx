import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setLoading(false);

        // Send an email alert only when a fresh SIGNED_IN event occurs
        if (_event === "SIGNED_IN" && session?.user?.email) {
          try {
            // Anti-spam guard: prevent infinite loops from token refreshes
            const sentKey = `auth_email_sent_${session.user.id}`;
            const lastSent = sessionStorage.getItem(sentKey);
            const now = Date.now();
            
            // Only send if we haven't sent in the last 5 minutes for this session
            if (!lastSent || now - parseInt(lastSent) > 300000) {
              sessionStorage.setItem(sentKey, now.toString());

              const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "there";
              
              // Determine if this is a brand new user (created within the last 2 minutes)
              const createdAt = new Date(session.user.created_at).getTime();
              const isNewUser = Date.now() - createdAt < 120000;

              const emailType = isNewUser ? "signup" : "login";
              
              // ONLY SEND EMAILS IN PRODUCTION
              if (!import.meta.env.DEV) {
                await fetch("/api/send-email", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    type: emailType, 
                    email: session.user.email,
                    name: name,
                    loginTime: new Date().toLocaleString(),
                    browser: navigator.userAgent
                  })
                });
              } else {
                console.log("[DEV MODE] Skipped sending auth email to:", session.user.email);
              }
            }
          } catch (e) {
            console.error("Failed to send auth alert:", e);
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

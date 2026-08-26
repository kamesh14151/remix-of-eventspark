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
            // Check if we already sent this in the current session state
            // to avoid duplicate emails if the event fires twice.
            const sentKey = `auth_email_sent_${session.user.id}`;
            if (!sessionStorage.getItem(sentKey)) {
              sessionStorage.setItem(sentKey, "true");
              
              const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "there";
              
              // Determine if this is a brand new user (created within the last 2 minutes)
              const createdAt = new Date(session.user.created_at).getTime();
              const isNewUser = Date.now() - createdAt < 120000;
              
              const emailType = isNewUser ? "signup" : "login";
              
              const apiUrl = import.meta.env.DEV 
                ? "https://remix-of-eventspark-five.vercel.app/api/send-email" 
                : "/api/send-email";

              await fetch(apiUrl, {
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

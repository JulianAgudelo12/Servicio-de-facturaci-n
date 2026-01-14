import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no hay variables de entorno, redirigir a login
  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/login");
  }

  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No hacer nada en este contexto
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Si el usuario está autenticado, redirigir a /app
    // Si no está autenticado, redirigir a /login
    if (user) {
      redirect("/app");
    } else {
      redirect("/login");
    }
  } catch (error) {
    // Si hay un error, redirigir a login
    redirect("/login");
  }
}

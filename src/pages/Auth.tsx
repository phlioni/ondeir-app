import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, ArrowLeft } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const fromState = location.state?.from?.pathname;

  useEffect(() => {
    if (fromState) {
      localStorage.setItem('auth_return_path', fromState);
    }
  }, [fromState]);

  // Função isolada de verificação para ser reutilizada
  const verifyAndRedirect = async (session: any) => {
    if (!session?.user?.id) return;

    try {
      // Tenta buscar o perfil
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle(); // IMPORTANTE: maybeSingle evita o erro PGRST116

      // Se der erro de conexão ou outro erro grave (não o de 'não encontrado')
      if (error && error.code !== 'PGRST116') {
        console.error("Erro ao verificar perfil:", error);
        return; // Mantém o usuário na tela de auth por segurança
      }

      // Se não tiver perfil (profile === null), assumimos 'user' para não bloquear
      const userRole = profile?.role || "user";

      if (userRole === "partner" || userRole === "admin") {
        await supabase.auth.signOut();
        toast({
          title: "Acesso Restrito",
          description: "Login administrativo deve ser feito pelo painel de gestão.",
          variant: "destructive"
        });
        setLoading(false);
      } else {
        // Redirecionamento de sucesso
        const storedPath = localStorage.getItem('auth_return_path');
        const returnPath = storedPath || fromState || "/";
        localStorage.removeItem('auth_return_path');

        // Pequeno delay para garantir que o estado do AuthProvider atualizou
        setTimeout(() => {
          navigate(returnPath === "/auth" ? "/" : returnPath, { replace: true });
        }, 100);
      }
    } catch (err) {
      // Se algo explodir, desloga o usuário para limpar o estado zumbi
      console.error("Erro crítico no fluxo de auth:", err);
      await supabase.auth.signOut();
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        verifyAndRedirect(session);
      }
    });

    // 2. Ouvir mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await verifyAndRedirect(session);
      }
      if (event === "SIGNED_OUT") {
        setLoading(false);
        setEmail("");
        setPassword("");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // O redirecionamento acontece no onAuthStateChange
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: email.split("@")[0] },
          },
        });

        if (error) throw error;

        if (!data.session) {
          setLoading(false);
          toast({
            title: "Verifique seu e-mail",
            description: "Enviamos um link de confirmação.",
          });
        }
        // Se tiver sessão (login automático), o onAuthStateChange cuida do resto
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro no Login Google",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-start w-full mb-2">
            <Button variant="ghost" size="sm" className="-ml-4 h-8 text-gray-500" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Flippi</CardTitle>
          <CardDescription>
            {isLogin ? "Entre para descobrir lugares incríveis" : "Crie sua conta gratuitamente"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <Button
            variant="outline"
            className="w-full h-12 gap-2 border-gray-300 font-medium text-gray-700 hover:bg-gray-50 bg-white"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Entrar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Ou use seu email</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Seu email"
                  className="pl-10 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Sua senha"
                  className="pl-10 h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading}>
              {loading && email ? <Loader2 className="animate-spin" /> : (isLogin ? "Entrar" : "Cadastrar")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary"
            >
              {isLogin ? "Não tem conta? Crie agora" : "Já tem conta? Faça login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
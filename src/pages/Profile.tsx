import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Camera, User, Mail, LogOut } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    id: "",
    display_name: "",
    email: "",
    avatar_url: "",
    role: "user"
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    // 1. Verifica se tem sessão ativa
    const { data: { session } } = await supabase.auth.getSession();

    // Se não tiver sessão (Visitante), manda pro Login
    if (!session) {
      navigate("/auth");
      return;
    }

    // 2. Busca dados do perfil
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setProfile({
        id: session.user.id,
        email: session.user.email || "",
        display_name: data.display_name || "",
        avatar_url: data.avatar_url || "",
        role: data.role
      });
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        })
        .eq("id", profile.id);

      if (error) throw error;
      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-10 border-b shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Meu Perfil</h1>
      </div>

      <main className="p-4 max-w-md mx-auto space-y-6 mt-4">
        {/* Foto e Role */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl bg-gray-200">{profile.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            {/* Num futuro upgrade, podemos colocar um input file aqui para upload real */}
            <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-sm cursor-pointer hover:bg-primary/90">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="font-bold text-xl">{profile.display_name || "Usuário"}</h2>
            <span className="text-xs font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
              {profile.role === 'partner' ? 'Parceiro' : 'Membro'}
            </span>
          </div>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-700">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-500">
                <User className="w-4 h-4" /> Nome de Exibição
              </label>
              <Input
                value={profile.display_name}
                onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                className="bg-gray-50/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-500">
                <Mail className="w-4 h-4" /> Email
              </label>
              <Input value={profile.email} disabled className="bg-gray-100 text-gray-500" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-500">
                <Camera className="w-4 h-4" /> URL da Foto
              </label>
              <Input
                placeholder="https://..."
                value={profile.avatar_url}
                onChange={e => setProfile({ ...profile, avatar_url: e.target.value })}
                className="bg-gray-50/50"
              />
            </div>

            <Button className="w-full mt-4 h-12" onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* Botão de Logout */}
        <Button
          variant="ghost"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 h-12"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
        </Button>
      </main>
    </div>
  );
}
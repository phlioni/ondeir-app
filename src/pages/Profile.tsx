import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Camera, User, Mail } from "lucide-react";

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
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile({
        id: user.id,
        email: user.email || "",
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

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-10 border-b">
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
              <AvatarFallback className="text-2xl">{profile.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-sm cursor-pointer hover:bg-primary/90">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="font-bold text-xl">{profile.display_name || "Sem Nome"}</h2>
            <span className="text-xs font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
              {profile.role === 'partner' ? 'Parceiro Verificado' : 'Usuário'}
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Nome de Exibição
              </label>
              <Input
                value={profile.display_name}
                onChange={e => setProfile({ ...profile, display_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" /> Email
              </label>
              <Input value={profile.email} disabled className="bg-gray-100 text-gray-500" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Camera className="w-4 h-4 text-gray-400" /> URL da Foto
              </label>
              <Input
                placeholder="https://..."
                value={profile.avatar_url}
                onChange={e => setProfile({ ...profile, avatar_url: e.target.value })}
              />
            </div>

            <Button className="w-full mt-2" onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>

        {profile.role === 'partner' && (
          <Button
            variant="outline"
            className="w-full h-12 border-primary text-primary hover:bg-primary/5"
            onClick={() => navigate("/dashboard")}
          >
            Acessar Painel do Restaurante
          </Button>
        )}
      </main>
    </div>
  );
}
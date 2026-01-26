import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, MapPin, User, LogOut, LogIn, Heart, ShoppingBag } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function AppMenu() {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setLoading(false);
                setProfile(null);
                return;
            }

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .single();

            setProfile(data);
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        navigate("/"); // Continua na home, mas como visitante
        setOpen(false);
        window.location.reload(); // Recarrega para limpar estados
    };

    const navigateTo = (path: string) => {
        navigate(path);
        setOpen(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full shadow-md bg-white/90 backdrop-blur hover:bg-white h-10 w-10">
                    <Menu className="w-5 h-5 text-gray-700" />
                </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[300px] sm:w-[350px] flex flex-col h-full">
                <SheetHeader className="text-left mb-6">
                    {loading ? (
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="h-12 w-12 rounded-full bg-gray-200" />
                            <div className="h-4 w-32 bg-gray-200 rounded" />
                        </div>
                    ) : profile ? (
                        // --- USUÁRIO LOGADO ---
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-primary/10">
                                <AvatarImage src={profile.avatar_url} />
                                <AvatarFallback>{profile.display_name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-lg font-bold">{profile.display_name}</SheetTitle>
                                <p className="text-xs text-gray-500">Membro da Comunidade</p>
                            </div>
                        </div>
                    ) : (
                        // --- VISITANTE (Sem Login) ---
                        <div className="flex flex-col gap-2">
                            <SheetTitle className="text-xl font-bold text-primary">Bem-vindo!</SheetTitle>
                            <p className="text-sm text-gray-500">Você está navegando como visitante.</p>
                            <Button
                                className="w-full mt-2 gap-2 shadow-sm"
                                onClick={() => navigateTo("/auth")}
                            >
                                <LogIn className="w-4 h-4" /> Entrar ou Cadastrar
                            </Button>
                        </div>
                    )}
                </SheetHeader>

                <div className="flex flex-col gap-2 flex-1">
                    {/* Itens Públicos */}
                    <Button
                        variant={location.pathname === "/" ? "secondary" : "ghost"}
                        className="justify-start gap-3 h-12 text-base font-medium"
                        onClick={() => navigateTo("/")}
                    >
                        <MapPin className="w-5 h-5 text-gray-500" /> Explorar Mapa
                    </Button>

                    {/* Itens que requerem Login (Mas mostramos desabilitados ou com redirecionamento) */}
                    {profile ? (
                        <>
                            <Button
                                variant={location.pathname === "/favorites" ? "secondary" : "ghost"}
                                className="justify-start gap-3 h-12 text-base font-medium"
                                onClick={() => navigateTo("/favorites")} // Futuro
                            >
                                <Heart className="w-5 h-5 text-gray-500" /> Favoritos
                            </Button>

                            <Button
                                variant={location.pathname === "/profile" ? "secondary" : "ghost"}
                                className="justify-start gap-3 h-12 text-base font-medium"
                                onClick={() => navigateTo("/profile")}
                            >
                                <User className="w-5 h-5 text-gray-500" /> Meus Dados
                            </Button>
                        </>
                    ) : (
                        // Placeholder para incentivar cadastro
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-xs text-gray-500 text-center mb-3">
                                Crie uma conta para salvar favoritos e fazer pedidos no futuro.
                            </p>
                        </div>
                    )}
                </div>

                {/* Rodapé do Menu */}
                {profile && (
                    <div className="mt-auto pt-4 border-t">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-5 h-5" /> Sair da Conta
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
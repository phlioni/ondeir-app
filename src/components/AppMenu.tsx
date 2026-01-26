import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, User, Store, LogOut, MapPin, LogIn, Shield } from "lucide-react";
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
        navigate("/auth");
        setOpen(false);
    };

    const navigateTo = (path: string) => {
        navigate(path);
        setOpen(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full shadow-md bg-white/90 backdrop-blur hover:bg-white">
                    <Menu className="w-5 h-5 text-gray-700" />
                </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[300px] sm:w-[350px]">
                <SheetHeader className="text-left mb-6">
                    {loading ? (
                        // Skeleton de carregamento
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                                <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
                            </div>
                        </div>
                    ) : profile ? (
                        // Usuário Logado
                        <div className="flex items-center gap-3 mb-2">
                            <Avatar className="h-12 w-12 border-2 border-primary/10">
                                <AvatarImage src={profile.avatar_url} />
                                <AvatarFallback>{profile.display_name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-lg font-bold">{profile.display_name || "Usuário"}</SheetTitle>
                                <p className="text-xs text-gray-500 capitalize">{profile.role === 'partner' ? 'Parceiro' : (profile.role === 'admin' ? 'Administrador' : 'Explorador')}</p>
                            </div>
                        </div>
                    ) : (
                        // Visitante
                        <div className="flex flex-col gap-1">
                            <SheetTitle className="text-xl font-bold text-primary">Onde Ir?</SheetTitle>
                            <p className="text-sm text-muted-foreground">Descubra os melhores lugares.</p>
                        </div>
                    )}
                </SheetHeader>

                <div className="flex flex-col gap-2">
                    {/* Item visível para todos */}
                    <Button
                        variant={location.pathname === "/" ? "secondary" : "ghost"}
                        className="justify-start gap-3 h-12 text-base"
                        onClick={() => navigateTo("/")}
                    >
                        <MapPin className="w-5 h-5" /> Explorar Mapa
                    </Button>

                    {profile ? (
                        <>
                            {/* Itens apenas para logados */}
                            <Button
                                variant={location.pathname === "/profile" ? "secondary" : "ghost"}
                                className="justify-start gap-3 h-12 text-base"
                                onClick={() => navigateTo("/profile")}
                            >
                                <User className="w-5 h-5" /> Meu Perfil
                            </Button>

                            {/* Área de Parceiros e Admin */}
                            {(profile.role === 'partner' || profile.role === 'admin') && (
                                <>
                                    <Separator className="my-2" />
                                    <p className="text-xs font-bold text-gray-400 px-4 uppercase mt-2 mb-1">Área do Parceiro</p>

                                    <Button
                                        variant={location.pathname === "/dashboard" ? "secondary" : "ghost"}
                                        className="justify-start gap-3 h-12 text-base text-primary font-medium bg-primary/5 hover:bg-primary/10"
                                        onClick={() => navigateTo("/dashboard")}
                                    >
                                        <Store className="w-5 h-5" /> Gerenciar Restaurante
                                    </Button>

                                    {/* Item Exclusivo de ADMIN */}
                                    {profile.role === 'admin' && (
                                        <Button
                                            variant={location.pathname === "/access-control" ? "secondary" : "ghost"}
                                            className="justify-start gap-3 h-12 text-base text-red-600 font-medium bg-red-50 hover:bg-red-100 mt-2"
                                            onClick={() => navigateTo("/access-control")}
                                        >
                                            <Shield className="w-5 h-5" /> Gestão de Acesso
                                        </Button>
                                    )}
                                </>
                            )}

                            <Separator className="my-2" />

                            <Button
                                variant="ghost"
                                className="justify-start gap-3 h-12 text-base text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-5 h-5" /> Sair da Conta
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Botão de Login para Visitantes */}
                            <Separator className="my-2" />
                            <Button
                                className="justify-start gap-3 h-12 text-base w-full mt-2"
                                onClick={() => navigateTo("/auth")}
                            >
                                <LogIn className="w-5 h-5" /> Entrar ou Cadastrar
                            </Button>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
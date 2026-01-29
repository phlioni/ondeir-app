import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Star, Utensils, Share2, Info, Coins, Clock, User, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductDrawer } from "@/components/ProductDrawer";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const checkIsOpen = (hours: any) => {
    if (!hours) return true;
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const todaySchedule = hours[currentDay];
    if (!todaySchedule || todaySchedule.closed) return false;
    return currentTime >= todaySchedule.open && currentTime <= todaySchedule.close;
};

const DAYS_TRANSLATION: any = {
    'segunda': 'Segunda-feira', 'terca': 'Terça-feira', 'quarta': 'Quarta-feira',
    'quinta': 'Quinta-feira', 'sexta': 'Sexta-feira', 'sabado': 'Sábado', 'domingo': 'Domingo'
};

export default function VenueDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const [venue, setVenue] = useState<any>(null);
    const [menu, setMenu] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado dinâmico de abertura
    const [isOpen, setIsOpen] = useState(false);
    const [ticker, setTicker] = useState(0);

    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        if (id) fetchVenueData(id);
    }, [id]);

    // RELÓGIO DE VERIFICAÇÃO (1 min)
    useEffect(() => {
        const interval = setInterval(() => {
            setTicker(t => t + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Revalida status quando o relógio (ticker) muda
    useEffect(() => {
        if (venue) {
            setIsOpen(checkIsOpen(venue.opening_hours));
        }
    }, [ticker, venue]);

    useEffect(() => {
        if (menu.length > 0 && location.state?.openProductId) {
            const productToOpen = menu.find(item => item.id === location.state.openProductId);
            if (productToOpen) {
                if (!checkIsOpen(venue?.opening_hours)) {
                    toast({ title: "Restaurante Fechado", description: "Não é possível realizar pedidos agora.", variant: "destructive" });
                    return;
                }
                setTimeout(() => {
                    setSelectedProduct(productToOpen);
                    setIsDrawerOpen(true);
                    window.history.replaceState({}, document.title);
                }, 300);
            }
        }
    }, [menu, location.state, venue]);

    const fetchVenueData = async (venueId: string) => {
        try {
            // 1. Busca Restaurante
            const { data: venueData, error: venueError } = await supabase
                .from("markets")
                .select("*, coin_balance")
                .eq("id", venueId)
                .single();

            if (venueError) throw venueError;
            setVenue(venueData);
            setIsOpen(checkIsOpen(venueData.opening_hours));

            // 2. Busca Menu
            const { data: menuData, error: menuError } = await supabase
                .from("menu_items")
                .select("*")
                .eq("market_id", venueId)
                .order("category", { ascending: true });

            if (menuError) throw menuError;
            setMenu(menuData || []);

            // 3. Busca Avaliações (ATUALIZADO para incluir replies)
            const { data: reviewsData, error: reviewsError } = await supabase
                .from("reviews")
                .select(`
                    *,
                    profiles (display_name, avatar_url),
                    replies:review_replies (
                        id, content, created_at, user_id
                    )
                `)
                .eq("target_id", venueId)
                .eq("target_type", "restaurant")
                .order("created_at", { ascending: false });

            if (!reviewsError && reviewsData) {
                // Ordena as respostas por data (antigas primeiro)
                const reviewsWithSortedReplies = reviewsData.map((r: any) => ({
                    ...r,
                    replies: r.replies?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
                }));
                setReviews(reviewsWithSortedReplies);
            }

        } catch (error) {
            console.error("Erro:", error);
            toast({ title: "Erro", description: "Falha ao carregar detalhes.", variant: "destructive" });
            navigate("/");
        } finally {
            setLoading(false);
        }
    };

    const handleProductClick = (item: any) => {
        if (!isOpen) {
            toast({ title: "Fechado", description: "Este estabelecimento está fechado no momento.", variant: "destructive" });
            return;
        }
        setSelectedProduct(item);
        setIsDrawerOpen(true);
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link copiado!", description: "Envie para seus amigos." });
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><span className="animate-pulse text-primary font-bold">Carregando...</span></div>;
    if (!venue) return null;

    const showGamification = (venue.coin_balance || 0) > 0;

    // Calcula nota se tiver reviews locais, senão usa a do banco
    const displayRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : (venue.rating || 0).toFixed(1);

    return (
        <div className="min-h-screen bg-gray-50 pb-32 font-sans relative">
            <div className="relative h-56 md:h-72 w-full bg-gray-200">
                <div
                    className={`absolute inset-0 bg-cover bg-center ${!isOpen ? 'grayscale' : ''}`}
                    style={{ backgroundImage: `url(${venue.cover_image || '/placeholder.svg'})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
                <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
                    <Button variant="secondary" size="icon" className="rounded-full bg-white/90 shadow-sm hover:bg-white text-gray-800" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Button variant="secondary" size="icon" className="rounded-full bg-white/90 shadow-sm hover:bg-white text-gray-800" onClick={handleShare}>
                        <Share2 className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="bg-white px-5 pt-4 pb-2 border-b">
                <div className="flex justify-between items-start mb-1">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{venue.name}</h1>
                    <Badge className={isOpen ? "bg-green-100 text-green-700 hover:bg-green-100 border-0 px-2" : "bg-red-100 text-red-700 hover:bg-red-100 border-0 px-2"}>
                        {isOpen ? "Aberto" : "Fechado"}
                    </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1 font-medium text-gray-800">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {displayRating} <span className="text-gray-400 font-normal">({reviews.length} avaliações)</span>
                    </span>
                    <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-gray-300" /> {venue.category}</span>
                </div>
            </div>

            <Tabs defaultValue="menu" className="w-full mt-2">
                <div className="bg-white border-b sticky top-0 z-10">
                    <TabsList className="w-full justify-start h-12 bg-transparent p-0 px-5 gap-6 rounded-none overflow-x-auto no-scrollbar">
                        <TabsTrigger value="menu" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-gray-500 data-[state=active]:text-primary font-medium text-base">Cardápio</TabsTrigger>
                        <TabsTrigger value="reviews" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-gray-500 data-[state=active]:text-primary font-medium text-base">Avaliações</TabsTrigger>
                        <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-gray-500 data-[state=active]:text-primary font-medium text-base">Sobre</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="menu" className="p-4 space-y-4 min-h-[50vh]">
                    {menu.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400"><Utensils className="w-10 h-10 mb-2 opacity-20" /><p>Cardápio indisponível.</p></div>
                    ) : (
                        menu.map((item) => (
                            <div
                                key={item.id}
                                className={`bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden ${!isOpen ? 'opacity-60 grayscale' : ''}`}
                                onClick={() => handleProductClick(item)}
                            >
                                <div className="w-24 h-24 bg-gray-100 rounded-lg bg-cover bg-center shrink-0 border border-gray-100" style={{ backgroundImage: `url(${item.image_url || '/placeholder.svg'})` }} />
                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div>
                                        <h3 className="font-bold text-gray-900 line-clamp-1 text-base">{item.name}</h3>
                                        {showGamification && isOpen && (
                                            <div className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 w-fit px-1.5 py-0.5 rounded border border-green-100 my-1">
                                                <Coins className="w-3 h-3" />
                                                <span className="font-bold">Ganhe {Math.floor(item.price)} Coins</span>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.description || "Sem descrição."}</p>
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="text-primary font-bold text-base">R$ {item.price?.toFixed(2)}</span>
                                        {isOpen && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full bg-gray-50 text-primary">+</Button>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </TabsContent>

                {/* ABA AVALIAÇÕES */}
                <TabsContent value="reviews" className="bg-white min-h-[50vh]">
                    {reviews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Star className="w-12 h-12 mb-3 opacity-20" />
                            <p className="font-medium">Nenhuma avaliação ainda.</p>
                            <p className="text-sm">Seja o primeiro a pedir!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {reviews.map((review) => (
                                <div key={review.id} className="p-5 flex gap-4 hover:bg-gray-50 transition-colors">
                                    <Avatar className="w-10 h-10 border border-gray-100">
                                        <AvatarImage src={review.profiles?.avatar_url} />
                                        <AvatarFallback><User className="w-5 h-5 text-gray-400" /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-2">
                                        {/* Cabeçalho da Review */}
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-900 text-sm">{review.profiles?.display_name || "Usuário"}</span>
                                            <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>

                                        <div className="flex text-amber-400 mb-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-current" : "text-gray-200 fill-gray-200"}`} />
                                            ))}
                                        </div>

                                        {review.comment && (
                                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg rounded-tl-none italic">
                                                "{review.comment}"
                                            </p>
                                        )}

                                        {review.tags && review.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {review.tags.map((tag: string) => (
                                                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* THREAD DE RESPOSTAS */}
                                        {review.replies && review.replies.length > 0 && (
                                            <div className="mt-4 pl-3 border-l-2 border-gray-100 space-y-3">
                                                {review.replies.map((reply: any) => {
                                                    const isOwner = reply.user_id === venue.owner_id;
                                                    return (
                                                        <div key={reply.id} className={`p-3 rounded-r-lg rounded-bl-lg text-sm ${isOwner ? 'bg-primary/5' : 'bg-gray-50'}`}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className={`font-bold text-xs ${isOwner ? 'text-primary' : 'text-gray-700'}`}>
                                                                    {isOwner ? venue.name : "Cliente"}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">{new Date(reply.created_at).toLocaleDateString('pt-BR')}</span>
                                                            </div>
                                                            <p className="text-gray-600">{reply.content}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="about" className="p-5 space-y-6 bg-white min-h-[50vh]">
                    <div className="space-y-2"><h3 className="font-bold text-gray-900 flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Descrição</h3><p className="text-sm text-gray-600 leading-relaxed text-justify">{venue.description || "Sem descrição."}</p></div>
                    <div className="space-y-2"><h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Endereço</h3><p className="text-sm text-gray-600">{venue.address || "Endereço não cadastrado"}</p></div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horário de Funcionamento</h3>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm space-y-2">
                            {venue.opening_hours && Object.keys(venue.opening_hours).map(day => {
                                const info = venue.opening_hours[day];
                                const daysOrder = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
                                const isActuallyToday = daysOrder[new Date().getDay()] === day;

                                return (
                                    <div key={day} className={`flex justify-between ${isActuallyToday ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                        <span className="capitalize">{DAYS_TRANSLATION[day] || day}</span>
                                        <span>{info.closed ? <span className="text-red-400">Fechado</span> : `${info.open} - ${info.close}`}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <CartFloatingBar />

            <ProductDrawer
                product={selectedProduct}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </div>
    );
}
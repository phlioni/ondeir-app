import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Star, Utensils, Share2, Info, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VenueDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [venue, setVenue] = useState<any>(null);
    const [menu, setMenu] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchVenueData(id);
    }, [id]);

    const fetchVenueData = async (venueId: string) => {
        try {
            const { data: venueData, error: venueError } = await supabase
                .from("markets")
                .select("*")
                .eq("id", venueId)
                .single();

            if (venueError) throw venueError;
            setVenue(venueData);

            const { data: menuData, error: menuError } = await supabase
                .from("menu_items")
                .select("*")
                .eq("market_id", venueId)
                .order("category", { ascending: true });

            if (menuError) throw menuError;
            setMenu(menuData || []);

        } catch (error) {
            console.error("Erro:", error);
            toast({ title: "Erro", description: "Falha ao carregar detalhes.", variant: "destructive" });
            navigate("/");
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link copiado!", description: "Envie para seus amigos." });
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><span className="animate-pulse text-primary font-bold">Carregando...</span></div>;
    if (!venue) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">

            <div className="relative h-56 md:h-72 w-full bg-gray-200">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${venue.cover_image || '/placeholder.svg'})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

                <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
                    <Button variant="secondary" size="icon" className="rounded-full bg-white/90 shadow-sm hover:bg-white text-gray-800" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="icon" className="rounded-full bg-white/90 shadow-sm hover:bg-white text-gray-800" onClick={handleShare}>
                            <Share2 className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white px-5 pt-4 pb-2 border-b">
                <div className="flex justify-between items-start mb-1">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{venue.name}</h1>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 px-2">Aberto</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1 font-medium text-gray-800">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {venue.rating || 4.5}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-gray-300" /> {venue.category}
                    </span>
                </div>
            </div>

            <Tabs defaultValue="menu" className="w-full mt-2">
                <div className="bg-white border-b sticky top-0 z-10">
                    <TabsList className="w-full justify-start h-12 bg-transparent p-0 px-5 gap-6 rounded-none">
                        <TabsTrigger value="menu" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-gray-500 data-[state=active]:text-primary font-medium text-base transition-all">
                            Cardápio
                        </TabsTrigger>
                        <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-gray-500 data-[state=active]:text-primary font-medium text-base transition-all">
                            Sobre
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="menu" className="p-4 space-y-4 min-h-[50vh]">
                    {menu.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Utensils className="w-10 h-10 mb-2 opacity-20" />
                            <p>Cardápio indisponível.</p>
                        </div>
                    ) : (
                        menu.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 active:scale-[0.98] transition-transform cursor-pointer"
                                onClick={() => navigate(`/product/${item.id}`)} // <--- AGORA VAI PARA A PÁGINA NOVA
                            >
                                <div
                                    className="w-24 h-24 bg-gray-100 rounded-lg bg-cover bg-center shrink-0 border border-gray-100"
                                    style={{ backgroundImage: `url(${item.image_url || '/placeholder.svg'})` }}
                                />
                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div>
                                        <h3 className="font-bold text-gray-900 line-clamp-1 text-base">{item.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                                            {item.description || "Sem descrição."}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="text-primary font-bold text-base">R$ {item.price?.toFixed(2)}</span>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full bg-gray-50 text-primary">
                                            +
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="about" className="p-5 space-y-6 bg-white min-h-[50vh]">
                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Descrição</h3>
                        <p className="text-sm text-gray-600 leading-relaxed text-justify">{venue.description || "Sem descrição."}</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Endereço</h3>
                        <p className="text-sm text-gray-600">{venue.address || "Endereço não cadastrado"}</p>
                    </div>
                    {venue.amenities && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Comodidades</h3>
                            <div className="flex flex-wrap gap-2">
                                {venue.amenities.map((item: string, idx: number) => (
                                    <span key={idx} className="text-xs bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full border">{item}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
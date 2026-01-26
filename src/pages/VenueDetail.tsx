import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MapPin, Star, Utensils, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function VenueDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [market, setMarket] = useState<any>(null);
    const [menu, setMenu] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            // Buscar Detalhes do Mercado
            const { data: marketData, error } = await supabase
                .from("markets")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            setMarket(marketData);

            // Buscar Menu
            const { data: menuData } = await supabase
                .from("menu_items")
                .select("*")
                .eq("market_id", id)
                .order("category");

            setMenu(menuData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!market) return <div className="p-8 text-center">Local não encontrado</div>;

    // Agrupar menu por categoria
    const groupedMenu = menu.reduce((acc, item) => {
        const cat = item.category || "Outros";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="min-h-screen bg-white pb-10">
            {/* Header com Imagem */}
            <div className="relative h-64 w-full">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${market.cover_image || '/placeholder.svg'})` }}
                >
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-4 left-4 rounded-full"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>

                <div className="absolute bottom-0 left-0 w-full p-6 text-white bg-gradient-to-t from-black/80 to-transparent">
                    <h1 className="text-3xl font-bold mb-1">{market.name}</h1>
                    <div className="flex items-center gap-2 text-sm opacity-90">
                        <span className="bg-primary px-2 py-0.5 rounded text-white font-bold">{market.category}</span>
                        <span className="flex items-center"><Star className="w-4 h-4 text-yellow-400 mr-1 fill-yellow-400" /> {market.rating || "Novo"}</span>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-6 max-w-3xl mx-auto -mt-4 bg-white rounded-t-3xl relative z-10">
                <div className="flex items-start gap-2 mb-6 text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{market.address || "Endereço não informado"}</p>
                </div>

                {/* Tags/Comodidades */}
                {market.amenities && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {market.amenities.map((tag: string) => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full border">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <Tabs defaultValue="menu" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="menu"><Utensils className="w-4 h-4 mr-2" /> Cardápio</TabsTrigger>
                        <TabsTrigger value="about"><Info className="w-4 h-4 mr-2" /> Sobre</TabsTrigger>
                    </TabsList>

                    <TabsContent value="menu" className="space-y-8">
                        {Object.keys(groupedMenu).length === 0 ? (
                            <div className="text-center py-10 text-gray-400">Cardápio ainda não cadastrado.</div>
                        ) : (
                            Object.entries(groupedMenu).map(([category, items]) => (
                                <div key={category}>
                                    <h3 className="font-bold text-xl mb-3 text-primary">{category}</h3>
                                    <div className="space-y-3">
                                        {items.map((item) => (
                                            <div key={item.id} className="flex justify-between items-start border-b pb-3 last:border-0">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                                                </div>
                                                <span className="font-bold text-gray-900 ml-4 whitespace-nowrap">
                                                    R$ {item.price.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="about">
                        <div className="text-gray-600 leading-relaxed">
                            {market.description ? market.description : "Nenhuma descrição informada pelo estabelecimento."}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
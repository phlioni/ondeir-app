import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Heart, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchProduct(id);
    }, [id]);

    const fetchProduct = async (productId: string) => {
        try {
            // Busca produto E os dados do restaurante (market)
            const { data, error } = await supabase
                .from("menu_items")
                .select(`
          *,
          markets (
            id,
            name,
            category
          )
        `)
                .eq("id", productId)
                .single();

            if (error) throw error;
            setProduct(data);
        } catch (error) {
            console.error("Erro:", error);
            toast({ title: "Erro", description: "Produto não encontrado.", variant: "destructive" });
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><span className="animate-pulse text-primary font-bold">Carregando sabor...</span></div>;
    if (!product) return null;

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">

            {/* IMAGEM DO PRODUTO */}
            <div className="relative h-[40vh] w-full bg-gray-100">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${product.image_url || '/placeholder.svg'})` }}
                />

                {/* Botões de Navegação */}
                <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-sm"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="icon" className="rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-sm">
                            <Share2 className="w-5 h-5" />
                        </Button>
                        <Button variant="secondary" size="icon" className="rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-sm">
                            <Heart className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO */}
            <div className="flex-1 p-6 -mt-6 rounded-t-[30px] bg-white relative z-20 flex flex-col">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                {/* Link para o Restaurante */}
                <div
                    className="flex items-center gap-2 text-sm text-gray-500 mb-2 cursor-pointer hover:text-primary transition-colors w-fit"
                    onClick={() => navigate(`/place/${product.markets?.id}`)}
                >
                    <Store className="w-4 h-4" />
                    <span className="font-medium uppercase tracking-wide text-xs">Vendido por {product.markets?.name}</span>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{product.name}</h1>

                <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl font-bold text-primary">R$ {product.price?.toFixed(2)}</span>
                    {product.category && (
                        <Badge variant="outline" className="text-gray-500 border-gray-200 font-normal">
                            {product.category}
                        </Badge>
                    )}
                </div>

                <div className="space-y-2 mb-8">
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Detalhes</h3>
                    <p className="text-gray-600 leading-relaxed">
                        {product.description || "O restaurante não forneceu uma descrição detalhada para este item, mas garantimos a qualidade."}
                    </p>
                </div>

                {/* Botão de Ação Fixo no Final */}
                <div className="mt-auto pt-4">
                    <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 rounded-xl">
                        Adicionar ao Pedido
                    </Button>
                </div>
            </div>
        </div>
    );
}
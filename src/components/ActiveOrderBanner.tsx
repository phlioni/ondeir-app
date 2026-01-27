import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat, Bike, Clock, ChevronRight, XCircle } from "lucide-react";

export function ActiveOrderBanner() {
    const navigate = useNavigate();
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let userId: string | undefined;

        const setupRealtime = async () => {
            // 1. Pega usuário atual
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            userId = session.user.id;

            // 2. Busca inicial
            await fetchActiveOrder(userId);

            // 3. INSCRIÇÃO REALTIME (O Segredo da Atualização Automática)
            // Escuta QUALQUER mudança na tabela 'orders'
            const channel = supabase.channel('any_order_change')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Insert, Update ou Delete
                        schema: 'public',
                        table: 'orders',
                        filter: `user_id=eq.${userId}` // Filtra só para este usuário
                    },
                    (payload) => {
                        // Se houver qualquer mudança no banco, atualizamos o banner
                        console.log("Mudança detectada no pedido:", payload);
                        fetchActiveOrder(userId!);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupRealtime();
    }, []);

    const fetchActiveOrder = async (uid: string) => {
        const { data } = await supabase
            .from('orders')
            .select('id, status, markets(name)')
            .eq('user_id', uid)
            // Trazemos apenas pedidos que NÃO estão finalizados (entregue ou cancelado)
            .in('status', ['pending', 'preparing', 'ready'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) {
            setActiveOrder(data);
            setIsVisible(true);
        } else {
            setIsVisible(false);
            setActiveOrder(null);
        }
    };

    if (!isVisible || !activeOrder) return null;

    // Configuração Visual baseada no Status
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return {
                icon: Clock,
                label: "Aguardando confirmação...",
                color: "text-orange-600",
                bg: "bg-orange-100",
                animate: "animate-pulse"
            };
            case 'preparing': return {
                icon: ChefHat,
                label: "Sendo preparado!",
                color: "text-blue-600",
                bg: "bg-blue-100",
                animate: ""
            };
            case 'ready': return {
                icon: Bike,
                label: "Saiu para entrega",
                color: "text-green-600",
                bg: "bg-green-100",
                animate: "animate-bounce"
            };
            default: return { icon: Loader2, label: "Processando...", color: "text-gray-500", bg: "bg-gray-100", animate: "animate-spin" };
        }
    };

    const info = getStatusInfo(activeOrder.status);
    const Icon = info.icon;

    return (
        <div className="fixed top-28 left-4 right-4 z-50 animate-in slide-in-from-top-5 fade-in duration-500">
            <Card
                className="p-3 shadow-xl border-0 bg-white/95 backdrop-blur-md flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform rounded-xl border-l-4 border-l-primary"
                onClick={() => navigate(`/order/${activeOrder.id}`)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${info.bg} ${info.color}`}>
                        <Icon className={`w-5 h-5 ${info.animate}`} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-gray-800 leading-tight">
                            {info.label}
                        </span>
                        <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]">
                            Pedido no {activeOrder.markets?.name}
                        </span>
                    </div>
                </div>

                <Button size="icon" variant="ghost" className="text-gray-400 hover:text-primary shrink-0">
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </Card>
        </div>
    );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat, Bike, Clock, ChevronRight, Hash, CheckCircle2, Coins, PackageCheck } from "lucide-react";

export function ActiveOrderBanner() {
    const navigate = useNavigate();
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Estado para o Banner de Recompensa (Coins)
    const [rewardData, setRewardData] = useState<{ coins: number } | null>(null);

    useEffect(() => {
        let userId: string | undefined;

        const setupRealtime = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            userId = session.user.id;

            // 1. Carga Inicial
            await fetchActiveOrder(userId);

            // 2. Monitoramento em Tempo Real
            const channel = supabase.channel('any_order_change')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload: any) => {
                        if (payload.new.status === 'delivered') {
                            fetchDeliveredOrderForCelebration(payload.new.id);
                        } else {
                            fetchActiveOrder(userId!);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupRealtime();
    }, []);

    // EFEITO: Sequência de Encerramento
    useEffect(() => {
        if (activeOrder?.status === 'delivered') {
            const timer1 = setTimeout(() => {
                const earned = Math.floor(Number(activeOrder.total_amount || 0));
                if (earned > 0) {
                    setRewardData({ coins: earned });
                } else {
                    setIsVisible(false);
                    setActiveOrder(null);
                }
            }, 3000);

            const timer2 = setTimeout(() => {
                setRewardData(null);
                setIsVisible(false);
                setActiveOrder(null);
            }, 7000);

            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        }
    }, [activeOrder?.status]);

    const fetchActiveOrder = async (uid: string) => {
        const { data } = await supabase
            .from('orders')
            .select('id, status, delivery_code, markets(name), created_at')
            .eq('user_id', uid)
            // CORREÇÃO AQUI: Adicionado 'confirmed' para o banner não sumir quando a cozinha der ok
            .in('status', ['pending', 'preparing', 'confirmed', 'ready'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) {
            const createdAt = new Date(data.created_at).getTime();
            const now = new Date().getTime();
            const hoursSinceCreated = (now - createdAt) / 1000 / 60 / 60;

            if (hoursSinceCreated > 24) {
                setIsVisible(false);
                return;
            }

            setActiveOrder(data);
            setIsVisible(true);
        } else {
            setIsVisible(false);
            setActiveOrder(null);
        }
    };

    const fetchDeliveredOrderForCelebration = async (orderId: string) => {
        const { data } = await supabase
            .from('orders')
            .select('id, status, delivery_code, markets(name), total_amount')
            .eq('id', orderId)
            .single();

        if (data) {
            setActiveOrder(data);
            setIsVisible(true);
        }
    };

    if (!isVisible) return null;

    if (rewardData) {
        return (
            <div className="fixed top-28 left-4 right-4 z-50 animate-in zoom-in duration-500 fade-in">
                <Card className="p-3 shadow-2xl border-l-4 border-l-yellow-400 bg-yellow-50 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-yellow-200 text-yellow-700 shadow-inner">
                            <Coins className="w-6 h-6 animate-bounce" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-base text-yellow-900 leading-tight uppercase tracking-wide">
                                Cashback!
                            </span>
                            <span className="text-sm text-yellow-800 font-medium">
                                Você ganhou <span className="font-bold text-lg">+{rewardData.coins}</span> coins!
                            </span>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    if (!activeOrder) return null;

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return {
                icon: Clock, label: "Aguardando confirmação...",
                color: "text-orange-600", bg: "bg-orange-100", border: "border-l-orange-500", animate: "animate-pulse"
            };
            case 'preparing': return {
                icon: ChefHat, label: "Sendo preparado!",
                color: "text-blue-600", bg: "bg-blue-100", border: "border-l-blue-500", animate: ""
            };
            // NOVO STATUS ADICIONADO
            case 'confirmed': return {
                icon: PackageCheck, label: "Pronto! Aguardando retirada.",
                color: "text-emerald-600", bg: "bg-emerald-100", border: "border-l-emerald-500", animate: ""
            };
            case 'ready': return {
                icon: Bike, label: "Saiu para entrega",
                color: "text-indigo-600", bg: "bg-indigo-100", border: "border-l-indigo-500", animate: "animate-bounce"
            };
            case 'delivered': return {
                icon: CheckCircle2, label: "Pedido Entregue! Bom apetite 😋",
                color: "text-green-700", bg: "bg-green-100", border: "border-l-green-600", animate: "animate-bounce"
            };
            default: return { icon: Loader2, label: "Processando...", color: "text-gray-500", bg: "bg-gray-100", border: "border-l-gray-400", animate: "animate-spin" };
        }
    };

    const info = getStatusInfo(activeOrder.status);
    const Icon = info.icon;

    return (
        <div className="fixed top-28 left-4 right-4 z-50 animate-in slide-in-from-top-5 fade-in duration-500">
            <Card
                className={`p-3 shadow-xl border-0 bg-white/95 backdrop-blur-md flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform rounded-xl border-l-4 ${info.border}`}
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

                        {activeOrder.status === 'ready' ? (
                            <span className="text-xs text-primary font-black flex items-center gap-1 mt-0.5 animate-pulse">
                                <Hash className="w-3 h-3" /> CÓDIGO: {activeOrder.delivery_code}
                            </span>
                        ) : activeOrder.status === 'delivered' ? (
                            <span className="text-xs text-green-600 font-medium">
                                Obrigado pela preferência!
                            </span>
                        ) : (
                            <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]">
                                Pedido no {activeOrder.markets?.name}
                            </span>
                        )}
                    </div>
                </div>

                <Button size="icon" variant="ghost" className="text-gray-400 hover:text-primary shrink-0">
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </Card>
        </div>
    );
}
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Loader2, CheckCircle2, Clock, ChefHat, Bike, Home,
    ArrowLeft, Phone, HelpCircle, XCircle, Copy, ChevronDown, ChevronUp, MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Configuração dos passos da timeline (Atualizada)
const STEPS = [
    { key: 'pending', label: 'Pedido Aceito', desc: 'Restaurante recebeu seu pedido', icon: Clock },
    { key: 'preparing', label: 'Preparando', desc: 'A cozinha está trabalhando', icon: ChefHat },
    { key: 'ready', label: 'Pedido Enviado', desc: 'Saiu para entrega', icon: Bike },
    { key: 'delivered', label: 'Entregue', desc: 'Pedido finalizado', icon: Home }
];

export default function OrderTracking() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchOrder = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, markets(*), order_items(*)')
                .eq('id', id)
                .single();

            if (error) {
                toast({ title: "Erro", description: "Pedido não encontrado.", variant: "destructive" });
                navigate('/');
                return;
            }
            setOrder(data);
            setLoading(false);
        };

        fetchOrder();

        // Realtime para atualizações instantâneas
        const channel = supabase.channel(`tracking_${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
                setOrder((prev: any) => ({ ...prev, ...payload.new }));
                if (payload.new.status !== order?.status) {
                    toast({ title: "Status Atualizado!", className: "bg-blue-600 text-white" });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id]);

    const handleCancel = async () => {
        if (!confirm("Tem certeza que deseja cancelar o pedido?")) return;
        await supabase.from('orders').update({ status: 'canceled' }).eq('id', id);
        toast({ title: "Pedido Cancelado" });
    };

    const copyOrderId = () => {
        if (order?.display_id) {
            navigator.clipboard.writeText(`#${order.display_id}`);
            toast({ title: "Copiado!", description: `Pedido #${order.display_id}` });
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin w-12 h-12 text-primary" /></div>;
    if (!order) return <div className="h-screen flex items-center justify-center">Pedido não encontrado.</div>;

    const currentStepIndex = STEPS.findIndex(s => s.key === order.status);
    const isCanceled = order.status === 'canceled';

    // Se cancelado, mostra tela de erro
    if (isCanceled) {
        return (
            <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-xl">
                    <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido Cancelado</h1>
                <p className="text-gray-600 mb-8">O restaurante não pôde aceitar ou você cancelou.</p>
                <div className="grid gap-3 w-full max-w-xs">
                    <Button variant="outline" className="w-full bg-white" onClick={() => navigate('/')}>Voltar ao Início</Button>
                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white gap-2" onClick={() => window.open(`tel:${order.markets?.phone}`)}>
                        <Phone className="w-4 h-4" /> Ligar para Restaurante
                    </Button>
                </div>
            </div>
        );
    }

    // Calcula tempo estimado (exemplo simples)
    // Em um app real, isso viria do banco (estimated_delivery_time)
    const isDelivered = order.status === 'delivered';

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-24">

            {/* Header com Navegação */}
            <div className="bg-white p-4 sticky top-0 z-20 border-b shadow-sm flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="w-5 h-5 text-gray-600" /></Button>
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Acompanhar</span>
                    <span className="font-bold text-gray-900">{order.markets?.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={copyOrderId}><Copy className="w-4 h-4 text-gray-400" /></Button>
            </div>

            <div className="p-5 max-w-lg mx-auto space-y-6">

                {/* 1. STATUS HERO & PREVISÃO */}
                <div className="text-center space-y-2 py-4">
                    {!isDelivered && (
                        <div className="inline-flex items-center justify-center p-3 bg-green-50 text-green-700 rounded-full mb-2 border border-green-100 shadow-sm animate-pulse">
                            <Clock className="w-5 h-5 mr-2" />
                            <span className="font-bold text-sm">Previsão: 20-30 min</span>
                        </div>
                    )}
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                        {STEPS[currentStepIndex]?.label || "Processando"}
                    </h1>
                    <p className="text-gray-500 font-medium">{STEPS[currentStepIndex]?.desc}</p>
                </div>

                {/* 2. TIMELINE VERTICAL (CORRIGIDA) */}
                <Card className="border-0 shadow-md overflow-hidden">
                    <CardContent className="p-6 bg-white">
                        <div className="relative pl-4 space-y-8 before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                            {STEPS.map((step, idx) => {
                                const isCompleted = currentStepIndex > idx;
                                const isCurrent = currentStepIndex === idx;
                                const Icon = step.icon;

                                return (
                                    <div key={step.key} className={`relative flex items-start gap-4 transition-all duration-500 ${isCurrent ? 'scale-100 opacity-100' : 'opacity-60'}`}>
                                        {/* Ícone da Timeline */}
                                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-300
                                            ${isCompleted ? 'bg-green-500 text-white' :
                                                isCurrent ? 'bg-primary text-white scale-110' : 'bg-gray-100 text-gray-400'}
                                        `}>
                                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                        </div>

                                        {/* Texto */}
                                        <div className={`pt-2 ${isCurrent ? 'opacity-100' : 'opacity-80'}`}>
                                            <h3 className={`font-bold text-sm leading-none ${isCurrent ? 'text-gray-900 text-base' : 'text-gray-500'}`}>
                                                {step.label}
                                            </h3>
                                            {/* CORREÇÃO: "Em andamento" só aparece se for o atual E não for entregue */}
                                            {isCurrent && step.key !== 'delivered' && (
                                                <p className="text-xs text-primary mt-1 font-medium animate-in fade-in slide-in-from-left-2">
                                                    Em andamento...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* 3. AÇÕES RÁPIDAS */}
                {!isDelivered && (
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="h-14 bg-white border-gray-200 shadow-sm rounded-xl flex flex-col gap-1 items-center justify-center hover:border-primary hover:bg-blue-50 hover:text-primary transition-all group"
                            onClick={() => window.open(`tel:${order.markets?.phone}`)}
                        >
                            <Phone className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                            <span className="text-xs font-bold">Ligar</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-14 bg-white border-gray-200 shadow-sm rounded-xl flex flex-col gap-1 items-center justify-center hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all group"
                        >
                            <HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
                            <span className="text-xs font-bold">Ajuda</span>
                        </Button>
                    </div>
                )}

                {/* Cancelar (Apenas se pendente) */}
                {order.status === 'pending' && (
                    <Button
                        variant="ghost"
                        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleCancel}
                    >
                        Cancelar Pedido
                    </Button>
                )}

                {/* 4. DETALHES DO PEDIDO (Acordeão) */}
                <Card className="border-0 shadow-sm">
                    <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                        <CollapsibleTrigger asChild>
                            <div className="p-4 flex justify-between items-center cursor-pointer bg-white rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-gray-500 font-bold uppercase">Entregar em</p>
                                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{order.address_street}, {order.address_number}</p>
                                    </div>
                                </div>
                                {isDetailsOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                            </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <Separator />
                            <div className="p-5 bg-gray-50/50 space-y-4">
                                <h4 className="font-bold text-sm text-gray-900">Itens do Pedido</h4>
                                <div className="space-y-3">
                                    {order.order_items?.map((item: any) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <div className="flex gap-2">
                                                <span className="font-bold text-gray-900">{item.quantity}x</span>
                                                <span className="text-gray-600">{item.name}</span>
                                            </div>
                                            <span className="font-medium text-gray-900">R$ {item.total_price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-gray-600 font-medium">Total Pago</span>
                                    <span className="font-bold text-xl text-green-600">R$ {order.total_amount?.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-gray-400 text-center pt-2">
                                    Pagamento via {order.payment_method === 'credit' ? 'Cartão de Crédito' : order.payment_method}
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

            </div>
        </div>
    );
}
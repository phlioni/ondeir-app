import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api";
import {
    Loader2, CheckCircle2, Clock, ChefHat, Bike, Home,
    ArrowLeft, Phone, HelpCircle, XCircle, Copy, ChevronDown, ChevronUp, MapPin, Hash, Car, Map as MapIcon, DollarSign, Coins
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { DeliveryReviewModal } from "@/components/DeliveryReviewModal";

const STEPS = [
    { key: 'pending', label: 'Pedido Aceito', desc: 'Restaurante recebeu seu pedido', icon: Clock },
    { key: 'preparing', label: 'Preparando', desc: 'A cozinha está trabalhando', icon: ChefHat },
    { key: 'ready', label: 'Pedido Enviado', desc: 'Saiu para entrega', icon: Bike },
    { key: 'delivered', label: 'Entregue', desc: 'Pedido finalizado', icon: Home }
];

const mapContainerStyle = { width: '100%', height: '100%' };
const GOOGLE_MAPS_LIBRARIES: ("places" | "marker")[] = ["places", "marker"];

// --- ESTILO CLEAN DO MAPA ---
const cleanMapStyles = [
    { "featureType": "all", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
    { "featureType": "all", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
    { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
    { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
    { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
];

export default function OrderTracking() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Novo estado para o Review
    const [showReviewModal, setShowReviewModal] = useState(false);

    // --- ESTADOS DO MAPA ---
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded: isMapsLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || "",
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    useEffect(() => {
        if (!id) return;

        const fetchOrder = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, markets(*), order_items(*), couriers(*)')
                .eq('id', id)
                .single();

            if (error) {
                toast({ title: "Erro", description: "Pedido não encontrado.", variant: "destructive" });
                navigate('/');
                return;
            }
            setOrder(data);

            // Verifica se deve abrir avaliação (Entregue e sem avaliação de driver)
            if (data.status === 'delivered') {
                const { count } = await supabase
                    .from('reviews')
                    .select('*', { count: 'exact', head: true })
                    .eq('order_id', id)
                    .eq('target_type', 'driver');

                if (count === 0) {
                    setShowReviewModal(true);
                }
            }

            if (data.couriers?.current_lat && data.couriers?.current_lng) {
                setCourierLocation({ lat: data.couriers.current_lat, lng: data.couriers.current_lng });
            }
            setLoading(false);
        };

        fetchOrder();

        const channelOrder = supabase.channel(`tracking_${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, async (payload) => {
                fetchOrder(); // Recarrega para garantir que a lógica de review rode
                if (payload.new.status !== order?.status) {
                    toast({ title: "Status Atualizado!", className: "bg-blue-600 text-white" });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channelOrder); };
    }, [id]);

    // Rastreio em Tempo Real
    useEffect(() => {
        if (!order?.courier_id) return;

        const channelCourier = supabase.channel(`courier_loc_${order.courier_id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'couriers',
                filter: `id=eq.${order.courier_id}`
            }, (payload: any) => {
                const newLoc = { lat: payload.new.current_lat, lng: payload.new.current_lng };
                if (newLoc.lat && newLoc.lng) {
                    setCourierLocation(newLoc);
                    if (isMapOpen && mapRef.current) {
                        mapRef.current.panTo(newLoc);
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channelCourier); };
    }, [order?.courier_id, isMapOpen]);

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

    const onLoadMap = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

    // --- ÍCONES SIMPLES E COLORIDOS ---
    const getVehicleIcon = () => {
        const type = order.couriers?.vehicle_type || 'motorcycle';
        let color = "#16A34A"; // Verde (Moto/Padrão)

        if (type === 'car') color = "#2563EB"; // Azul
        if (type === 'bike') color = "#EAB308"; // Amarelo

        return {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 1,
            strokeWeight: 4,
            strokeColor: "white",
        };
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin w-12 h-12 text-primary" /></div>;
    if (!order) return <div className="h-screen flex items-center justify-center">Pedido não encontrado.</div>;

    const currentStepIndex = STEPS.findIndex(s => s.key === order.status);
    const isCanceled = order.status === 'canceled';
    const isDelivered = order.status === 'delivered';

    // --- CÁLCULOS MATEMÁTICOS CORRIGIDOS ---
    const itemsSubtotal = order.order_items?.reduce((acc: number, item: any) => acc + (Number(item.total_price) || 0), 0) || 0;
    const deliveryFee = Number(order.delivery_fee) || 0;
    const discountAmount = Number(order.discount_amount) || 0;
    const visualTotal = (itemsSubtotal + deliveryFee) - discountAmount;

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

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-24">

            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-20 border-b shadow-sm flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="w-5 h-5 text-gray-600" /></Button>
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Acompanhar</span>
                    <span className="font-bold text-gray-900">{order.markets?.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={copyOrderId}><Copy className="w-4 h-4 text-gray-400" /></Button>
            </div>

            <div className="p-5 max-w-lg mx-auto space-y-6">

                {/* Status Hero */}
                <div className="text-center space-y-2 py-4">
                    {!isDelivered && (
                        <div className="inline-flex items-center justify-center p-3 bg-green-50 text-green-700 rounded-full mb-2 border border-green-100 shadow-sm animate-pulse">
                            <Clock className="w-5 h-5 mr-2" />
                            <span className="font-bold text-sm">
                                Previsão: {order.estimated_min || 30}-{order.estimated_max || 45} min
                            </span>
                        </div>
                    )}

                    {!isDelivered && order.status !== 'pending' && order.delivery_code && (
                        <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl flex flex-col items-center animate-in zoom-in duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-1 bg-primary text-white text-[10px] font-bold rounded-bl-lg">SEGURANÇA</div>
                            <span className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Código de Recebimento</span>
                            <div className="text-5xl font-black text-primary tracking-widest flex items-center gap-3 my-2">
                                <Hash className="w-8 h-8 opacity-40" />
                                {order.delivery_code}
                            </div>
                            <span className="text-[10px] text-gray-500">Informe este número ao entregador.</span>
                        </div>
                    )}

                    <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mt-4">
                        {STEPS[currentStepIndex]?.label || "Processando"}
                    </h1>
                    <p className="text-gray-500 font-medium">{STEPS[currentStepIndex]?.desc}</p>
                </div>

                {/* Cartão do Entregador */}
                {order.couriers && !isDelivered && (
                    <Card className="border-l-4 border-l-blue-500 shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                    {order.couriers.vehicle_type === 'car' ? <Car className="w-6 h-6 text-blue-600" /> : <Bike className="w-6 h-6 text-blue-600" />}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Seu Entregador</p>
                                    <p className="font-bold text-gray-900">{order.couriers.name}</p>
                                    {order.couriers.plate && <Badge variant="outline" className="text-[10px] h-5 mt-1">{order.couriers.plate}</Badge>}
                                </div>
                            </div>

                            {courierLocation && (
                                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 animate-pulse shadow-lg" onClick={() => setIsMapOpen(true)}>
                                    <MapIcon className="w-4 h-4" /> Rastrear
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Timeline */}
                <Card className="border-0 shadow-md overflow-hidden">
                    <CardContent className="p-6 bg-white">
                        <div className="relative pl-4 space-y-8 before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                            {STEPS.map((step, idx) => {
                                const isCompleted = currentStepIndex > idx;
                                const isCurrent = currentStepIndex === idx;
                                const Icon = step.icon;

                                return (
                                    <div key={step.key} className={`relative flex items-start gap-4 transition-all duration-500 ${isCurrent ? 'scale-100 opacity-100' : 'opacity-60'}`}>
                                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-300
                                            ${isCompleted ? 'bg-green-500 text-white' :
                                                isCurrent ? 'bg-primary text-white scale-110' : 'bg-gray-100 text-gray-400'}
                                        `}>
                                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                        </div>
                                        <div className={`pt-2 ${isCurrent ? 'opacity-100' : 'opacity-80'}`}>
                                            <h3 className={`font-bold text-sm leading-none ${isCurrent ? 'text-gray-900 text-base' : 'text-gray-500'}`}>
                                                {step.label}
                                            </h3>
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

                {/* Ações */}
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

                {order.status === 'pending' && (
                    <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleCancel}>
                        Cancelar Pedido
                    </Button>
                )}

                {/* Detalhes do Pedido - COM CORREÇÃO DE VALORES */}
                <Card className="border-0 shadow-sm">
                    <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                        <CollapsibleTrigger asChild>
                            <div className="p-4 flex justify-between items-center cursor-pointer bg-white rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><MapPin className="w-5 h-5" /></div>
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
                                            <div className="flex gap-2"><span className="font-bold text-gray-900">{item.quantity}x</span><span className="text-gray-600">{item.name}</span></div>
                                            <span className="font-medium text-gray-900">R$ {item.total_price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-gray-600 font-medium">Subtotal</span>
                                    {/* Mostra a soma dos itens como Subtotal */}
                                    <span className="text-gray-900 font-medium">R$ {itemsSubtotal.toFixed(2)}</span>
                                </div>

                                {discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-green-600 font-bold">
                                        <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Desconto</span>
                                        <span>- R$ {discountAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium text-sm flex items-center gap-1"><Bike className="w-3 h-3" /> Taxa de Entrega</span>
                                    <span className="text-gray-900 text-sm">R$ {deliveryFee.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-gray-600 font-bold">Total Pago</span>
                                    {/* Mostra a soma visual (Subtotal + Frete - Desconto) */}
                                    <span className="font-bold text-xl text-green-600">R$ {visualTotal.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-gray-400 text-center pt-2">Pagamento via {order.payment_method === 'credit' ? 'Cartão de Crédito' : order.payment_method}</div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            </div>

            {/* Mapa no Drawer */}
            <Drawer open={isMapOpen} onOpenChange={setIsMapOpen}>
                <DrawerContent className="h-[80vh] rounded-t-3xl">
                    <DrawerHeader>
                        <DrawerTitle className="text-center">Acompanhando Entrega</DrawerTitle>
                    </DrawerHeader>
                    <div className="w-full h-full bg-gray-100 relative">
                        {isMapsLoaded && courierLocation ? (
                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                center={courierLocation}
                                zoom={17}
                                onLoad={onLoadMap}
                                options={{
                                    disableDefaultUI: true,
                                    zoomControl: false,
                                    styles: cleanMapStyles // Estilo aplicado
                                }}
                            >
                                <MarkerF
                                    position={courierLocation}
                                    icon={getVehicleIcon()}
                                />
                            </GoogleMap>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <p>{isMapsLoaded ? "Aguardando sinal GPS do entregador..." : "Carregando mapa..."}</p>
                            </div>
                        )}
                    </div>
                </DrawerContent>
            </Drawer>

            {/* Modal de Avaliação Logística */}
            <DeliveryReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                orderId={id || ""}
                courierId={order?.courier_id}
                courierName={order?.couriers?.name || "Entregador"}
            />
        </div>
    );
}
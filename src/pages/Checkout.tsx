import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Wallet, Bike, Store, Loader2, Plus, Clock, Coins, User, Trash2, ShoppingBag, Minus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export default function Checkout() {
    const { items, total: cartSubtotal, marketId, clearCart, removeItem, updateQuantity } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [marketConfig, setMarketConfig] = useState<any>(null);

    // Dados do Cliente
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState(""); // Novo estado para garantir o telefone

    // Coins Logic
    const [userCoins, setUserCoins] = useState(0);
    const [useCoins, setUseCoins] = useState(false);
    const [coinsToUse, setCoinsToUse] = useState(0);

    // Dados do Pedido
    const [orderType, setOrderType] = useState("delivery");
    const [paymentMethod, setPaymentMethod] = useState("credit");
    const [changeFor, setChangeFor] = useState("");

    // Endereços
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState({ name: "Casa", street: "", number: "", neighborhood: "", complement: "" });
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate("/auth", { state: { from: location } });
                return;
            }
            setUser(session.user);

            // Tenta pegar nome do metadado do auth
            const metadata = session.user.user_metadata;
            const googleName = metadata?.full_name || metadata?.name || metadata?.given_name || session.user.email?.split('@')[0];
            if (googleName) setCustomerName(googleName);

            fetchUserData(session.user.id);
            fetchMarketConfig();
        };
        checkAuth();
    }, [navigate, location, marketId]);

    useEffect(() => {
        if (items.length === 0) navigate("/");
    }, [items, navigate]);

    const fetchUserData = async (userId: string) => {
        // 1. Busca Endereços
        const { data: addrData } = await supabase.from('user_addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (addrData && addrData.length > 0) {
            setSavedAddresses(addrData);
            setSelectedAddressId(addrData[0].id);
        }

        // 2. Busca Perfil (Coins e Telefone)
        // Atenção: Verifica se a coluna chama 'phone' ou 'phone_number' no seu banco. Usei 'phone_number' conforme seu schema.
        const { data: profile } = await supabase.from('profiles').select('coin_balance, phone_number, full_name').eq('id', userId).single();

        if (profile) {
            setUserCoins(profile.coin_balance || 0);
            // Se tiver telefone no perfil, já preenche o estado para envio
            if (profile.phone_number) setCustomerPhone(profile.phone_number);
            // Se o nome do auth falhou, tenta do perfil
            if (!customerName && profile.full_name) setCustomerName(profile.full_name);
        }

        setLoading(false);
    };

    const fetchMarketConfig = async () => {
        if (!marketId) return;
        const { data } = await supabase.from('markets').select('delivery_fee, delivery_time_min, delivery_time_max, coin_balance').eq('id', marketId).single();
        if (data) setMarketConfig(data);
    };

    const handleSaveAddress = async () => {
        if (!newAddress.street || !newAddress.number || !newAddress.neighborhood) {
            return toast({ title: "Endereço incompleto", variant: "destructive" });
        }
        const { data, error } = await supabase.from('user_addresses').insert({
            user_id: user.id,
            ...newAddress
        }).select().single();

        if (error) {
            toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        } else {
            setSavedAddresses([data, ...savedAddresses]);
            setSelectedAddressId(data.id);
            setIsAddressModalOpen(false);
            toast({ title: "Endereço adicionado!" });
        }
    };

    const handleClearCart = () => {
        if (window.confirm("Tem certeza que deseja esvaziar sua sacola?")) {
            clearCart();
        }
    };

    // Cálculos Financeiros
    const currentFee = orderType === 'delivery' ? (marketConfig?.delivery_fee || 0) : 0;
    const coinValue = 0.05;
    const maxDiscount = cartSubtotal;
    const maxCoinsAllowed = Math.floor(maxDiscount / coinValue);
    const marketAcceptsCoins = (marketConfig?.coin_balance || 0) > 0;

    useEffect(() => {
        if (useCoins) {
            setCoinsToUse(Math.min(userCoins, maxCoinsAllowed));
        } else {
            setCoinsToUse(0);
        }
    }, [useCoins, userCoins, maxCoinsAllowed]);

    const discountValue = coinsToUse * coinValue;
    const finalTotal = Math.max(0, (cartSubtotal + currentFee) - discountValue);

    const handlePlaceOrder = async () => {
        if (orderType === "delivery" && !selectedAddressId) {
            return toast({ title: "Selecione um endereço", variant: "destructive" });
        }

        if (!customerName.trim()) {
            return toast({ title: "Por favor, informe seu nome", variant: "destructive" });
        }

        setSubmitting(true);
        try {
            const addr = savedAddresses.find(a => a.id === selectedAddressId) || {};
            const finalName = customerName.trim() || "Cliente App";

            // Garante que o telefone vá no JSON de endereço também por segurança
            const addressDataWithPhone = { ...addr, phone: customerPhone };

            let orderId;

            // CENÁRIO 1: Pagamento com Coins (RPC)
            if (useCoins && coinsToUse > 0) {
                const { data, error } = await supabase.rpc('create_order_with_coins', {
                    p_market_id: marketId,
                    p_user_id: user.id,
                    p_items: items,
                    p_subtotal: cartSubtotal,
                    p_delivery_fee: currentFee,
                    p_coins_to_use: coinsToUse,
                    p_address_data: addressDataWithPhone,
                    p_order_type: orderType,
                    p_payment_method: paymentMethod
                });

                if (error) throw error;
                orderId = data;

                // Atualiza dados extras que a RPC pode não ter coberto
                if (orderId) {
                    await supabase.from('orders').update({
                        customer_name: finalName,
                        customer_phone: customerPhone // Salva telefone explicitamente
                    }).eq('id', orderId);
                }

            } else {
                // CENÁRIO 2: Pagamento Normal (Insert direto)
                const { data: order, error: orderError } = await supabase.from("orders").insert({
                    market_id: marketId,
                    user_id: user.id,
                    customer_name: finalName,
                    customer_phone: customerPhone, // AQUI: Envia o telefone recuperado do perfil
                    order_type: orderType,
                    status: "pending",
                    payment_status: "pending",
                    payment_method: paymentMethod,
                    total_amount: finalTotal,
                    delivery_fee: currentFee,
                    estimated_min: marketConfig?.delivery_time_min,
                    estimated_max: marketConfig?.delivery_time_max,
                    address_street: addr.street,
                    address_number: addr.number,
                    address_neighborhood: addr.neighborhood,
                    address_complement: addr.complement,
                    address_data: addressDataWithPhone,
                    change_for: paymentMethod === 'cash' ? Number(changeFor) : null,
                    coins_used: 0,
                    discount_amount: 0
                }).select().single();

                if (orderError) throw orderError;
                orderId = order.id;
            }

            // Inserir Itens do Pedido
            if (orderId) {
                if (!useCoins || coinsToUse === 0) {
                    const orderItems = items.map(item => ({
                        order_id: orderId,
                        market_id: marketId,
                        menu_item_id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        unit_price: item.price,
                        total_price: item.price * item.quantity,
                        notes: item.notes
                    }));

                    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
                    if (itemsError) console.error("Erro itens:", itemsError);
                }
            }

            clearCart();
            toast({ title: "Pedido Enviado!", className: "bg-green-600 text-white" });
            navigate(`/order/${orderId}`);

        } catch (error: any) {
            console.error(error);
            toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-32 font-sans">
            <div className="bg-white p-4 sticky top-0 z-10 border-b flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2"><ArrowLeft className="w-5 h-5" /></Button>
                    <h1 className="text-lg font-bold text-gray-800">Finalizar Pedido</h1>
                </div>
                {items.length > 0 && (
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleClearCart}>
                        <Trash2 className="w-5 h-5" />
                    </Button>
                )}
            </div>

            <div className="p-4 space-y-6 max-w-lg mx-auto">

                {/* --- RESUMO DO PEDIDO E EDIÇÃO --- */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" /> Resumo do Pedido
                    </h2>
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div key={item.cartItemId} className="flex justify-between items-start pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                <div className="flex-1 pr-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-700 text-sm">{item.quantity}x</span>
                                        <span className="text-sm text-gray-900 font-medium line-clamp-1">{item.name}</span>
                                    </div>
                                    {item.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-2">Obs: {item.notes}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-sm font-bold text-gray-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 h-8">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-md hover:bg-white"
                                            onClick={() => item.quantity > 1 ? updateQuantity(item.cartItemId, item.quantity - 1) : removeItem(item.cartItemId)}
                                        >
                                            <Minus className="w-3 h-3 text-gray-600" />
                                        </Button>
                                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-md hover:bg-white"
                                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                        >
                                            <Plus className="w-3 h-3 text-gray-600" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DADOS PESSOAIS */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><User className="w-4 h-4" /> Quem vai receber?</h2>
                    <Input
                        placeholder="Nome completo"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="bg-white border-gray-200"
                    />
                    {/* Input de telefone removido visualmente pois já vem do perfil, mas o estado existe */}
                </div>

                <Tabs defaultValue="delivery" onValueChange={setOrderType} className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-3">
                        <TabsTrigger value="delivery"><Bike className="w-4 h-4 mr-2" /> Delivery</TabsTrigger>
                        <TabsTrigger value="pickup"><Store className="w-4 h-4 mr-2" /> Retirada</TabsTrigger>
                    </TabsList>

                    <TabsContent value="delivery" className="space-y-3">
                        <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><MapPin className="w-4 h-4" /> Onde entregar?</h2>
                        {savedAddresses.map(addr => (
                            <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-4 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all ${selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'border-transparent bg-white shadow-sm'}`}>
                                <div>
                                    <div className="font-bold text-gray-900">{addr.name}</div>
                                    <div className="text-sm text-gray-500">{addr.street}, {addr.number} - {addr.neighborhood}</div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedAddressId === addr.id ? 'border-primary' : 'border-gray-300'}`}>
                                    {selectedAddressId === addr.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                                </div>
                            </div>
                        ))}
                        <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
                            <DialogTrigger asChild><Button variant="outline" className="w-full border-dashed border-2 h-12 text-gray-500 bg-white"><Plus className="w-4 h-4 mr-2" /> Novo Endereço</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Adicionar Endereço</DialogTitle></DialogHeader>
                                <div className="space-y-3 py-2">
                                    <Input placeholder="Nome (Ex: Casa)" value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} />
                                    <div className="grid grid-cols-3 gap-2"><Input className="col-span-2" placeholder="Rua" value={newAddress.street} onChange={e => setNewAddress({ ...newAddress, street: e.target.value })} /><Input placeholder="Nº" value={newAddress.number} onChange={e => setNewAddress({ ...newAddress, number: e.target.value })} /></div>
                                    <Input placeholder="Bairro" value={newAddress.neighborhood} onChange={e => setNewAddress({ ...newAddress, neighborhood: e.target.value })} />
                                    <Input placeholder="Complemento" value={newAddress.complement} onChange={e => setNewAddress({ ...newAddress, complement: e.target.value })} />
                                    <Button className="w-full" onClick={handleSaveAddress}>Salvar Endereço</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </TabsContent>

                    <TabsContent value="pickup">
                        <div className="bg-orange-50 p-4 rounded-xl text-orange-800 text-sm border border-orange-100">Você deverá retirar o pedido no balcão do restaurante.</div>
                    </TabsContent>
                </Tabs>

                {/* SEÇÃO DE COINS */}
                {userCoins > 0 && marketAcceptsCoins && (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Coins className="w-4 h-4 text-yellow-500" /> Usar Coins
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">Saldo: {userCoins}</span>
                                <Switch checked={useCoins} onCheckedChange={setUseCoins} />
                            </div>
                        </div>

                        {useCoins && (
                            <Card className="border-yellow-200 bg-yellow-50/50 shadow-sm animate-in slide-in-from-top-2">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-center text-sm font-medium">
                                        <span>Usar: {coinsToUse} coins</span>
                                        <span className="text-green-600 font-bold">- R$ {discountValue.toFixed(2)}</span>
                                    </div>
                                    <Slider
                                        defaultValue={[coinsToUse]}
                                        max={Math.min(userCoins, maxCoinsAllowed)}
                                        step={10}
                                        value={[coinsToUse]}
                                        onValueChange={(val) => setCoinsToUse(val[0])}
                                        className="py-2"
                                    />
                                    <p className="text-xs text-gray-500 text-center">
                                        Desconto máximo permitido: R$ {maxDiscount.toFixed(2)}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </section>
                )}

                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><Wallet className="w-4 h-4" /> Pagamento</h2>
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-4">
                            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                                {finalTotal > 0 ? (
                                    <>
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer bg-white"><RadioGroupItem value="credit" id="r1" /><Label htmlFor="r1" className="cursor-pointer flex-1">Crédito (Entrega)</Label></div>
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer bg-white"><RadioGroupItem value="debit" id="r2" /><Label htmlFor="r2" className="cursor-pointer flex-1">Débito (Entrega)</Label></div>
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer bg-white"><RadioGroupItem value="pix" id="r3" /><Label htmlFor="r3" className="cursor-pointer flex-1">Pix (Entrega)</Label></div>
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer bg-white"><RadioGroupItem value="cash" id="r4" /><Label htmlFor="r4" className="cursor-pointer flex-1">Dinheiro</Label></div>
                                    </>
                                ) : (
                                    <div className="text-center text-green-600 font-bold py-2 bg-green-50 rounded-lg">
                                        Pago integralmente com Coins! 🎉
                                    </div>
                                )}
                            </RadioGroup>
                            {paymentMethod === 'cash' && finalTotal > 0 && (<div className="mt-3"><Label>Troco para quanto?</Label><Input type="number" placeholder="Ex: 50" value={changeFor} onChange={e => setChangeFor(e.target.value)} className="mt-1 bg-white" /></div>)}
                        </CardContent>
                    </Card>
                </section>

                {/* Resumo de Valores */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>R$ {cartSubtotal.toFixed(2)}</span></div>
                    {orderType === 'delivery' && (
                        <div className="flex justify-between text-gray-600">
                            <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> Taxa de Entrega</span>
                            <span>R$ {currentFee.toFixed(2)}</span>
                        </div>
                    )}
                    {discountValue > 0 && (
                        <div className="flex justify-between text-green-600 font-bold">
                            <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Desconto Coins</span>
                            <span>- R$ {discountValue.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Tempo Estimado</span>
                        <span>{marketConfig?.delivery_time_min}-{marketConfig?.delivery_time_max} min</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2"><span>Total</span><span>R$ {finalTotal.toFixed(2)}</span></div>
                </div>

                <Button className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-xl rounded-xl" onClick={handlePlaceOrder} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin mr-2" /> : `Finalizar Pedido`}
                </Button>
            </div>
        </div>
    );
}
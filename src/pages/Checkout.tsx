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
import { ArrowLeft, MapPin, Wallet, Bike, Store, Loader2, Plus, Clock, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Checkout() {
    const { items, total: cartSubtotal, marketId, clearCart } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [marketConfig, setMarketConfig] = useState<any>(null);

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
            fetchAddresses(session.user.id);
            fetchMarketConfig();
        };
        checkAuth();
    }, [navigate, location, marketId]);

    useEffect(() => {
        if (items.length === 0) navigate("/");
    }, [items, navigate]);

    const fetchAddresses = async (userId: string) => {
        const { data } = await supabase.from('user_addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (data && data.length > 0) {
            setSavedAddresses(data);
            setSelectedAddressId(data[0].id);
        }
        setLoading(false);
    };

    const fetchMarketConfig = async () => {
        if (!marketId) return;
        const { data } = await supabase.from('markets').select('delivery_fee, delivery_time_min, delivery_time_max').eq('id', marketId).single();
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

    const handlePlaceOrder = async () => {
        if (orderType === "delivery" && !selectedAddressId) {
            return toast({ title: "Selecione um endereço", variant: "destructive" });
        }

        setSubmitting(true);
        try {
            const addr = savedAddresses.find(a => a.id === selectedAddressId) || {};

            // Cálculos Finais
            const fee = orderType === 'delivery' ? (marketConfig?.delivery_fee || 0) : 0;
            const finalTotal = cartSubtotal + fee;

            // 1. Criar o Pedido
            const { data: order, error: orderError } = await supabase.from("orders").insert({
                market_id: marketId,
                user_id: user.id,
                customer_name: user.email?.split('@')[0],
                customer_phone: "",
                order_type: orderType,
                status: "pending",
                payment_status: "pending",
                payment_method: paymentMethod,

                // Valores
                total_amount: finalTotal,
                delivery_fee: fee,
                estimated_min: marketConfig?.delivery_time_min,
                estimated_max: marketConfig?.delivery_time_max,

                // Endereço Snapshot
                address_street: addr.street,
                address_number: addr.number,
                address_neighborhood: addr.neighborhood,
                address_complement: addr.complement,
                change_for: paymentMethod === 'cash' ? Number(changeFor) : null
            }).select().single();

            if (orderError) throw orderError;

            // 2. Inserir Itens
            const orderItems = items.map(item => ({
                order_id: order.id,
                market_id: marketId,
                menu_item_id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                total_price: item.price * item.quantity,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
            if (itemsError) throw itemsError;

            clearCart();
            toast({ title: "Pedido Enviado!", className: "bg-green-600 text-white" });
            navigate(`/order/${order.id}`);

        } catch (error: any) {
            toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    // Totais para exibição
    const currentFee = orderType === 'delivery' ? (marketConfig?.delivery_fee || 0) : 0;
    const currentTotal = cartSubtotal + currentFee;

    return (
        <div className="min-h-screen bg-gray-50 pb-32 font-sans">
            <div className="bg-white p-4 sticky top-0 z-10 border-b flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
                <h1 className="text-lg font-bold">Finalizar Pedido</h1>
            </div>

            <div className="p-4 space-y-6 max-w-lg mx-auto">
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
                            <DialogTrigger asChild><Button variant="outline" className="w-full border-dashed border-2 h-12 text-gray-500"><Plus className="w-4 h-4 mr-2" /> Novo Endereço</Button></DialogTrigger>
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

                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><Wallet className="w-4 h-4" /> Pagamento</h2>
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-4">
                            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer"><RadioGroupItem value="credit" id="r1" /><Label htmlFor="r1" className="cursor-pointer flex-1">Crédito (Entrega)</Label></div>
                                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer"><RadioGroupItem value="debit" id="r2" /><Label htmlFor="r2" className="cursor-pointer flex-1">Débito (Entrega)</Label></div>
                                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer"><RadioGroupItem value="pix" id="r3" /><Label htmlFor="r3" className="cursor-pointer flex-1">Pix (Entrega)</Label></div>
                                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer"><RadioGroupItem value="cash" id="r4" /><Label htmlFor="r4" className="cursor-pointer flex-1">Dinheiro</Label></div>
                            </RadioGroup>
                            {paymentMethod === 'cash' && (<div className="mt-3"><Label>Troco para quanto?</Label><Input type="number" placeholder="Ex: 50" value={changeFor} onChange={e => setChangeFor(e.target.value)} className="mt-1" /></div>)}
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
                    <div className="flex justify-between text-gray-600">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Tempo Estimado</span>
                        <span>{marketConfig?.delivery_time_min}-{marketConfig?.delivery_time_max} min</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2"><span>Total</span><span>R$ {currentTotal.toFixed(2)}</span></div>
                </div>

                <Button className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-xl rounded-xl" onClick={handlePlaceOrder} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin mr-2" /> : `Finalizar Pedido`}
                </Button>
            </div>
        </div>
    );
}
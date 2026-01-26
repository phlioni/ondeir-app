import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash, Store, Save, LogOut } from "lucide-react";

export default function Dashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Estado do Mercado
    const [market, setMarket] = useState<any>(null);
    const [marketForm, setMarketForm] = useState({
        name: "",
        category: "",
        description: "",
        address: "",
        amenities: "", // Será convertido para array
        cover_image: ""
    });

    // Estado dos Produtos
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ name: "", price: "", description: "", category: "Comida" });
    const [isAddingItem, setIsAddingItem] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate("/auth");
        setUser(user);

        // Buscar mercado do usuário
        const { data: userMarket } = await supabase
            .from("markets")
            .select("*")
            .eq("owner_id", user.id)
            .single();

        if (userMarket) {
            setMarket(userMarket);
            setMarketForm({
                name: userMarket.name,
                category: userMarket.category,
                description: userMarket.description || "",
                address: userMarket.address || "",
                amenities: userMarket.amenities ? userMarket.amenities.join(", ") : "",
                cover_image: userMarket.cover_image || ""
            });
            fetchMenu(userMarket.id);
        }
        setLoading(false);
    };

    const fetchMenu = async (marketId: string) => {
        const { data } = await supabase
            .from("menu_items")
            .select("*")
            .eq("market_id", marketId)
            .order("created_at", { ascending: false });
        setMenuItems(data || []);
    };

    const handleSaveMarket = async () => {
        setLoading(true);
        try {
            const payload = {
                name: marketForm.name,
                category: marketForm.category,
                description: marketForm.description,
                address: marketForm.address,
                amenities: marketForm.amenities.split(",").map(s => s.trim()).filter(Boolean),
                cover_image: marketForm.cover_image,
                owner_id: user.id,
                // Mock de lat/lng - Num app real usaria API de Geocoding aqui
                latitude: -23.550520 + (Math.random() * 0.01),
                longitude: -46.633308 + (Math.random() * 0.01)
            };

            if (market) {
                await supabase.from("markets").update(payload).eq("id", market.id);
                toast({ title: "Atualizado!" });
            } else {
                const { data, error } = await supabase.from("markets").insert(payload).select().single();
                if (error) throw error;
                setMarket(data);
            }
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!market) return;
        setIsAddingItem(true);
        try {
            const { error } = await supabase.from("menu_items").insert({
                market_id: market.id,
                name: newItem.name,
                description: newItem.description,
                price: parseFloat(newItem.price),
                category: newItem.category
            });

            if (error) throw error;

            setNewItem({ name: "", price: "", description: "", category: "Comida" });
            fetchMenu(market.id);
            toast({ title: "Item adicionado!" });
        } catch (error) {
            console.error(error);
        } finally {
            setIsAddingItem(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        await supabase.from("menu_items").delete().eq("id", id);
        fetchMenu(market!.id);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Store className="text-primary" /> Painel do Parceiro
                </h1>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                </Button>
            </header>

            <main className="container mx-auto max-w-4xl p-4">
                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="info">Meu Estabelecimento</TabsTrigger>
                        <TabsTrigger value="menu" disabled={!market}>Cardápio & Produtos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações Básicas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nome do Local</label>
                                        <Input
                                            value={marketForm.name}
                                            onChange={e => setMarketForm({ ...marketForm, name: e.target.value })}
                                            placeholder="Ex: Bar do Zé"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Categoria</label>
                                        <Select
                                            value={marketForm.category}
                                            onValueChange={v => setMarketForm({ ...marketForm, category: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Bar">Bar</SelectItem>
                                                <SelectItem value="Restaurante">Restaurante</SelectItem>
                                                <SelectItem value="Balada">Balada</SelectItem>
                                                <SelectItem value="Café">Café</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Descrição (Para a IA encontrar você)</label>
                                    <Textarea
                                        value={marketForm.description}
                                        onChange={e => setMarketForm({ ...marketForm, description: e.target.value })}
                                        placeholder="Descreva a vibe, pratos principais, música..."
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Endereço</label>
                                    <Input
                                        value={marketForm.address}
                                        onChange={e => setMarketForm({ ...marketForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Comodidades (Separadas por vírgula)</label>
                                    <Input
                                        value={marketForm.amenities}
                                        onChange={e => setMarketForm({ ...marketForm, amenities: e.target.value })}
                                        placeholder="wifi, musica ao vivo, area externa, pet friendly"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">URL da Imagem de Capa</label>
                                    <Input
                                        value={marketForm.cover_image}
                                        onChange={e => setMarketForm({ ...marketForm, cover_image: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>

                                <Button className="w-full mt-4" onClick={handleSaveMarket} disabled={loading}>
                                    <Save className="w-4 h-4 mr-2" /> Salvar Informações
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="menu">
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Adicionar Novo Item</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Input
                                        placeholder="Nome do produto"
                                        value={newItem.name}
                                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Preço (R$)"
                                        type="number"
                                        value={newItem.price}
                                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                    />
                                    <Select
                                        value={newItem.category}
                                        onValueChange={v => setNewItem({ ...newItem, category: v })}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Comida">Comida</SelectItem>
                                            <SelectItem value="Bebida">Bebida</SelectItem>
                                            <SelectItem value="Sobremesa">Sobremesa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Textarea
                                    placeholder="Descrição detalhada (Ingredientes, tamanho...)"
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                                <Button onClick={handleAddItem} disabled={isAddingItem || !newItem.name}>
                                    <Plus className="w-4 h-4 mr-2" /> Adicionar ao Menu
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4">
                            {menuItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-lg border flex justify-between items-center shadow-sm">
                                    <div>
                                        <h4 className="font-bold text-lg">{item.name}</h4>
                                        <p className="text-gray-500 text-sm">{item.description}</p>
                                        <span className="text-primary font-bold">R$ {item.price}</span>
                                        <span className="ml-3 text-xs bg-gray-100 px-2 py-1 rounded">{item.category}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteItem(item.id)}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2, Package, LogOut, User, ChevronRight, Coins, History,
  ArrowLeft, MapPin, Edit2, Camera, Plus, Trash2, ChevronDown, ChevronUp, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Dados Principais
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Edição de Perfil
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "" });
  const [uploading, setUploading] = useState(false);

  // Estados de Endereço (Novo/Edição)
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null); // ID do endereço sendo editado
  const [addressForm, setAddressForm] = useState({ name: "Casa", street: "", number: "", neighborhood: "", complement: "" });

  useEffect(() => {
    loadProfile();
  }, [navigate]);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    // 1. Carrega Perfil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    setProfile(profileData);
    setEditForm({
      full_name: profileData?.full_name || "",
      phone: profileData?.phone_number || ""
    });

    // 2. Carrega Endereços
    const { data: addrData } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setAddresses(addrData || []);

    // 3. Carrega Pedidos
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, markets(name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    setOrders(ordersData || []);
    setLoading(false);
  };

  // --- AÇÕES DE PERFIL (FOTO/NOME) ---
  const handleSaveProfile = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name, phone_number: editForm.phone })
      .eq('id', user.id);

    if (error) toast({ title: "Erro ao atualizar", variant: "destructive" });
    else {
      toast({ title: "Perfil atualizado!" });
      setIsEditing(false);
      loadProfile();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      await supabase.storage.from('avatars').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

      toast({ title: "Foto atualizada!" });
      loadProfile();
    } catch (error) {
      toast({ title: "Erro no upload", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // --- AÇÕES DE ENDEREÇO (CRIAR/EDITAR/EXCLUIR) ---

  // Abre o modal para criar um novo
  const openNewAddress = () => {
    setEditingAddressId(null);
    setAddressForm({ name: "Casa", street: "", number: "", neighborhood: "", complement: "" });
    setIsAddressModalOpen(true);
  };

  // Abre o modal para editar um existente
  const openEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      name: addr.name,
      street: addr.street,
      number: addr.number,
      neighborhood: addr.neighborhood,
      complement: addr.complement || ""
    });
    setIsAddressModalOpen(true);
  };

  // Salva (Insert ou Update dependendo do estado)
  const handleSaveAddress = async () => {
    if (!addressForm.street || !addressForm.number || !addressForm.neighborhood) {
      return toast({ title: "Preencha rua, número e bairro", variant: "destructive" });
    }

    let error;

    if (editingAddressId) {
      // UPDATE
      const { error: updateError } = await supabase.from('user_addresses')
        .update({
          name: addressForm.name,
          street: addressForm.street,
          number: addressForm.number,
          neighborhood: addressForm.neighborhood,
          complement: addressForm.complement
        })
        .eq('id', editingAddressId);
      error = updateError;
    } else {
      // INSERT
      const { error: insertError } = await supabase.from('user_addresses').insert({
        user_id: user.id,
        ...addressForm
      });
      error = insertError;
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingAddressId ? "Endereço atualizado!" : "Endereço adicionado!" });
      setIsAddressModalOpen(false);
      loadProfile();
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Excluir este endereço?")) return;
    await supabase.from('user_addresses').delete().eq('id', id);
    loadProfile();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">

      {/* HEADER E INFO DO USUÁRIO */}
      <div className="bg-white p-6 border-b shadow-sm relative">
        <div className="flex justify-between items-start mb-4">
          <Button variant="ghost" size="icon" className="-ml-2 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Button>
          <Button variant="ghost" size="sm" className="text-primary font-bold" onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}>
            {isEditing ? <><Save className="w-4 h-4 mr-2" /> Salvar</> : <><Edit2 className="w-4 h-4 mr-2" /> Editar</>}
          </Button>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border-4 border-white shadow-lg overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12" />
              )}
            </div>
            <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
              <Camera className="w-8 h-8" />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
            {uploading && <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}
          </div>

          {isEditing ? (
            <div className="w-full max-w-xs mt-4 space-y-3 animate-in fade-in">
              <div className="space-y-1">
                <Label>Nome Completo</Label>
                <Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
            </div>
          ) : (
            <div className="text-center mt-3">
              <h1 className="text-xl font-bold text-gray-900">{profile?.full_name || "Usuário sem nome"}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-sm text-gray-500">{profile?.phone_number || "Sem telefone"}</p>
            </div>
          )}
        </div>

        {/* CARD DE COINS */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-xl shadow-lg text-white mt-6 flex justify-between items-center cursor-pointer active:scale-95 transition-transform">
              <div>
                <p className="text-xs font-medium text-yellow-50 opacity-90 mb-1">Seu Saldo</p>
                <div className="flex items-center gap-2">
                  <Coins className="w-6 h-6 fill-yellow-200 text-yellow-100" />
                  <span className="text-3xl font-bold">{profile?.coin_balance || 0}</span>
                  <span className="text-sm font-medium opacity-80">Coins</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <History className="w-3 h-3" /> Ver Extrato
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Extrato de Coins</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {orders.filter(o => o.status === 'delivered' || o.coins_used > 0).length === 0 ? (
                <p className="text-center text-gray-500 py-4">Nenhuma movimentação ainda.</p>
              ) : (
                orders.map(order => {
                  const earned = order.status === 'delivered' ? Math.floor(order.total_amount) : 0;
                  const spent = order.coins_used || 0;
                  if (!earned && !spent) return null;
                  return (
                    <div key={order.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div><p className="font-bold text-sm">{order.markets?.name}</p><p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p></div>
                      <div className="text-right space-y-1">
                        {earned > 0 && <div className="text-green-600 font-bold text-sm flex items-center justify-end gap-1">+{earned} <Coins className="w-3 h-3" /></div>}
                        {spent > 0 && <div className="text-red-500 font-bold text-sm flex items-center justify-end gap-1">-{spent} <Coins className="w-3 h-3" /></div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4 space-y-6">

        {/* SEÇÃO DE ENDEREÇOS */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Meus Endereços
            </h2>

            {/* BOTÃO ADICIONAR QUE ABRE O MODAL LIMPO */}
            <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={openNewAddress}>
              <Plus className="w-3 h-3 mr-1" /> Adicionar
            </Button>

            {/* MODAL DE ENDEREÇO (COMPARTILHADO CRIAR/EDITAR) */}
            <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAddressId ? "Editar Endereço" : "Novo Endereço"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Input placeholder="Nome (Ex: Casa, Trabalho)" value={addressForm.name} onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2">
                    <Input className="col-span-2" placeholder="Rua" value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })} />
                    <Input placeholder="Nº" value={addressForm.number} onChange={e => setAddressForm({ ...addressForm, number: e.target.value })} />
                  </div>
                  <Input placeholder="Bairro" value={addressForm.neighborhood} onChange={e => setAddressForm({ ...addressForm, neighborhood: e.target.value })} />
                  <Input placeholder="Complemento" value={addressForm.complement} onChange={e => setAddressForm({ ...addressForm, complement: e.target.value })} />
                  <Button className="w-full" onClick={handleSaveAddress}>
                    {editingAddressId ? "Salvar Alterações" : "Adicionar Endereço"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {addresses.length === 0 ? <p className="text-sm text-gray-400 text-center py-4 bg-white rounded-lg border border-dashed">Nenhum endereço salvo.</p> :
              addresses.map(addr => (
                <div key={addr.id} className="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{addr.name}</p>
                    <p className="text-xs text-gray-500">{addr.street}, {addr.number} - {addr.neighborhood}</p>
                  </div>
                  <div className="flex gap-1">
                    {/* BOTÃO EDITAR */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary" onClick={() => openEditAddress(addr)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {/* BOTÃO EXCLUIR */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => handleDeleteAddress(addr.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* SEÇÃO DE PEDIDOS (COLLAPSIBLE) */}
        <Collapsible open={isOrdersOpen} onOpenChange={setIsOrdersOpen} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
              <Package className="w-4 h-4" /> Histórico de Pedidos
            </h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOrdersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-3 animate-in slide-in-from-top-2">
            {orders.length === 0 && <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed">Nenhum pedido ainda.</div>}
            {orders.map(order => (
              <Card
                key={order.id}
                className="border-0 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => navigate(`/order/${order.id}`)}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">{order.markets?.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <Badge variant={order.status === 'delivered' ? 'outline' : 'default'} className={order.status === 'delivered' ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                      {order.status === 'pending' && 'Enviado'}
                      {order.status === 'confirmed' && 'Confirmado'}
                      {order.status === 'preparing' && 'Preparando'}
                      {order.status === 'ready' && 'Saiu para Entrega'}
                      {order.status === 'delivered' && 'Entregue'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-gray-900 mb-1">R$ {order.total_amount.toFixed(2)}</span>
                    <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
          {!isOrdersOpen && orders.length > 0 && (
            <div
              className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsOrdersOpen(true)}
            >
              <span className="text-sm font-medium text-gray-600">Ver último pedido: {orders[0]?.markets?.name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </Collapsible>

        <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 mt-8" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
        </Button>
      </div>
    </div>
  );
}
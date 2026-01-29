import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Package, LogOut, User, ChevronRight, Coins, History, ArrowLeft } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // 1. Carrega Perfil (Saldo de Coins)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);

      // 2. Carrega Pedidos do Usuário
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, markets(name)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);
      setLoading(false);
    };
    loadProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header do Perfil */}
      <div className="bg-white p-6 border-b">

        {/* BOTÃO DE VOLTAR (NOVO) */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-3 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.email?.split('@')[0]}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* CARD DE COINS */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-xl shadow-lg text-white mb-6 flex justify-between items-center cursor-pointer active:scale-95 transition-transform">
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
            <DialogHeader>
              <DialogTitle>Extrato de Coins</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {orders.filter(o => o.status === 'delivered' || o.coins_used > 0).length === 0 ? (
                <p className="text-center text-gray-500 py-4">Nenhuma movimentação ainda.</p>
              ) : (
                orders.map(order => {
                  // Lógica visual do extrato baseada nos pedidos
                  const earned = order.status === 'delivered' ? Math.floor(order.total_amount) : 0;
                  const spent = order.coins_used || 0;

                  if (!earned && !spent) return null;

                  return (
                    <div key={order.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div>
                        <p className="font-bold text-sm">{order.markets?.name}</p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right space-y-1">
                        {earned > 0 && (
                          <div className="text-green-600 font-bold text-sm flex items-center justify-end gap-1">
                            +{earned} <Coins className="w-3 h-3" />
                          </div>
                        )}
                        {spent > 0 && (
                          <div className="text-red-500 font-bold text-sm flex items-center justify-end gap-1">
                            -{spent} <Coins className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
        </Button>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-3 ml-1 flex items-center gap-2">
            <Package className="w-4 h-4" /> Meus Pedidos
          </h2>
          <div className="space-y-3">
            {orders.length === 0 && <div className="text-center py-10 text-gray-400">Nenhum pedido ainda.</div>}
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
                      {new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Badge variant={order.status === 'delivered' ? 'outline' : 'default'} className={order.status === 'delivered' ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                      {order.status === 'pending' && 'Enviado'}
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
          </div>
        </div>
      </div>
    </div>
  );
}
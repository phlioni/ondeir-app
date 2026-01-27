import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, LogOut, MapPin, User, ChevronRight } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
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

      // Carrega Pedidos do Usuário
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
      <div className="bg-white p-6 border-b">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.email?.split('@')[0]}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
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
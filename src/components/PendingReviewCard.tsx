import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Utensils, X } from "lucide-react"; // Removido ícone Coins
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export function PendingReviewCard() {
    const [pendingOrder, setPendingOrder] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const checkPending = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: orders } = await supabase
                .from('orders')
                .select('*, markets(name, cover_image)')
                .eq('user_id', user.id)
                .eq('status', 'delivered')
                .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(1);

            if (orders && orders.length > 0) {
                const order = orders[0];
                const { count } = await supabase
                    .from('reviews')
                    .select('*', { count: 'exact', head: true })
                    .eq('order_id', order.id)
                    .eq('target_type', 'restaurant');

                if (count === 0) {
                    setPendingOrder(order);
                }
            }
        };
        checkPending();
    }, []);

    const handleSubmit = async () => {
        if (!pendingOrder) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('reviews').insert({
            order_id: pendingOrder.id,
            user_id: user.id,
            target_type: 'restaurant',
            target_id: pendingOrder.market_id,
            rating,
            comment,
            tags: []
        });

        if (!error) {
            // Apenas mensagem de sucesso
            toast({
                title: "Avaliação enviada!",
                description: "Obrigado! Sua opinião ajuda muito.",
                className: "bg-green-50 border-green-200"
            });
            setPendingOrder(null);
            setIsOpen(false);
        } else {
            toast({ title: "Erro", description: "Tente novamente.", variant: "destructive" });
        }
    };

    if (!pendingOrder || !isVisible) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div className="px-4 mt-2 animate-in slide-in-from-top-5 w-full max-w-md mx-auto relative z-20">
                <Card className="bg-white border-l-4 border-l-orange-500 border-y-0 border-r-0 shadow-2xl p-4 flex items-center justify-between relative overflow-hidden group cursor-pointer hover:bg-gray-50 transition-colors">

                    <button
                        onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
                        className="absolute top-1 right-1 p-1 text-gray-300 hover:text-gray-500 z-10"
                    >
                        <X className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                            <Utensils className="w-6 h-6 text-orange-600" />
                        </div>

                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1">
                                Avaliação Pendente
                            </span>
                            <span className="text-sm font-bold text-gray-900 leading-tight">
                                Como estava o <br />
                                <span className="text-base text-black">{pendingOrder.markets?.name}?</span>
                            </span>
                        </div>
                    </div>

                    <DialogTrigger asChild>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md rounded-full px-4 h-9 text-xs">
                            Avaliar
                        </Button>
                    </DialogTrigger>
                </Card>
            </div>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">Como estava?</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                    <p className="text-center text-gray-500 text-sm">
                        Avalie o <strong>{pendingOrder.markets?.name}</strong> para ajudar outros clientes.
                    </p>

                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="focus:outline-none transition-all hover:scale-125 active:scale-95"
                            >
                                <Star
                                    className={`w-10 h-10 transition-colors ${star <= rating
                                            ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                            : "text-gray-200"
                                        }`}
                                />
                            </button>
                        ))}
                    </div>

                    <div className="w-full space-y-2">
                        <label className="text-xs font-bold text-gray-700 ml-1">Comentário (Opcional)</label>
                        <Textarea
                            placeholder="O lanche estava saboroso? Chegou quente?"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            maxLength={150} // LIMITE
                        />
                        <p className="text-[10px] text-right text-gray-400">
                            {comment.length}/150
                        </p>
                    </div>

                    <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg font-bold shadow-lg gap-2"
                        onClick={handleSubmit}
                        disabled={rating === 0}
                    >
                        Enviar Avaliação
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
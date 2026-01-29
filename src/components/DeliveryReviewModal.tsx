import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Bike, Smartphone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DeliveryReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    courierId?: string;
    courierName?: string;
}

const DRIVER_TAGS = ["Rápido", "Educado", "Cuidado com o pedido", "Simpático"];

export function DeliveryReviewModal({ isOpen, onClose, orderId, courierId, courierName }: DeliveryReviewModalProps) {
    const [step, setStep] = useState<'driver' | 'platform'>('driver');
    const [rating, setRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitStep = async () => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const targetType = step === 'driver' ? 'driver' : 'platform';
            const targetId = step === 'driver' ? courierId : null;

            // Se for driver e não tiver ID, pula para plataforma
            if (step === 'driver' && !courierId) {
                setStep('platform');
                setRating(0);
                setIsSubmitting(false);
                return;
            }

            // 1. Salva a avaliação
            const { error } = await supabase.from('reviews').insert({
                order_id: orderId,
                user_id: user.id,
                target_type: targetType,
                target_id: targetId,
                rating,
                tags: selectedTags,
                comment: comment || null
            });

            if (error) throw error;

            // 2. Lógica de transição
            if (step === 'driver') {
                setStep('platform');
                setRating(0);
                setSelectedTags([]);
                setComment("");
            } else {
                // Última etapa (Plataforma) - Apenas finaliza
                toast({
                    title: "Avaliação enviada!",
                    description: "Obrigado por ajudar a melhorar o Ondeir.",
                    className: "bg-green-50 border-green-200"
                });
                onClose();
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível enviar a avaliação.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag));
        } else {
            setSelectedTags(prev => [...prev, tag]);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        {step === 'driver' ? <Bike className="w-6 h-6 text-primary" /> : <Smartphone className="w-6 h-6 text-primary" />}
                    </div>
                    <DialogTitle className="text-center">
                        {step === 'driver' ? `Como foi a entrega de ${courierName}?` : "O que achou do App?"}
                    </DialogTitle>
                    <DialogDescription className="text-center flex items-center justify-center gap-1">
                        {step === 'driver' ? "Avalie a entrega e ajude a comunidade." : "Sua opinião é muito importante."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">
                    {/* Estrelas */}
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110 focus:outline-none">
                                <Star className={`w-8 h-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                            </button>
                        ))}
                    </div>

                    {/* Tags (Apenas para Driver) */}
                    {step === 'driver' && rating >= 4 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {DRIVER_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`text-xs px-3 py-1 rounded-full border transition-all ${selectedTags.includes(tag) ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200"}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Comentário (Obrigatório se nota baixa) */}
                    {(rating > 0 && rating <= 3) && (
                        <div className="w-full space-y-1">
                            <Textarea
                                placeholder="Conte o que houve..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="text-sm"
                                maxLength={150} // LIMITE
                            />
                            <p className="text-[10px] text-right text-gray-400">
                                {comment.length}/150
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={handleSubmitStep} disabled={rating === 0 || isSubmitting} className="w-full gap-2">
                        {step === 'driver' ? "Próximo" : "Finalizar Avaliação"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
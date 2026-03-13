import { useEffect, useState } from 'react';
import { Star, MessageSquareQuote } from 'lucide-react';
import { getEndpoint } from '@/config/api';

interface Feedback {
    name: string;
    designation: string;
    company: string;
    rating: number;
    message: string;
}

export function FeedbackBox() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const response = await fetch(getEndpoint('/api/feedbacks'));
                const data = await response.json();
                if (data.success) {
                    // Show latest first
                    setFeedbacks([...data.data].reverse());
                }
            } catch (error) {
                console.error('Failed to fetch feedbacks for box:', error);
            }
        };
        fetchFeedbacks();
    }, []);

    useEffect(() => {
        if (feedbacks.length <= 1 || isPaused) return;

        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
                setIsVisible(true);
            }, 300); // Wait for fade out
        }, 2000);

        return () => clearInterval(interval);
    }, [feedbacks, isPaused]);

    if (feedbacks.length === 0) return null;

    const current = feedbacks[currentIndex];

    return (
        <div 
            className="flex-1 min-w-[240px] max-w-[320px] bg-white/50 backdrop-blur-sm border border-primary/20 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-500 cursor-default group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className={`flex flex-col gap-1 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
                <div className="flex items-center justify-between mb-0.5">
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                                key={s} 
                                className={`w-2.5 h-2.5 ${s <= current.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'}`} 
                            />
                        ))}
                    </div>
                   <MessageSquareQuote className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary/50 transition-colors" />
                </div>
                
                <p className="text-[11px] leading-snug text-foreground/80 italic line-clamp-2 min-h-[32px]">
                    "{current.message}"
                </p>
                
                <div className="flex items-center gap-1.5 mt-1 border-t border-primary/10 pt-1">
                    <span className="text-[10px] font-bold text-primary truncate">
                        {current.name}
                    </span>
                    {current.company && (
                        <>
                            <span className="text-[8px] text-muted-foreground/50">•</span>
                            <span className="text-[9px] text-muted-foreground truncate italic">
                                {current.company}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState, useRef } from 'react';
import { Star } from 'lucide-react';
import { getEndpoint } from '@/config/api';

interface Feedback {
    name: string;
    designation: string;
    company: string;
    rating: number;
    message: string;
}

export function FeedbackMarquee() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    
    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const response = await fetch(getEndpoint('/api/feedbacks'));
                const data = await response.json();
                if (data.success) {
                    setFeedbacks(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch feedbacks for marquee:', error);
            }
        };
        fetchFeedbacks();
        
        // Refresh every minute to get latest
        const interval = setInterval(fetchFeedbacks, 60000);
        return () => clearInterval(interval);
    }, []);

    if (feedbacks.length === 0) return null;

    return (
        <div 
            className="w-full bg-primary/5 border-b border-primary/10 overflow-hidden py-2 select-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div 
                className={`flex whitespace-nowrap gap-12 ${isPaused ? 'pause-animation' : 'animate-marquee'}`}
                style={{ animationDuration: `${feedbacks.length * 10}s` }}
            >
                {/* Duplicate items for seamless scroll */}
                {[...feedbacks, ...feedbacks].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star 
                                    key={s} 
                                    className={`w-3 h-3 ${s <= item.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'}`} 
                                />
                            ))}
                        </div>
                        <span className="text-xs font-medium text-foreground/80 italic">
                            "{item.message.length > 100 ? item.message.substring(0, 100) + '...' : item.message}"
                        </span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                            — {item.name}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee linear infinite;
                    display: flex;
                    width: max-content;
                }
                .pause-animation {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}

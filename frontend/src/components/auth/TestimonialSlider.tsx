import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { getEndpoint } from '@/config/api';

interface Feedback {
  name: string;
  designation: string;
  company: string;
  rating: number;
  message: string;
}

export function TestimonialSlider() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const response = await fetch(getEndpoint('/api/feedbacks'));
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setFeedbacks(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
      }
    };
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    if (feedbacks.length <= 1) return;

    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
        setFade(true);
      }, 500);
    }, 5000);

    return () => clearInterval(timer);
  }, [feedbacks]);

  if (feedbacks.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-4 shadow-xl border border-slate-100 w-full">
        <div className="flex gap-0.5 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-2.5 h-2.5 fill-[#FFB300] text-[#FFB300]" />
          ))}
        </div>
        <p className="text-[#1E293B] text-[10px] font-bold italic leading-relaxed mb-2.5">
          "Excellent messaging platform with great support team. Campaign management is very easy to handle."
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[#059669] font-black text-[9px]">Amit Patel</span>
          <span className="text-slate-300 text-[9px]">|</span>
          <span className="text-slate-500 font-bold text-[9px]">GrowthEdge</span>
        </div>
      </div>
    );
  }

  const current = feedbacks[currentIndex];

  return (
    <div className={`transition-all duration-500 transform w-full ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="bg-white rounded-[20px] p-4 shadow-xl border border-slate-100 w-full">
        <div className="flex gap-0.5 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-2.5 h-2.5 ${i < current.rating ? 'fill-[#FFB300] text-[#FFB300]' : 'text-slate-200'}`} />
          ))}
        </div>
        <p className="text-[#1E293B] text-[10px] font-bold italic leading-relaxed mb-2.5">
          "{current.message}"
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[#059669] font-black text-[9px]">{current.name}</span>
          {(current.designation || current.company) && (
            <>
              <span className="text-slate-300 text-[9px]">|</span>
              <span className="text-slate-500 font-bold text-[9px]">{current.designation || current.company}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

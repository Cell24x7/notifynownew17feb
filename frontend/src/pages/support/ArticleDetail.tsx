import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  HelpCircle, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  ChevronRight,
  Share2,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import "./knowledge.css"; // We will create this for Quill content styles

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  category_name: string;
  view_count: number;
  updated_at: string;
}

export default function ArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await api.get(`/knowledge/articles/${slug}`);
        setArticle(res.data.article);
      } catch (e) {
        toast.error("Article not found");
        navigate("/support/help");
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchArticle();
  }, [slug]);

  if (loading) return <div className="p-20 text-center animate-pulse font-bold text-slate-400">Loading documentation...</div>;
  if (!article) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-20">
      
      {/* 🧭 Breadcrumbs / Action Bar */}
      <div className="border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20">
         <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/support/help" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors">
               <ArrowLeft className="h-4 w-4" /> Back to Help Center
            </Link>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" className="rounded-full"><Share2 className="h-4 w-4" /></Button>
               <Button variant="ghost" size="icon" className="rounded-full"><Printer className="h-4 w-4" /></Button>
            </div>
         </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
         
         {/* 📝 Article Header */}
         <div className="space-y-6 mb-12">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold uppercase text-[10px] tracking-widest px-3 py-1">
               {article.category_name}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white leading-[1.1] tracking-tight">
               {article.title}
            </h1>
            <div className="flex items-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50 dark:border-slate-900">
               <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Updated {new Date(article.updated_at).toLocaleDateString()}</div>
               <div className="flex items-center gap-2"><Eye className="h-4 w-4" /> {article.view_count} Views</div>
            </div>
         </div>

         {/* 📖 Content Area (Rich Text) */}
         <div 
            className="kb-content ql-editor prose dark:prose-invert max-w-none mb-20"
            dangerouslySetInnerHTML={{ __html: article.content }}
         />

         {/* 👍 Feedback Section */}
         <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 text-center space-y-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h4 className="text-lg font-black text-slate-800 dark:text-white">Was this article helpful?</h4>
            <div className="flex items-center justify-center gap-4">
               <Button variant="outline" className="h-12 px-8 rounded-2xl font-bold gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all">
                  <ThumbsUp className="h-4 w-4" /> Yes, thanks!
               </Button>
               <Button variant="outline" className="h-12 px-8 rounded-2xl font-bold gap-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">
                  <ThumbsDown className="h-4 w-4" /> Not really
               </Button>
            </div>
         </div>

         {/* ☎️ Final CTA */}
         <div className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <MessageSquare className="h-7 w-7" />
               </div>
               <div>
                  <h4 className="text-xl font-black text-slate-800 dark:text-white">Still have questions?</h4>
                  <p className="text-sm font-medium text-slate-500">Our customer success team is here for you.</p>
               </div>
            </div>
            <Button asChild className="h-14 px-10 rounded-2xl font-extrabold text-lg shadow-xl shadow-primary/20">
               <Link to="/support/tickets/new">Start Conversation</Link>
            </Button>
         </div>

      </div>
    </div>
  );
}

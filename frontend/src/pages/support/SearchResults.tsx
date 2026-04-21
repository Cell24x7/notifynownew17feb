import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Search, 
  Book, 
  ArrowLeft, 
  ChevronRight, 
  AlertCircle,
  Clock,
  Eye,
  FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import SupportChatWidget from "@/components/support/SupportChatWidget";

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string;
  category_name: string;
  view_count: number;
  created_at: string;
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query);

  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/knowledge/articles?search=${encodeURIComponent(q)}`);
      setArticles(res.data.articles || []);
    } catch (e) {
      console.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query) {
      fetchResults(query);
    }
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/20 pb-20">
      
      {/* 🔍 Search Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-12 px-6">
         <div className="max-w-4xl mx-auto space-y-8">
            <Link to="/support/help" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors">
               <ArrowLeft className="h-4 w-4" /> Back to Help Center
            </Link>
            
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
               Search results for <span className="text-primary italic">"{query}"</span>
            </h1>

            <form onSubmit={handleSearchSubmit} className="relative group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
               <Input 
                 className="h-14 pl-14 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-medium text-lg shadow-inner"
                 placeholder="Search again..."
                 value={searchInput}
                 onChange={e => setSearchInput(e.target.value)}
               />
            </form>
         </div>
      </div>

      {/* 📄 Results Area */}
      <div className="max-w-4xl mx-auto px-6 py-12">
         {loading ? (
            <div className="space-y-4">
               {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-2xl animate-pulse" />)}
            </div>
         ) : articles.length > 0 ? (
            <div className="space-y-4">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Found {articles.length} matching articles</p>
               {articles.map(art => (
                  <Link 
                    key={art.id} 
                    to={`/support/help/${art.slug}`}
                    className="group block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all no-underline"
                  >
                     <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                           <Badge variant="secondary" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold uppercase rounded p-1">{art.category_name}</Badge>
                           <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors">{art.title}</h3>
                           <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">{art.summary}</p>
                           <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
                              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(art.created_at).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> {art.view_count} Views</span>
                           </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-primary transition-all">
                           <ChevronRight className="h-5 w-5" />
                        </div>
                     </div>
                  </Link>
               ))}
            </div>
         ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
               <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-8 w-8 text-slate-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No results found</h3>
               <p className="text-slate-500 font-medium">Try different keywords or check out our popular topics.</p>
               <Button asChild variant="outline" className="mt-8 rounded-xl font-bold">
                  <Link to="/support/help">Browse All Categories</Link>
               </Button>
            </div>
         )}
      </div>

      <SupportChatWidget />
    </div>
  );
}

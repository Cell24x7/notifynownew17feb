import { useState, useEffect } from "react";
import { 
  Search, 
  Book, 
  ArrowRight, 
  LifeBuoy, 
  MessageSquare,
  ChevronRight,
  HelpCircle,
  Clock,
  Eye,
  Rocket,
  Compass
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string;
  category_name: string;
  view_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  icon_name: string;
}

export default function HelpCenter() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, artRes] = await Promise.all([
          api.get("/knowledge/categories"),
          api.get("/knowledge/articles?limit=5")
        ]);
        setCategories(catRes.data.categories);
        setPopularArticles(artRes.data.articles);
      } catch (e) {
        console.error("Failed to fetch Help Center data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
       navigate(`/support/search?q=${encodeURIComponent(search)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/20">
      
      {/* 🌟 Hero Section / Search */}
      <div className="bg-primary/5 dark:bg-primary/10 pt-20 pb-20 px-6 border-b border-primary/10">
        <div className="max-w-4xl mx-auto text-center space-y-6">
           <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none font-bold px-4 py-1.5 rounded-full animate-bounce">
              Self-Service Hub
           </Badge>
           <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight">
             How can we help you <span className="text-primary italic">today?</span>
           </h1>
           <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
             Search our comprehensive knowledge base for quick solutions to common issues before raising a support ticket.
           </p>

           <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group mt-10">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within:text-primary transition-all scale-110" />
              <Input 
                placeholder="Type your question (e.g. 'How to sync API')" 
                className="h-16 pl-16 pr-6 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-2xl shadow-primary/5 text-lg font-medium focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6 rounded-xl font-bold">Search</Button>
           </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 mb-20 space-y-20">
        
        {/* 🗂️ Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {loading ? (
               [1, 2, 3].map(i => <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-3xl animate-pulse border border-slate-100 dark:border-slate-800" />)
           ) : (
             categories.map(cat => (
               <Card key={cat.id} className="group overflow-hidden rounded-3xl border-none bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-2 transition-all duration-300 cursor-pointer">
                 <CardContent className="p-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                       <Rocket className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">{cat.name}</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2 leading-relaxed">{cat.description || "Comprehensive documentation and tutorials."}</p>
                    <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-tight">
                       Explore Category <ArrowRight className="h-4 w-4" />
                    </div>
                 </CardContent>
               </Card>
             ))
           )}
        </div>

        {/* 📈 Popular Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-1.5 bg-primary rounded-full" />
                   <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Popular Solutions</h2>
                </div>

                <div className="space-y-4">
                   {popularArticles.map(art => (
                     <div key={art.id} className="group p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-all cursor-pointer flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                              <Book className="h-5 w-5" />
                           </div>
                           <div>
                              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1 group-hover:text-primary transition-colors">{art.title}</h4>
                              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 <span>{art.category_name}</span>
                                 <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {art.view_count}</span>
                              </div>
                           </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-2" />
                     </div>
                   ))}
                </div>
            </div>

            {/* ☎️ Alternate Support */}
            <div className="space-y-6">
                <Card className="rounded-3xl border-none bg-primary text-primary-foreground p-8 shadow-2xl shadow-primary/20">
                   <CardContent className="p-0 space-y-6">
                      <LifeBuoy className="h-12 w-12 opacity-50" />
                      <div>
                        <h3 className="text-2xl font-black mb-2">Still need help?</h3>
                        <p className="text-primary-foreground/80 font-medium text-sm leading-relaxed mb-8">
                           If your question isn't answered in the help center, our technical specialists are ready to assist.
                        </p>
                        <Button asChild className="w-full h-12 bg-white text-primary hover:bg-slate-100 rounded-2xl font-bold">
                           <Link to="/support/tickets/new">Open Support Ticket</Link>
                        </Button>
                      </div>
                   </CardContent>
                </Card>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6" />
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white">Community Chat</h4>
                      <p className="text-xs text-slate-500 font-medium">Join our developer group</p>
                   </div>
                   <ArrowRight className="h-4 w-4 text-slate-300 ml-auto" />
                </div>
            </div>

        </div>

      </div>

    </div>
  );
}

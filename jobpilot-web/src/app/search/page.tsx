"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search as SearchIcon, ArrowLeft, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import Link from "next/link";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const { orchestrate, loading, error, message, results } = useOrchestrator();

  useEffect(() => {
    if (initialQuery) {
      orchestrate(`Find jobs for: ${initialQuery}`);
    }
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    orchestrate(`Find jobs for: ${query}`);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-12 px-6 selection:bg-primary/10">
      <div className="w-full max-w-4xl space-y-12">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 signature-gradient rounded flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">J</div>
            <span className="text-xl font-bold tracking-tighter italic">JobPilot</span>
          </Link>
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="font-bold text-sm h-10 px-6 no-line flex gap-2">
             <ArrowLeft size={16} /> Back to Dashboard
          </Button>
        </header>

        <section className="text-center space-y-6">
           <h1 className="text-5xl font-bold tracking-tighter">Global Agentic Search.</h1>
           <p className="text-muted-foreground text-lg font-medium mx-auto max-w-xl">
             Our agents are ready to scan LinkedIn, Indeed, and company portals to find your clinical match.
           </p>
           
           <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative mt-10">
              <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" size={20} />
              <Input 
                 placeholder="E.g., 'Senior Product Designer at Figma'..."
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 className="h-16 pl-14 pr-32 bg-surface-container-low border-none rounded-2xl text-lg font-medium focus-visible:ring-1 focus-visible:ring-primary/20 shadow-xl"
              />
              <Button 
                type="submit"
                disabled={loading}
                className="absolute right-3 top-3 h-10 px-6 signature-gradient font-bold rounded-xl"
              >
                 {loading ? <Loader2 size={18} className="animate-spin" /> : "Deploy Agent"}
              </Button>
           </form>
        </section>

        <main className="space-y-8 min-h-[400px]">
           {loading && (
              <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-pulse">
                 <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center">
                    <Sparkles size={32} className="text-primary" />
                 </div>
                 <div className="space-y-2 text-center">
                    <h3 className="text-lg font-bold">Agents are scouring the web...</h3>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">Synchronizing results to pipeline</p>
                 </div>
              </div>
           )}

           {!loading && message && (
              <Card className="p-8 border-primary/20 bg-primary/5 text-center space-y-6 animate-in zoom-in-95 duration-500">
                 <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <TrendingUp className="text-primary" size={24} />
                 </div>
                 <p className="text-xl font-bold italic text-on-surface leading-tight">"{message}"</p>
                 <Link href="/dashboard">
                    <Button className="signature-gradient font-bold h-12 px-10 rounded-xl">View in Kanban Board</Button>
                 </Link>
              </Card>
           )}

           {!loading && error && (
              <div className="p-8 text-center bg-red-50 text-red-500 rounded-3xl border border-red-100 italic font-medium">
                 {error}
              </div>
           )}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
       <div className="flex h-screen items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
       </div>
    }>
       <SearchContent />
    </Suspense>
  );
}

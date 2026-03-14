import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ALLOWED_CATEGORIES } from "../lib/categories";

type Business = {
  id: number;
  name: string;
  category: string;
  city: string | null;
  government_rate: string | null;
  phone: string | null;
  website: string | null;
  verification_status: string | null;
  created_at: string;
};

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentBusinesses();
  }, []);

  async function fetchRecentBusinesses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("id,name,category,city,government_rate,phone,website,verification_status,created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to fetch businesses", error);
      setBusinesses([]);
    } else {
      setBusinesses((data as Business[]) ?? []);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between px-4">
          <div className="font-bold text-neutral-900">AI Business Directory</div>
          <Link to="/admin" className="text-emerald-600 font-medium">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Latest verified businesses</h1>
        <p className="text-neutral-600 mb-6">Allowed categories: {ALLOWED_CATEGORIES.join(", ")}</p>

        {loading ? (
          <p className="text-neutral-600">Loading…</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((business) => (
              <article key={business.id} className="bg-white border border-neutral-200 rounded-xl p-4">
                <h2 className="font-semibold text-neutral-900">{business.name}</h2>
                <p className="text-sm text-neutral-600 mt-1">{business.category}</p>
                <p className="text-sm text-neutral-600 mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {business.city ?? "Unknown city"}
                </p>
                <p className="text-sm text-neutral-600 mt-2">Status: {business.verification_status ?? "pending"}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

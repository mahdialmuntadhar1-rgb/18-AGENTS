import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ALLOWED_CATEGORIES } from "../lib/categories";
import { AgentControlPanel } from "../components/admin/AgentControlPanel";

type BusinessRow = {
  id: number;
  name: string;
  category: string | null;
  city: string | null;
  government_rate: string | null;
  phone: string | null;
  website: string | null;
  verification_status: string | null;
  created_at: string;
};

const PAGE_SIZE = 20;

export default function Admin() {
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALLOWED_CATEGORIES[0]);
  const [selectedRate, setSelectedRate] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  async function fetchGrid() {
    setLoading(true);

    let query = supabase
      .from("businesses")
      .select("id,name,category,city,government_rate,phone,website,verification_status,created_at")
      .eq("category", selectedCategory)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (selectedRate !== "all") {
      query = query.eq("government_rate", selectedRate);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load grid", error);
      setRows([]);
    } else {
      setRows((data as BusinessRow[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchGrid();
  }, [selectedCategory, selectedRate, offset]);

  useEffect(() => {
    const channel = supabase
      .channel("business_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "businesses",
        },
        () => {
          fetchGrid();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory, selectedRate, offset]);

  const rates = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      if (row.government_rate) {
        set.add(row.government_rate);
      }
    });
    return Array.from(set);
  }, [rows]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Business Dashboard</h1>
        <AgentControlPanel />

        <div className="flex gap-3 flex-wrap">
          <select
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setOffset(0);
            }}
          >
            {ALLOWED_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
            value={selectedRate}
            onChange={(e) => {
              setSelectedRate(e.target.value);
              setOffset(0);
            }}
          >
            <option value="all">all government rates</option>
            {rates.map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-neutral-800 rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left">
              <tr>
                <th className="px-3 py-2">Business Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Government Rate</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Website</th>
                <th className="px-3 py-2">Verification Status</th>
                <th className="px-3 py-2">Date Added</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-neutral-800">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2">{row.city}</td>
                  <td className="px-3 py-2">{row.government_rate}</td>
                  <td className="px-3 py-2">{row.phone}</td>
                  <td className="px-3 py-2">{row.website}</td>
                  <td className="px-3 py-2">{row.verification_status}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                    No rows yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded bg-neutral-800 disabled:opacity-50"
            disabled={offset === 0}
            onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
          >
            Previous
          </button>
          <button
            className="px-3 py-2 rounded bg-neutral-800"
            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
          >
            Next
          </button>
          <span className="text-sm text-neutral-400">offset: {offset}</span>
        </div>
      </div>
    </main>
  );
}

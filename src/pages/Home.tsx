import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ALLOWED_CATEGORIES } from "../../shared-categories";

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

const PAGE_SIZE = 20;

export default function Home() {
  const [rows, setRows] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALLOWED_CATEGORIES[0]);
  const [selectedRate, setSelectedRate] = useState<string>("A");

  async function refreshGrid() {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("category", selectedCategory)
      .eq("government_rate", selectedRate)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to load businesses", error);
      setRows([]);
    } else {
      setRows((data ?? []) as Business[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    refreshGrid();
  }, [selectedCategory, selectedRate]);

  useEffect(() => {
    const channel = supabase
      .channel("business_updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "businesses" },
        () => {
          refreshGrid();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory, selectedRate]);

  const rateOptions = useMemo(() => ["A", "B", "C"], []);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">Business Directory Grid</h1>

        <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Category
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {ALLOWED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Government Rate
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
              value={selectedRate}
              onChange={(event) => setSelectedRate(event.target.value)}
            >
              {rateOptions.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Business Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Government Rate</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Verification Status</th>
                <th className="px-4 py-3">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={8}>
                    Loading businesses...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={8}>
                    No rows found for this category and government rate.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3">{row.city ?? "-"}</td>
                    <td className="px-4 py-3">{row.government_rate ?? "-"}</td>
                    <td className="px-4 py-3">{row.phone ?? "-"}</td>
                    <td className="px-4 py-3">
                      {row.website ? (
                        <a href={row.website} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                          {row.website}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">{row.verification_status ?? "pending"}</td>
                    <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

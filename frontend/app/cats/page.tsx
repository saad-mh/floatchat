"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function CatsPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCats() {
      try {
        const res = await fetch("https://api.thecatapi.com/v1/images/search?limit=10");
        if (!res.ok) throw new Error("Failed to fetch cat images");
        const data = await res.json();
        setCats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error fetching cats");
      } finally {
        setLoading(false);
      }
    }
    fetchCats();
  }, []);

  const captions = [
    "Professional napper",
    "Plotting world domination",
    "Just knocked something off a table",
    "Staring into your soul",
    "Dreaming of tuna",
    "Practicing parkour",
    "Judging you silently",
    "Master of the zoomies",
    "Purrfessional biscuit maker",
    "Waiting for the red dot"
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Get back to this page when youre tired of floats and data
      </h1>
      {loading && (
        <p className="text-center text-lg animate-pulse">
          Summoning cats from the internet
        </p>
      )}
      {error && (
        <p className="text-center text-red-500">
          {error} <br />
          (Maybe the cats are busy napping. Try again!)
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 justify-center">
        {cats.map((cat, idx) => (
          <div key={cat.id || idx} className="rounded-lg overflow-hidden shadow bg-card flex flex-col items-center">
            <Image
              src={cat.url}
              alt="Cat"
              width={300}
              height={300}
              className="object-cover w-full h-64"
            />
            <div className="p-2 text-xs text-muted-foreground text-center">
              {captions[idx % captions.length]}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Warning: Viewing too many cats may result in spontaneous meowing.<br />
        Powered by the Magical Cats Society 🐾
      </div>

      <div className="mt-6 flex justify-center">
        <a href="/" className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-colors font-medium shadow">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}

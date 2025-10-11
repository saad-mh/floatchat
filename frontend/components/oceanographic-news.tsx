"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, Waves } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: string;
}

export function OceanographicNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch("/api/oceanographic-news");
        if (!response.ok) {
          throw new Error("Failed to fetch oceanographic news");
        }
        const result = await response.json();
        if (result.success && result.data) {
          setNews(result.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load news");
        console.error("Error fetching oceanographic news:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Waves className="w-5 h-5 text-primary" />
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Latest Ocean News
          </h2>
        </div>

        {/* Mobile: Horizontal scroll */}
        <div className="md:hidden overflow-x-auto pb-2 px-4">
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="w-48 flex-shrink-0">
                <Skeleton className="w-full h-32 rounded-lg mb-2" />
                <Skeleton className="h-3 w-3/4 mb-1" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx}>
              <Skeleton className="w-full h-40 rounded-lg mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-2/3 mb-2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Waves className="w-5 h-5 text-primary" />
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Latest Ocean News
          </h2>
        </div>
        <Card className="p-6 text-center border-border/50 max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">
            Unable to load news at this time
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-6">
        <Waves className="w-5 h-5 text-primary" />
        <h2 className="text-lg md:text-xl font-semibold text-foreground">
          Latest Ocean News
        </h2>
      </div>

      {/* Mobile: Horizontal scroll cards - Meta.ai style */}
      <div className="md:hidden overflow-x-auto pb-2 scrollbar-hide px-4">
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {news.slice(0, 8).map((item, idx) => (
            <Card
              key={idx}
              className="w-48 flex-shrink-0 group cursor-pointer border-border/50 hover:border-primary/20 transition-all duration-200 bg-card/50"
              onClick={() =>
                window.open(item.url, "_blank", "noopener,noreferrer")
              }
            >
              <div className="relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center";
                  }}
                />
                <div className="absolute top-2 right-2">
                  <ExternalLink className="w-3 h-3 text-white opacity-60" />
                </div>
              </div>

              <div className="p-3">
                <h3 className="font-medium text-xs text-foreground mb-2 line-clamp-2 leading-tight">
                  {item.title}
                </h3>

                <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-xs px-2 py-0.5 bg-primary/5 border-primary/20 text-primary"
                  >
                    {item.source.split(" ")[0]}
                  </Badge>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(item.publishedAt)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Desktop: Infinite Horizontal Scroll Container */}
      <div className="hidden md:block">
        <div className="relative group">
          <div className="overflow-x-auto pb-4 scrollbar-hide hover:scrollbar-show transition-all duration-300">
            <div className="flex gap-6 px-4" style={{ width: "max-content" }}>
              {news.map((item, idx) => (
                <Card
                  key={idx}
                  className="w-72 flex-shrink-0 group cursor-pointer border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-200 bg-card/50"
                  onClick={() =>
                    window.open(item.url, "_blank", "noopener,noreferrer")
                  }
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center";
                      }}
                    />
                    <div className="absolute top-3 right-3">
                      <ExternalLink className="w-4 h-4 text-white opacity-60 group-hover:opacity-90 transition-opacity" />
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {item.title}
                    </h3>

                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="text-xs px-2 py-1 bg-primary/5 border-primary/20 text-primary"
                      >
                        {item.source.split(" ")[0]}
                      </Badge>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(item.publishedAt)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Latest discoveries in ocean science and marine research
        </p>
      </div>
    </div>
  );
}

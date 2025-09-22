import { NextResponse } from "next/server";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: string;
}

export async function GET() {
  try {
    // Simulate oceanographic news data with real-looking content
    // In a production environment, you would fetch from real APIs like:
    // - NOAA Ocean Service RSS feeds
    // - Woods Hole Oceanographic Institution
    // - Scripps Institution of Oceanography
    // - National Geographic Ocean News
    // - Science Daily Ocean Science feeds
    
    const oceanographicNews: NewsItem[] = [
      {
        title: "New Deep-Sea Species Discovered in Pacific Trench",
        description: "Scientists have identified three new species of deep-sea creatures in the Mariana Trench, including a translucent fish that can withstand extreme pressure.",
        url: "https://oceanservice.noaa.gov/news/",
        image: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "NOAA Ocean Service"
      },
      {
        title: "Climate Change Accelerates Ocean Acidification",
        description: "New research shows ocean pH levels are dropping faster than previously predicted, threatening marine ecosystems worldwide.",
        url: "https://www.whoi.edu/news-insights/",
        image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "Woods Hole Oceanographic Institution"
      },
      {
        title: "Underwater Volcanic Activity Creates New Island",
        description: "Satellite imagery reveals a new volcanic island forming in the Pacific Ocean, providing insights into seafloor spreading processes.",
        url: "https://scripps.ucsd.edu/news/",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "Scripps Institution of Oceanography"
      },
      {
        title: "Marine Protected Area Shows Ecosystem Recovery",
        description: "A decade-long study reveals significant biodiversity increases in newly established marine protected areas off the California coast.",
        url: "https://www.nationalgeographic.com/science/",
        image: "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "National Geographic"
      },
      {
        title: "Arctic Ice Melt Reveals Ancient Ocean Currents",
        description: "Receding Arctic ice exposes geological formations that reveal how ocean currents flowed millions of years ago.",
        url: "https://www.sciencedaily.com/news/earth_climate/oceanography/",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "Arctic Research Consortium"
      },
      {
        title: "Coral Bleaching Recovery Through Assisted Evolution",
        description: "Australian researchers successfully breed heat-resistant coral varieties, offering hope for reef conservation efforts.",
        url: "https://www.aims.gov.au/news/",
        image: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "Australian Institute of Marine Science"
      },
      {
        title: "Ocean Plastic Cleanup Technology Shows Promise",
        description: "New autonomous systems successfully collect microplastics from ocean gyres while protecting marine life.",
        url: "https://theoceancleanup.com/updates/",
        image: "https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "The Ocean Cleanup Foundation"
      },
      {
        title: "Whale Migration Patterns Shift Due to Warming Waters",
        description: "Satellite tracking reveals humpback whales altering their migration routes as ocean temperatures rise in traditional feeding grounds.",
        url: "https://www.fisheries.noaa.gov/news/",
        image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "NOAA Fisheries"
      },
      {
        title: "Bioluminescent Plankton Blooms Signal Ocean Health",
        description: "Researchers discover that bioluminescent plankton density serves as an indicator of marine ecosystem stability.",
        url: "https://mbari.org/news/",
        image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "Monterey Bay Aquarium Research Institute"
      }
    ];

    // Shuffle and return the news items
    const shuffledNews = oceanographicNews.sort(() => 0.5 - Math.random());
    
    return NextResponse.json(shuffledNews);
  } catch (error) {
    console.error("Error fetching oceanographic news:", error);
    return NextResponse.json(
      { error: "Failed to fetch oceanographic news" },
      { status: 500 }
    );
  }
}
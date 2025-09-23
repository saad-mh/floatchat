import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: string;
}

interface AIFilterResponse {
  index: number;
  isOceanRelated: boolean;
  relevanceScore: number;
  reasoning?: string;
}

// Simple in-memory cache to avoid repeated AI calls
const aiCache = new Map<string, boolean>();

// AI-powered filtering function for ocean-centric content
async function filterWithAI(articles: any[]): Promise<any[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.warn('OpenAI API key not configured. Using basic keyword filtering.');
    return basicKeywordFilter(articles);
  }

  try {
    const preFiltered = basicKeywordFilter(articles);
    if (preFiltered.length === 0) return preFiltered;

    const uncachedArticles = preFiltered.filter(article => {
      const cacheKey = `${article.title}:${article.description}`.slice(0, 100);
      return !aiCache.has(cacheKey);
    });

    const cachedArticles = preFiltered.filter(article => {
      const cacheKey = `${article.title}:${article.description}`.slice(0, 100);
      return aiCache.has(cacheKey) && aiCache.get(cacheKey);
    });

    const maxArticles = 15;
    const articlesForAI = uncachedArticles.slice(0, maxArticles);

    const batchSize = 5;
    const filteredArticles: any[] = [];

    for (let i = 0; i < articlesForAI.length; i += batchSize) {
      const batch = articlesForAI.slice(i, i + batchSize);

      try {
        const batchResults = await processBatchWithAI(batch, openaiApiKey);

        batch.forEach((article, index) => {
          const cacheKey = `${article.title}:${article.description}`.slice(0, 100);
          const result = batchResults.includes(batch[index]);
          aiCache.set(cacheKey, result);
        });

        filteredArticles.push(...batchResults);

        if (i + batchSize < articlesForAI.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (batchError: any) {
        if (batchError.message.includes('429')) {
          console.warn('Rate limit hit, using remaining pre-filtered articles');
          const remaining = preFiltered.slice(i);
          filteredArticles.push(...remaining.slice(0, 20 - filteredArticles.length));
          break;
        }
        throw batchError;
      }
    }

    return [...cachedArticles, ...filteredArticles];
  } catch (error: any) {
    console.error('AI filtering failed, falling back to keyword filtering:', error.message);
    return basicKeywordFilter(articles);
  }
}

async function processBatchWithAI(articles: any[], apiKey: string): Promise<any[]> {
  const articlesText = articles.map((article, index) => 
    `${index + 1}. Title: "${article.title}"\nDescription: "${article.description}"\n`
  ).join('\n');

  const prompt = `Analyze these ${articles.length} news articles for ocean/marine relevance. Return JSON array with: index, isOceanRelated (boolean), relevanceScore (0-10).

Ocean topics: currents, marine life, coral reefs, sea level, ocean temp, deep sea, acidification, conservation, tsunamis, tides, marine mammals, pollution, underwater exploration.

Exclude: land-based topics, freshwater, general weather.

${articlesText}

JSON format: [{"index":1,"isOceanRelated":true,"relevanceScore":8},...]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5', // ✅ using GPT-5
      messages: [
        {
          role: 'system',
          content: 'You are a marine science expert. Analyze news for ocean relevance. Return only valid JSON array.'
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;
  
  if (!aiResponse) throw new Error('Empty response from OpenAI API');

  let filterResults: AIFilterResponse[];
  try {
    filterResults = JSON.parse(aiResponse);
  } catch {
    throw new Error('Invalid JSON response from AI');
  }

  return articles.filter((_, index) => {
    const result = filterResults.find(r => r.index === index + 1);
    return result && result.isOceanRelated && result.relevanceScore >= 7; // stricter threshold
  });
}

// Fallback keyword filtering when AI is not available
function basicKeywordFilter(articles: any[]): any[] {
  return articles.filter((article: any) => {
    if (!article.title || !article.description) return false;
    
    const content = (article.title + ' ' + article.description).toLowerCase();
    const oceanTerms = [
      'ocean', 'sea', 'marine', 'coral', 'whale', 'dolphin', 'shark', 
      'tide', 'current', 'wave', 'deep sea', 'underwater', 'salinity',
      'plankton', 'reef', 'coast', 'maritime', 'aquatic', 'seawater',
      'fish', 'algae', 'kelp', 'seabed', 'naval', 'shipping',
      'polar ice', 'iceberg', 'tsunami', 'storm surge', 'sea level'
    ];
    
    return oceanTerms.some(term => content.includes(term));
  });
}

const fallbackNews: NewsItem[] = [
  {
    title: "Gulf Stream Circulation Weakens to Record Low Levels",
    description: "Atlantic Meridional Overturning Circulation shows unprecedented decline, potentially altering global ocean current patterns and climate systems.",
    url: "#",
    image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-20T10:00:00Z",
    source: "Ocean Current Monitor"
  },
  {
    title: "Deep Ocean Temperatures Rise 0.6°C in Pacific Trenches",
    description: "Hadal zone warming documented for first time, affecting deep-sea thermal vents and pressure-adapted marine life in ocean's deepest regions.",
    url: "#",
    image: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-19T15:30:00Z",
    source: "Deep Sea Thermal Research"
  },
  {
    title: "Antarctic Circumpolar Current Accelerates Due to Wind Changes",
    description: "Southern Ocean's massive current system speeds up by 15%, redistributing heat and nutrients across three major ocean basins.",
    url: "#",
    image: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-18T08:45:00Z",
    source: "Southern Ocean Institute"
  },
  {
    title: "Great Barrier Reef Experiences Fourth Mass Bleaching Event",
    description: "Coral bleaching now affects 89% of reef systems as ocean temperatures exceed critical thresholds for extended periods.",
    url: "#",
    image: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-17T12:20:00Z",
    source: "Coral Research Network"
  },
  {
    title: "Massive Underwater Mountain Range Discovered in Pacific",
    description: "Sonar mapping reveals 2,000km seamount chain harboring unique deep-sea ecosystems and potential rare earth mineral deposits.",
    url: "#",
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-16T14:15:00Z",
    source: "Ocean Floor Mapping"
  },
  {
    title: "Arctic Sea Ice Hits September Record Low of 3.2M km²",
    description: "Polar ice coverage drops below previous minimums as Arctic Ocean absorbs unprecedented amounts of solar radiation.",
    url: "#",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-15T09:30:00Z",
    source: "Arctic Sea Ice Center"
  },
  {
    title: "Whale Migration Patterns Shift 500km North in Atlantic",
    description: "Humpback and blue whale populations alter ancient migration routes as warming ocean waters change krill distribution patterns.",
    url: "#",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-14T16:45:00Z",
    source: "Marine Mammal Tracker"
  },
  {
    title: "Ocean pH Drops to 7.9 in Acidification Hotspots",
    description: "Carbonic acid levels surge in key marine regions, threatening shellfish populations and coral skeleton formation worldwide.",
    url: "#",
    image: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-13T11:00:00Z",
    source: "Ocean Chemistry Lab"
  },
  {
    title: "Kelp Forest Collapse Accelerates Along California Coast",
    description: "Giant kelp canopy coverage declines by 75% as marine heatwaves and sea urchin populations devastate underwater forests.",
    url: "#",
    image: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-12T13:25:00Z",
    source: "Kelp Forest Research"
  },
  {
    title: "Microplastic Concentrations Double in Deep Ocean Sediments",
    description: "Plastic particle density reaches 2,000 pieces per cubic meter in abyssal plains, entering deep-sea food webs permanently.",
    url: "#",
    image: "https://images.unsplash.com/photo-1484291150605-cedf83137ea0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-11T10:15:00Z",
    source: "Ocean Pollution Monitor"
  },
  {
    title: "Tidal Patterns Shift as Moon's Orbit Changes Sea Levels",
    description: "Lunar gravitational variations create new tidal ranges, affecting coastal flooding predictions and marine ecosystem timing.",
    url: "#",
    image: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-10T14:30:00Z",
    source: "Tidal Research Institute"
  },
  {
    title: "Dead Zones Expand to Cover 245,000 km² of Ocean",
    description: "Oxygen-depleted marine regions grow by 30% as nutrient runoff and warming waters create uninhabitable underwater deserts.",
    url: "#",
    image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2025-09-09T09:45:00Z",
    source: "Ocean Oxygen Labs"
  }
];

async function fetchNewsFromAPI(): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    console.warn('NEWS_API_KEY not found or not configured. Using fallback ocean-centric data.');
    return fallbackNews.slice(0, 9);
  }

  try {
    // ✅ Calculate date range (last 6 months)
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setMonth(fromDate.getMonth() - 6);

    const searchQueries = ['ocean', 'marine', 'coral reef', 'sea level', 'deep sea'];
    const searchQuery = searchQueries.join(' OR ');
    
    const url = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `from=${fromDate.toISOString().split('T')[0]}&` +
      `to=${toDate.toISOString().split('T')[0]}&` +
      `language=en&sortBy=publishedAt&pageSize=100&apiKey=${apiKey}`;

    console.log('NewsAPI URL (without API key):', url.replace(/apiKey=[^&]+/, 'apiKey=***'));

    let response = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'FloatChat/1.0' } });
    
    // Handle 426 Upgrade Required with fallback strategies
    if (response.status === 426) {
      console.warn('NewsAPI returned 426 (Upgrade Required). Trying fallback strategies...');
      
      // Strategy 1: Try top-headlines endpoint
      const topHeadlinesUrl = `https://newsapi.org/v2/top-headlines?` +
        `q=${encodeURIComponent('ocean OR marine')}&` +
        `language=en&pageSize=100&apiKey=${apiKey}`;
      
      console.log('Trying top-headlines fallback...');
      response = await fetch(topHeadlinesUrl, { method: 'GET', headers: { 'User-Agent': 'FloatChat/1.0' } });
      
      // Strategy 2: If still 426 or no results, try with shorter date range
      if (response.status === 426 || (response.ok && (await response.clone().json()).articles?.length === 0)) {
        const shortFromDate = new Date(toDate);
        shortFromDate.setDate(shortFromDate.getDate() - 30); // Last 30 days only
        
        const shortRangeUrl = `https://newsapi.org/v2/everything?` +
          `q=${encodeURIComponent('ocean')}&` +
          `from=${shortFromDate.toISOString().split('T')[0]}&` +
          `to=${toDate.toISOString().split('T')[0]}&` +
          `language=en&sortBy=publishedAt&pageSize=50&apiKey=${apiKey}`;
        
        console.log('Trying shorter date range fallback (30 days)...');
        response = await fetch(shortRangeUrl, { method: 'GET', headers: { 'User-Agent': 'FloatChat/1.0' } });
        
        // Strategy 3: If still issues, try category-based approach
        if (response.status === 426 || (response.ok && (await response.clone().json()).articles?.length === 0)) {
          const categoryUrl = `https://newsapi.org/v2/top-headlines?` +
            `category=science&` +
            `language=en&pageSize=100&apiKey=${apiKey}`;
          
          console.log('Trying science category fallback...');
          response = await fetch(categoryUrl, { method: 'GET', headers: { 'User-Agent': 'FloatChat/1.0' } });
        }
      }
    }
    
    if (!response.ok) {
      let errorMessage = `NewsAPI request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage += `: ${errorData.message}`;
      } catch (e) {
        // Ignore JSON parsing errors for error response
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.status !== 'ok') throw new Error(data.message || 'NewsAPI returned error');

    console.log(`NewsAPI returned ${data.articles?.length || 0} articles`);
    
    if (!data.articles || data.articles.length === 0) {
      console.warn('No articles found from NewsAPI, using fallback data');
      return fallbackNews.slice(0, 9);
    }

    // First filter out invalid articles (require url + urlToImage)
    const validArticles = data.articles.filter((article: any) => 
      article.title && 
      article.description && 
      article.url &&
      article.urlToImage &&
      article.title !== '[Removed]' && 
      article.description !== '[Removed]'
    );

    const aiFilteredArticles = await filterWithAI(validArticles);

    const transformedNews: NewsItem[] = aiFilteredArticles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source?.name || 'News Source'
    }));

    // Always return exactly 9 articles (fill with fallback if needed)
    const results = transformedNews.length < 9
      ? [...transformedNews, ...fallbackNews].slice(0, 9)
      : transformedNews.slice(0, 9);

    return results;

  } catch (error) {
    console.error('Error fetching news from API:', error);
    return fallbackNews.slice(0, 9);
  }
}

export async function GET() {
  try {
    const news = await fetchNewsFromAPI();
    return NextResponse.json({ success: true, data: news, count: news.length });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: fallbackNews.slice(0, 9),
      count: 9,
      note: 'Using fallback data due to API error'
    });
  }
}

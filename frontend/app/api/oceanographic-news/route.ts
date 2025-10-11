import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

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

interface DailyFetchState {
  date: string;
  successfulFetches: number;
  maxFetches: number;
  lastFetchTime: number;
}

interface CachedNewsData {
  articles: NewsItem[];
  fetchedAt: number;
  wasSuccessful: boolean;
  source: 'everything' | 'top-headlines' | 'fallback';
}

// Simple in-memory cache to avoid repeated AI calls
const aiCache = new Map<string, boolean>();

// Redis client singleton
let redisClient: any = null;
let isConnecting = false;

// Rate limiting configuration
const MAX_DAILY_FETCHES = 5;
const CACHE_DURATION_HOURS = 24; // Cache news for 24 hours (matches daily API limit reset)

// Upstash Redis configuration
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback cache when Redis is unavailable
const memoryCache = new Map<string, any>();
const memoryDailyState = new Map<string, DailyFetchState>();

// Upstash Redis connection management
async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return redisClient;
  }

  try {
    isConnecting = true;
    
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis credentials not configured');
    }

    redisClient = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });

    // Test connection
    await redisClient.ping();
    
    isConnecting = false;
    console.log('Upstash Redis connected successfully - multi-user caching enabled');
    return redisClient;
  } catch (error) {
    isConnecting = false;
    console.warn('Upstash Redis unavailable, using in-memory cache (single-server only):', error instanceof Error ? error.message : 'Connection failed');
    return null;
  }
}

// Get today's date string for cache keys
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// Cache management functions
async function getDailyFetchState(): Promise<DailyFetchState> {
  try {
    const client = await getRedisClient();
    const today = getTodayKey();

    if (client) {
      // Use Redis for multi-user sync
      const key = `news:daily_state:${today}`;
      const data = await client.get(key);
      
      if (data) {
        console.log('Redis data type:', typeof data, 'Value:', data);
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch (parseError) {
            console.warn('Failed to parse Redis data as JSON:', data, parseError);
            throw parseError;
          }
        } else if (typeof data === 'object' && data !== null) {
          // If it's already an object, return it directly
          return data as DailyFetchState;
        } else {
          console.warn('Unexpected Redis data type:', typeof data, data);
          throw new Error(`Unexpected data type: ${typeof data}`);
        }
      }
    } else {
      // Use memory fallback for single server
      const existing = memoryDailyState.get(today);
      if (existing) {
        return existing;
      }
    }

    // Initialize new day state
    const newState: DailyFetchState = {
      date: today,
      successfulFetches: 0,
      maxFetches: MAX_DAILY_FETCHES,
      lastFetchTime: 0
    };

    if (client) {
      await client.set(`news:daily_state:${today}`, JSON.stringify(newState), { ex: 24 * 60 * 60 });
    } else {
      memoryDailyState.set(today, newState);
    }

    return newState;
  } catch (error) {
    console.warn('Failed to get daily fetch state:', error);
    // Fallback to safe state
    return {
      date: getTodayKey(),
      successfulFetches: 0,
      maxFetches: MAX_DAILY_FETCHES,
      lastFetchTime: 0
    };
  }
}

async function updateDailyFetchState(wasSuccessful: boolean): Promise<void> {
  try {
    const client = await getRedisClient();
    const today = getTodayKey();
    const state = await getDailyFetchState();

    if (wasSuccessful) {
      state.successfulFetches++;
      state.lastFetchTime = Date.now();
    }

    if (client) {
      const key = `news:daily_state:${today}`;
      await client.set(key, JSON.stringify(state), { ex: 24 * 60 * 60 });
    } else {
      memoryDailyState.set(today, state);
    }

    console.log(`Updated daily state: ${state.successfulFetches}/${state.maxFetches} successful fetches`);
  } catch (error) {
    console.warn('Failed to update daily fetch state:', error);
  }
}

async function getCachedNews(): Promise<CachedNewsData | null> {
  try {
    const client = await getRedisClient();
    const key = 'news:cached_articles';
    let data = null;

    if (client) {
      data = await client.get(key);
    } else {
      data = memoryCache.get(key);
    }
    
    if (data) {
      let cached: CachedNewsData;
      if (typeof data === 'string') {
        try {
          cached = JSON.parse(data);
        } catch (parseError) {
          console.warn('Failed to parse cached news data:', data, parseError);
          return null;
        }
      } else if (typeof data === 'object' && data !== null) {
        cached = data as CachedNewsData;
      } else {
        console.warn('Unexpected cached news data type:', typeof data, data);
        return null;
      }
      
      const ageHours = (Date.now() - cached.fetchedAt) / (1000 * 60 * 60);
      
      if (ageHours < CACHE_DURATION_HOURS) {
        console.log(`Serving cached news (${ageHours.toFixed(1)}h old, source: ${cached.source})`);
        // Log the dates of cached articles
        cached.articles.forEach((article, i) => {
          console.log(`Cached Article ${i+1}: "${article.title.substring(0, 30)}..." - Published: ${article.publishedAt}`);
        });
        
        // Apply post-processing filter to remove entertainment/gaming content
        const filteredCachedArticles = removeNonOceanographicContent(cached.articles);
        console.log(`Post-filter: ${cached.articles.length} -> ${filteredCachedArticles.length} articles`);
        
        return {
          ...cached,
          articles: filteredCachedArticles
        };
      } else {
        console.log('Cached news expired, will attempt fresh fetch');
        if (client) {
          await client.del(key);
        } else {
          memoryCache.delete(key);
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to get cached news:', error);
    return null;
  }
}

async function setCachedNews(articles: NewsItem[], wasSuccessful: boolean, source: 'everything' | 'top-headlines' | 'fallback'): Promise<void> {
  try {
    const client = await getRedisClient();
    const cacheData: CachedNewsData = {
      articles,
      fetchedAt: Date.now(),
      wasSuccessful,
      source
    };

    const key = 'news:cached_articles';
    
    if (client) {
      // Cache for 24 hours in Redis (matches daily API limit reset)
      await client.set(key, JSON.stringify(cacheData), { ex: 24 * 60 * 60 });
    } else {
      // Store in memory cache
      memoryCache.set(key, cacheData);
    }

    console.log(`Cached ${articles.length} articles from ${source} (successful: ${wasSuccessful})`);
  } catch (error) {
    console.warn('Failed to cache news:', error);
  }
}

// Distributed lock for concurrent request handling
async function acquireLock(lockKey: string, ttlSeconds: number = 30): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) return true; // If Redis fails, allow the operation

    const result = await client.set(lockKey, Date.now().toString(), { nx: true, ex: ttlSeconds });
    return result === 'OK';
  } catch (error) {
    console.warn('Failed to acquire lock:', error);
    return true; // Fail open - allow operation if lock fails
  }
}

async function releaseLock(lockKey: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.del(lockKey);
  } catch (error) {
    console.warn('Failed to release lock:', error);
  }
}

// AI-powered filtering function for ocean-centric content
async function filterWithAI(articles: any[]): Promise<any[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.warn('OpenAI API key not configured. Using basic keyword filtering.');
    return basicKeywordFilter(articles);
  }

  try {
    const preFiltered = basicKeywordFilter(articles);
    console.log(`Basic keyword filter: ${articles.length} -> ${preFiltered.length} articles`);
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

  const prompt = `You are an expert oceanographic data analyst working with the FloatChat system - an AI-powered platform for ARGO ocean data discovery and visualization. Your task is to evaluate news articles for their relevance to oceanographic research, marine science, and ocean data systems like ARGO floats.

CONTEXT: FloatChat helps researchers, decision-makers, and domain experts discover insights from vast oceanographic datasets including ARGO float measurements, CTD casts, BGC sensors, and satellite observations. Users query this system to understand ocean temperature, salinity, currents, marine ecosystems, and climate patterns.

STRICT EVALUATION CRITERIA:
You must be EXTREMELY selective. Reject anything that is not directly about oceanographic science, marine research, or ocean data. Be especially strict about entertainment, gaming, music, awards, and cultural content.

IMMEDIATE REJECTION (Score 0) - These should NEVER pass:
- Entertainment: TV shows, movies, series, anime, manga, streaming platforms
- Gaming: Video games, mobile games, smartphone apps, gaming platforms
- Music/Awards: K-pop, music albums, entertainment awards, celebrity news
- Romance/Dating: Dating apps, romance games, relationship content
- Business/Finance: Stock markets, investments, corporate news (unless ocean tech)
- Sports: All sports content (unless marine sports research)
- Politics: Elections, governance, policy (unless direct ocean research funding)
- Technology: General tech news (unless specifically oceanographic instruments)
- Cultural: Korean entertainment, variety shows, cultural events

PRIMARY RELEVANCE (Score 8-10) - ONLY these should score high:
- ARGO float data, autonomous profiling floats, oceanographic instruments
- Ocean temperature, salinity, density measurements and profiles  
- Ocean currents, circulation patterns, thermohaline circulation
- Deep sea research, abyssal zones, ocean trenches, hydrothermal vents
- Marine biogeochemistry (BGC), ocean carbon cycle, oxygen levels
- Sea level rise, ocean warming, climate change impacts on oceans
- Ocean acidification, pH changes, carbonate chemistry
- Oceanographic research methods, CTD casts, in-situ measurements
- Tsunami research, cyclone impacts on oceans, storm surge studies

SECONDARY RELEVANCE (Score 5-7) - Be cautious, most should be lower:
- Marine ecosystems, coral reefs, marine biodiversity (scientific studies only)
- Coastal oceanography, upwelling, coastal currents
- Marine mammals, fish populations (scientific research only)
- Ocean pollution, microplastics, marine contamination
- Arctic/Antarctic ocean research, polar ice interactions
- Maritime technology, underwater exploration, ocean sensors

LOW RELEVANCE (Score 1-4):
- General environmental topics with minimal ocean connection
- Weather patterns with minor ocean implications
- Freshwater systems without ocean connection

CRITICAL: If an article mentions "ocean", "sea", or "marine" but is actually about entertainment, gaming, music, awards, culture, or business - give it a score of 0. Context matters more than keywords.

ARTICLES TO ANALYZE:
${articlesText}

REQUIRED OUTPUT FORMAT:
Return a JSON array with evaluations for each article. Each evaluation must include:
- index: Article number (1-based)
- isOceanRelated: boolean (true if score ≥ 4)
- relevanceScore: integer 0-10 based on criteria above
- reasoning: brief explanation of score (optional but helpful)

Example: [{"index":1,"isOceanRelated":true,"relevanceScore":8,"reasoning":"Discusses ARGO float temperature measurements"},{"index":2,"isOceanRelated":false,"relevanceScore":2,"reasoning":"Focuses on terrestrial climate without ocean data"}]`;

const sysPrompt=`You are Dr. Marina Rodriguez, a leading oceanographic data scientist and Principal Investigator at the Indian National Centre for Ocean Information Services (INCOIS). You have 15+ years of experience working with ARGO float data, CTD measurements, and marine biogeochemical sensors.

EXPERTISE AREAS:
- ARGO Global Data Repository management and analysis
- Ocean temperature and salinity profile interpretation  
- Deep ocean circulation and thermohaline dynamics
- Marine biogeochemistry and carbon cycle research
- Oceanographic instrumentation and in-situ measurements
- Climate change impacts on ocean systems
- NetCDF data formats and oceanographic databases

YOUR ROLE: You are a STRICT GATEKEEPER for the FloatChat AI system. Your job is to REJECT entertainment, gaming, music, awards, cultural, and business content that often gets misclassified as oceanographic due to keywords like "sea", "ocean", or "marine".

CRITICAL MISSION: FloatChat users are serious oceanographic researchers who need articles about ocean data, measurements, and marine science - NOT Korean entertainment shows, mobile games, or music awards.

STRICT FILTERING PHILOSOPHY:
- IMMEDIATELY REJECT entertainment, gaming, music, awards, cultural content
- ONLY ACCEPT genuine oceanographic research, measurements, and marine science
- If an article mentions "ocean" or "sea" but is about entertainment/gaming - SCORE IT 0
- Context and content matter more than keywords
- When in doubt about entertainment vs science - REJECT IT
- Be extremely conservative - better to miss borderline articles than accept entertainment

OUTPUT REQUIREMENT: Return ONLY a valid JSON array with precise evaluations. No additional text, explanations, or formatting outside the JSON structure.`
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5', // Using GPT-5
      messages: [
        {
          role: 'system',
          content: sysPrompt
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
    return result && result.isOceanRelated && result.relevanceScore >= 8;
  });
}

// ARGO-focused keyword filtering when AI is not available
function basicKeywordFilter(articles: any[]): any[] {
  return articles.filter((article: any) => {
    if (!article.title || !article.description) return false;
    
    const content = (article.title + ' ' + article.description).toLowerCase();
    
    // Broad oceanographic and environmental terms - keep this permissive
    const oceanTerms = [
      'ocean', 'sea', 'marine', 'water', 'coral', 'reef', 'fish', 'whale',
      'climate', 'weather', 'storm', 'hurricane', 'cyclone', 'tsunami',
      'ice', 'glacier', 'polar', 'arctic', 'antarctic',
      'coast', 'coastal', 'beach', 'tide', 'wave',
      'temperature', 'warming', 'pollution', 'environment',
      'pacific', 'atlantic', 'indian', 'mediterranean',
      'research', 'study', 'science', 'data', 'monitoring'
    ];
    
    return oceanTerms.some(term => content.includes(term));
  });
}

// Post-processing filter to remove entertainment/gaming content from cached results
function removeNonOceanographicContent(articles: NewsItem[]): NewsItem[] {
  return articles.filter((article: NewsItem) => {
    const content = (article.title + ' ' + article.description).toLowerCase();
    
    // Strong exclusion patterns that indicate non-scientific content
    const strictExcludePatterns = [
      /gaming|games|video game|mobile game|smartphone app/,
      /entertainment|tv show|movie|film|anime|manga|series/,
      /romance|dating|couple.*palace|celebrity|actor|actress/,
      /k-pop|korean.*music|album|song|band|idol|mnet/,
      /awards.*ceremony|trophy.*winner|competition.*winner/,
      /streaming|netflix|disney|platform.*channel/,
      /casino|gambling|betting|lottery|poker/,
      /fashion|beauty|cosmetics|makeup|skincare/,
      /restaurant|food|cuisine|chef|cooking/,
      /politics.*election|government.*policy/,
      /business.*stock|investment.*market/,
      /sports|football|basketball|soccer|athlete/,
      /haruka.*beyond.*stream|couple.*palace|romance.*games/,
      /launches.*new.*smartphone|debuts.*ios.*android/,
      /cj enm|mnet.*program|variety.*show|korean.*entertainment/
    ];
    
    // Check if article matches any exclusion pattern
    const shouldExclude = strictExcludePatterns.some(pattern => pattern.test(content));
    
    if (shouldExclude) {
      console.log(`POST-FILTER: Removing non-oceanographic article: "${article.title.substring(0, 50)}..."`);
      return false;
    }
    
    return true;
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

  // Step 1: Check for cached data first
  const cachedNews = await getCachedNews();
  if (cachedNews) {
    return cachedNews.articles;
  }

  // Step 2: Acquire distributed lock to prevent concurrent API calls
  const lockKey = 'news:fetch_lock';
  const lockAcquired = await acquireLock(lockKey, 60); // 60 second timeout

  if (!lockAcquired) {
    console.log('Another fetch is in progress, waiting for cached result...');
    // Wait a bit and check cache again
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newCachedNews = await getCachedNews();
    if (newCachedNews) {
      return newCachedNews.articles;
    }
    // If still no cache, return fallback
    return fallbackNews.slice(0, 9);
  }

  let wasSuccessful = false;
  let source: 'everything' | 'top-headlines' | 'fallback' = 'fallback';
  
  try {
    // Step 3: Check daily fetch limits
    const dailyState = await getDailyFetchState();
    
    if (dailyState.successfulFetches >= dailyState.maxFetches) {
      console.log(`Daily fetch limit reached (${dailyState.successfulFetches}/${dailyState.maxFetches}). Using fallback data.`);
      // DON'T cache fallback data when limit is reached - return directly
      return fallbackNews.slice(0, 9);
    }

    console.log(`Attempting API fetch (${dailyState.successfulFetches}/${dailyState.maxFetches} daily fetches used)`);

    // Step 4: Attempt API fetch
    // ✅ Calculate date range (last 1 month for developer plan)
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setMonth(fromDate.getMonth() - 1);

    const searchQueries = ['ocean', 'marine', 'sea', 'coral', 'climate', 'water', 'tsunami', 'cyclone'];
    const searchQuery = searchQueries.join(' OR ');
    
    const url = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `from=${fromDate.toISOString().split('T')[0]}&` +
      `to=${toDate.toISOString().split('T')[0]}&` +
      `language=en&sortBy=publishedAt&pageSize=100&apiKey=${apiKey}`;

    console.log('NewsAPI URL (without API key):', url.replace(/apiKey=[^&]+/, 'apiKey=***'));

    let response = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'FloatChat/1.0' } });
    
    // Check if we got a successful response from /everything
    if (response.ok) {
      source = 'everything';
      wasSuccessful = true;
    } else if (response.status === 426 || response.status === 429) {
      console.warn(`NewsAPI returned ${response.status}. Trying top-headlines fallback...`);
      
      // Try top-headlines endpoint as fallback with broader query
      const topHeadlinesUrl = `https://newsapi.org/v2/top-headlines?` +
        `category=science&` +
        `language=en&pageSize=100&apiKey=${apiKey}`;
      
      response = await fetch(topHeadlinesUrl, { method: 'GET', headers: { 'User-Agent': 'FloatChat/1.0' } });
      
      if (response.ok) {
        source = 'top-headlines';
        wasSuccessful = true;
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

    console.log(`NewsAPI returned ${data.articles?.length || 0} articles from ${source}`);
    
    if (!data.articles || data.articles.length === 0) {
      console.warn('No articles found from NewsAPI, using fallback data');
      wasSuccessful = false;
      source = 'fallback';
      const results = fallbackNews.slice(0, 9);
      // DON'T cache fallback articles - let them be fetched fresh each time
      await updateDailyFetchState(wasSuccessful);
      return results;
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

    console.log(`Found ${validArticles.length} valid articles, filtering with AI...`);
    const aiFilteredArticles = await filterWithAI(validArticles);
    console.log(`AI filtering resulted in ${aiFilteredArticles.length} articles`);

    const transformedNews: NewsItem[] = aiFilteredArticles.map((article: any) => {
      console.log(`Article: "${article.title.substring(0, 50)}..." - Published: ${article.publishedAt}`);
      return {
        title: article.title,
        description: article.description,
        url: article.url,
        image: article.urlToImage,
        publishedAt: article.publishedAt,
        source: article.source?.name || 'News Source'
      };
    });

    // Apply post-processing filter to remove entertainment/gaming content
    const postFilteredNews = removeNonOceanographicContent(transformedNews);
    console.log(`Post-processing filter: ${transformedNews.length} -> ${postFilteredNews.length} articles`);

    // Always return exactly 9 articles (fill with fallback if needed)
    const results = postFilteredNews.length < 9
      ? [...postFilteredNews, ...fallbackNews].slice(0, 9)
      : postFilteredNews.slice(0, 9);

    // Step 5: Cache ONLY successful API results and update daily state
    if (wasSuccessful) {
      await setCachedNews(results, wasSuccessful, source);
      console.log(`Successfully cached real news from ${source}`);
    } else {
      console.log('Not caching fallback data - will retry API on next request');
    }
    await updateDailyFetchState(wasSuccessful);

    return results;

  } catch (error) {
    console.error('Error fetching news from API:', error);
    
    // DON'T cache fallback data - return it directly so API will be retried
    const results = fallbackNews.slice(0, 9);
    await updateDailyFetchState(false);
    
    return results;
  } finally {
    // Always release the lock
    await releaseLock(lockKey);
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

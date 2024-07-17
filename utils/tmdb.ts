import axios from "axios";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface SearchResult {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
}

interface MovieOrTvDetails {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
  original_language: string;
  genres: { name: string }[];
}

interface CastMember {
  name: string;
}

export const searchMovieOrTvShow = async (
  query: string,
  locale: string
): Promise<SearchResult[]> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query,
        language: locale,
      },
    });

    const results = response.data.results;

    // Sort results by release_date or first_air_date, most recent first
    results.sort((a: SearchResult, b: SearchResult) => {
      const dateA = new Date(
        a.release_date || a.first_air_date || ""
      ).getTime();
      const dateB = new Date(
        b.release_date || b.first_air_date || ""
      ).getTime();
      return dateB - dateA;
    });

    return results;
  } catch (error) {
    console.error("Error fetching data from TMDB:", error);
    return [];
  }
};

export const getMovieOrTvShowDetails = async (
  id: number,
  type: "movie" | "tv",
  locale: string
): Promise<MovieOrTvDetails | null> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: locale,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching details from TMDB:", error);
    return null;
  }
};

export const getCast = async (
  id: number,
  type: "movie" | "tv",
  locale: string
): Promise<CastMember[]> => {
  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/${type}/${id}/credits`,
      {
        params: {
          api_key: TMDB_API_KEY,
          language: locale,
        },
      }
    );

    return response.data.cast.slice(0, 5);
  } catch (error) {
    console.error("Error fetching cast from TMDB:", error);
    return [];
  }
};

export const getWatchProviders = async (id: number, type: "movie" | "tv", locale: string): Promise<string | null> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}/watch/providers`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });

    // Extract the country code from the locale
    const country = locale.split('-')[1]?.toUpperCase() || locale.toUpperCase() || 'US'; // Default to 'US' if locale does not contain a country

    const providers = response.data.results?.[country];

    if (!providers) {
      return "No OTT information available.";
    }

    let providerInfo = "";

    if (providers.flatrate) {
      providerInfo += "Included in Subscription:\n";
      providers.flatrate.forEach(provider => {
        providerInfo += `- ${provider.provider_name}\n`;
      });
    }

    if (providers.rent) {
      providerInfo += "Available for Rent:\n";
      providers.rent.forEach(provider => {
        providerInfo += `- ${provider.provider_name}\n`;
      });
    }

    if (providers.buy) {
      providerInfo += "Available for Purchase:\n";
      providers.buy.forEach(provider => {
        providerInfo += `- ${provider.provider_name}\n`;
      });
    }

    return providerInfo;
  } catch (error) {
    console.error("Error fetching watch providers from TMDB:", error);
    return null;
  }
};
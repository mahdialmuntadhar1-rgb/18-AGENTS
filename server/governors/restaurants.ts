import { BaseGovernor } from "./base-governor.js";

export class RestaurantsGovernor extends BaseGovernor {
  category = "Restaurants";
  agentName = "Gov-01 Restaurants";

  async gather(): Promise<any[]> {
    console.log(`Gathering data for ${this.category}...`);
    
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey || apiKey === "your-google-places-api-key") {
      console.log("No GOOGLE_PLACES_API_KEY found. Returning mock data.");
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock data for demonstration
      return [
        {
          name: "Al-Baghdadi Traditional Restaurant",
          category: this.category,
          address: "Al-Mutanabbi Street",
          city: "Baghdad",
          latitude: 33.3386,
          longitude: 44.3939,
          phone: "+964 770 123 4567",
          website: "https://example.com",
          rating: 4.5,
          review_count: 120,
          source: "Google Places",
        },
        {
          name: "Tigris River Cafe & Grill",
          category: this.category,
          address: "Abu Nuwas Street",
          city: "Baghdad",
          latitude: 33.3152,
          longitude: 44.4009,
          phone: "+964 780 987 6543",
          website: "https://example.com",
          rating: 4.8,
          review_count: 340,
          source: "Google Places",
        },
      ];
    }

    try {
      console.log("Fetching real data from Google Places API...");
      const query = encodeURIComponent("best restaurants in Baghdad, Iraq");
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results) {
        console.error("Google Places API error:", data);
        return [];
      }

      return data.results.map((place: any) => ({
        name: place.name,
        category: this.category,
        address: place.formatted_address,
        city: "Baghdad",
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        rating: place.rating,
        review_count: place.user_ratings_total,
        source: "Google Places",
      }));
    } catch (error) {
      console.error("Error fetching from Google Places API:", error);
      return [];
    }
  }
}

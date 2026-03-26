import { BaseGovernor } from "./base-governor.js";

export class RestaurantsGovernor extends BaseGovernor {
  category = "Restaurants";
  agentName = "Agent-01";
  governmentRate = "Rate Level 1";

  async gather(city?: string): Promise<any[]> {
    const targetCity = city || "Baghdad";
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey || apiKey === "your-google-places-api-key") {
      throw new Error("NOT_CONFIGURED: GOOGLE_PLACES_API_KEY missing");
    }

    const query = encodeURIComponent(`best restaurants in ${targetCity}, Iraq`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.results) {
      throw new Error(`Google Places API error: ${data.status || response.status}`);
    }

    return data.results.map((place: any) => ({
      external_id: place.place_id,
      name: place.name,
      category: this.category,
      address: place.formatted_address,
      city: targetCity,
      latitude: place.geometry?.location?.lat,
      longitude: place.geometry?.location?.lng,
      rating: place.rating,
      review_count: place.user_ratings_total,
      source: "google_places",
      source_url: place.place_id
        ? `https://maps.google.com/?cid=${place.place_id}`
        : `https://maps.google.com/?q=${encodeURIComponent(place.name)}`,
      collected_at: new Date().toISOString(),
      raw_payload: place,
    }));
  }
}

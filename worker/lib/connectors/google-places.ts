import type { ProviderBusiness } from '../schema';

export class ConnectorNotConfiguredError extends Error {
  constructor(message = 'GOOGLE_PLACES_API_KEY is not configured') {
    super(message);
    this.name = 'ConnectorNotConfiguredError';
  }
}

export async function fetchGooglePlacesBusinesses(
  apiKey: string | undefined,
  city: string,
  category: string,
): Promise<ProviderBusiness[]> {
  if (!apiKey) {
    throw new ConnectorNotConfiguredError();
  }

  const query = encodeURIComponent(`best ${category} in ${city}, Iraq`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`google_places_http_${response.status}`);
  }

  const data = (await response.json()) as { results?: Array<Record<string, unknown>> };

  return (data.results ?? []).map((place) => {
    const geometry = place.geometry as { location?: { lat?: number; lng?: number } } | undefined;

    return {
      externalId: place.place_id as string | undefined,
      name: (place.name as string | undefined) ?? 'unknown',
      category,
      city,
      address: place.formatted_address as string | undefined,
      latitude: geometry?.location?.lat,
      longitude: geometry?.location?.lng,
      rating: place.rating as number | undefined,
      reviewCount: place.user_ratings_total as number | undefined,
      sourceUrl: place.url as string | undefined,
      rawPayload: place,
    } satisfies ProviderBusiness;
  });
}

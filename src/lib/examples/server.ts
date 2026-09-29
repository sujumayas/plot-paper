import { toExample, type Example } from "./index";
import { RAW_EXAMPLES } from "./manifest";

/** Examples shown first in the gallery; the rest follow alphabetically. */
const FEATURED = [
  "co2-mauna-loa",
  "wealth-and-health",
  "electricity-mix-by-country",
  "saas-arr-bridge",
  "co2-emitters-treemap",
  "imdb-rating-by-genre",
  "world-electricity-mix",
  "life-expectancy-continents",
  "ecommerce-checkout-funnel",
  "co2-per-capita-1990-vs-now",
  "saas-monthly-kpis",
  "tech-stocks-2000s",
];
const rank = (id: string) => {
  const i = FEATURED.indexOf(id);
  return i < 0 ? FEATURED.length : i;
};

/** All bundled examples (server-side: gallery, landing page, render scripts). */
export const EXAMPLES: Example[] = RAW_EXAMPLES.map(toExample).sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));

export function getExample(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}

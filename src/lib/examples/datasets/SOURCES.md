# Example dataset sources

This file lists every gallery example in this folder, where its data came from and the terms that apply. Real data was fetched on 2026-09-29. Some values are aggregated or rounded; each file's `subtitle` and `note` say how.

Illustrative examples use made-up business or personal-analytics data. Their subtitle and tags say "illustrative", and they have no external source.

| id | chartType | source URL | license / terms | notes |
|---|---|---|---|---|
| `co2-mauna-loa` | line | <https://gml.noaa.gov/ccgg/trends/data.html> | Public domain (US Government / NOAA GML; cite Keeling & NOAA) | File: <https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.csv> |
| `co2-seasonal-cycle` | heatmap | <https://gml.noaa.gov/ccgg/trends/data.html> | Public domain (NOAA GML) | File: <https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv>. Value = monthly average minus deseasonalized. |
| `life-expectancy-continents` | multiline | <https://ourworldindata.org/grapher/life-expectancy> | CC BY 4.0 (Our World in Data) |  |
| `pib-per-capita-latam` | hbar | <https://data.worldbank.org/indicator/NY.GDP.PCAP.PP.CD> | CC BY 4.0 (World Bank) | World Bank API v2, indicator NY.GDP.PCAP.PP.CD, 2024 |
| `inflacion-lima` | line | <https://estadisticas.bcrp.gob.pe/estadisticas/series/mensuales/resultados/PN01273PM/html> | Datos públicos del BCRP (uso libre citando la fuente) | API: <https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PN01273PM/json/2015-1/2026-9> |
| `seattle-2015-heat-calendar` | calendar | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/seattle-weather.csv> | Public domain (NOAA); packaged in vega-datasets (BSD-3-Clause) |  |
| `seattle-temperature-by-month` | boxplot | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/seattle-weather.csv> | Public domain (NOAA); vega-datasets (BSD-3-Clause) |  |
| `seattle-weather-mix` | donut | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/seattle-weather.csv> | Public domain (NOAA); vega-datasets (BSD-3-Clause) |  |
| `seattle-monthly-rainfall` | bar | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/seattle-weather.csv> | Public domain (NOAA); vega-datasets (BSD-3-Clause) |  |
| `cars-horsepower-vs-mpg` | scatter | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/cars.json> | CC BY 4.0 (UCI ML Repository) | Upstream: UCI Auto MPG <https://archive.ics.uci.edu/dataset/9/auto+mpg> |
| `car-profiles-by-origin` | radar | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/cars.json> | CC BY 4.0 (UCI ML Repository) | Upstream: UCI Auto MPG <https://archive.ics.uci.edu/dataset/9/auto+mpg>. Averages indexed to the all-car mean. |
| `gapminder-families-and-lifespans` | bubble | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/gapminder.json> | CC BY 4.0 (Gapminder) | Upstream: Gapminder <https://www.gapminder.org/data/> |
| `tech-stocks-2000s` | multiline | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/stocks.csv> | vega-datasets (BSD-3-Clause); original source unspecified |  |
| `us-unemployment-by-industry` | heatmap | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/unemployment-across-industries.json> | Public domain (US BLS); vega-datasets (BSD-3-Clause) |  |
| `disaster-deaths-by-decade` | stacked | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/disasters.csv> | EM-DAT data via OWID (CC BY 4.0 for OWID-processed data); vega-datasets (BSD-3-Clause) | Upstream: EM-DAT via OWID <https://ourworldindata.org/natural-disasters>. Summed by decade. |
| `imdb-rating-distribution` | histogram | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/movies.json> | vega-datasets (BSD-3-Clause); IMDb ratings used for illustration only | Evenly spaced 2,000-row sample |
| `imdb-rating-by-genre` | boxplot | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/movies.json> | vega-datasets (BSD-3-Clause); IMDb ratings used for illustration only | Subsampled to at most 330 per genre |
| `solar-module-prices` | line | <https://ourworldindata.org/grapher/solar-pv-prices> | CC BY 4.0 (Our World in Data) |  |
| `world-electricity-mix` | waffle | <https://ourworldindata.org/grapher/share-elec-by-source> | CC BY 4.0 (Our World in Data) |  |
| `matriz-electrica-peru` | pie | <https://ourworldindata.org/grapher/share-elec-by-source?country=~PER> | CC BY 4.0 (Our World in Data) |  |
| `wind-solar-decade` | dumbbell | <https://ourworldindata.org/grapher/share-elec-by-source> | CC BY 4.0 (Our World in Data) |  |
| `solar-share-of-electricity` | multiline | <https://ourworldindata.org/grapher/share-elec-by-source> | CC BY 4.0 (Our World in Data) |  |
| `electricity-mix-by-country` | stacked | <https://ourworldindata.org/grapher/share-elec-by-source> | CC BY 4.0 (Our World in Data) |  |
| `co2-per-capita-1990-vs-now` | slope | <https://ourworldindata.org/grapher/co-emissions-per-capita> | CC BY 4.0 (Our World in Data) |  |
| `co2-emitters-treemap` | treemap | <https://ourworldindata.org/grapher/annual-co2-emissions-per-country> | CC BY 4.0 (Our World in Data) |  |
| `internet-america-latina` | lollipop | <https://ourworldindata.org/grapher/share-of-individuals-using-the-internet> | CC BY 4.0 (Our World in Data); ITU data |  |
| `global-plastic-production` | area | <https://ourworldindata.org/grapher/global-plastics-production> | CC BY 4.0 (Our World in Data) |  |
| `world-primary-energy` | area | <https://ourworldindata.org/grapher/primary-energy-source-bar> | CC BY 4.0 (Our World in Data) |  |
| `barley-morris-anomaly` | grouped | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/barley.json> | vega-datasets (BSD-3-Clause); original 1934 published data |  |
| `iowa-electricity-shift` | stacked | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/iowa-electricity.csv> | Public domain (US EIA); vega-datasets (BSD-3-Clause) |  |
| `us-age-structure-1900-2000` | grouped | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/population.json> | IPUMS USA terms (free for research/education, cite IPUMS); vega-datasets (BSD-3-Clause) |  |
| `crecimiento-pib-peru` | bar | <https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=PE> | CC BY 4.0 (World Bank) | World Bank API v2, PER, indicator NY.GDP.MKTP.KD.ZG |
| `solar-capacity-leaders` | hbar | <https://ourworldindata.org/grapher/installed-solar-pv-capacity> | CC BY 4.0 (Our World in Data) |  |
| `wealth-and-health` | scatter | <https://ourworldindata.org/grapher/life-expectancy-vs-gdp-per-capita> | CC BY 4.0 (Our World in Data) | Joined from the OWID grapher CSVs gdp-per-capita-worldbank, life-expectancy and population (2023) |
| `sp500-lost-decade` | line | <https://cdn.jsdelivr.net/npm/vega-datasets@2/data/sp500.csv> | vega-datasets (BSD-3-Clause) |  |
| `saas-arr-bridge` | waterfall | (none, illustrative) | Illustrative data (no external source) |  |
| `ecommerce-checkout-funnel` | funnel | (none, illustrative) | Illustrative data (no external source) |  |
| `saas-monthly-kpis` | kpi | (none, illustrative) | Illustrative data (no external source) |  |
| `q3-okr-progress` | progress | (none, illustrative) | Illustrative data (no external source) |  |
| `freelancer-monthly-budget` | donut | (none, illustrative) | Illustrative data (no external source) |  |
| `daily-steps-2025` | calendar | (none, illustrative) | Illustrative data (no external source) | Synthetic, seeded generator (mulberry32 seed 20250101) |
| `presidentes-peru-2016-2025` | timeline | <https://es.wikipedia.org/wiki/Anexo:Presidentes_del_Per%C3%BA> | Hechos de dominio público; texto de Wikipedia bajo CC BY-SA 4.0 (solo se usaron fechas) | Dates compiled by hand from the public record (Wikipedia list of presidents) |

## License summary

- **Our World in Data** charts and data are CC BY 4.0. Credit OWID and the underlying source named in each example.
- **World Bank** World Development Indicators are CC BY 4.0.
- **NOAA GML** and other US federal data (BLS, EIA, NCEI) are public domain. NOAA asks users to cite the Mauna Loa record.
- **BCRP** (Banco Central de Reserva del Perú) publishes public statistics that are free to reuse with attribution to BCRPData.
- **vega-datasets**: the npm package is BSD-3-Clause, and each file keeps the terms of its upstream source (UCI Auto MPG and Gapminder are CC BY 4.0; IPUMS data is free to use with a citation). Upstream does not fully document where `stocks.csv`, `sp500.csv` and `movies.json` came from, so use them as demo data only.
- **Wikipedia**: only factual dates were taken. The article text is CC BY-SA 4.0.

-- Seed the 13 built-in viz types. Glyphs live in src/lib/viz/catalog.tsx (code-side, keyed by base_renderer_id).
-- Idempotent via ON CONFLICT (slug, owner_id is null).

insert into public.viz_types (slug, name, description, category, base_renderer_id, columns, sample, owner_id, is_public)
values
  ('bar', 'Bar chart', 'Category vs value', 'Comparison', 'bar',
    '[{"name":"category","type":"string"},{"name":"value","type":"number"}]'::jsonb,
    '[{"category":"Almonds","value":42},{"category":"Walnuts","value":67},{"category":"Cashews","value":31},{"category":"Pistachios","value":58},{"category":"Pecans","value":23}]'::jsonb,
    null, true),

  ('hbar', 'Ranked bars', 'Sorted horizontal bars', 'Comparison', 'hbar',
    '[{"name":"label","type":"string"},{"name":"score","type":"number"}]'::jsonb,
    '[{"label":"Helsinki","score":7.8},{"label":"Copenhagen","score":7.6},{"label":"Reykjavik","score":7.5},{"label":"Zurich","score":7.2},{"label":"Oslo","score":7.1}]'::jsonb,
    null, true),

  ('line', 'Line chart', 'Trends over time', 'Trends', 'line',
    '[{"name":"date","type":"string"},{"name":"value","type":"number"}]'::jsonb,
    '[{"date":"Jan","value":120},{"date":"Feb","value":132},{"date":"Mar","value":101},{"date":"Apr","value":134},{"date":"May","value":190},{"date":"Jun","value":230},{"date":"Jul","value":210},{"date":"Aug","value":244}]'::jsonb,
    null, true),

  ('multiline', 'Multi-line', 'Compare series', 'Trends', 'multiline',
    '[{"name":"date","type":"string"},{"name":"revenue","type":"number"},{"name":"cost","type":"number"}]'::jsonb,
    '[{"date":"Q1-22","revenue":120,"cost":90},{"date":"Q2-22","revenue":148,"cost":94},{"date":"Q3-22","revenue":175,"cost":110},{"date":"Q4-22","revenue":210,"cost":120},{"date":"Q1-23","revenue":232,"cost":135},{"date":"Q2-23","revenue":280,"cost":148}]'::jsonb,
    null, true),

  ('area', 'Area chart', 'Volume over time', 'Trends', 'area',
    '[{"name":"month","type":"string"},{"name":"users","type":"number"}]'::jsonb,
    '[{"month":"Jan","users":1200},{"month":"Feb","users":1450},{"month":"Mar","users":1380},{"month":"Apr","users":1680},{"month":"May","users":1920},{"month":"Jun","users":2310}]'::jsonb,
    null, true),

  ('donut', 'Donut chart', 'Parts of a whole', 'Composition', 'donut',
    '[{"name":"segment","type":"string"},{"name":"share","type":"number"}]'::jsonb,
    '[{"segment":"Enterprise","share":42},{"segment":"Mid-market","share":28},{"segment":"SMB","share":18},{"segment":"Self-serve","share":12}]'::jsonb,
    null, true),

  ('pie', 'Pie chart', 'Composition', 'Composition', 'pie',
    '[{"name":"slice","type":"string"},{"name":"amount","type":"number"}]'::jsonb,
    '[{"slice":"Coffee","amount":120},{"slice":"Groceries","amount":340},{"slice":"Transit","amount":90},{"slice":"Rent","amount":1200}]'::jsonb,
    null, true),

  ('scatter', 'Scatter plot', 'Correlation / dots', 'Relationships', 'scatter',
    '[{"name":"x","type":"number"},{"name":"y","type":"number"},{"name":"size","type":"number"}]'::jsonb,
    '[{"x":12,"y":43,"size":14},{"x":24,"y":67,"size":22},{"x":33,"y":55,"size":9},{"x":45,"y":89,"size":30},{"x":51,"y":42,"size":18},{"x":62,"y":76,"size":12},{"x":71,"y":95,"size":26},{"x":82,"y":58,"size":8}]'::jsonb,
    null, true),

  ('heatmap', 'Heatmap', 'Matrix of values', 'Relationships', 'heatmap',
    '[{"name":"row","type":"string"},{"name":"column","type":"string"},{"name":"value","type":"number"}]'::jsonb,
    '[{"row":"Mon","column":"9am","value":12},{"row":"Mon","column":"12pm","value":45},{"row":"Mon","column":"3pm","value":30},{"row":"Mon","column":"6pm","value":88},{"row":"Tue","column":"9am","value":18},{"row":"Tue","column":"12pm","value":52},{"row":"Tue","column":"3pm","value":40},{"row":"Tue","column":"6pm","value":75},{"row":"Wed","column":"9am","value":22},{"row":"Wed","column":"12pm","value":60},{"row":"Wed","column":"3pm","value":55},{"row":"Wed","column":"6pm","value":92},{"row":"Thu","column":"9am","value":16},{"row":"Thu","column":"12pm","value":48},{"row":"Thu","column":"3pm","value":42},{"row":"Thu","column":"6pm","value":80},{"row":"Fri","column":"9am","value":9},{"row":"Fri","column":"12pm","value":35},{"row":"Fri","column":"3pm","value":28},{"row":"Fri","column":"6pm","value":64}]'::jsonb,
    null, true),

  ('radar', 'Radar chart', 'Multivariate profile', 'Distribution', 'radar',
    '[{"name":"axis","type":"string"},{"name":"you","type":"number"},{"name":"benchmark","type":"number"}]'::jsonb,
    '[{"axis":"Speed","you":72,"benchmark":58},{"axis":"Accuracy","you":84,"benchmark":70},{"axis":"Clarity","you":66,"benchmark":74},{"axis":"Depth","you":58,"benchmark":52},{"axis":"Breadth","you":80,"benchmark":62},{"axis":"Rigor","you":74,"benchmark":68}]'::jsonb,
    null, true),

  ('kpi', 'KPI cards', 'Big headline numbers', 'Headline', 'kpi',
    '[{"name":"metric","type":"string"},{"name":"value","type":"number"},{"name":"change_pct","type":"number"}]'::jsonb,
    '[{"metric":"Monthly revenue","value":248000,"change_pct":12},{"metric":"Active users","value":18400,"change_pct":8},{"metric":"Churn rate","value":3.2,"change_pct":-1}]'::jsonb,
    null, true),

  ('timeline', 'Timeline', 'Schedule / gantt', 'Planning', 'timeline',
    '[{"name":"task","type":"string"},{"name":"start","type":"number"},{"name":"end","type":"number"}]'::jsonb,
    '[{"task":"Research","start":1,"end":4},{"task":"Design","start":3,"end":7},{"task":"Build","start":6,"end":12},{"task":"Test","start":10,"end":14},{"task":"Launch","start":14,"end":15}]'::jsonb,
    null, true)
on conflict (slug, coalesce(owner_id::text, '')) do update
  set name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      base_renderer_id = excluded.base_renderer_id,
      columns = excluded.columns,
      sample = excluded.sample,
      is_public = excluded.is_public;

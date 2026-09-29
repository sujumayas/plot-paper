import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { rows: unknown[]; error: unknown; throws: boolean; configured: boolean } = { rows: [], error: null, throws: false, configured: true };

vi.mock("@/lib/supabase/server", () => ({
  getServerClient: async () => {
    if (!state.configured) return null;
    if (state.throws) throw new Error("network down");
    const q = {
      select: () => q,
      eq: () => q,
      order: () => q,
      limit: async () => ({ data: state.rows, error: state.error }),
      maybeSingle: async () => ({ data: state.rows[0] ?? null, error: state.error }),
    };
    return { from: () => q };
  },
}));

const { listCommunityCharts, getCommunityChart } = await import("@/lib/community");

const row = (over: Record<string, unknown> = {}) => ({
  id: "0b8f7c7e-3a2b-4c1d-9e8f-123456789abc",
  title: "Coffee",
  description: "cups",
  chart_type: "bar",
  config: { chartType: "bar", title: "Coffee", subtitle: "cups", mapping: { label: "k", value: "v" }, columns: [{ name: "k", type: "string" }, { name: "v", type: "number" }], style: { width: 800, height: 500 } },
  data: [{ k: "a", v: 1 }],
  display_author: "ana",
  likes: 1,
  views: 2,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

beforeEach(() => Object.assign(state, { rows: [], error: null, throws: false, configured: true }));

describe("community charts", () => {
  it("maps rows to renderable documents", async () => {
    state.rows = [row()];
    const [c] = await listCommunityCharts();
    expect(c.def.id).toBe("bar");
    expect(c.doc.style.width).toBe(800);
    expect(c.doc.data).toEqual([{ k: "a", v: 1 }]);
    expect(c.author).toBe("ana");
  });

  it("repairs hostile or partial rows", async () => {
    state.rows = [
      row({ config: null, chart_type: null, data: "not an array", display_author: null }),
      row({ chart_type: "custom:x", config: { spec: { name: "evil", layers: [{ mark: "script" }] } } }),
      row({ config: { style: { width: 1e9, height: -1 } } }),
    ];
    const list = await listCommunityCharts();
    expect(list).toHaveLength(3);
    expect(list[0].doc.data).toEqual([]);
    expect(list[0].def.id).toBe("bar");
    expect(list[1].def.id).toBe("bar"); // invalid spec falls back
    expect(list[2].doc.style.width).toBe(4000);
    expect(list[2].doc.style.height).toBe(320);
  });

  it("renders valid community PlotSpecs", async () => {
    const { SPEC_TEMPLATES } = await import("@/lib/viz/spec/templates");
    state.rows = [row({ chart_type: "custom:abc", config: { spec: SPEC_TEMPLATES[0].spec } })];
    const [c] = await listCommunityCharts();
    expect(c.def.isCustom).toBe(true);
    expect(c.def.name).toBe("Bullet chart");
  });

  it("skips rows that can't be read, caps data and exposes custom specs for remixing", async () => {
    const { SPEC_TEMPLATES } = await import("@/lib/viz/spec/templates");
    const exploding = row();
    Object.defineProperty(exploding, "config", { get() { throw new Error("corrupt"); }, enumerable: true });
    state.rows = [
      exploding,
      row({ data: Array.from({ length: 6000 }, (_, i) => ({ k: `k${i}`, v: i })) }),
      row({ chart_type: "custom:abc", config: { spec: SPEC_TEMPLATES[0].spec } }),
    ];
    const list = await listCommunityCharts();
    expect(list).toHaveLength(2);
    expect(list[0].doc.data).toHaveLength(5000);
    expect(list[0].spec).toBeNull();
    expect(list[1].spec?.name).toBe(SPEC_TEMPLATES[0].spec.name);
  });

  it("returns [] when Supabase is missing, erroring or unreachable", async () => {
    state.configured = false;
    expect(await listCommunityCharts()).toEqual([]);
    state.configured = true;
    state.error = { message: "boom" };
    expect(await listCommunityCharts()).toEqual([]);
    state.error = null;
    state.throws = true;
    expect(await listCommunityCharts()).toEqual([]);
  });

  it("validates ids before querying", async () => {
    state.rows = [row()];
    expect(await getCommunityChart("../../etc/passwd")).toBeNull();
    expect((await getCommunityChart("0b8f7c7e-3a2b-4c1d-9e8f-123456789abc"))?.doc.title).toBe("Coffee");
  });
});

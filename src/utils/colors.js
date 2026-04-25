// Color palette — single source of truth, referenced from spec §4.
// Use hex strings; convert via new THREE.Color(COLORS.foo) where needed.

export const COLORS = {
  // Base / neutrals
  background:      '#FAFAF8',
  backgroundBottom:'#F0F0EC',
  ground:          '#F5F5F2',
  groundGrid:      '#D8D8D4',

  // Wood framing
  framing:         '#D9C9A8',
  framingShadow:   '#B8A582',
  subfloor:        '#C9B894',

  // MEP color coding
  plumbing:        '#3AA8D8',
  electrical:      '#E8A93A',
  hvac:            '#D8704A',
  gas:             '#D85050',

  // Insulation & finishes
  insulation:      '#F5D580',
  drywall:         '#F2EFE8',

  // Exterior — v3 palette tuned to the Champion 05-S30 York, NE rendering
  housewrap:       '#E8EDF2',     // pale blue-gray (under siding, mostly hidden in final)
  siding:          '#94A6B3',     // muted blue-gray lap siding (matches rendering)
  roofShingle:     '#4D3F35',     // warm dark brown asphalt shingles
  windowGlass:     '#1F2530',     // dark, near-black with subtle reflections
  windowFrame:     '#FFFFFF',     // white trim around windows
  doorWood:        '#9B6F4D',     // warm walnut/teak front door (used in v3 porch stage)

  // Brand accent
  spearAccent:     '#1A4A7A',
  spearLight:      '#4A90E2',
  approvedGreen:   '#3AA850',
};

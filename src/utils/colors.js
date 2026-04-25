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

  // Exterior
  housewrap:       '#E8EDF2',
  siding:          '#E5E0D5',
  roofShingle:     '#5A5A56',
  windowGlass:     '#A8C5D8',
  windowFrame:     '#FFFFFF',

  // Brand accent
  spearAccent:     '#1A4A7A',
  spearLight:      '#4A90E2',
  approvedGreen:   '#3AA850',
};

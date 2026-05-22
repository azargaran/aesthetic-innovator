import { useState, useEffect, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';

// =============================================================================
// PRACTICE v5 — Designed by A. Zargaran. UK 2026. © All rights reserved.
// Units: state.cash in £k (thousands).
// =============================================================================

const BACKGROUNDS = [
  { id: 'surgeon', label: 'Plastic Surgeon (GMC)', regulator: 'GMC', desc: 'NHS consultant or senior trainee. Anatomy is second nature. Can prescribe.', fx: { safety: 25, innovation: 20, brand: 15, compliance: 15, cash: -2 }, locked: [] },
  { id: 'doctor', label: 'Aesthetic Doctor (GMC)', regulator: 'GMC', desc: 'GMC-registered, full prescribing rights. Strong clinical baseline.', fx: { safety: 18, innovation: 12, brand: 8, compliance: 12 }, locked: [] },
  { id: 'nurse-ip', label: 'Aesthetic Nurse — Independent Prescriber (NMC)', regulator: 'NMC', desc: 'NMC + IP-qualified, autonomous practice.', fx: { safety: 15, nps: 10, innovation: 8, compliance: 10 }, locked: [] },
  { id: 'nurse', label: 'Aesthetic Nurse (NMC)', regulator: 'NMC', desc: 'Non-prescriber. Needs a remote prescriber for POMs.', fx: { safety: 10, nps: 8, compliance: 6, cash: -3 }, locked: [] },
  { id: 'dentist', label: 'Dentist (GDC)', regulator: 'GDC', desc: 'GDC-registered, can prescribe within scope.', fx: { safety: 14, innovation: 10, compliance: 10 }, locked: [] },
  { id: 'nm', label: 'Non-Medical Practitioner', regulator: 'Local Authority (under emerging licensing)', desc: 'No statutory healthcare regulator. High exposure under emerging licensing.', fx: { compliance: -15, safety: -10, brand: -8, innovation: -10, cash: 4 }, locked: ['cl1', 'cl2', 'gr1', 'gr7'] },
];

const STRUCTURES = [
  { id: 'sole', label: 'Sole Trader', desc: 'Fast, cheap. No personal liability protection.', fx: { cash: 2 } },
  { id: 'ltd', label: 'Limited Company', desc: 'Personal liability protected. More credibility.', fx: { brand: 4, compliance: 3, cash: -3 } },
];

const PREMISES = [
  { id: 'home', label: 'Home Treatment Room', desc: 'Treat from a spare room. You own the property, so no rent — just utilities, clinical waste contract, and council tax delta. Lowest overhead, significant brand and CQC-perception risk.', fx: { brand: -10, ethics: -3, cash: 0 }, capacity: 60, rentPerQ: 1 },
  { id: 'rented', label: 'Rented Chair in Salon', desc: 'A booth or treatment room inside a host salon. ~£600–900/month including bills.', fx: { brand: -4, cash: -2 }, capacity: 100, rentPerQ: 2.5 },
  { id: 'room', label: 'Dedicated Clinical Room', desc: 'Your own medical-grade room on a commercial lease. ~£1,200–2,000/month plus rates.', fx: { brand: 6, cash: -15 }, capacity: 220, rentPerQ: 5 },
  { id: 'flagship', label: 'Premium Clinic Suite', desc: 'Discretion architecture, private entrance, full lease. ~£4,000–12,000/month before rates and fit-out. Significant capex — usually requires a loan.', fx: { brand: 18, ethics: -2, cash: -50 }, capacity: 450, rentPerQ: 16 },
];

// London locations — borough × demographic × competition
const LOCATIONS = [
  { id: 'marylebone', label: 'Marylebone / Harley Street', shortLabel: 'Marylebone', desc: 'The historic medical postcode. Affluent, discreet, GP-referred. Highest rent in the country (~£85/sqft). Reputation matters more than reach.', rentMult: 2.2, capacityMult: 1.4, competition: 'high', archetype: 'premium', fx: { brand: 12, ethics: 4 }, mx: 218, my: 178 },
  { id: 'chelsea', label: 'Chelsea / South Kensington', shortLabel: 'Chelsea', desc: 'Old money meets new wealth. Sloane Square footfall, hedge-fund households. High willingness to pay, image-conscious clientele.', rentMult: 2.0, capacityMult: 1.3, competition: 'high', archetype: 'aspirational', fx: { brand: 9, nps: 2 }, mx: 195, my: 235 },
  { id: 'shoreditch', label: 'Shoreditch / Hoxton', shortLabel: 'Shoreditch', desc: 'Younger demographic, creative industries, fluent in social media. TikTok and Reels convert here. Lower rent than W1, faster brand reach.', rentMult: 1.4, capacityMult: 1.1, competition: 'medium', archetype: 'social-led', fx: { brand: 4, innovation: 6, ethics: -2 }, mx: 290, my: 175 },
  { id: 'wimbledon', label: 'Wimbledon Village', shortLabel: 'Wimbledon', desc: 'Stable professional demographic. Family-led purchase decisions, loyalty over novelty. Lower competition than central London.', rentMult: 1.1, capacityMult: 1.0, competition: 'medium', archetype: 'loyalist', fx: { nps: 5, ethics: 3 }, mx: 170, my: 305 },
  { id: 'croydon', label: 'Croydon / Outer South', shortLabel: 'Croydon', desc: 'High-volume, price-sensitive market. Difficult to charge premium. Easier to dominate by clinical reputation. Rent ~£25/sqft.', rentMult: 0.6, capacityMult: 0.9, competition: 'low', archetype: 'volume', fx: { brand: -3, ethics: 2 }, mx: 245, my: 335 },
  { id: 'richmond', label: 'Richmond / Twickenham', shortLabel: 'Richmond', desc: 'Affluent suburban demographic, riverside village feel. Lower competition, loyal clientele.', rentMult: 1.0, capacityMult: 1.0, competition: 'low', archetype: 'loyalist', fx: { brand: 3, ethics: 3, nps: 3 }, mx: 145, my: 268 },
  { id: 'manchester', label: 'Manchester / Spinningfields', shortLabel: 'Manchester', desc: 'Strong regional pull from Cheshire and the wider North-West. London-equivalent positioning at half the rent.', rentMult: 0.75, capacityMult: 1.1, competition: 'medium', archetype: 'aspirational', fx: { brand: 4 }, mx: 200, my: 80 },
  { id: 'edinburgh', label: 'Edinburgh New Town', shortLabel: 'Edinburgh', desc: 'Professional Scottish clientele, higher proportion of medical-led referral, less reliant on social media.', rentMult: 0.85, capacityMult: 1.0, competition: 'low', archetype: 'loyalist', fx: { ethics: 4, brand: 3 }, mx: 170, my: 30 },
];

// Competitor clinics — depend on location selection
const COMPETITOR_POOL = [
  { id: 'highstreet', name: 'High Street Aesthetics Ltd.', style: 'Volume-led, discount-driven, social-heavy', threat: { volume: 8, premium: 2, aspirational: 5, social: 6, loyalist: 3 } },
  { id: 'derm', name: 'The Dermatology Group', style: 'Medical-led, doctor-only, conservative', threat: { volume: 3, premium: 8, aspirational: 6, social: 1, loyalist: 7 } },
  { id: 'celeb', name: 'Couture Aesthetics', style: 'Celebrity-marketed, Instagram-first', threat: { volume: 6, premium: 7, aspirational: 9, social: 8, loyalist: 2 } },
  { id: 'chain', name: 'NorthStar Cosmetic Group', style: 'National chain, mid-market positioning', threat: { volume: 9, premium: 4, aspirational: 7, social: 6, loyalist: 5 } },
  { id: 'indie', name: 'Apothecary & Co.', style: 'Indie wellness brand, regenerative-led', threat: { volume: 2, premium: 6, aspirational: 5, social: 4, loyalist: 6 } },
];

// Company formation costs (deducted at setup)
const COMPANY_FORMATION_COST = 0.05; // £50 — Companies House online incorporation (£12 minimum, accountant onboarding optional)

// Patient archetypes — for acquisition battles
const PATIENT_TYPES = [
  { id: 'first-timer', label: 'Anxious First-Timer', desc: 'First injectables ever. Wants reassurance, not sales.', biases: { ethics: 1.4, safety: 1.3, nps: 1.0, brand: 0.7, innovation: 0.6 }, lifetimeValue: 4.5 },
  { id: 'switcher', label: 'Dissatisfied Switcher', desc: 'Bad experience elsewhere. Sceptical, well-informed.', biases: { ethics: 1.2, safety: 1.5, innovation: 1.1, brand: 0.8, nps: 1.0 }, lifetimeValue: 6.0 },
  { id: 'tiktok', label: 'TikTok-Driven Twentysomething', desc: 'Saw a Reel. Wants the look from the video.', biases: { brand: 1.5, innovation: 1.2, nps: 0.9, safety: 0.6, ethics: 0.5 }, lifetimeValue: 2.5 },
  { id: 'wealthy', label: 'Affluent Loyalist', desc: 'Established patient elsewhere, considering you. Discretion-led.', biases: { brand: 1.4, ethics: 1.3, nps: 1.2, safety: 1.1, innovation: 0.7 }, lifetimeValue: 12.0 },
  { id: 'menopause', label: 'Perimenopausal Returner', desc: 'Skin changes, hormonal context. Wants clinical depth.', biases: { ethics: 1.3, innovation: 1.4, safety: 1.2, brand: 0.9, nps: 1.0 }, lifetimeValue: 8.0 },
  { id: 'wedding', label: 'Wedding-Pressured Bride', desc: 'Six-month deadline. Anxious, sometimes pushy.', biases: { nps: 1.3, brand: 1.2, safety: 1.1, ethics: 0.8, innovation: 0.7 }, lifetimeValue: 3.5 },
];

// Multi-site expansion options. Two paths: organic build, or acquisition of failing competitor.
// Gated behind Brand ≥ 65 AND trailing 2Q EBITDA ≥ £30k.
// ---------- MARKETING CHANNELS ----------
// Player allocates marketing budget across four channels. Each has its own CAC, demographic,
// ASA risk, and brand-quality signature.
const MARKETING_CHANNELS = [
  { id: 'instagram', label: 'Instagram', sub: 'Reels + Stories', color: '#3D2548', cac: 165, demoSkew: 'broad', brandFx: 1.5, asaRisk: 0.05, ethicsFx: 0, desc: 'The proven default. Broad reach, mid-CAC, modest brand uplift. The category benchmark.' },
  { id: 'tiktok', label: 'TikTok', sub: 'Short-form viral', color: '#8B2C3C', cac: 95, demoSkew: 'young', brandFx: 0.6, asaRisk: 0.18, ethicsFx: -1, desc: 'Lowest CAC, youngest demographic, highest ASA breach risk. High volume, high churn. Compliance hit if you over-rely.' },
  { id: 'youtube', label: 'YouTube', sub: 'Long-form education', color: '#1A4D5E', cac: 280, demoSkew: 'high-intent', brandFx: 3.2, asaRisk: 0.02, ethicsFx: +1, desc: 'Highest CAC but highest intent. Educational long-form lifts brand and ethics signals. Slow build.' },
  { id: 'google', label: 'Paid Google', sub: 'Search + Display', color: '#5C7A52', cac: 210, demoSkew: 'intent', brandFx: 1.0, asaRisk: 0.04, ethicsFx: 0, desc: 'Bottom-of-funnel intent traffic. Patients already searching. Reliable, low-risk, brand-neutral.' },
];

// ---------- RIVALS ----------
// Named competitors that move quarter-on-quarter. Each has a position, brand, scandal risk.
// Their movements affect your demand, your acquirer interest, and the narrative.
const RIVAL_NETWORK = [
  { id: 'northstar', name: 'NorthStar Aesthetics', archetype: 'premium-chain', startingBrand: 70, startingSites: 3, color: '#1A4D5E', desc: 'A Marylebone-anchored four-site chain. Pharma-courted. The clinic you measure yourself against.' },
  { id: 'highstreet', name: 'Skin Studios UK', archetype: 'volume-chain', startingBrand: 55, startingSites: 8, color: '#8B2C3C', desc: 'High-street operator. Eight sites across London. Aggressive pricing, mixed reviews. Always at risk of a scandal.' },
  { id: 'boutique', name: 'Halcyon Clinic', archetype: 'single-site-premium', startingBrand: 78, startingSites: 1, color: '#3D2548', desc: 'Single-site Mayfair boutique. The owner trained at Harvard. Always rumoured to be selling.' },
  { id: 'newentrant', name: 'Glow Lab', archetype: 'social-disruptor', startingBrand: 35, startingSites: 1, color: '#B8945F', desc: 'TikTok-led startup launched 18 months ago. Young clientele, Shoreditch. Already on its third investor round.' },
];

const RIVAL_EVENTS = [
  { id: 'northstar-expansion', rival: 'northstar', minQ: 3, label: 'NorthStar opens a fifth site', desc: 'NorthStar opens in Chelsea. They\'re explicitly targeting premium pharma exit. Your demand softens 8% in their catchment.', fx: { brand: -2 }, demand: -0.05, brandShift: +5 },
  { id: 'highstreet-scandal', rival: 'highstreet', minQ: 4, label: 'Skin Studios faces vascular-event scandal', desc: 'A patient at a Skin Studios site develops a vascular occlusion. The story breaks on BBC. Patients flee to clinically-credible providers.', fx: { brand: 4, safety: 2, nps: 3 }, demand: +0.10, brandShift: -15, target: 'highstreet' },
  { id: 'boutique-sells', rival: 'boutique', minQ: 5, label: 'Halcyon Clinic sells to Galderma', desc: 'The Mayfair boutique exits at a rumoured 11× multiple. Pharma appetite for UK aesthetics confirmed. Your suitor multipliers rise.', fx: { innovation: 2, brand: 1 }, multiplierLift: 0.08 },
  { id: 'newentrant-funding', rival: 'newentrant', minQ: 2, label: 'Glow Lab raises £6M Series A', desc: 'The TikTok startup raises £6M. They\'ll be everywhere on social. Marketing CAC across the UK ticks up.', fx: { brand: -1 }, cacInflation: 0.18 },
  { id: 'highstreet-closes', rival: 'highstreet', minQ: 6, label: 'Skin Studios closes two London sites', desc: 'Sustained losses and the scandal force two-site closure. Their patients land in the market — yours if your brand holds.', fx: { brand: 3 }, demand: +0.08 },
  { id: 'rival-merger', rival: null, minQ: 5, label: 'Two regional chains merge', desc: 'Aesthetic Group North and South Coast Aesthetics announce a merger. Pressure on remaining independents to scale.', fx: { brand: -1 }, multiplierLift: -0.04 },
  { id: 'northstar-poaches', rival: 'northstar', minQ: 4, label: 'NorthStar poaches your senior staff', desc: 'NorthStar approaches your senior injector with an open-ended offer. If they leave, you lose throughput.', fx: { nps: -2 }, demand: -0.04 },
  { id: 'newentrant-collapse', rival: 'newentrant', minQ: 6, label: 'Glow Lab investor pulls funding', desc: 'The Series A investor cuts losses after the founder cashes out early. Glow Lab shutters. The young demographic returns to brand-led clinics.', fx: { brand: 2 }, demand: +0.06, brandShift: -20, target: 'newentrant' },
];

const ORGANIC_SITE_OPTIONS = [
  { id: 'org-satellite', label: 'Satellite Room — Outer Borough', cost: 60, monthlyCost: 12, capacity: 130, throughputBoost: 0.18, brandStartingPct: 0.55, desc: 'A modest treatment room in an outer borough — Wimbledon, Richmond. Lower capex, lower ceiling. Tests whether replication works.', premises: 'room' },
  { id: 'org-clinical', label: 'Clinical Suite — Secondary City', cost: 95, monthlyCost: 18, capacity: 200, throughputBoost: 0.25, brandStartingPct: 0.6, desc: 'A second-city flagship — Manchester, Edinburgh. Sub-London rent, full clinical-grade fit-out.', premises: 'room' },
  { id: 'org-flagship', label: 'Flagship Suite — Central London', cost: 150, monthlyCost: 32, capacity: 350, throughputBoost: 0.32, brandStartingPct: 0.7, desc: 'A second premium suite. Knightsbridge or Marylebone-equivalent. The ambitious play — high capex, high ceiling, high brand carry.', premises: 'flagship' },
];
const ACQUISITION_TARGETS = [
  { id: 'acq-distressed', label: 'Distressed Clinic — Outer London', cost: 40, monthlyCost: 14, capacity: 110, throughputBoost: 0.12, brandStartingPct: 0.30, assimilationRisk: 0.35, desc: 'A solo practitioner retiring early. Run-down premises, mixed patient reviews. Cheap entry but you inherit problems.' },
  { id: 'acq-midmarket', label: 'Mid-Market Chain Site', cost: 65, monthlyCost: 19, capacity: 180, throughputBoost: 0.22, brandStartingPct: 0.42, assimilationRisk: 0.25, desc: 'A site being divested from a regional chain. Established patient base, some staff. Moderate integration friction.' },
  { id: 'acq-boutique', label: 'Boutique Clinic — Brand-Damaged', cost: 80, monthlyCost: 22, capacity: 220, throughputBoost: 0.28, brandStartingPct: 0.35, assimilationRisk: 0.45, desc: 'Premium fit-out, recent complications scandal. Cheap relative to its bones. Rehabilitation play.' },
];

// Staff roles — hireable. Each has skill, wage (£/Q), and effect on the clinic.
const STAFF_ROLES = [
  { id: 'reception', label: 'Front-Desk Receptionist', desc: 'Calm patients before you see them. Reduces consultation friction.', wagePerQ: 6, fx: { nps: 6, ethics: 3 }, hireCost: 0.5 },
  { id: 'junior-nurse', label: 'Junior Injector (NMC)', desc: 'Handles toxin lists, basic filler. Frees your time for complex work.', wagePerQ: 11, fx: { nps: 4, innovation: 3, brand: 2 }, hireCost: 1.5, requiresPrescriber: true },
  { id: 'senior-injector', label: 'Senior Injector', desc: 'Independent practitioner. Doubles your capacity. Loyalty-flighty.', wagePerQ: 18, fx: { nps: 6, innovation: 8, brand: 7, safety: 4 }, hireCost: 3, poachable: true },
  { id: 'marketing', label: 'In-House Marketing Lead', desc: 'Owns social, editorial, PR. Compounds your brand quarter on quarter.', wagePerQ: 10, fx: { brand: 9, innovation: 2 }, hireCost: 1.2 },
  { id: 'patient-coord', label: 'Patient Coordinator', desc: 'Manages aftercare, follow-ups, retention. Lifts CLV.', wagePerQ: 7, fx: { nps: 8, ethics: 4, retention: 5 }, hireCost: 0.8 },
];

// Patient name pool for the persistent roster
const NAMED_PATIENTS = [
  { first: 'Sarah', archetype: 'wedding' }, { first: 'Olivia', archetype: 'wealthy' }, { first: 'Emma', archetype: 'menopause' },
  { first: 'Sophie', archetype: 'tiktok' }, { first: 'Charlotte', archetype: 'switcher' }, { first: 'Amelia', archetype: 'first-timer' },
  { first: 'Isla', archetype: 'wealthy' }, { first: 'Mia', archetype: 'tiktok' }, { first: 'Lily', archetype: 'wedding' },
  { first: 'Grace', archetype: 'menopause' }, { first: 'Freya', archetype: 'first-timer' }, { first: 'Phoebe', archetype: 'switcher' },
  { first: 'Hannah', archetype: 'wealthy' }, { first: 'Zara', archetype: 'tiktok' }, { first: 'Beatrice', archetype: 'menopause' },
  { first: 'Imogen', archetype: 'first-timer' }, { first: 'Rosie', archetype: 'wedding' }, { first: 'Florence', archetype: 'wealthy' },
];

// Weekly ticker events — narrative texture between quarters. Triggered by state, not random.
// Each is { text, condition(state, staff, patients), category, microChoice? }
const WEEKLY_EVENTS = [
  // High-ethics positive
  { id: 'thank-you', cat: 'patient', text: "A patient drops off a handwritten card. \"You're the first person who didn't try to sell me anything I didn't need.\"", condition: s => s.ethics > 55, weight: 3 },
  { id: 'referral-derm', cat: 'referral', text: 'A local dermatologist refers her own patient — a peri-menopausal woman with skin concerns. Quiet validation.', condition: s => s.ethics > 60 && s.compliance > 50, weight: 2 },
  { id: 'review-organic', cat: 'patient', text: 'A 5-star Google review appears, unprompted. "Felt heard. Not upsold. Will be back."', condition: s => s.nps > 50, weight: 4 },

  // Brand-positive
  { id: 'podcast-invite', cat: 'brand', text: 'A wellness podcast emails — would you guest on an episode about the UK aesthetics regulation gap?', condition: s => s.brand > 55, weight: 2 },
  { id: 'press-mention', cat: 'brand', text: 'A Sunday Times wellness column name-checks you in passing. Two enquiries by Monday.', condition: s => s.brand > 65, weight: 1 },

  // Operational / routine
  { id: 'quiet-week', cat: 'ops', text: 'A quiet week. You catch up on notes, take stock, fix the broken treatment couch.', condition: () => true, weight: 5 },
  { id: 'busy-week', cat: 'ops', text: 'Three back-to-back clinic days. Tired but solvent.', condition: s => s.cash > 5, weight: 4 },
  { id: 'no-show', cat: 'ops', text: 'A patient no-shows. Your day shrinks; your margin too.', condition: () => true, weight: 3 },
  { id: 'supplier-late', cat: 'ops', text: 'Supplier delays a filler delivery by a week. You shuffle the diary.', condition: () => true, weight: 2 },

  // Safety/compliance warnings
  { id: 'asa-query', cat: 'risk', text: 'An ASA query lands in your inbox about a recent post. Routine, but it costs an hour.', condition: s => s.compliance < 50, weight: 4 },
  { id: 'complication-mild', cat: 'risk', text: 'A patient calls with minor bruising and anxiety. You reassure her. Day-2 follow-up booked.', condition: () => true, weight: 2 },
  { id: 'cqc-letter', cat: 'risk', text: 'A CQC information request arrives. Standard, but it surfaces gaps.', condition: s => s.compliance < 40, weight: 3 },

  // Competitor noise
  { id: 'comp-flash', cat: 'competitor', text: 'High Street Aesthetics runs a Wowcher flash sale. The bottom of the market just moved.', condition: () => true, weight: 2 },
  { id: 'comp-poach', cat: 'competitor', text: 'A NorthStar recruiter LinkedIn-messages a member of your team. They forward it to you.', condition: (s, st) => st && st.length > 0, weight: 2 },
  { id: 'comp-close', cat: 'competitor', text: 'A nearby clinic closes. Two of their patients call you, looking for continuity.', condition: s => s.brand > 45, weight: 1 },

  // Staff micro-events
  { id: 'staff-sick', cat: 'staff', text: 'A team member calls in sick on a clinic day.', condition: (s, st) => st && st.length > 0, weight: 3, microChoice: {
    prompt: 'They\'re unwell. What do you do?',
    options: [
      { label: 'Cover yourself, stay late', fx: { nps: 2, cash: -0.3 } },
      { label: 'Close the day, reschedule patients', fx: { nps: -3, cash: -1 } },
      { label: 'Call in a freelance locum', fx: { cash: -1.5, nps: 1 } },
    ],
  }},
  { id: 'staff-cpd', cat: 'staff', text: 'A team member asks if you\'ll fund their next CPD course.', condition: (s, st) => st && st.length > 0, weight: 2, microChoice: {
    prompt: 'CPD funding request:',
    options: [
      { label: 'Yes — invest in them', fx: { cash: -1.5, innovation: 3, nps: 2 } },
      { label: 'Yes — but they pay half', fx: { cash: -0.8, innovation: 1 } },
      { label: 'Not this quarter', fx: { nps: -2 } },
    ],
  }},
  // Pay rise request — fires when staff are well-tenured
  { id: 'staff-payrise', cat: 'staff', text: null, condition: (s, st) => st && st.some(m => m.loyalty < 65), weight: 3, dynamic: 'payrise', microChoice: {
    prompt: 'Pay-rise request landed on your desk:',
    options: [
      { label: 'Approve — full 8% rise', fx: { cash: -2.5, nps: 3 }, loyaltyBoost: 18 },
      { label: 'Counter at 4%', fx: { cash: -1.3, nps: 1 }, loyaltyBoost: 8 },
      { label: 'Decline — explain timing', fx: { nps: -2 }, loyaltyBoost: -12 },
    ],
  }},
  // Senior poaching — a real attempt to lure them away
  { id: 'staff-poach', cat: 'staff', text: null, condition: (s, st) => st && st.some(m => m.roleId === 'senior-injector' && (m._poachThreat || m.loyalty < 50)), weight: 5, dynamic: 'poach', microChoice: {
    prompt: 'NorthStar has formally offered them a job — 30% more pay, equity, clinical autonomy. They\'ve told you out of courtesy. What do you do?',
    options: [
      { label: 'Match the offer — significant raise', fx: { cash: -6, nps: 2 }, loyaltyBoost: 30, keepStaff: true },
      { label: 'Counter with equity stake instead', fx: { cash: -1, ethics: 3, nps: 4 }, loyaltyBoost: 25, keepStaff: true },
      { label: 'Wish them well, let them go', fx: { brand: -3, nps: -4 }, removeStaff: 'senior-injector' },
    ],
  }},
  // Loyalty warning — soft signal before they snap
  { id: 'staff-disengaged', cat: 'staff', text: null, condition: (s, st) => st && st.some(m => m.loyalty < 40), weight: 2, dynamic: 'disengaged' },

  // Patient roster events (fire when patients exist)
  { id: 'patient-return', cat: 'roster', text: null /* dynamic */, condition: (s, st, p) => p && p.length > 0, weight: 3, dynamic: 'return' },
  { id: 'patient-refer', cat: 'roster', text: null, condition: (s, st, p) => p && p.length > 1 && s.nps > 50, weight: 2, dynamic: 'refer' },
  { id: 'patient-leave', cat: 'roster', text: null, condition: (s, st, p) => p && p.length > 2 && s.ethics < 40, weight: 2, dynamic: 'leave' },
];

// Mood states for live consultation
const MOOD_STATES = {
  calm: { label: 'Calm', color: '#5C7A52', mouth: 'M 38 73 Q 50 70 62 73', eyebrow: 'flat' },
  interested: { label: 'Interested', color: '#1A4D5E', mouth: 'M 38 72 Q 50 68 62 72', eyebrow: 'raised' },
  anxious: { label: 'Anxious', color: '#B8945F', mouth: 'M 38 75 Q 50 73 62 75', eyebrow: 'worried' },
  defensive: { label: 'Defensive', color: '#8B2C3C', mouth: 'M 40 75 L 60 75', eyebrow: 'flat' },
  closing: { label: 'Disengaging', color: '#5A5560', mouth: 'M 40 76 Q 50 78 60 76', eyebrow: 'worried' },
};

const COMPLIANCE_OPTIONS = [
  { id: 'register', label: 'Voluntary Practitioner Register', cost: 2, fx: { compliance: 8, brand: 4 }, desc: 'Sector-wide register vouching for your standards. Patients increasingly check.' },
  { id: 'accred', label: 'Industry Accreditation Scheme', cost: 5, fx: { compliance: 10, brand: 8, safety: 4 }, desc: 'Government-backed accreditation. Strong consumer trust signal, slower to obtain.' },
  { id: 'ico', label: 'ICO Registration (GDPR)', cost: 0.1, fx: { compliance: 5 }, desc: 'Legally required if you process patient data. Cowboys skip it.' },
  { id: 'indemnity', label: 'Professional Indemnity Insurance', cost: 6, fx: { compliance: 12, safety: 6 }, desc: 'Some practitioners operate without it. They tend not to do so for long.' },
  { id: 'membership', label: 'Professional Body Membership', cost: 1, fx: { compliance: 5, innovation: 4, brand: 3 }, desc: 'Education, audit, peer network.' },
  { id: 'hyalase', label: 'Hyaluronidase Stock & VO Protocol', cost: 3, fx: { safety: 14, compliance: 6 }, desc: 'Filler VO emergency kit. Lives depend on this.' },
];

const TOXINS = [
  { id: 'none', label: 'No toxin offering', desc: 'Skip Botox-class treatments entirely. Some clinics focus exclusively on filler, regenerative, or skin work.', fx: { margin: 4 } },
  { id: 't1', label: 'Premium incumbent brand', desc: 'Market-leading recognition. Premium pricing supports premium positioning.', fx: { brand: 6, margin: -2, cash: -3 } },
  { id: 't2', label: 'Established alternative', desc: 'Strong evidence base, good training pipeline.', fx: { brand: 4, margin: 2, innovation: 2, cash: -3 } },
  { id: 't3', label: 'Naked toxin (no complexing protein)', desc: 'Favoured for patients with antibody history.', fx: { innovation: 6, brand: 3, cash: -3 } },
  { id: 't4', label: 'Newer market entrant', desc: 'Cheaper, less brand pull. Innovation upside.', fx: { innovation: 8, margin: 4, brand: -4, cash: -2 } },
];

const FILLERS = [
  { id: 'none', label: 'No filler offering', desc: 'Skip HA filler entirely. Toxin-only, biostimulator-only, or regenerative-only practices exist and can specialise hard.', fx: { margin: 5 } },
  { id: 'f1', label: 'Premium HA range', desc: 'Industry workhorse. Strong evidence, predictable longevity.', fx: { brand: 5, margin: -2, cash: -4 } },
  { id: 'f2', label: 'Natural-result HA range', desc: 'Excellent natural results. Broad portfolio.', fx: { brand: 4, innovation: 3, cash: -4 } },
  { id: 'f3', label: 'CPM-tech HA range', desc: 'Highly integrated tissue behaviour. Superficial work.', fx: { innovation: 5, brand: 2, cash: -3 } },
  { id: 'f4', label: 'Curated multi-brand HA formulary', desc: 'Best-tool-for-job. Higher inventory, max flexibility.', fx: { innovation: 8, margin: -3, cash: -8 } },
];

const BIOSTIMS = [
  { id: 'none', label: 'No biostimulator', desc: 'HA-only focused offer. Lower stock, simpler patient journey.', fx: { margin: 3 } },
  { id: 'plla', label: 'PLLA collagen stimulator', desc: 'Gradual collagen induction. Higher ticket. Education-led selling.', fx: { innovation: 7, brand: 5, margin: 4, cash: -5 } },
  { id: 'caha', label: 'CaHA biostimulator (hybrid filler/stimulator)', desc: 'Strong on hand and lower-face rejuvenation.', fx: { innovation: 6, brand: 4, cash: -4 } },
  { id: 'biorem', label: 'Bioremodelling HA', desc: 'Skin-quality treatment. Excellent retention tool.', fx: { nps: 6, innovation: 5, brand: 3, cash: -3 } },
  { id: 'poly', label: 'Polynucleotides (regenerative)', desc: 'Cutting-edge regenerative pathway. Science-forward.', fx: { innovation: 10, brand: 4, cash: -4 } },
  { id: 'full', label: 'Full regenerative formulary', desc: 'PLLA + CaHA + bioremodel + poly. Maximum scope.', fx: { innovation: 14, brand: 8, margin: -3, cash: -14 } },
];

const STAT_LABELS = { safety: 'Clinical Safety', nps: 'Patient NPS', ethics: 'Ethics & Patient-First Culture', innovation: 'Clinical Differentiation', brand: 'Brand Equity', compliance: 'Regulatory Standing' };
const STAT_COLORS = { safety: '#1A4D5E', nps: '#8B2C3C', ethics: '#B8945F', innovation: '#3D2548', brand: '#0E1726', compliance: '#5C7A52' };
const INITIAL = { safety: 25, nps: 30, ethics: 35, innovation: 20, brand: 10, compliance: 10, cash: 0, debt: 0, equity: 0, streak: 0 };

// Starting capital — player chooses
const SAVINGS_TIERS = [
  { id: 'lean', label: 'Lean Savings', desc: 'A few thousand from your NHS pay cheque, that\'s it. Bootstrapped reality.', cash: 3 },
  { id: 'modest', label: 'Modest Savings', desc: 'A year of careful saving, no debt.', cash: 8 },
  { id: 'comfortable', label: 'Comfortable Savings', desc: 'Sold property, family help, locum money banked.', cash: 20 },
];

const LOANS = [
  { id: 'none', label: 'No loan', desc: 'Self-funded all the way.', cash: 0, debt: 0 },
  { id: 'startup', label: 'Start Up Loans (gov)', desc: '£10k personal loan, 6% APR fixed, repayable over 5 years.', cash: 10, debt: 10, apr: 0.06 },
  { id: 'biz', label: 'Business loan (bank)', desc: '£25k secured loan, 8% APR. Higher repayments, more runway.', cash: 25, debt: 25, apr: 0.08 },
];

const INVESTORS = [
  { id: 'none', label: 'No investor', desc: 'Keep 100% equity. Your business, your rules.', cash: 0, equity: 0 },
  { id: 'angel', label: 'Angel investor (£40k for 15%)', desc: 'Industry angel writes a cheque for 15% of the company. They expect a board seat and growth.', cash: 40, equity: 15 },
  { id: 'family', label: 'Family & friends (£15k for 5%)', desc: 'Soft money from people who believe in you. Lower expectations, smaller cheque.', cash: 15, equity: 5 },
];

// Training pathways — chosen once at setup
const TRAINING_PATHS = [
  { id: 'none', label: 'No Formal Training', desc: 'Learn on the job. Legally permissible for some practitioners. Patients can tell, and so can your defence lawyer.', cost: 0, fx: { safety: -8, brand: -6, ethics: -3, compliance: -5 } },
  { id: 'self', label: 'Self-Taught from Weekend Courses', desc: 'Cobbled together from 1-day courses and YouTube. Cheap. Outcomes vary.', cost: 0.5, fx: { safety: 2, brand: -4, ethics: -4, compliance: -3 } },
  { id: 'foundation', label: 'Foundation Live-Model Course', desc: 'Two days of supervised live-model injecting. The industry entry point. Costs less, certifies less.', cost: 2, fx: { safety: 6, innovation: 2, brand: 2, compliance: 4 } },
  { id: 'pharma', label: 'Pharma-Sponsored Academy', desc: 'Manufacturer-led training. Strong on their products, weaker on cross-brand or complications.', cost: 3, fx: { safety: 8, innovation: 6, brand: 4 } },
  { id: 'cadaver', label: 'Cadaver Anatomy Workshop', desc: 'Hands-on dissection with surgical anatomists. The serious clinical foundation.', cost: 5, fx: { safety: 15, innovation: 8, brand: 5, compliance: 5 } },
  { id: 'diploma', label: 'Level 7 Diploma Pathway', desc: 'Year-long postgraduate diploma. Government-recognised, mentored, examined. The most credible route.', cost: 8, fx: { safety: 18, innovation: 12, brand: 9, compliance: 10, ethics: 5 } },
];

const MOVES = [
  // CLINICAL — protocols, training, safety, outcomes
  { id: 'cl1', ap: 3, cat: 'CL', title: 'Cadaver-Based Anatomy Training', desc: 'Annual hands-on dissection for every injector.', fx: { safety: 8, innovation: 5, brand: 3, cash: -8 } },
  { id: 'cl2', ap: 2, cat: 'CL', title: 'Publish Complications Protocol', desc: 'VO algorithm public on the website.', fx: { safety: 7, brand: 6, innovation: 4, compliance: 3, cash: -1 } },
  { id: 'cl3', ap: 2, cat: 'CL', title: 'Quarterly VO Drills', desc: 'Named lead, audit log, quarterly drill.', fx: { safety: 9, compliance: 4, cash: -3 } },
  { id: 'cl4', ap: 3, cat: 'CL', title: 'Standardised Outcomes Reporting', desc: 'Audit-ready outcome tracking on every patient.', fx: { innovation: 7, safety: 4, brand: 5, cash: -6 } },
  { id: 'cl5', ap: 3, cat: 'CL', title: 'Medical-Grade 3D Imaging', desc: 'High-res 3D capture at every consult.', fx: { innovation: 6, nps: 5, safety: 3, cash: -14 } },
  { id: 'cl6', ap: 1, cat: 'CL', title: 'End Same-Day Treatment', desc: '14-day cooling period for new patients.', fx: { safety: 6, brand: 5, compliance: 4, ethics: -3, cash: -1 } },
  { id: 'cl7', ap: 1, cat: 'CL', title: 'End Group Treatment Bookings', desc: 'No more group home treatments.', fx: { safety: 7, compliance: 5, brand: 3, cash: -1 } },
  { id: 'cl8', ap: 1, cat: 'CL', title: 'Reduce Daily Treatment Volume', desc: 'Cap at six patients per clinic day.', fx: { safety: 5, nps: 4, ethics: -4, cash: -3 } },

  // BRAND — positioning, marketing, PR, voice
  { id: 'br1', ap: 1, cat: 'BR', title: 'Quit Discount Aggregators', desc: 'No more Wowcher, Groupon, daily-deal listings.', fx: { brand: 7, ethics: 4, safety: 2, cash: -2 } },
  { id: 'br2', ap: 1, cat: 'BR', title: 'Drop POM Advertising', desc: 'Remove every social post mentioning POMs by name. ASA compliance.', fx: { compliance: 8, brand: 3, safety: 2, cash: -1 } },
  { id: 'br3', ap: 1, cat: 'BR', title: 'Drop Influencer Gifting', desc: 'Stop gifting treatments for posts.', fx: { brand: 6, compliance: 4, cash: 2 } },
  { id: 'br4', ap: 1, cat: 'BR', title: 'End Engagement-Bait Reels', desc: 'No trending sounds, dance trends, before/after grids.', fx: { brand: 5, compliance: 3 } },
  { id: 'br5', ap: 1, cat: 'BR', title: 'Cut Paid Social Spend', desc: 'Reduce paid social 70%. Invest in earned media.', fx: { brand: 3, ethics: 4, cash: 3 } },
  { id: 'br6', ap: 2, cat: 'BR', title: 'Move to Editorial PR', desc: 'Long-form press, broadsheets, podcasts.', fx: { brand: 7, compliance: 3, cash: -5 } },
  { id: 'br7', ap: 2, cat: 'BR', title: 'SEO Around Clinical Authority', desc: 'Long-form safety guides. Pre-educated patients.', fx: { brand: 5, nps: 3, innovation: 3, cash: -3 } },
  { id: 'br8', ap: 3, cat: 'BR', title: 'Branded Patient Magazine', desc: 'Quarterly editorial. The brand artefact patients take home.', fx: { brand: 9, nps: 3, ethics: -2, cash: -9 } },
  { id: 'br9', ap: 2, cat: 'BR', title: 'Speaker & Conference Pipeline', desc: 'Keynote circuit. Inbound from delegates.', fx: { brand: 8, innovation: 5, cash: -4 } },
  { id: 'br10', ap: 3, cat: 'BR', title: 'Found a Patient Safety Podcast', desc: 'UK voice of safer aesthetics.', fx: { brand: 9, innovation: 6, safety: 3, cash: -5 } },

  // PATIENTS — experience, retention, consultation, aftercare
  { id: 'pt1', ap: 2, cat: 'PT', title: 'Hour-Long Consultations', desc: '60 minutes minimum, no upsell pressure.', fx: { nps: 8, safety: 5, brand: 4, ethics: -3, cash: -2 } },
  { id: 'pt2', ap: 2, cat: 'PT', title: 'Proactive Aftercare', desc: 'Day-3, day-14, day-90 patient outreach.', fx: { nps: 6, safety: 4, brand: 3, cash: -3 } },
  { id: 'pt3', ap: 1, cat: 'PT', title: 'Cut Multi-Tier Pricing', desc: 'One transparent fee structure.', fx: { nps: 4, brand: 4, ethics: -2 } },
  { id: 'pt4', ap: 1, cat: 'PT', title: 'Lower Bundle Pressure', desc: 'No more "package of six". Single-treatment plans.', fx: { nps: 5, safety: 3, ethics: -3, cash: -2 } },
  { id: 'pt5', ap: 1, cat: 'PT', title: 'Reduce Front-Desk Friction', desc: 'Digital intake, e-consent embedded.', fx: { nps: 4, ethics: 3, compliance: 2, cash: -2 } },
  { id: 'pt6', ap: 1, cat: 'PT', title: 'End DM-Based Booking', desc: 'Formal pathway only, with consent.', fx: { safety: 4, compliance: 4, nps: 2, cash: -1 } },
  { id: 'pt7', ap: 3, cat: 'PT', title: 'Pay Team Above Market', desc: 'Comp 20% above regional, equity for seniors.', fx: { nps: 4, innovation: 3, cash: -12 } },
  { id: 'pt8', ap: 1, cat: 'PT', title: 'Shrink the Treatment Menu', desc: 'Drop from 30 items to twelve. Depth beats breadth.', fx: { innovation: 4, brand: 4, ethics: 3, cash: -3 } },

  // GROWTH — new services, partnerships, expansion, IP
  { id: 'gr1', ap: 3, cat: 'GR', title: 'In-House CPD Programme', desc: 'Train other clinicians. Revenue + brand moat.', fx: { brand: 7, innovation: 7, ethics: 4, cash: -11 } },
  { id: 'gr2', ap: 3, cat: 'GR', title: 'Hormone-Aware Pathway', desc: 'Peri/post-menopause protocols.', fx: { innovation: 8, nps: 6, brand: 6, cash: -7 } },
  { id: 'gr3', ap: 2, cat: 'GR', title: 'Surgeon-Led Non-Surgical Positioning', desc: 'The only plastic surgeon doing non-surgical work in your region.', fx: { brand: 9, innovation: 6, nps: 4, cash: -2 } },
  { id: 'gr4', ap: 3, cat: 'GR', title: 'Public Health Partnership', desc: 'Co-author research with a UK university.', fx: { innovation: 9, brand: 7, compliance: 5, safety: 4, cash: -7 } },
  { id: 'gr5', ap: 2, cat: 'GR', title: 'Free Community VO Hotline', desc: 'Free VO emergency support to other clinics.', fx: { brand: 8, safety: 6, innovation: 4, cash: -3 } },
  { id: 'gr6', ap: 2, cat: 'GR', title: 'Cancer Restoration Programme', desc: 'Pro-bono restoration for post-oncology patients.', fx: { brand: 8, nps: 6, safety: 3, cash: -6 } },
  { id: 'gr7', ap: 3, cat: 'GR', title: 'Aesthetic Genomics', desc: 'Skin and metabolism gene panel in consult.', fx: { innovation: 8, brand: 5, ethics: 3, cash: -11 } },
  { id: 'gr8', ap: 2, cat: 'GR', title: 'Launch Biostimulator Pathway', desc: 'Dedicated PLLA/CaHA programme. Education-led.', fx: { innovation: 7, brand: 4, ethics: 4, cash: -8 } },
  { id: 'gr9', ap: 3, cat: 'GR', title: 'Polynucleotide Suite', desc: 'Lead UK on regenerative injectables.', fx: { innovation: 9, brand: 6, cash: -10 } },
  { id: 'gr10', ap: 3, cat: 'GR', title: 'Energy-Device Adjunct', desc: 'RF microneedling. Clinical cross-sell pathway.', fx: { innovation: 7, brand: 4, ethics: 5, cash: -16 } },
  { id: 'gr11', ap: 3, cat: 'GR', title: 'Open Outcome Reporting', desc: 'Anonymised outcome data published quarterly. UK-first.', fx: { innovation: 9, brand: 8, safety: 5, cash: -5 } },

  // CAMPAIGN STARTS — register a multi-quarter campaign. Pay the entry cost now, reap on completion.
  { id: 'gr-cpd', ap: 3, cat: 'GR', title: 'Found the CPD Training School', desc: 'A 4-quarter build. Requires Innovation 55, Brand 50. Massive payoff if you sustain those stats.', fx: { brand: 2, innovation: 2, cash: -18 }, startsCampaign: 'cpd-school' },
  { id: 'gr-paper', ap: 2, cat: 'GR', title: 'Commission UK Outcome Study', desc: 'A 3-quarter university partnership paper. Requires Compliance 55, Innovation 50.', fx: { compliance: 2, innovation: 2, cash: -10 }, startsCampaign: 'research-paper' },
  { id: 'gr-award', ap: 1, cat: 'GR', title: 'Enter Aesthetics Awards', desc: 'A 2-quarter campaign. Requires Brand 55. Win → brand pop. Lose → mild brand hit.', fx: { brand: 1, cash: -4 }, startsCampaign: 'industry-award' },

  // COST DISCIPLINE — moves that cut expenses, with strategic trade-offs. Tied to business concepts.
  { id: 'op1', ap: 1, cat: 'OP', title: 'Renegotiate Lease', desc: 'Push your landlord for better terms. Possible if rent is high; ethics-positive if done fairly.', fx: { cash: 6, ethics: 1, brand: -1 }, concept: 'operating-leverage' },
  { id: 'op2', ap: 2, cat: 'OP', title: 'Consolidate Supplier Base', desc: 'Move from 8 suppliers to 3. Better volume discounts; less flexibility on niche products.', fx: { cash: 5, innovation: -3, ethics: 2 }, concept: 'supplier-strategy' },
  { id: 'op3', ap: 1, cat: 'OP', title: 'Restructure Staff to Part-Time', desc: 'Move full-time roles to flexible contracts. Cash positive; loyalty hit; safety risk if clinical.', fx: { cash: 8, nps: -3, safety: -2, ethics: -3 }, concept: 'operating-leverage' },
  { id: 'op4', ap: 1, cat: 'OP', title: 'Switch to Lean Software Stack', desc: 'Drop two SaaS tools, consolidate to one CRM. Small cash win; compliance neutral.', fx: { cash: 3, compliance: -1 }, concept: 'cash-vs-profit' },
  { id: 'op5', ap: 2, cat: 'OP', title: 'Invoice Factoring', desc: 'Sell receivables for 92p on the £. Cash now, margin eroded permanently.', fx: { cash: 10, brand: -4, ethics: -2 }, concept: 'working-capital' },
  { id: 'op6', ap: 1, cat: 'OP', title: 'Defer Owner Salary', desc: 'Skip your own salary for the quarter. Cash boost; pressure on you. Sustainable for 1-2 quarters max.', fx: { cash: 9, nps: -1 }, concept: 'runway' },

  // PRODUCT MIX PIVOTS — automatically rebalance treatment mix toward a strategy
  { id: 'mx1', ap: 2, cat: 'OP', title: 'Launch Regenerative Suite', desc: 'Pivot mix toward biostimulators and polynucleotides. Requires Innovation 55+.', fx: { innovation: 5, brand: 4, cash: -3 }, concept: 'product-mix', mixPivot: { biostim: 25, poly: 15, toxin: 20, filler: 25, ebd: 0, skin: 15 } },
  { id: 'mx2', ap: 2, cat: 'OP', title: 'Pivot to Energy Devices', desc: 'Build the mix around EBDs. Requires EBD unlock.', fx: { innovation: 6, safety: 2, cash: -2 }, concept: 'capex-asset-unlock', mixPivot: { ebd: 30, toxin: 20, filler: 20, skin: 20, biostim: 5, poly: 5 } },
  { id: 'mx3', ap: 1, cat: 'OP', title: 'Volume Toxin Push', desc: 'Move toward a high-volume toxin model. Brand-positive at 50+; cash heavy.', fx: { cash: 5, nps: 2 }, concept: 'category-margin', mixPivot: { toxin: 60, filler: 25, skin: 15, biostim: 0, poly: 0, ebd: 0 } },
];

// ---------- SET-PIECE EVENTS (escalating tension at specific quarters) ----------
// These guarantee a dramatic narrative moment, replacing the random EVENT roll for that quarter.
const SET_PIECES = [
  {
    id: 'q3-press-callout', quarter: 3, title: 'The Mail Names Names', archetype: 'press',
    setup: 'The Daily Mail runs a feature: "The Wild West of UK Injectables — Who Polices the Police?" Your clinic is on the long list of clinics they reviewed. They want a quote by 5pm.',
    illustration: 'press',
    choices: [
      { label: 'Send a written statement: protocols, audit data, complications rate', fx: { brand: 12, compliance: 5, innovation: 3 }, outcome: 'They print three lines verbatim. Two GPs in your borough start sending patients.', requires: s => s.compliance > 45 },
      { label: 'Do the on-camera interview', fx: { brand: 8, nps: -2, compliance: -3 }, outcome: 'Two minutes of you on the 6 o\'clock news. They cut to make it dramatic. You sound credible. Just.' },
      { label: 'No comment', fx: { brand: -5 }, outcome: 'The piece runs without your input. The clinics that did engage benefit.' },
      { label: 'Threaten legal action', fx: { brand: -10, ethics: -4, compliance: -2 }, outcome: 'They reprint the threat. You look defensive. Don\'t do this.' },
    ],
  },
  {
    id: 'q4-cqc-audit', quarter: 4, title: 'CQC Unannounced Inspection', archetype: 'audit',
    setup: 'A black Audi pulls up at 9.04am. Two CQC inspectors. They want sharps records, consent files, the SOP folder, the named clinical lead, and a tour. You have 90 minutes.',
    illustration: 'audit',
    choices: [
      { label: 'Walk them through everything calmly', fx: { compliance: 10, brand: 8, safety: 5 }, outcome: 'Outstanding rating. The certificate is on your website by Friday. New enquiries up 30%.', requires: s => s.compliance > 55 },
      { label: 'Show what\'s ready, apologise for the rest', fx: { compliance: -2, brand: 1 }, outcome: 'Requires Improvement. A follow-up in 6 months. You spend two weeks panic-fixing.' },
      { label: 'Delay them — claim you weren\'t expecting them', fx: { compliance: -12, brand: -8, cash: -8 }, outcome: 'Inadequate. Suspension threat. Local press picks it up. Recovery takes a year.' },
    ],
  },
  {
    id: 'q5-medico-legal', quarter: 5, title: 'A Letter Arrives', archetype: 'legal',
    setup: 'A solicitor\'s letter. A patient you treated 8 months ago alleges informed consent failure and ongoing complications. Your indemnity provider needs your statement in 14 days.',
    illustration: 'legal',
    choices: [
      { label: 'Full clinical disclosure to indemnity — consent, photos, follow-up notes', fx: { compliance: 8, safety: 4 }, outcome: 'Indemnity defends robustly. Claim withdrawn within three months. You document the lessons.', requires: s => s.compliance > 50 },
      { label: 'Try to settle directly with the patient', fx: { cash: -8, ethics: -4, compliance: -6 }, outcome: 'You paid her off. She tells others you paid. The next letter arrives in six months.' },
      { label: 'Ignore the letter, hope it goes away', fx: { compliance: -15, brand: -10, cash: -22 }, outcome: 'It does not go away. The claim succeeds. Your premiums double.' },
    ],
  },
  {
    id: 'q6-acquisition-feeler', quarter: 6, title: 'A Quiet Lunch', archetype: 'offer',
    setup: 'A corporate development director at one of the major pharma groups invites you to lunch at The Wolseley. No agenda. Just "a conversation". You know what conversation.',
    illustration: 'offer',
    choices: [
      { label: 'Accept the lunch. Listen. Disclose nothing.', fx: { brand: 6, innovation: 3 }, outcome: 'You listen, ask good questions, eat well. They like you. The follow-up call comes in Q8.' },
      { label: 'Accept and pitch your numbers hard', fx: { brand: 3 }, outcome: 'You\'re selling, not being acquired. They politely lose interest.' },
      { label: 'Decline — too early, no advisors yet', fx: { brand: 4, ethics: 3 }, outcome: 'Mature. They respect the line. The relationship is preserved for later.' },
      { label: 'Accept and bring a senior injector to sound them out about retention', fx: { brand: 5, nps: 4 }, outcome: 'Smart. Your team feels included. The pharma group notes the leadership style.' },
    ],
  },
  {
    id: 'q7-poaching-war', quarter: 7, title: 'The Poaching War', archetype: 'staff',
    setup: 'NorthStar Cosmetic Group sends formal offers to two of your team simultaneously. Senior injector, +35% pay and equity. Patient coordinator, +20%. Both with two-week notice clauses.',
    illustration: 'staff',
    choices: [
      { label: 'Match both offers in full plus a retention bonus', fx: { cash: -28, nps: 8, brand: 5 }, outcome: 'Both stay. Your wage bill is now permanent. The team knows you fought for them.' },
      { label: 'Match the senior, lose the coordinator', fx: { cash: -14, nps: -2 }, outcome: 'Pragmatic. The coordinator leaves cleanly. You hire a replacement at the original rate.' },
      { label: 'Counter with equity, not cash', fx: { cash: -3, nps: 6, ethics: 5, brand: 4 }, outcome: 'The senior injector accepts the equity. Coordinator leaves. Long-term loyalty story starts.' },
      { label: 'Let them both go', fx: { nps: -12, brand: -6, cash: 4 }, outcome: 'You save the wages. You lose your best people. Capacity collapses next quarter.' },
    ],
  },
];

// ---------- MULTI-QUARTER CAMPAIGNS ----------
// Started as moves, accrue progress across quarters, pay off (or fail) at completion.
const CAMPAIGNS = [
  {
    id: 'cpd-school', label: 'CPD Training School Build', desc: 'Set up a teaching arm. 4-quarter build. Becomes a revenue stream and a brand moat.',
    cost: 18, duration: 4, requires: s => s.innovation >= 55 && s.brand >= 50,
    progressFx: { innovation: 2, brand: 1 }, // each quarter while building
    completeFx: { brand: 12, innovation: 10, ethics: 6, cash: 12 }, // on completion
    failFx: { cash: -8, brand: -3 }, // if requirements drop below threshold mid-build
  },
  {
    id: 'research-paper', label: 'Co-Authored UK Outcome Study', desc: 'University partnership paper. 3 quarters. Publication is a Merz-class signal.',
    cost: 10, duration: 3, requires: s => s.compliance >= 55 && s.innovation >= 50,
    progressFx: { compliance: 1, innovation: 2 },
    completeFx: { innovation: 18, brand: 10, safety: 6, compliance: 6 },
    failFx: { innovation: -4 },
  },
  {
    id: 'industry-award', label: 'Aesthetics Awards Submission', desc: '2-quarter campaign. Win — brand and patient pipeline pop. Lose — minor brand cost.',
    cost: 4, duration: 2, requires: s => s.brand >= 55,
    progressFx: { brand: 1 },
    completeFx: { brand: 14, nps: 6, cash: 8 }, // if brand sustained
    failFx: { brand: -5 },
  },
];

// ---------- STREAKS ----------
// Behavioural patterns that unlock bonuses. Tracked across quarters.
// ---------- BUSINESS CONCEPTS LIBRARY ----------
// The educational core. Every concept the game uses, defined formally with formula,
// aesthetics-domain worked example, MBA-textbook precision. Surfaced via Concept Cards
// at the moment a concept first becomes relevant, plus a permanent Glossary in the menu.
const BUSINESS_CONCEPTS = {
  // ---- Unit economics ----
  'revenue': {
    title: 'Revenue',
    short: 'Total income from selling treatments before any costs are deducted.',
    formula: 'Revenue = Treatments delivered × Average ticket value',
    example: 'A clinic delivering 180 treatments at an average ticket of £350 generates Revenue of 180 × £350 = £63,000 per quarter.',
    why: 'Revenue is the top line of any P&L. It sets the ceiling for everything below. But revenue alone tells you nothing about whether the business makes money — that depends on costs.',
    chapter: 'Unit Economics',
  },
  'cogs': {
    title: 'Cost of Goods Sold (COGS)',
    short: 'The direct cost of producing each unit of service — for a clinic, the consumables, products, and product-level supplies.',
    formula: 'COGS = Direct product/consumable cost per treatment × Treatments delivered',
    example: 'A vial of toxin costs the clinic £75 and is used across two treatments. The COGS per treatment is £37.50. Filler at £180 wholesale, used once, has COGS of £180. Across a typical injectables mix, COGS runs at 18-25% of revenue.',
    why: 'COGS scales with volume. Distinct from fixed costs (rent, software). The gap between revenue and COGS is your gross profit — the money available to pay for everything else.',
    chapter: 'Unit Economics',
  },
  'gross-profit': {
    title: 'Gross Profit & Gross Margin',
    short: 'What remains of revenue after paying for the direct cost of the treatments themselves. Gross margin expresses it as a percentage.',
    formula: 'Gross Profit = Revenue − COGS\nGross Margin % = Gross Profit ÷ Revenue × 100',
    example: 'Revenue of £63,000 with COGS of £12,600 gives Gross Profit of £50,400 — a Gross Margin of 80%. Aesthetics clinics typically run 75-82% gross margins, which is high. Hospitality runs 60-70%. SaaS runs 70-85%.',
    why: 'Gross margin is the strongest indicator of whether the underlying service is economically viable. A weak gross margin can never be saved by cost-cutting elsewhere.',
    chapter: 'Unit Economics',
  },
  'opex': {
    title: 'Operating Expenses (OpEx)',
    short: 'The fixed and semi-fixed costs of running the business — rent, salaries, marketing, software, professional fees.',
    formula: 'OpEx = Rent + Wages + Marketing + Overheads + Professional fees + Software',
    example: 'Marylebone treatment room rent £18k/Q, two staff at £14k/Q wages, marketing £6k/Q, overheads £4k/Q — total OpEx £42k per quarter.',
    why: 'OpEx is mostly fixed in the short term. This creates operating leverage: as revenue grows past breakeven, each new pound of gross profit drops straight to EBITDA. Conversely, falling revenue without falling OpEx is how clinics go bust.',
    chapter: 'P&L Structure',
  },
  'ebitda': {
    title: 'EBITDA',
    short: 'Earnings Before Interest, Tax, Depreciation, and Amortisation. The standard cash-generative profit measure for valuation.',
    formula: 'EBITDA = Gross Profit − Operating Expenses',
    example: 'Gross Profit £50,400 − OpEx £42,000 = EBITDA £8,400 per quarter, or £33,600 annualised. A 13% EBITDA margin. Healthy aesthetics clinics target 22-30%.',
    why: 'EBITDA is the metric acquirers use because it strips out the financing structure (interest), tax jurisdiction, and accounting choices (depreciation). It is the closest standardised proxy for what cash the operation produces. Almost every UK aesthetics M&A deal prices on a multiple of trailing EBITDA.',
    chapter: 'P&L Structure',
  },
  'net-income': {
    title: 'Net Income',
    short: 'What\'s left after every cost, including interest on debt and corporation tax. The actual money the business has earned for its owner.',
    formula: 'Net Income = EBITDA − Interest − Tax',
    example: 'EBITDA £8,400 − Interest £200 (on a £16k loan at 5% APR) − Corporation Tax £2,050 (25% of taxable EBIT) = Net Income £6,150.',
    why: 'Net income is what flows to retained earnings or dividends. It funds future investment. EBITDA tells you the operation is healthy; net income tells you the *business* is healthy.',
    chapter: 'P&L Structure',
  },
  'cac': {
    title: 'Customer Acquisition Cost (CAC)',
    short: 'What it costs you to acquire one new patient through marketing.',
    formula: 'CAC = Marketing spend ÷ New patients acquired',
    example: 'Marketing spend £6,000 in a quarter, 42 new patients = CAC £143. UK aesthetics CAC ranges from £80 (organic referral) to £400+ (paid Instagram in London).',
    why: 'CAC is half of the most important ratio in any service business. If your CAC exceeds your CLV, you lose money on every new patient. If your CAC is much lower than your CLV, you should invest *more* in marketing.',
    chapter: 'Marketing Economics',
  },
  'clv': {
    title: 'Customer Lifetime Value (CLV)',
    short: 'The total gross profit a patient generates across their entire relationship with the clinic.',
    formula: 'CLV = (Average gross profit per visit × Visits per year) × Average retention years',
    example: 'A patient who spends £400 per visit at 75% margin = £300 GP per visit. Visits twice yearly. Retained for 4 years average. CLV = £300 × 2 × 4 = £2,400.',
    why: 'CLV transforms the marketing question. A £143 CAC against a £2,400 CLV means your LTV:CAC ratio is ~17:1 — excellent. Payback period is 1-2 visits. You should spend aggressively to acquire.',
    chapter: 'Marketing Economics',
  },
  'ltv-cac': {
    title: 'LTV:CAC Ratio & Payback Period',
    short: 'Two ratios that together tell you whether your marketing engine is healthy.',
    formula: 'LTV:CAC Ratio = CLV ÷ CAC\nPayback Period = CAC ÷ (Gross Profit per first visit)',
    example: 'CLV £2,400 ÷ CAC £143 = 16.8:1 ratio. Payback = £143 ÷ £300 = 0.48 visits — you recover your acquisition cost on the first treatment.',
    why: 'Benchmarks: <3:1 ratio = bleeding money on marketing. 3-5:1 = sustainable. >5:1 = under-investing in growth, you could spend more on marketing and grow faster. Payback under 12 months is acceptable, under 6 months is healthy, under 3 months is excellent.',
    chapter: 'Marketing Economics',
  },
  'retention': {
    title: 'Retention Rate',
    short: 'The proportion of patients who return within a defined period.',
    formula: 'Retention Rate = Returning patients ÷ Total active patients at start of period',
    example: 'A clinic with 200 active patients at start of year, 120 of whom book again, has 60% annual retention. Patients lost: 40% (called "churn"). Healthy injectables retention: 60-75%.',
    why: 'Small changes in retention compound dramatically in CLV. Moving retention from 55% to 70% can double CLV. It is almost always cheaper to retain than to acquire — a 5% retention improvement is worth more than a 5% CAC reduction.',
    chapter: 'Marketing Economics',
  },
  // ---- Capacity ----
  'capacity': {
    title: 'Capacity & Throughput',
    short: 'The maximum number of treatments your premises can deliver per quarter, and the proportion you actually deliver.',
    formula: 'Effective capacity = Premises capacity × Throughput %\nThroughput depends on practitioner-hours available.',
    example: 'A treatment room with 220-treatment capacity at 25% solo throughput delivers 55 treatments. Hire a senior injector (+45% throughput) and you can deliver 154 treatments — almost triple.',
    why: 'For most service businesses, the founder is the constraint. You cannot scale revenue without scaling clinical hands. This is why staff hiring becomes mandatory past a certain brand level — demand exceeds your physical ability to deliver, and the difference is patients walking to competitors.',
    chapter: 'Operations',
  },
  'operating-leverage': {
    title: 'Operating Leverage',
    short: 'The degree to which a business has fixed (vs variable) costs. Higher fixed-cost businesses amplify revenue swings into bigger profit swings.',
    formula: 'Operating Leverage = Contribution Margin ÷ Operating Profit',
    example: 'A clinic with mostly fixed costs (rent, salaried staff) earns dramatically more on each additional treatment past breakeven — but suffers dramatically more during downturns. A home clinic with no rent has low operating leverage; a flagship Marylebone suite has high.',
    why: 'Operating leverage is why scaling is risky. The treatment-room business has low operating leverage (limited fixed costs); the multi-injector clinic has high operating leverage. Both can be the right answer depending on your risk appetite.',
    chapter: 'Operations',
  },
  // ---- Cash flow ----
  'cash-vs-profit': {
    title: 'Cash ≠ Profit',
    short: 'A profitable business can run out of cash. A loss-making business can have cash. These are different concepts.',
    formula: 'Cash position = Opening cash + Net income + Working capital changes − Investments',
    example: 'A clinic with £40k of profit on paper can still go bust if it paid £50k upfront for a new device, has £20k stuck in patient receivables, and £15k of supplier invoices due next week.',
    why: 'Every business that goes bust does so by running out of cash, not by being unprofitable. The cash conversion cycle — how long money is tied up between paying for stock and receiving payment — is the operational expression of this risk.',
    chapter: 'Cash Flow',
  },
  'runway': {
    title: 'Runway',
    short: 'How many quarters of negative cash flow your current cash position can absorb before insolvency.',
    formula: 'Runway = Cash on hand ÷ Net cash burn per quarter',
    example: 'A clinic with £24k cash burning £8k/Q has 3 quarters of runway. With one quarter to go before profitability, you can survive. With four quarters to go, you cannot.',
    why: 'Runway is the most important number for an unprofitable business. It tells you how much time you have to fix the unit economics before you fail. Every founder should know their runway to the week.',
    chapter: 'Cash Flow',
  },
  // ---- Strategy ----
  'positioning': {
    title: 'Strategic Positioning',
    short: 'The deliberate choice to be different from competitors on dimensions that matter to the customer.',
    formula: 'Position = (Set of attributes you over-deliver on) − (Set of attributes you under-deliver on)',
    example: 'A clinic that chooses to be more clinically rigorous, slower, more expensive than the high-street average — and explicitly under-delivers on convenience and price — has a defensible position. The clinic that tries to be all things to all people has no position.',
    why: 'Without a position, you compete on price. Competing on price in aesthetics is a losing game — there is always a cheaper option, and discount-driven patients have low retention.',
    chapter: 'Strategy',
  },
  'porter-five': {
    title: 'Porter\'s Five Forces',
    short: 'A framework for analysing industry attractiveness through five competitive pressures.',
    formula: 'Industry profitability = f(supplier power, buyer power, threat of new entrants, threat of substitutes, competitive rivalry)',
    example: 'UK aesthetics: high competitive rivalry (low entry barriers), low supplier power (multiple toxin and filler brands), moderate buyer power (price-sensitive but loyalty-prone), high threat of substitutes (surgery, energy devices, "doing nothing"), moderate threat of entrants (regulation tightening).',
    why: 'You cannot change the industry, but you can choose where to play within it. Practitioners drawn into aesthetics by money often misunderstand that the industry has structurally compressed margins. Your strategy must take the industry shape into account.',
    chapter: 'Strategy',
  },
  // ---- Valuation ----
  'ebitda-multiple': {
    title: 'EBITDA Multiple Valuation',
    short: 'The standard way small businesses are valued in M&A: a multiple of trailing annualised EBITDA.',
    formula: 'Enterprise Value = Trailing 4-Quarter EBITDA × Multiple\nMultiple is set by acquirer type, market conditions, and business quality.',
    example: 'A clinic with £80k trailing EBITDA acquired by a PE roll-up at 3.5× = £280k enterprise value. The same clinic acquired by a pharma group at 8× = £640k. Same business, different acquirer, different price.',
    why: 'The multiple expansion from PE to pharma — from 3-4× to 7-12× — is the entire game of clinic exit. It is not driven by EBITDA size; it is driven by what acquirer wants you, which is driven by your strategic positioning years before the conversation begins.',
    chapter: 'Valuation',
  },
  'multiple-drivers': {
    title: 'What Drives Multiple Expansion',
    short: 'Beyond raw EBITDA, four characteristics meaningfully shift the multiple a buyer will pay.',
    formula: 'Multiple = Base + Growth premium + Defensibility premium + Margin quality premium + Brand premium',
    example: 'Two clinics with identical £80k EBITDA. Clinic A: declining revenue, dependent on the founder, 18% margin, no IP. Multiple offered: 2.5×. Clinic B: 30% YoY growth, recognised research, 28% margin, strong brand. Multiple offered: 9×. Same EBITDA, 3.6× the price.',
    why: 'Growth, defensibility, margin quality, and brand are the four levers an owner can pull in the years before a sale to maximise valuation. They are exactly what the strategic-identity choice in this game is about.',
    chapter: 'Valuation',
  },
  'diligence-discount': {
    title: 'The Diligence Discount',
    short: 'The amount an acquirer reduces their headline offer once they have audited the business.',
    formula: 'Final offer = Headline offer × (1 − Diligence findings adjustment)',
    example: 'A headline offer of £800k may end at £450k after diligence finds: outstanding HMRC enquiries, GMC complaints in process, key staff at flight risk, software licence non-compliance, and uninsured complications. A historic bust on the founder\'s record alone can trigger a 50% discount.',
    why: 'Operational discipline during the build phase compounds at sale. Every shortcut taken in years 1-2 reappears as a diligence finding in year 8. The path to a premium exit begins with clean records, not with growth hacks.',
    chapter: 'Valuation',
  },
  // ---- Operational levers ----
  'marketing-spend-policy': {
    title: 'Marketing Spend Policy',
    short: 'The strategic choice of how aggressively to invest in customer acquisition relative to revenue.',
    formula: 'Marketing as % of Revenue × Demand Elasticity × Brand Multiplier',
    example: 'A clinic doing £200k/Q at standard 12% marketing spends £24k/Q. Going conservative (cut to 7%) saves £10k/Q but lowers demand ~22%. Going aggressive (raise to 20%) costs an extra £16k/Q but lifts demand ~18%. The right choice depends on your LTV:CAC ratio and your runway.',
    why: 'Marketing is the most discretionary line in a service P&L. It is the lever most owners pull during cash crunches — usually too late. The discipline is to flex marketing *deliberately* against your unit economics and runway, not reflexively against your cash anxiety.',
    chapter: 'Operations',
  },
  'supplier-strategy': {
    title: 'Supplier & Procurement Strategy',
    short: 'The choice of which products to use and how to source them, balancing cost, quality, and brand signal.',
    formula: 'COGS impact = Base COGS rate × Supplier mix multiplier\n(Generic: ~0.72×, Standard: 1.0×, Premium: ~1.35×)',
    example: 'A clinic running £180k/Q revenue with 20% standard COGS pays £36k for product. Switching to generic suppliers drops COGS to £26k (saving £10k) but visible product quality declines and brand suffers. Switching to premium brands raises COGS to £49k but builds a quality narrative the patient pays for.',
    why: 'Procurement strategy is a strategic choice, not a finance choice. A premium positioning *requires* premium consumables; a value positioning *requires* aggressive procurement. Mismatched supplier strategy and brand positioning is one of the most common reasons clinics fail to defend their margins.',
    chapter: 'Operations',
  },
  'working-capital': {
    title: 'Working Capital Management',
    short: 'The art of managing the gap between cash going out (to suppliers, staff) and cash coming in (from patients).',
    formula: 'Working Capital = Receivables + Inventory − Payables\nCash Conversion Cycle = Days Sales Outstanding + Days Inventory − Days Payables',
    example: 'A clinic with 30-day supplier payment terms but patient payment-on-the-day has a *favourable* cash conversion cycle. Paying suppliers early (15 days) makes the supplier happy but ties up £8k more in working capital. Stretching to 60 days frees £6k but supplier relationships deteriorate.',
    why: 'Profitable businesses fail on cash timing, not on profitability. A clinic earning £40k profit on paper can still go bust if it has £50k locked in late receivables. Working capital is the most under-taught lever in MBA programmes and the one most founders learn the hard way.',
    chapter: 'Cash Flow',
  },
  'capex-vs-opex': {
    title: 'CapEx vs OpEx',
    short: 'The distinction between Capital Expenditure (assets used over years) and Operating Expenditure (consumed in the period).',
    formula: 'CapEx hits cash this quarter. Depreciates over useful life.\nOpEx hits the P&L immediately.',
    example: 'A £24k laser device is CapEx. The £24k cash leaves now. The P&L sees only £24k ÷ 8 quarters = £3k depreciation per quarter for 2 years. EBITDA looks healthier; cash position looks tighter. Marketing spend, by contrast, is OpEx — £24k spent hits the P&L in full this quarter.',
    why: 'CapEx vs OpEx is the single most important distinction for understanding *why EBITDA differs from cash*. EBITDA flatters businesses that invest heavily; net income looks worse but cash conversion is what matters for survival. Acquirers price on EBITDA precisely because it strips out this distortion — but you must manage cash, not EBITDA, to stay solvent.',
    chapter: 'Cash Flow',
  },
  'cash-flow-statement': {
    title: 'The Cash Flow Statement',
    short: 'The third financial statement (alongside P&L and Balance Sheet) — tracks actual cash movement, not accounting profit.',
    formula: 'Cash Flow = Net Income + Depreciation + Working Capital Δ − CapEx − Debt Service',
    example: 'A quarter with £18k net income, £3k depreciation, no WC change, but £24k spent on a new device: cash change = £18 + £3 + 0 − £24 = −£3k. The business made a £18k profit and lost £3k of cash. Both are true.',
    why: 'The cash flow statement is the discipline tool. P&L tells you whether the business model works. Cash flow tells you whether it survives. Reading both fluently is the difference between an operator and a hobbyist.',
    chapter: 'Cash Flow',
  },
  // ---- Product Strategy ----
  'product-mix': {
    title: 'Product Mix Strategy',
    short: 'The deliberate allocation of clinical time across product categories. The mix IS the strategic positioning.',
    formula: 'Weighted Avg Ticket = Σ (Category % × Category Ticket)\nWeighted Margin = Σ (Category % × Category Margin)',
    example: 'Clinic A: 70% toxin / 25% filler / 5% biostim → weighted ticket £325, blended margin 75%. Clinic B: 25% toxin / 30% filler / 25% biostim / 10% polynucleotide / 10% EBD → weighted ticket £445, blended margin 76%. Clinic B captures 37% more revenue per visit, signals premium, and attracts a different acquirer.',
    why: 'Most clinics drift into a mix without choosing one. The clinics that build deliberate mixes outperform on multiple fronts: higher average ticket, better margin defensibility, premium acquirer interest. The mix is your operational expression of strategy.',
    chapter: 'Operations',
  },
  'category-margin': {
    title: 'Category Margin Analysis',
    short: 'Not all treatments contribute equally. Understanding margin per category is how you decide where to invest.',
    formula: 'Category Contribution = (Ticket − COGS) × Volume\nMix optimisation: maximise contribution subject to capacity',
    example: 'Toxin: £280 × 78% = £218 GP per treatment. Biostimulators: £680 × 70% = £476 GP per treatment — 2.2× more profitable per visit. Energy devices: £450 × 88% = £396 GP per treatment with minimal consumables. But EBDs require £24k CapEx and a different patient narrative.',
    why: 'Treatment-level P&L is the single most under-used analysis in UK aesthetics. Most clinics know their overall margin but not their category margin. The clinics that *do* know rapidly reallocate capacity toward high-contribution categories — and capture the premium.',
    chapter: 'Operations',
  },
  'capex-asset-unlock': {
    title: 'CapEx as Strategic Asset',
    short: 'Capital investment as a category-unlock decision — not just a financial choice, but a strategic one.',
    formula: 'NPV of asset = Σ (Cash flows generated) − CapEx outlay\nPayback period = CapEx ÷ Marginal quarterly contribution',
    example: 'A £24k RF microneedling platform unlocks the EBD category. If EBDs come to represent 15% of mix at 84% margin and £450 ticket, the asset generates ~£15-22k quarterly contribution. Payback ~5-6 quarters; useful life 8+ quarters. ROI positive within first year.',
    why: 'Major CapEx unlocks entire product categories — not just incremental revenue. The clinic that buys the laser platform isn\'t adding 5% revenue; it\'s unlocking a high-margin, low-COGS category that defines its strategic position for years. This is why M&A acquirers pay multiples for chains with established EBD platforms.',
    chapter: 'Operations',
  },
  // ---- Multi-site ----
  'roll-up-strategy': {
    title: 'Roll-Up Strategy',
    short: 'The deliberate building of a multi-site chain to capture multiple expansion at exit.',
    formula: 'Chain Enterprise Value = Σ Site EBITDA × Acquirer Multiple × Chain Bonus\nChain Bonus: 2 sites = ×1.2 · 3 = ×1.5 · 4 = ×2.0 · 6+ = ×2.5',
    example: 'Single site at £80k EBITDA × 6× = £480k exit. Four sites at £80k EBITDA each (£320k chain EBITDA) × 7× × 2.0 chain bonus = £4.48M exit. Same per-site economics; 9× the exit through chain assembly.',
    why: 'Roll-up is the most predictable path to an eight-figure exit in UK aesthetics. Pharma acquirers (Galderma, AbbVie) and PE roll-ups pay premiums for chains because integration is proven and the operating model is replicable. The single-site clinic competes in a different market from the four-site chain.',
    chapter: 'Valuation',
  },
  'integration-risk': {
    title: 'Integration Risk',
    short: 'The hidden cost of acquiring sites: assimilating different teams, brands, patient bases, and operating procedures.',
    formula: 'Integration Risk = (Acquisition Discount) ↔ (Failure Probability × Cleanup Cost)',
    example: 'A boutique clinic at £80k looks cheap vs £150k for organic flagship build. But the boutique has 45% assimilation risk — staff defections, patient churn, brand contamination from prior complications. Half the time it works (cheap site, fast scale). Half the time it costs £40k+ to remediate and damages the parent brand.',
    why: 'Acquisitions look cheaper on paper but carry compounding risk. The clinics that succeed at roll-up are usually patient (slow organic growth) or rigorous (heavy diligence and integration playbook). Cheap acquisitions of damaged brands are how most roll-ups collapse.',
    chapter: 'Valuation',
  },
  'coordination-tax': {
    title: 'Coordination Tax (Diseconomies of Scale)',
    short: 'The productivity loss from running multiple sites — management attention is finite.',
    formula: 'Effective throughput = (Σ Site capacity × Site throughput) − (Coordination tax % × Site count)',
    example: 'A single-site founder runs at 95% throughput. Open a second site: each site drops to 90%. Open a fourth: each drops to 80%. Without dedicated regional leadership, the chain collapses around 5-6 sites. With it, 20+ is possible.',
    why: 'Most failed UK aesthetics roll-ups in 2015-2022 failed not on unit economics but on coordination. The founder couldn\'t scale their attention. The fix — hiring a Chief Operating Officer or Regional Director — is itself expensive and is typically the differentiator between chains that exit at 10× and chains that exit at 4×.',
    chapter: 'Operations',
  },
  // ---- Competitive & Marketing ----
  'competitive-intel': {
    title: 'Competitive Intelligence',
    short: 'Understanding rival movements as inputs to your own strategy — not as background noise.',
    formula: 'Your position = (Your brand × Your capacity) ÷ (Sum of all credible alternatives in catchment)',
    example: 'A scandal at the high-street chain frees up ~£200k of annual demand in your catchment. A premium chain expanding into your borough compresses your premium pricing by ~5%. Both are *real* economic events that should change your decisions — but most founders treat them as gossip.',
    why: 'Markets are dynamic. Your trajectory through the cycle depends not only on what *you* do but on what your rivals do. Reading competitive signals correctly (when to expand into a wounded competitor\'s catchment, when to defend brand against a new entrant\'s noise) is what separates an operator from a craftsman.',
    chapter: 'Strategy',
  },
  'channel-mix': {
    title: 'Marketing Channel Mix',
    short: 'The deliberate allocation of marketing budget across channels with different CAC, demographic, and brand-quality profiles.',
    formula: 'Blended CAC = Σ (Channel % × Channel CAC)\nWeighted brand fx = Σ (Channel % × Channel brand uplift)',
    example: '60% Instagram (£165 CAC, mid-brand) + 10% TikTok (£95 CAC, ASA risk) + 10% YouTube (£280, +3.2 brand) + 20% Google (£210, intent) = Blended CAC £175 with strong brand carry. Versus 80% TikTok = £106 blended CAC but compounding ASA risk and ethics drift.',
    why: 'CAC is the headline number but channel mix decides the *quality* of patients acquired. TikTok patients churn faster; YouTube patients have higher CLV; Google patients have higher intent. The channel mix is your brand strategy expressed in numbers.',
    chapter: 'Marketing Economics',
  },
  'asa-compliance': {
    title: 'ASA Compliance Risk',
    short: 'The advertising standards risk inherent in different marketing channels and creative approaches.',
    formula: 'Cumulative risk per quarter = Σ (Channel % × Channel ASA risk %)',
    example: 'Heavy TikTok exposure (50% of mix at 18% risk per quarter) means a ~9% chance of a CAP Code breach this quarter. A breach typically costs Brand −3, Ethics −2, Compliance −4. Three quarters running this exposure compounds into ~25% cumulative breach probability.',
    why: 'The ASA, MHRA, and CAP Code are the regulatory teeth on UK aesthetics marketing. Mentioning a POM (prescription-only medicine) on social, using before/after creative without consent, or running discount-driven creative will trigger investigation. The clinics that get away with it do so until they don\'t — and the diligence discount on past breaches at exit is brutal.',
    chapter: 'Marketing Economics',
  },
};

// ---------- TREATMENT CATEGORIES ----------
// The product mix model. Each category has its own economics, margin profile, and strategic signal.
// Real UK aesthetics: the mix IS the positioning. A clinic doing 70% toxin is a different business
// from one doing 30% biostimulators + 20% EBDs.
const TREATMENT_CATEGORIES = [
  {
    id: 'toxin', label: 'Toxin', sub: 'Botulinum injections',
    avgTicket: 0.28, cogsRate: 0.22, color: '#1A4D5E',
    statBoost: { brand: 0, innovation: 0 },
    acquirerSignal: { allergan: 1.0, galde: 0.6, merz: 0.3, cont: 0.7 },
    desc: 'The gateway product. High volume, modest ticket, dependable cash flow. Allergan-coded.',
    requires: null,
    defaultPct: 35,
  },
  {
    id: 'filler', label: 'HA Filler', sub: 'Hyaluronic-acid based',
    avgTicket: 0.42, cogsRate: 0.28, color: '#3D2548',
    statBoost: { brand: 1, innovation: 0 },
    acquirerSignal: { allergan: 1.0, galde: 0.8, merz: 0.5, cont: 0.8 },
    desc: 'The bread-and-butter. Reversible, branded, mid-margin. The market leader\'s core category.',
    requires: null,
    defaultPct: 35,
  },
  {
    id: 'biostim', label: 'Biostimulators', sub: 'PLLA, CaHA',
    avgTicket: 0.68, cogsRate: 0.32, color: '#B8945F',
    statBoost: { brand: 2, innovation: 2 },
    acquirerSignal: { allergan: 0.5, galde: 1.0, merz: 0.8, cont: 0.4 },
    desc: 'Premium category. Collagen induction, longer-lasting, education-led selling. Galderma-coded.',
    requires: s => s.innovation >= 50,
    defaultPct: 10,
  },
  {
    id: 'poly', label: 'Polynucleotides', sub: 'Regenerative DNA fragments',
    avgTicket: 0.38, cogsRate: 0.30, color: '#5C7A52',
    statBoost: { brand: 1, innovation: 3 },
    acquirerSignal: { allergan: 0.3, galde: 0.6, merz: 1.0, cont: 0.4 },
    desc: 'Newest premium category. Regenerative narrative, skin-quality positioning. Merz-coded.',
    requires: s => s.innovation >= 55,
    defaultPct: 5,
  },
  {
    id: 'ebd', label: 'Energy Devices', sub: 'RF, IPL, laser',
    avgTicket: 0.45, cogsRate: 0.12, color: '#8B2C3C',
    statBoost: { brand: 2, innovation: 3, safety: 1 },
    acquirerSignal: { allergan: 0.4, galde: 0.7, merz: 0.9, cont: 0.8 },
    desc: 'Highest-margin category. Single-treatment lower ticket but minimal consumables. Requires CapEx unlock.',
    requires: s => s.ebdUnlocked === true,
    capexUnlock: { cost: 24, name: 'RF Microneedling Platform', quartersToDepreciate: 8 },
    defaultPct: 0,
  },
  {
    id: 'skin', label: 'Skin Programmes', sub: 'Topicals, peels, microneedling',
    avgTicket: 0.18, cogsRate: 0.25, color: '#9B9098',
    statBoost: { brand: 0, innovation: 0, nps: 1 },
    acquirerSignal: { allergan: 0.6, galde: 0.7, merz: 0.5, cont: 0.6 },
    desc: 'Low-ticket, retention engine. Patients book monthly. The thread that holds the relationship.',
    requires: null,
    defaultPct: 15,
  },
];

// ---------- MILESTONES ----------
// Identity-aligned moments. Triggered when a quarterly state crosses a threshold for the first time.
// Each milestone celebrates a strategic identity beat — gives the run narrative shape.
const MILESTONES = [
  // Clinical Pharma Path
  { id: 'first-safety-65', label: 'Clinically Credible', desc: 'Safety crossed 65. Your protocols are starting to show.', identity: 'Clinical Pharma Path', check: (s, prev) => s.safety >= 65 && prev.safety < 65, color: '#1A4D5E' },
  { id: 'first-safety-75', label: 'Galderma-Eligible Safety', desc: 'Safety crossed 75. You\'ve cleared the clinical bar for the premium pharma multiple.', identity: 'Clinical Pharma Path', check: (s, prev) => s.safety >= 75 && prev.safety < 75, color: '#1A4D5E' },
  { id: 'cadaver-stack', label: 'The Cadaver-Trained Clinic', desc: 'You\'ve invested in anatomical depth. Patients sense it.', identity: 'Clinical Pharma Path', check: (s, prev, ctx) => ctx.movesPlayedThisQ?.includes('cl1') && !ctx.previousMilestones.includes('cadaver-stack'), color: '#1A4D5E' },
  // Research-Led Path
  { id: 'first-innovation-70', label: 'Research-Forward', desc: 'Innovation crossed 70. The journals are starting to notice.', identity: 'Research-Led Path', check: (s, prev) => s.innovation >= 70 && prev.innovation < 70, color: '#3D2548' },
  { id: 'first-innovation-82', label: 'Merz-Eligible Innovation', desc: 'Innovation crossed 82. You\'ve cleared the bar for the research-led acquirer.', identity: 'Research-Led Path', check: (s, prev) => s.innovation >= 82 && prev.innovation < 82, color: '#3D2548' },
  { id: 'open-outcomes', label: 'The Open-Outcomes Clinic', desc: 'You publish your data. The UK aesthetic press is paying attention.', identity: 'Research-Led Path', check: (s, prev, ctx) => ctx.movesPlayedThisQ?.includes('gr11') && !ctx.previousMilestones.includes('open-outcomes'), color: '#3D2548' },
  // Brand & Volume Path
  { id: 'first-brand-65', label: 'Brand Recognised', desc: 'Brand crossed 65. Word-of-mouth is doing real work.', identity: 'Brand & Volume Path', check: (s, prev) => s.brand >= 65 && prev.brand < 65, color: '#8B2C3C' },
  { id: 'first-nps-70', label: 'Allergan-Eligible NPS', desc: 'NPS crossed 70. Patients are evangelising. Allergan tracks this.', identity: 'Brand & Volume Path', check: (s, prev) => s.nps >= 70 && prev.nps < 70, color: '#8B2C3C' },
  { id: 'editorial-pr', label: 'The Editorial Clinic', desc: 'Long-form press has lifted the brand into a different category.', identity: 'Brand & Volume Path', check: (s, prev, ctx) => ctx.movesPlayedThisQ?.includes('br6') && !ctx.previousMilestones.includes('editorial-pr'), color: '#8B2C3C' },
  // PE Flip Path
  { id: 'first-margin-25', label: 'Margin Quality', desc: 'Gross margin held above 25% EBITDA. PE roll-ups want this profile.', identity: 'PE Flip Path', check: (s, prev, ctx) => (ctx.q?.ebitda / Math.max(ctx.q?.revenue, 0.01)) >= 0.25 && !ctx.previousMilestones.includes('first-margin-25'), color: '#5C7A52' },
  { id: 'lean-stack', label: 'The Lean Operator', desc: 'You\'ve cost-cut without cratering the team. PE diligence likes this.', identity: 'PE Flip Path', check: (s, prev, ctx) => (ctx.movesPlayedThisQ?.some(m => ['op1', 'op2', 'op4'].includes(m))) && !ctx.previousMilestones.includes('lean-stack'), color: '#5C7A52' },
  // Universal
  { id: 'first-profitable', label: 'First Profitable Quarter', desc: 'Net cash positive. The model works.', identity: null, check: (s, prev, ctx) => ctx.q?.net > 0 && !ctx.previousMilestones.includes('first-profitable'), color: '#B8945F' },
  { id: 'cash-positive-streak-3', label: 'Three Profitable Quarters', desc: 'Three in a row. This is a business now.', identity: null, check: (s, prev, ctx) => s.streak >= 3 && !ctx.previousMilestones.includes('cash-positive-streak-3'), color: '#B8945F' },
  { id: 'consultation-craft', label: 'Consultation Master', desc: 'Four consultations in a row landed well. Your craft shows.', identity: null, check: (s, prev, ctx) => ctx.streakCounters?.consult >= 4 && !ctx.previousMilestones.includes('consultation-craft'), color: '#B8945F' },
  { id: 'survived-bust', label: 'You Came Back', desc: 'Round Two. Diligence flag, but you\'re still building.', identity: null, check: (s, prev, ctx) => ctx.bustCount > 0 && !ctx.previousMilestones.includes('survived-bust'), color: '#B8945F' },
  // Mix-aligned
  { id: 'first-biostim-mix', label: 'Galderma-Coded Mix', desc: 'Biostimulators crossed 20% of mix. Galderma\'s scouts are watching.', identity: 'Research-Led Path', check: (s, prev, ctx) => (ctx.treatmentMix?.biostim || 0) >= 20 && !ctx.previousMilestones.includes('first-biostim-mix'), color: '#B8945F' },
  { id: 'first-poly-mix', label: 'Merz-Coded Mix', desc: 'Polynucleotides crossed 15% of mix. The regenerative narrative is yours.', identity: 'Research-Led Path', check: (s, prev, ctx) => (ctx.treatmentMix?.poly || 0) >= 15 && !ctx.previousMilestones.includes('first-poly-mix'), color: '#5C7A52' },
  { id: 'ebd-pioneer', label: 'EBD Pioneer', desc: 'Energy devices crossed 25% of mix. You\'ve escaped commodity injectable pricing.', identity: null, check: (s, prev, ctx) => (ctx.treatmentMix?.ebd || 0) >= 25 && !ctx.previousMilestones.includes('ebd-pioneer'), color: '#8B2C3C' },
  { id: 'mix-mastery', label: 'Full-Spectrum Clinic', desc: 'All six categories contributing. Multi-product mastery.', identity: null, check: (s, prev, ctx) => ctx.treatmentMix && Object.values(ctx.treatmentMix).every(p => p >= 5) && !ctx.previousMilestones.includes('mix-mastery'), color: '#3D2548' },
  // Chain milestones
  { id: 'second-site', label: 'Second Site', desc: 'You\'ve proven the model is replicable. The leap from one to two is the hardest.', identity: null, check: (s, prev, ctx) => ctx.sites && ctx.sites.filter(x => x.health !== 'failed').length >= 1 && !ctx.previousMilestones.includes('second-site'), color: '#B8945F' },
  { id: 'chain-of-three', label: 'Chain of Three', desc: 'Three sites operating. Roll-up multiple unlocked — pharma acquirers take notice.', identity: null, check: (s, prev, ctx) => ctx.sites && ctx.sites.filter(x => x.health !== 'failed').length >= 2 && !ctx.previousMilestones.includes('chain-of-three'), color: '#B8945F' },
  { id: 'chain-of-four', label: 'Strategic Scale', desc: 'Four sites. You\'re no longer a clinic — you\'re a UK aesthetics business. Galderma class.', identity: 'Brand & Volume Path', check: (s, prev, ctx) => ctx.sites && ctx.sites.filter(x => x.health !== 'failed').length >= 3 && !ctx.previousMilestones.includes('chain-of-four'), color: '#B8945F' },
  { id: 'six-figure-chain', label: 'Roll-Up Master', desc: 'Six sites. Strategic acquirer territory. Eight-figure exit possible.', identity: null, check: (s, prev, ctx) => ctx.sites && ctx.sites.filter(x => x.health !== 'failed').length >= 5 && !ctx.previousMilestones.includes('six-figure-chain'), color: '#3D2548' },
  { id: 'first-acquisition', label: 'The Acquirer', desc: 'You bought a competitor. Integration risk lies ahead — but so does scale.', identity: null, check: (s, prev, ctx) => ctx.sites && ctx.sites.some(x => x.origin === 'acquisition') && !ctx.previousMilestones.includes('first-acquisition'), color: '#8B2C3C' },
  { id: 'survived-failure', label: 'The Survivor', desc: 'A site failed. The chain held. The lesson cost real money.', identity: null, check: (s, prev, ctx) => ctx.sites && ctx.sites.some(x => x.health === 'failed') && !ctx.previousMilestones.includes('survived-failure'), color: '#5A5560' },
];

const STREAKS = [
  { id: 'ethics-streak', label: 'Ethics Streak', desc: 'Three consecutive quarters with ethics-positive choices and no upsell-heavy moves.', threshold: 3, bonus: { brand: 4, nps: 3 } },
  { id: 'safety-streak', label: 'Zero-Complication Streak', desc: 'Five quarters without a complication event.', threshold: 5, bonus: { brand: 6, safety: 4, innovation: 3 } },
  { id: 'consult-streak', label: 'Consultation Mastery', desc: 'Four consultations in a row with majority-correct beats.', threshold: 4, bonus: { nps: 5, brand: 4 } },
  { id: 'profit-streak', label: 'Profitable Quarter Streak', desc: 'Three consecutive profitable quarters.', threshold: 3, bonus: { brand: 3, cash: 4 } },
];

const EVENTS = [
  { title: 'Health & Care Act Licensing Activates', desc: 'Licensing for non-surgical cosmetic procedures comes into force.', cue: 'Clinics at clinical standard pass the audit.', check: s => s.compliance > 45, win: { brand: 6, compliance: 4 }, lose: { cash: -18, brand: -8, compliance: -6 } },
  { title: 'ASA Adjudication: POM Promotion', desc: 'ASA ruling against a competitor goes viral.', cue: 'Clean practices benefit by contrast.', check: s => s.compliance > 40, win: { brand: 7, nps: 3 }, lose: { compliance: -5, brand: -4 } },
  { title: 'UK Filler Botulism Cluster', desc: 'Regional outbreak hits BBC News.', cue: 'Public trust collapses. Clinics with protocols become the reference.', check: s => s.safety > 55 && s.compliance > 50, win: { brand: 12, nps: 8, cash: 12 }, lose: { cash: -15, nps: -6, brand: -6 }, complicationEvent: true },
  { title: 'Hyaluronidase Supply Shortage', desc: 'National shortage strains filler clinics.', cue: 'Stocked clinics keep treating safely.', check: s => s.safety > 50, win: { safety: 4, brand: 6 }, lose: { safety: -10, cash: -8 } },
  { title: 'ITV Tonight Documentary', desc: 'Primetime doc on "Wild West Injectables". They want a counterexample clinic.', cue: 'They pick the one with public safety credentials.', check: s => s.brand > 55 && s.safety > 50, win: { brand: 15, nps: 10, cash: 15 }, lose: { brand: -3 } },
  { title: 'Exclusive Supply Deal Offered', desc: 'Exclusivity for a year, 18% off bulk. Lose flexibility.', cue: 'Innovation-led clinics decline.', check: s => s.innovation > 55, win: { brand: 4, innovation: 3 }, lose: { ethics: 5, innovation: -4 } },
  { title: 'Competitor VO in the Press', desc: 'Celebrity patient suffers VO at a chain. Front page.', cue: 'Patients flood toward clinics with published protocols.', check: s => s.safety > 55, win: { nps: 8, brand: 10, cash: 14 }, lose: { brand: -3 }, complicationEvent: true },
  { title: 'Practitioner Standards Tighten', desc: 'Annual CPD evidence, named protocols, audit trail now required.', cue: 'Compliant clinics renew.', check: s => s.compliance > 50, win: { brand: 5 }, lose: { compliance: -8, brand: -6 } },
  { title: 'GLP-1 Demand Surge', desc: 'Ozempic face demand spikes.', cue: 'Innovation-led clinics with biostimulators capture it.', check: s => s.innovation > 50, win: { cash: 22, nps: 4, brand: 4 }, lose: { cash: 4 } },
  { title: 'Patient Posts Long Thread', desc: '4,000-word X thread about their experience.', cue: 'Glowing — if the experience was genuinely different.', check: s => s.nps > 65, win: { brand: 10, nps: 5, cash: 8 }, lose: { brand: -5, nps: -4 } },
  { title: 'CQC Premises Inspection', desc: 'Unannounced inspection on storage, sharps, consent.', cue: 'Audit-ready clinics breeze through.', check: s => s.compliance > 50, win: { compliance: 3 }, lose: { cash: -12, compliance: -10, brand: -5 }, complicationEvent: true },
  { title: 'Senior Injector Poached', desc: 'Competitor offers your top clinician 25% more.', cue: 'Teams paid above market stay.', check: s => s.brand > 60 || s.margin > 55, win: { brand: 3 }, lose: { nps: -6, cash: -14 } },
  { title: 'Regenerative Trend in Vogue', desc: 'Vogue features polynucleotides and biostimulators.', cue: 'Regenerative-ready clinics capture demand.', check: s => s.innovation > 55, win: { cash: 18, brand: 8, nps: 4 }, lose: { brand: -2 } },
  { title: 'Patient Data Breach Complaint', desc: 'A patient files a complaint that her photos and notes were never properly secured. The ICO opens a file.', cue: 'Registered clinics with proper data handling weather it. Unregistered clinics face a £4k+ fine and a public notice.', check: s => s.compliance > 40, win: { compliance: 2 }, lose: { cash: -8, compliance: -8, brand: -5 }, icoEvent: true },
];

const SCENARIOS = [
  { id: 'sameday', requires: 'filler', persona: 'F · 23 · Travel-driven', title: 'Same-Day Filler Request', setup: 'A new patient walks in. 23. Wants 2ml lip filler this afternoon, cash. Flying to Dubai tomorrow.', choices: [
    { label: 'Treat her today', outcome: 'You inject. Three weeks later, a 1-star Google review citing nodules and a "rushed consultation".', fx: { cash: 1.2, safety: -8, nps: -6, brand: -5, compliance: -4 } },
    { label: 'Decline; consult today, treat in 14 days', outcome: 'She is annoyed. Books for next month. Two friends book because she told them about your process.', fx: { cash: -0.3, safety: 7, nps: 6, brand: 9, compliance: 6 } },
    { label: 'Refer to a colleague who can see her today', outcome: 'She thanks you. The colleague treats her badly. Three months later she returns to you, loyal.', fx: { cash: 0, safety: 3, nps: 7, brand: 6 } },
  ]},
  { id: 'influencer', requires: 'any', persona: 'F · 28 · 240k followers', title: 'The Influencer Approaches', setup: 'A UK influencer with 240,000 followers DMs you. Free treatment in exchange for three Stories and a Reel.', choices: [
    { label: 'Accept — gift in exchange for tagged posts', outcome: 'ASA receive complaints about undisclosed POM-adjacent advertising. You receive a warning letter.', fx: { cash: 1.5, brand: 4, compliance: -10, nps: -3 } },
    { label: 'Accept — she pays full price, proper disclosure', outcome: 'She posts disclosed. The clinic looks both desirable and professional.', fx: { cash: 3, brand: 9, compliance: 4, nps: 4 } },
    { label: 'Decline — no-gifting policy on safety grounds', outcome: 'She posts about being declined. The conversation goes mildly viral in the right circles.', fx: { brand: 11, compliance: 6, safety: 4 } },
  ]},
  { id: 'vo', requires: 'filler', persona: 'F · 42 · Existing patient', title: 'Vascular Occlusion at 2pm', setup: 'A patient injected at 10am calls in distress. Pale skin distal to injection site, severe pain, mottling. 20 minutes away.', choices: [
    { label: 'Activate published protocol: hyaluronidase flood, immediate review', outcome: 'Perfusion returns by 4pm. She becomes a loyal patient. The case becomes a teaching example.', fx: { safety: 12, brand: 10, innovation: 6, nps: 8, cash: -2 } },
    { label: 'Tell her to come in, dose conservatively, wait and see', outcome: 'By morning the area is necrotic. She survives the scar; your reputation does not.', fx: { safety: -15, brand: -14, nps: -10, compliance: -8, cash: -45 } },
    { label: 'Refer to regional plastic surgery on-call', outcome: 'They manage it. The protocol is now non-negotiable.', fx: { safety: 4, brand: 2, compliance: 6, cash: -3 } },
  ]},
  { id: 'tabloid', requires: 'any', persona: 'B2B · National newspaper', title: 'The Tabloid Calls', setup: 'A national tabloid wants you on camera for a piece on "Dangerous TikTok injectable trends". Quote by tomorrow.', choices: [
    { label: 'Accept their angle', outcome: 'They cut you to sound sensational. Brief brand bump, but the framing haunts you for months.', fx: { brand: 4, nps: -3, compliance: -2 } },
    { label: 'Counter-propose: safety, regulation, evidence', outcome: 'They negotiate, then go for it. You become a regular contributor. The angle shifts to credible.', fx: { brand: 12, innovation: 6, compliance: 4 } },
    { label: 'Decline, refer to the trade body press office', outcome: 'They get someone less qualified. You miss the platform, keep your voice.', fx: { brand: 3, compliance: 5 } },
  ]},
  { id: 'returning', requires: 'any', persona: 'F · 35 · Returning, escalating', title: 'The Patient Who Keeps Returning', setup: 'A long-standing patient has booked four consults in six months. Each time identifies a new "issue" you cannot see. Today: more treatment in multiple areas.', choices: [
    { label: 'Treat what she asks for. She is consenting.', outcome: 'You treat. She returns six weeks later identifying new areas. The pattern accelerates. You begin to dread her appointments.', fx: { cash: 2, safety: -6, nps: -4, brand: -7 } },
    { label: 'Decline today. Have the body dysmorphia conversation.', outcome: 'It is the hardest conversation of your month. She cries. Three months later she returns, having seen a psychologist. She thanks you.', fx: { cash: -0.4, safety: 10, brand: 8, nps: 5 } },
    { label: 'Treat a small portion. Bring it up next time.', outcome: 'A compromise that doesn\'t hold. You are participating in something.', fx: { cash: 0.6, safety: -3, nps: -2, brand: -3 } },
  ]},
  { id: 'minor-presents', requires: 'any', persona: 'F · 17 · Mother insistent', title: 'A 17-Year-Old at the Door',
    setup: 'A patient arrives with her mother. The mother explains her daughter has "always been self-conscious about her lips" and wants to book her in. The girl is 17. She doesn\'t make eye contact.',
    choices: [
      { label: 'Treat — the mother is consenting, the patient is post-pubertal', outcome: 'You did it. You\'re now a clinic that treats children. The GMC interest in this is not theoretical.', fx: { cash: 1.4, ethics: -15, compliance: -10, safety: -8, brand: -10 } },
      { label: 'Refuse — explain UK best practice is 18+, schedule a return', outcome: 'The mother is upset, then thoughtful. Two years later, the daughter returns alone and books for the right reasons.', fx: { ethics: 12, brand: 8, compliance: 6, safety: 5 } },
      { label: 'Spend the hour talking — about her, not her face', outcome: 'You learn she\'s being bullied at school. You signpost to her GP. She leaves with something more useful than filler.', fx: { ethics: 15, brand: 10, nps: 5, safety: 4 } },
    ]},
  { id: 'wholesaler-deal', requires: 'any', persona: 'B2B · Pharmaceutical wholesaler', title: 'The Grey-Market Offer',
    setup: 'A wholesaler quietly offers you product at 40% below MHRA-licensed cost. "It\'s the same molecule. No paperwork. Imported in volume, sold cash."',
    choices: [
      { label: 'Buy in — your margins double overnight', outcome: 'One of the vials is a counterfeit. A patient has a granulomatous reaction. The MHRA traces it. You lose your insurance.', fx: { cash: -25, compliance: -25, safety: -15, brand: -15, ethics: -10 } },
      { label: 'Decline. Stay on the licensed supply chain', outcome: 'Your COGS is higher. Your peace of mind is intact. Three months later, the wholesaler is raided.', fx: { ethics: 8, compliance: 8, safety: 5, brand: 4 } },
      { label: 'Decline and report to the MHRA', outcome: 'The MHRA opens a case. You become an industry reference point. Other clinicians start sending patients your way.', fx: { brand: 12, compliance: 10, ethics: 10, innovation: 5 } },
    ]},
  { id: 'staff-error', requires: 'any', persona: 'Internal · Junior team member', title: 'Your Junior Made a Mistake',
    setup: 'Your junior injector treated a patient yesterday. She used the wrong product for the area — a high-G\' filler intended for cheek, placed in lips. The patient has not noticed yet.',
    choices: [
      { label: 'Tell the patient. Dissolve it today. Cover the cost.', outcome: 'Hard conversation, but the patient appreciates the honesty. She writes a review about your safety culture. Your junior learns.', fx: { cash: -3, safety: 12, brand: 10, ethics: 10, nps: 8 } },
      { label: 'Hope she doesn\'t notice. Schedule routine follow-up.', outcome: 'She notices at week 3. The complaint to the GMC names you. You spend six months responding to the investigation.', fx: { cash: -8, safety: -10, brand: -12, compliance: -15, ethics: -10 } },
      { label: 'Tell her you\'d like to "refine the result" with a complimentary review', outcome: 'You concealed it as a refinement. She accepts. The junior never learns what she did. The pattern will repeat.', fx: { cash: -1.5, safety: -5, ethics: -8, brand: -4 } },
    ]},
  { id: 'patient-relationship', requires: 'any', persona: 'F · 42 · Returning, attached', title: 'Boundary Crossing',
    setup: 'A regular patient has started messaging you on Instagram after appointments. Friendly, then warmer. Today: "Are you single? Can I take you for dinner to say thank you?"',
    choices: [
      { label: 'Politely decline, transfer her care to a colleague', outcome: 'Professional. She\'s embarrassed but respects it. Your indemnity insurer would approve.', fx: { ethics: 10, compliance: 8, brand: 5, safety: 4 } },
      { label: 'Accept dinner — "what could go wrong?"', outcome: 'Six months later she files a complaint when the relationship sours. The GMC takes a dim view of practitioner-patient relationships.', fx: { ethics: -20, compliance: -20, brand: -15, safety: -10 } },
      { label: 'Politely decline, keep treating her', outcome: 'Awkward, but professional. The dynamic shifts. She finds another clinic within months.', fx: { ethics: 5, compliance: 4, nps: -3, brand: 2 } },
    ]},
  { id: 'tiktok-trend', requires: 'any', persona: 'F · 24 · TikTok-driven', title: 'The "Fox Eye" Request', art: 'phone-trend',
    setup: 'A 24-year-old wants the "fox eye" look from TikTok. She has photos. The look requires thread-lifts, brow toxin, and lateral canthal repositioning — a major intervention for a transient trend.',
    choices: [
      { label: 'Deliver what she asked for', outcome: 'You did it. Three months later the trend fades. She wants it reversed. You can\'t fully reverse threads.', fx: { cash: 4, ethics: -8, brand: -6, safety: -4 } },
      { label: 'Suggest a softer alternative — micro-dose brow toxin only', outcome: 'She agrees. Subtle result. She returns six weeks later, content. Two friends book.', fx: { cash: 0.8, ethics: 4, brand: 5, innovation: 3 } },
      { label: 'Refuse — explain trends and irreversible procedures don\'t mix', outcome: 'She\'s annoyed and goes elsewhere. Three years later she sends a thank-you message — she sees the same look on others and cringes.', fx: { ethics: 8, brand: 6, safety: 4 } },
    ]},
  { id: 'turkey-return', requires: 'any', persona: 'F · 31 · Post-Istanbul returner', title: 'She Came Back From Istanbul', art: 'turkey',
    setup: 'A 31-year-old returns from a £2,200 Istanbul aesthetic package — rhinoplasty + 6ml filler + a "vampire facial". The filler has migrated, there\'s visible product in her tear trough, and her nose has an asymmetric tip. She wants you to fix it.',
    choices: [
      { label: 'Examine, document, treat what you safely can with hyaluronidase', outcome: 'You dissolve the migrated HA. The non-HA in her tear trough needs surgical removal. You refer her to oculoplastics. She trusts you.', fx: { cash: -1, safety: 10, brand: 8, ethics: 6, innovation: 4 } },
      { label: 'Refuse to be involved — refer her straight back to Istanbul', outcome: 'A clean line. She\'s angry but her insurer eventually engages the original clinic. You\'re not part of the legal fallout.', fx: { ethics: 4, compliance: 6 } },
      { label: 'Treat to "improve" the cosmetic result without diagnosing the migration', outcome: 'You injected over the existing problem. Three months later there are nodules. Her solicitor names you in the complaint.', fx: { cash: 1.5, safety: -12, ethics: -10, brand: -8, compliance: -8 } },
      { label: 'Provide a written clinical opinion she can use against the Istanbul clinic', outcome: 'A useful, honest document. Her case advances. She refers two friends. You become known as the clinic that does this properly.', fx: { ethics: 8, brand: 8, safety: 5, cash: -0.3 } },
    ]},
  { id: 'wedding-panic', requires: 'any', persona: 'F · 33 · Bride · 36 hours out', title: 'The Wedding Is in 36 Hours', art: 'wedding',
    setup: 'A bride calls in tears. She\'s had filler from a competitor two days ago. There\'s significant swelling on the left side. The wedding is in 36 hours. She\'s offering whatever it costs.',
    choices: [
      { label: 'See her urgently. Examine. Manage swelling. No new product.', outcome: 'You assess, exclude VO, advise ice, antihistamines, head elevation. She walks down the aisle 80% normal. She tells everyone how you saved the day.', fx: { brand: 14, nps: 12, ethics: 8, safety: 6, cash: -0.3 } },
      { label: 'Inject hyaluronidase to dissolve everything immediately', outcome: 'You over-corrected without examination. She has a deflated lip on her wedding day. She is photographed crying.', fx: { cash: 0.5, safety: -8, brand: -10, nps: -8, ethics: -5 } },
      { label: 'Refuse — "I can\'t take responsibility for another clinic\'s work"', outcome: 'A defensible position. She finds an A&E doctor friend who helps. She remembers the clinic that helped, not yours.', fx: { ethics: 4, compliance: 6, brand: -3 } },
      { label: 'Add subtle filler to the other side to balance', outcome: 'You doubled down on a problem. The swelling didn\'t settle. Both sides now look strange.', fx: { cash: 2, safety: -10, brand: -8, ethics: -6 } },
    ]},
  { id: 'glp1-face', requires: 'any', persona: 'F · 47 · Lost 4 stone on Ozempic', title: 'Ozempic Face', art: 'glp1',
    setup: 'A patient who has lost 4 stone in 18 months on semaglutide. Her face is gaunt, her midface deflated, her nasolabials prominent. She wants "everything fixed". She has £15k earmarked.',
    choices: [
      { label: 'Stage a careful plan: bioremodelling first (12 weeks), then volume restoration', outcome: 'Methodical, anatomically correct. She trusts the sequencing. You become her practitioner for the next decade.', fx: { cash: 6, brand: 10, innovation: 8, nps: 8, ethics: 6, safety: 5 } },
      { label: 'Deliver everything she asked for in one session', outcome: 'You injected 8ml in one day. Some looked too tight, some looked over-filled. She\'s back in three weeks asking for "refinements".', fx: { cash: 12, safety: -8, brand: -6, ethics: -8 } },
      { label: 'Recommend she stabilises her weight first, then come back in 6 months', outcome: 'Conservative, clinically right. She doesn\'t book today but returns in 8 months, stable. She brings a friend.', fx: { ethics: 8, brand: 6, safety: 4, cash: -0.4 } },
      { label: 'Cheek and chin filler today, then assess', outcome: 'A reasonable starting point. She\'s happy. You\'ve avoided over-treatment but kept her engaged.', fx: { cash: 2.5, brand: 4, nps: 5, innovation: 3 } },
    ]},
  { id: 'nhs-moonlighter', requires: 'any', persona: 'B2B · NHS Consultant', title: 'The Moonlighting Consultant', art: 'moonlight',
    setup: 'A senior NHS consultant in a non-aesthetic specialty wants to do "weekend clinics" at your premises. He\'d bring a patient list, his own indemnity, and a 30% revenue share. He has no aesthetic training.',
    choices: [
      { label: 'Decline politely — clinical standards non-negotiable', outcome: 'He\'s offended but moves on to a less rigorous clinic. Six months later that clinic faces a major complication. Your name is not in the headlines.', fx: { ethics: 10, safety: 8, compliance: 8, brand: 5 } },
      { label: 'Accept on condition: he completes your training first', outcome: 'He scoffs and walks away. You upheld the standard publicly. Word spreads in medical circles.', fx: { ethics: 8, brand: 10, innovation: 4, safety: 6, cash: -0.5 } },
      { label: 'Accept — the revenue share is too good to refuse', outcome: 'He treats patients badly under your branding. The complaints come to you. You spend two quarters cleaning up.', fx: { cash: 4, safety: -12, ethics: -10, brand: -10, compliance: -8 } },
      { label: 'Counter-offer: he refers his NHS-frustrated patients to you, no shared room', outcome: 'A clean structure. He sends 3 patients/month. You build a long-term referral pipeline.', fx: { cash: 2, brand: 6, ethics: 5, nps: 4 } },
    ]},
  { id: 'fake-review', requires: 'any', persona: 'B2B · Marketing agency', title: 'The Reputation Manager Calls', art: 'reviews',
    setup: 'A reputation-management agency offers to "boost your Google reviews" — 25 five-star reviews per month, written by their team, posted from rotating IP addresses, for £400/month. They have other clinics as clients.',
    choices: [
      { label: 'Decline — fraudulent reviews are an integrity issue', outcome: 'A clean line. Six months later the CMA investigates the agency. Two of your competitors are named. You aren\'t.', fx: { ethics: 10, brand: 8, compliance: 7 } },
      { label: 'Accept the package — everyone does it', outcome: 'Reviews go up. So does your traffic. Until a journalist runs the reverse-image-search on the fake reviewer headshots. You\'re named in The Telegraph.', fx: { cash: -3, ethics: -15, brand: -18, compliance: -10 } },
      { label: 'Counter — ask them to coach your real patients on leaving honest reviews instead', outcome: 'They reluctantly do this. Volume is lower but reviews are real. Your local SEO climbs organically.', fx: { cash: -1, ethics: 5, brand: 6, nps: 4 } },
      { label: 'Decline and write a public LinkedIn post about the offer', outcome: 'It goes viral in the UK aesthetics community. You become the named voice on review integrity. Galderma\'s comms team takes note.', fx: { brand: 14, ethics: 10, innovation: 4, cash: -0.3 } },
    ]},
];

const CONSULTATIONS = [
  {
    id: 'first-timer', requires: 'both', persona: 'F · 28 · First consultation',
    background: 'A marketing professional. First-time injectable seeker. A friend had treatment elsewhere and "didn\'t like how it looked". Six months until her wedding.',
    branching: true,
    startStage: 'open',
    closingStages: ['close-trust', 'close-transact', 'close-walked', 'close-bdd'],
    stages: {
      // === Opening — sets her mood and primes everything downstream ===
      'open': {
        prompt: 'She walks in nervously. "I\'ve never done this before. I don\'t even know what I want, really."',
        moodHint: 'anxious',
        options: [
          { label: 'Open question — what made today the day she came in?', response: 'She talks for two minutes without interruption. The wedding is part of it, but so is a comment her sister made last Christmas. She isn\'t sure what she wants — but she\'s sure what she doesn\'t want.', fx: { safety: 3, nps: 4, brand: 2 }, nextId: 'history', moodTo: 'calm', addsFlag: 'listened-first' },
          { label: 'Show her the gallery of before/afters', response: 'She politely engages but you watch her tighten. She came to be heard; you moved to sales.', fx: { brand: -3, nps: -2 }, nextId: 'history-defensive', moodTo: 'defensive' },
          { label: 'Walk her through consent first', response: 'Professional, but she expected to be heard first. You skipped the human step.', fx: { compliance: 2, nps: -1 }, nextId: 'history', moodTo: 'anxious' },
          { label: '"What does your sister think?"', response: 'A pointed question. Her face shifts — there\'s a story there. She tells you. It changes the consultation.', fx: { ethics: 4, nps: 3, brand: 2 }, nextId: 'history', moodTo: 'interested', addsFlag: 'family-context' },
        ],
      },

      // === History branch (calm/neutral path) ===
      'history': {
        prompt: 'You move to medical history. She mentions a recent flu vaccine and a dental implant six weeks ago.',
        options: [
          { label: 'Full structured history including autoimmune, BDD screen, recent dental, vaccines', response: 'She mentions an aunt with thyroid disease. You note it. The dental implant means delaying treatment in the lower face — you explain why.', fx: { safety: 6, compliance: 4, brand: 3 }, nextId: 'request', moodTo: 'interested', addsFlag: 'thorough' },
          { label: 'Standard questionnaire — allergies, medications', response: 'Adequate. You missed the BDD screen and didn\'t probe the family history.', fx: { safety: 1, compliance: 1 }, nextId: 'request', moodTo: 'calm' },
          { label: 'Verbal check — she looks healthy', response: 'She nods through. The notes will not survive an audit.', fx: { safety: -5, compliance: -4 }, nextId: 'request', moodTo: 'calm' },
        ],
      },

      // === Defensive history branch (she's already on edge) ===
      'history-defensive': {
        prompt: 'You start medical history. Her arms are folded. She\'s answering in short sentences.',
        options: [
          { label: 'Pause and acknowledge — "I get the sense I jumped ahead. Can we restart?"', response: 'A reset. She visibly relaxes. The consultation recovers — partially.', fx: { brand: 4, nps: 5, ethics: 3 }, nextId: 'request', moodTo: 'calm', addsFlag: 'recovered' },
          { label: 'Push through with full history regardless', response: 'You got the data. You missed the relationship. She answers, but the trust isn\'t there.', fx: { safety: 3, compliance: 3, brand: -2 }, nextId: 'request-defensive', moodTo: 'defensive' },
          { label: 'Skip detailed history — keep it light', response: 'You traded safety for tone. Both are now compromised.', fx: { safety: -6, compliance: -3 }, nextId: 'request-defensive', moodTo: 'closing' },
        ],
      },

      // === The request — what she actually asks for ===
      'request': {
        prompt: 'She steadies herself. "Okay. So. I think I want lip filler and forehead toxin. My friend Hannah had hers done. She\'s a 2ml lip and 50 units. Can we do the same?"',
        options: [
          { label: 'Discuss whole-face balance — suggest micro-dose toxin + 0.5ml subtle lip', response: 'Initial disappointment. You explain wedding photography concerns, the "less is more" principle, and why what suits Hannah may not suit her. She trusts you.', fx: { safety: 5, brand: 5, nps: 4, innovation: 3 }, nextId: 'pricing-trust', moodTo: 'interested', addsFlag: 'restrained' },
          { label: 'Match her brief — 2ml lips and 50u toxin', response: 'You ordered what she asked. She leaves happy. You did not advise — you transcribed.', fx: { cash: 1.4, safety: -3, brand: -3 }, nextId: 'pricing-transact', moodTo: 'calm', addsFlag: 'transcribed' },
          { label: 'Decline today. Suggest two weeks to reflect and a second consultation.', response: 'She\'s surprised, then thoughtful. She agrees. You may not see her cash today — but you\'ll see her trust.', fx: { cash: -0.5, safety: 7, brand: 7, nps: 5 }, nextId: 'close-walked', moodTo: 'interested', addsFlag: 'cooling-period' },
          { label: 'Probe gently — "What does Hannah think of her result?"', response: 'Long pause. "She regrets the lips, actually. They\'re too big in photos." She\'s now asking different questions.', fx: { brand: 6, ethics: 5, nps: 4 }, nextId: 'request-reconsidered', moodTo: 'interested', addsFlag: 'self-aware' },
        ],
      },

      // === Defensive request branch (she didn't recover) ===
      'request-defensive': {
        prompt: 'She lists what she wants quickly, almost transactionally. "Lips, forehead, maybe cheek. Just price it up for me."',
        options: [
          { label: 'Treat as requested — match the transactional energy', response: 'A transactional consultation. She pays, she leaves. She won\'t come back, but she won\'t complain either.', fx: { cash: 1.6, safety: -2, brand: -4 }, nextId: 'close-transact', moodTo: 'closing' },
          { label: 'Pause — "I can\'t safely treat without a proper conversation."', response: 'You held the line. She\'s irritated. She leaves without booking — but you preserved your standards.', fx: { safety: 6, brand: 4, ethics: 5 }, nextId: 'close-walked', moodTo: 'defensive' },
          { label: 'Decline the cheek, treat lips and forehead modestly', response: 'A clinical compromise. Defensible. The relationship doesn\'t fully recover this visit but she returns six weeks later.', fx: { cash: 0.9, safety: 3, brand: 1 }, nextId: 'close-transact', moodTo: 'calm' },
        ],
      },

      // === Reconsidered branch — she's now open to a different conversation ===
      'request-reconsidered': {
        prompt: 'She leans forward. "So what would you actually recommend? Forget what I came in saying."',
        options: [
          { label: 'A skin-quality programme first — bioremodelling, then reassess', response: 'A long-game answer. She\'s impressed by the clinical sophistication. She books a 12-week programme.', fx: { innovation: 7, brand: 8, nps: 6, ethics: 5, cash: 2.2 }, nextId: 'pricing-trust', moodTo: 'interested', addsFlag: 'sophisticated' },
          { label: '"Honestly? Wait six months until after the wedding. Treat from a calm place."', response: 'Counter-intuitive. She\'s startled. Then she laughs. "You\'re the first person to tell me to do less." She doesn\'t book today. She refers three friends.', fx: { brand: 12, ethics: 10, nps: 7, cash: -0.5 }, nextId: 'close-walked', moodTo: 'interested', addsFlag: 'cooling-period' },
          { label: 'A modest, restrained plan — 0.5ml lip, micro-dose toxin', response: 'A measured plan. She agrees comfortably.', fx: { brand: 5, safety: 4, nps: 3 }, nextId: 'pricing-trust', moodTo: 'calm', addsFlag: 'restrained' },
        ],
      },

      // === Pricing conversation — trust path (she trusts you) ===
      'pricing-trust': {
        prompt: 'You\'re into pricing now. She\'s relaxed. "What does all this come to?"',
        options: [
          { label: 'Transparent single fee, itemised, no upsell', response: 'She appreciates the clarity. She books because of, not despite, the price.', fx: { brand: 5, nps: 4, ethics: 4 }, nextId: 'close-trust', moodTo: 'interested' },
          { label: 'Add a 15% bundle discount with a skin booster', response: 'She accepts. Margin up, brand cheapens slightly. The relationship has a price tag now.', fx: { cash: 1.2, brand: -3, ethics: -2 }, nextId: 'close-trust', moodTo: 'calm' },
          { label: 'Offer 0% finance over 6 months', response: 'She accepts. You wonder, later, whether she could have afforded to walk away.', fx: { cash: 0.4, safety: -2, brand: -4, ethics: -4 }, nextId: 'close-trust', moodTo: 'calm' },
          { label: '"Take 48 hours. Email me your decision."', response: 'You handed her power. She emails the next day, books fully. Loyalty starts here.', fx: { brand: 8, ethics: 6, nps: 6 }, nextId: 'close-trust', moodTo: 'interested' },
        ],
      },

      // === Pricing conversation — transactional path (she didn't really trust you) ===
      'pricing-transact': {
        prompt: 'You move to pricing. She\'s polite, but the warmth from the start of the consultation is gone.',
        options: [
          { label: 'Standard pricing, no embellishment', response: 'She pays, books in for two weeks. The relationship is professional but thin.', fx: { cash: 1.4, brand: 1 }, nextId: 'close-transact', moodTo: 'calm' },
          { label: 'Offer a follow-up consultation in 4 weeks at no charge', response: 'A small gesture. She notices. She might come back warmer next time.', fx: { brand: 4, nps: 3, ethics: 3 }, nextId: 'close-transact', moodTo: 'calm' },
          { label: 'Discount the package by 10% as a goodwill gesture', response: 'You\'re trying to buy what she didn\'t give you. She accepts but doesn\'t notice the goodwill.', fx: { cash: -0.8, brand: -2 }, nextId: 'close-transact', moodTo: 'calm' },
        ],
      },

      // === Closing stages — different endings ===
      'close-trust': {
        prompt: 'She leaves smiling. She has your card. She mentions her sister, her cousin, her colleague at work.',
        terminal: true,
        summary: 'Trust-based close — she became a loyal patient and a referrer.',
      },
      'close-transact': {
        prompt: 'She pays at reception, books in for treatment in two weeks, and leaves. The interaction is over.',
        terminal: true,
        summary: 'Transactional close — revenue today, no relationship.',
      },
      'close-walked': {
        prompt: 'She leaves without booking. But she leaves thinking differently about what she wanted.',
        terminal: true,
        summary: 'You walked her away — for the right reasons. Long-term reputation wins.',
      },
      'close-bdd': {
        prompt: 'You flagged a deeper concern and referred her appropriately. She didn\'t book treatment.',
        terminal: true,
        summary: 'Safeguarding close — you protected her from herself.',
      },
    },
  },
  {
    id: 'returning', requires: 'any', persona: 'F · 38 · Established patient',
    background: 'Three-year patient. Biannual treatments. Steady referrer. Today she mentions her face "looks tired".',
    branching: true, startStage: 'open',
    closingStages: ['close-deep', 'close-stock', 'close-shallow'],
    stages: {
      'open': {
        prompt: 'She sits down with the familiarity of a long-standing patient. "I just look tired. Can we fix it?"',
        moodHint: 'calm',
        options: [
          { label: 'Ask about sleep, stress, hormones, life', response: 'She mentions a year of peri-menopausal symptoms. The fatigue is dermal, not muscular. You\'ve found the real conversation.', fx: { safety: 4, innovation: 5, nps: 4 }, nextId: 'rec-hormonal', moodTo: 'interested', addsFlag: 'context-found' },
          { label: 'Suggest more of her usual', response: 'You may be treating the wrong tissue. She agrees because she trusts you.', fx: { safety: -2, brand: -2 }, nextId: 'rec-default', moodTo: 'calm' },
          { label: 'Recommend the medical skincare line you sell', response: 'A pivot toward what you stock, not what she needs.', fx: { cash: 0.3, brand: -2 }, nextId: 'rec-default', moodTo: 'calm' },
          { label: '"Tell me what changed in the last six months."', response: 'She pauses. "Everything, actually." She talks about her mother\'s death, hormone shifts, sleeping badly. You haven\'t had this conversation with her before.', fx: { ethics: 6, brand: 6, nps: 5 }, nextId: 'rec-deep', moodTo: 'interested', addsFlag: 'real-talk' },
        ],
      },
      'rec-hormonal': {
        prompt: 'You\'ve identified hormonal skin change. What\'s the plan?',
        options: [
          { label: 'Bioremodelling course over 12 weeks', response: 'You explain what it does and doesn\'t. She engages clinically. She agrees.', fx: { innovation: 6, nps: 5, safety: 3, cash: 1.5 }, nextId: 'referral', moodTo: 'interested' },
          { label: 'Polynucleotide course alongside her usual', response: 'Regenerative pathway. Science on the front foot. She trusts you, books the course.', fx: { innovation: 7, brand: 5, nps: 5, cash: 1.4 }, nextId: 'referral', moodTo: 'interested' },
          { label: 'Refer for HRT review with her GP first', response: 'A clinically sophisticated answer — treat the cause, not the skin. She\'s grateful.', fx: { ethics: 8, brand: 8, innovation: 4, cash: -0.3 }, nextId: 'referral', moodTo: 'interested', addsFlag: 'medical-first' },
        ],
      },
      'rec-deep': {
        prompt: 'The conversation has shifted. You\'re no longer just her injector — you\'re someone she trusts. What\'s the recommendation?',
        options: [
          { label: 'Pause all aesthetic treatment for 3 months', response: 'You name what she needs — time, not products. She cries quietly. She agrees.', fx: { ethics: 12, brand: 10, nps: 8, cash: -1 }, nextId: 'close-deep', moodTo: 'anxious', addsFlag: 'paused-treatment' },
          { label: 'A light bioremodelling course while she stabilises', response: 'Gentle, supportive. She accepts. Light clinical touch, not transformation.', fx: { innovation: 5, brand: 6, nps: 5, cash: 1 }, nextId: 'referral', moodTo: 'calm' },
          { label: 'Suggest she sees her GP, you\'ll wait', response: 'Right call. She returns six months later, calmer, ready.', fx: { ethics: 10, brand: 8, cash: -0.5 }, nextId: 'close-deep', moodTo: 'calm' },
        ],
      },
      'rec-default': {
        prompt: 'You proceeded without the deeper conversation. She asks for what she always asks for.',
        options: [
          { label: 'Stop — ask the question you skipped', response: 'You caught yourself. The consultation rewinds. She tells you about her mother. You proceed gently.', fx: { ethics: 6, brand: 5, nps: 4 }, nextId: 'rec-deep', moodTo: 'anxious', addsFlag: 'caught-it' },
          { label: 'Standard treatment as usual', response: 'You delivered what she expected. She leaves on autopilot. You missed it.', fx: { cash: 1.5, brand: -2 }, nextId: 'close-shallow', moodTo: 'calm' },
          { label: 'Push the skincare line', response: 'You converted the visit. She buys. You both leave the room a little smaller.', fx: { cash: 1.2, brand: -4, ethics: -3 }, nextId: 'close-stock', moodTo: 'closing' },
        ],
      },
      'referral': {
        prompt: 'She mentions a friend who\'s been thinking about it. "Can I introduce you?"',
        options: [
          { label: 'Offer "VIP introduction" — bypass standard consult', response: 'Short-term referral. You started a tier where some patients matter more.', fx: { cash: 0.8, safety: -3, brand: -4 }, nextId: 'close-stock', moodTo: 'calm' },
          { label: 'Send the standard consult booking link', response: 'Boring, correct. The friend books. The system holds.', fx: { nps: 3, compliance: 3, brand: 3 }, nextId: 'close-deep', moodTo: 'calm' },
          { label: '"Send her over — I\'ll fit her in personally for the first consult"', response: 'A small warmth. Her friend books and stays for years.', fx: { brand: 6, ethics: 4, nps: 4 }, nextId: 'close-deep', moodTo: 'interested' },
        ],
      },
      'close-deep': { prompt: 'You met her where she actually was. The relationship deepens — and so does the brand.', terminal: true, summary: 'Deep close — you noticed the human, not the wrinkle. Strongest long-term outcome.' },
      'close-stock': { prompt: 'You sold what was on the shelf. Margin up, signal down.', terminal: true, summary: 'Stock-led close — short-term revenue, long-term brand erosion.' },
      'close-shallow': { prompt: 'You delivered the usual. The appointment was fine. The chance was missed.', terminal: true, summary: 'Shallow close — no harm done, no depth built.' },
    },
  },
  {
    id: 'dysmorphia', requires: 'any', persona: 'F · 26 · Returning, escalating',
    background: 'Fifth consultation in eight months. Has had 4ml filler, two toxin treatments. Today: wants chin filler and asks about "buccal fat removal".',
    branching: true,
    startStage: 'open',
    closingStages: ['close-protected', 'close-participated', 'close-blocked', 'close-cooled'],
    stages: {
      'open': {
        prompt: 'She sits down with a list on her phone. "I\'ve been thinking about my chin. And my buccal fat. And maybe my temples again."',
        moodHint: 'anxious',
        options: [
          { label: 'Ask her to articulate one specific outcome she wants', response: 'She struggles. She describes how she wants to feel — not what she wants to look like. The gap is telling. You file it away.', fx: { safety: 5, brand: 4, ethics: 5 }, nextId: 'pattern', moodTo: 'anxious', addsFlag: 'noticed-pattern' },
          { label: 'Walk her through what each treatment does, anatomically', response: 'Educational, but you\'ve answered the wrong question. She knows what they do — she\'s been doing them for eight months.', fx: { brand: 0, nps: -1 }, nextId: 'pattern-late', moodTo: 'calm' },
          { label: 'Take clinical photos and review her facial proportions objectively', response: 'She visibly tenses. Looking at her own face in clinical lighting was not what she came for.', fx: { safety: -2, brand: -3 }, nextId: 'pattern-late', moodTo: 'defensive' },
          { label: '"Before we go further — can I ask why now? Why today?"', response: 'A long silence. Then she says she had a panic attack last week and decided changing her face would fix it. You\'ve found the conversation.', fx: { ethics: 8, safety: 6, brand: 5 }, nextId: 'pattern-clear', moodTo: 'anxious', addsFlag: 'caught-it' },
        ],
      },

      // === Pattern is now visible to you ===
      'pattern': {
        prompt: 'You\'ve seen what you needed to see. She lists three more areas she\'s "considered". The pattern is clear.',
        options: [
          { label: 'Decline today. Signpost to a BDD specialist.', response: 'It\'s the hardest conversation of the month. She cries. She accuses you of "judging" her. Three months later, she returns calmer. She thanks you.', fx: { safety: 10, ethics: 12, brand: 8, cash: -0.6 }, nextId: 'follow-up', moodTo: 'defensive', addsFlag: 'declined' },
          { label: 'Treat the chin only — "we\'ll address the rest separately"', response: 'You participated. You softened the line. She returns in six weeks identifying a new area. The pattern accelerates.', fx: { cash: 1.4, safety: -5, ethics: -8, brand: -5 }, nextId: 'close-participated', moodTo: 'calm' },
          { label: 'Refuse all aesthetic treatment, refer to her GP', response: 'A clean line. She leaves angry. She blocks your number. A year later her sister calls to thank you.', fx: { ethics: 15, safety: 8, brand: 4, cash: -0.4 }, nextId: 'close-protected', moodTo: 'closing' },
          { label: '"Tell me about the panic attack from last week."', response: 'She didn\'t mention one. But your assumption lands — she had one in fact, last month. She tells you everything. The consultation is now therapeutic.', fx: { ethics: 12, brand: 8, nps: 6 }, nextId: 'pattern-clear', moodTo: 'anxious', addsFlag: 'caught-it' },
        ],
      },

      // === You missed the signal ===
      'pattern-late': {
        prompt: 'She steers the conversation back to the chin filler. "So can we book it in for next week?"',
        options: [
          { label: 'Pause now — "Something\'s been bothering me about this. Can we talk?"', response: 'You caught yourself. She resists, then opens up. The conversation shifts. Late, but real.', fx: { ethics: 8, safety: 5, brand: 5 }, nextId: 'pattern', moodTo: 'anxious', addsFlag: 'caught-late' },
          { label: 'Book the chin treatment', response: 'You proceeded. She thanks you. She emails three weeks later identifying her temples again.', fx: { cash: 1.2, safety: -6, ethics: -8, brand: -6 }, nextId: 'close-participated', moodTo: 'calm' },
          { label: 'Defer to next month — "Let\'s take time on this one"', response: 'A soft delay. Not the BDD conversation, but a pause. She might return calmer; she might not.', fx: { safety: 2, brand: 2 }, nextId: 'close-cooled', moodTo: 'calm' },
        ],
      },

      // === You caught it early — the conversation pivots ===
      'pattern-clear': {
        prompt: 'The room is quiet. She is crying, quietly. "I don\'t know how to stop."',
        options: [
          { label: 'Don\'t treat. Walk her through what BDD is and what helps.', response: 'You sit with her for thirty minutes past the booked slot. You don\'t bill for it. She leaves with a leaflet and a referral. She writes you a letter a year later.', fx: { ethics: 18, brand: 12, safety: 10, nps: 8, cash: -1 }, nextId: 'close-protected', moodTo: 'anxious', addsFlag: 'gold-standard' },
          { label: 'Refer to her GP and to a specialist clinical psychologist', response: 'Professional, appropriate. She follows up. She doesn\'t return as a patient. She refers her sister, who becomes loyal.', fx: { ethics: 12, safety: 8, brand: 8 }, nextId: 'close-protected', moodTo: 'calm' },
          { label: 'Treat the chin anyway — "we can address everything in parallel"', response: 'You saw it, and you treated anyway. The GMC would have a view.', fx: { cash: 1, ethics: -18, safety: -10, brand: -10, compliance: -8 }, nextId: 'close-participated', moodTo: 'calm' },
        ],
      },

      // === The follow-up email a week later ===
      'follow-up': {
        prompt: 'A week later she emails: "I\'ve thought about it. Can we just do the chin? Just a small amount. Please."',
        options: [
          { label: 'Hold the line — re-share the BDD resources', response: 'Boundary maintained. She doesn\'t reply for two months, then sends a note: she\'s in therapy.', fx: { ethics: 8, brand: 6, safety: 4 }, nextId: 'close-protected', moodTo: 'calm' },
          { label: 'Soften — offer "just a small refresh"', response: 'Your line just moved. The next email will go further. You know it; she knows it.', fx: { ethics: -8, brand: -4, safety: -3 }, nextId: 'close-participated', moodTo: 'calm' },
          { label: 'Block patient from future bookings — flag in the system', response: 'A hard decision. The right one. Your team is relieved.', fx: { ethics: 10, brand: 5, safety: 5 }, nextId: 'close-blocked', moodTo: 'closing', addsFlag: 'blocked' },
          { label: 'Reply only if she confirms she\'s been seen by her GP', response: 'A conditional door. She replies a month later: she has been seen. She accepts a follow-up consult, not a treatment.', fx: { ethics: 10, brand: 7, safety: 6 }, nextId: 'close-protected', moodTo: 'calm' },
        ],
      },

      // === Closing stages ===
      'close-protected': {
        prompt: 'You held the line. She didn\'t get the treatment she came for. She got the conversation she needed.',
        terminal: true,
        summary: 'Safeguarding close — you protected her, took the financial hit, kept your integrity.',
      },
      'close-participated': {
        prompt: 'You treated her. The treatment was clinically fine. Whether the consultation was, is a different question.',
        terminal: true,
        summary: 'Participation close — revenue today, debt accruing elsewhere.',
      },
      'close-blocked': {
        prompt: 'You blocked her from future bookings. The clinic admin notes it. Your team breathes out.',
        terminal: true,
        summary: 'Hard boundary — the right call for everyone, including her.',
      },
      'close-cooled': {
        prompt: 'You deferred without naming the deeper concern. She left calmer, but the conversation she needed didn\'t happen.',
        terminal: true,
        summary: 'Soft deferral — you bought time but didn\'t use it.',
      },
    },
  },
  {
    id: 'price-shopper', requires: 'any', persona: 'F · 32 · Comparison-shopping',
    background: 'Has been to three other clinics this week. Showing you her quotes on her phone. "Can you match this £180 figure from the salon on the high street?"',
    branching: true, startStage: 'open',
    closingStages: ['close-converted', 'close-price-war', 'close-walked-respect', 'close-walked-irritated'],
    stages: {
      'open': {
        prompt: 'She slides her phone across the desk. "I\'ve had three quotes. The cheapest is £180. Can you match?"',
        moodHint: 'defensive',
        options: [
          { label: 'Walk her through what £180 doesn\'t include', response: 'Indemnity, premium product, follow-up, complications protocol. She listens — she wasn\'t given that context elsewhere.', fx: { brand: 6, ethics: 5, innovation: 3, nps: 3 }, nextId: 'data', moodTo: 'interested', addsFlag: 'educated' },
          { label: 'Match the £180', response: 'You can\'t profitably deliver at that price. She books, but the clinic now competes on price.', fx: { cash: 0.4, brand: -10, ethics: -5 }, nextId: 'close-price-war', moodTo: 'calm' },
          { label: '"I\'m not the right clinic for you"', response: 'Direct. She respects it. She doesn\'t book — but a friend of hers does six weeks later because of how you handled it.', fx: { brand: 8, ethics: 6, nps: 2 }, nextId: 'close-walked-respect', moodTo: 'calm', addsFlag: 'walked' },
          { label: 'Ask what she\'s actually trying to achieve', response: 'She pauses. "Honestly? I just want to feel less invisible." The price was the wrong question.', fx: { ethics: 6, brand: 5, nps: 4 }, nextId: 'depth', moodTo: 'anxious', addsFlag: 'real-question' },
        ],
      },
      'data': {
        prompt: 'She asks about your complications rate.',
        options: [
          { label: 'Share your published audit data openly', response: 'You\'re the first clinic she\'s spoken to that has data. She\'s sold on rigour, not price.', fx: { brand: 10, innovation: 6, safety: 5, nps: 4 }, nextId: 'shortcut', moodTo: 'interested', addsFlag: 'data-sold' },
          { label: 'Reassure her verbally — "very rare in my practice"', response: 'Soft. Not verifiable. She\'s polite but unconvinced.', fx: { brand: -1 }, nextId: 'shortcut', moodTo: 'calm' },
          { label: 'Decline to share — "every patient is different"', response: 'Evasive. She leaves quietly.', fx: { brand: -5, nps: -3 }, nextId: 'close-walked-irritated', moodTo: 'closing' },
        ],
      },
      'depth': {
        prompt: 'You\'ve moved past price. Now what?',
        options: [
          { label: 'Discuss what a good outcome would actually look like for her', response: 'You take 20 minutes mapping it out. She wasn\'t expecting a conversation. She books in full.', fx: { brand: 10, ethics: 8, nps: 7, cash: 1.5 }, nextId: 'close-converted', moodTo: 'interested', addsFlag: 'converted' },
          { label: 'Recommend a small starter treatment', response: 'A gentle entry. She accepts and returns.', fx: { brand: 5, cash: 0.9 }, nextId: 'close-converted', moodTo: 'calm' },
          { label: '"Let\'s not treat today. Come back when you\'re sure."', response: 'You walked her away — for her sake, not yours. She\'ll be back.', fx: { brand: 7, ethics: 7, nps: 5 }, nextId: 'close-walked-respect', moodTo: 'interested' },
        ],
      },
      'shortcut': {
        prompt: 'She asks: "Can we just do the toxin today, skip the long consult?"',
        options: [
          { label: 'Decline — explain the consultation is non-negotiable', response: 'Standards held. She books a proper consultation for next week.', fx: { safety: 8, compliance: 6, ethics: 5, brand: 5 }, nextId: 'close-converted', moodTo: 'calm' },
          { label: 'Agree — shorten to 10 minutes', response: 'You compromised the safety net. The patient is fine. The principle is dented.', fx: { cash: 0.3, safety: -4, brand: -3, ethics: -4 }, nextId: 'close-price-war', moodTo: 'calm' },
          { label: 'Offer a free 30-min consult to demonstrate value', response: 'Investment in her, not the booking. She converts to a paid full consult two weeks later.', fx: { brand: 5, ethics: 4, nps: 3, cash: -0.3 }, nextId: 'close-converted', moodTo: 'interested', addsFlag: 'invested' },
        ],
      },
      'close-converted': { prompt: 'She arrived shopping on price. She left as a patient.', terminal: true, summary: 'Converted — she became a clinic patient, not a price-shopper.' },
      'close-price-war': { prompt: 'You discounted to win her. You will now have to discount to keep her.', terminal: true, summary: 'Price-war close — short-term win, long-term margin erosion.' },
      'close-walked-respect': { prompt: 'She left without booking. She also left telling friends about the clinic that didn\'t chase her.', terminal: true, summary: 'Walked-with-respect — better than a bad booking. Brand wins.' },
      'close-walked-irritated': { prompt: 'She left and won\'t be back. The conversation was a near miss.', terminal: true, summary: 'Lost the conversation. Lost the patient.' },
    },
  },
  {
    id: 'man-first', requires: 'any', persona: 'M · 41 · First-time male consultation',
    background: 'A first-time male patient. Senior corporate executive. Refers to himself as "the test case before my wife considers it." Visibly uncomfortable being in a clinic associated with women.',
    stages: [
      { prompt: 'He\'s nervous and a little defensive. How do you set the tone?', options: [
        { label: 'Acknowledge the gender dynamics directly', response: 'You name it. He laughs, visibly relaxes. The consultation is now a conversation.', fx: { brand: 6, ethics: 4, nps: 6, innovation: 3 } },
        { label: 'Treat him exactly as you would any patient', response: 'Professional. He responds well to the lack of fuss.', fx: { brand: 3, nps: 3 } },
        { label: 'Lean into the "executive" framing', response: 'You positioned him as a client, not a patient. He\'s comfortable. The clinical edge is dulled.', fx: { cash: 0.4, ethics: -2, brand: -1 } },
      ]},
      { prompt: 'He wants "to look less tired" but not "obvious". What\'s the discussion?', options: [
        { label: 'Discuss masseter toxin and subtle temple work', response: 'A male-appropriate treatment plan. He nods slowly — this isn\'t what he expected, but it makes sense.', fx: { innovation: 5, brand: 6, safety: 4, nps: 4 } },
        { label: 'Match what he\'d see in his peer group — jaw, brow, lips', response: 'You handed him a stock approach. He books, but the result is unbecoming.', fx: { cash: 1.5, brand: -3, ethics: -3 } },
        { label: 'Suggest he start with a skin programme, not injectables', response: 'A surprising recommendation. He respects it. He books, then later refers two senior colleagues.', fx: { brand: 8, ethics: 5, innovation: 4, nps: 5 } },
      ]},
      { prompt: 'He asks about discretion — billing, scheduling, photos.', options: [
        { label: 'Walk him through your privacy and discretion protocols', response: 'You have them, you explain them. He\'s reassured. He books a series of treatments and refers his CEO.', fx: { brand: 10, ethics: 5, nps: 6 } },
        { label: '"We don\'t take after-photos unless you consent"', response: 'Honest, narrow. He appreciates it but worries about the others.', fx: { brand: 3, ethics: 3 } },
        { label: 'Offer to invoice via a generic "wellness consultation"', response: 'You crossed an accounting line. Cash up; integrity down. HMRC might be interested.', fx: { cash: 1, compliance: -8, ethics: -6 } },
      ]},
    ],
  },
  {
    id: 'medical-tourism', requires: 'any', persona: 'F · 38 · Post-Turkey rhinoplasty referral',
    background: 'Returned from Istanbul three weeks ago — rhinoplasty plus filler. The filler has migrated. She has tear-trough oedema and visible product in the lateral nasal sidewall. She wants you to "fix it without telling anyone".',
    stages: [
      { prompt: 'She walks in clearly anxious. What\'s your first move?', options: [
        { label: 'Examine clinically, ask for the discharge notes from Istanbul', response: 'She doesn\'t have them. She has a WhatsApp message and an Instagram receipt. You document everything carefully.', fx: { safety: 6, compliance: 5, ethics: 4 } },
        { label: 'Offer reassurance before examination', response: 'You moved to comfort before assessment. She\'s calmer; you\'re less informed.', fx: { nps: 1, safety: -2 } },
        { label: 'Tell her firmly this is a complication and a serious one', response: 'You established gravity early. She\'s frightened. She\'ll do what you say from here.', fx: { safety: 4, brand: 3, ethics: 3 } },
      ]},
      { prompt: 'You suspect non-CE-marked filler. What\'s the management plan?', options: [
        { label: 'Hyaluronidase trial under careful protocol, with consent', response: 'It partially dissolves. The remaining product is non-HA. You explain that surgery is the next option.', fx: { safety: 8, innovation: 5, brand: 6, cash: -1 } },
        { label: 'Treat empirically — dissolve and add new filler', response: 'You masked the problem. Six weeks later the lump returns. You\'re now part of the complication.', fx: { cash: 1.2, safety: -8, brand: -4, ethics: -4 } },
        { label: 'Refer urgently to oculoplastics — this is beyond aesthetics', response: 'The right call clinically. She\'s upset (she came to you to keep it quiet), but you protected her.', fx: { safety: 10, ethics: 8, brand: 5, cash: -0.5 } },
      ]},
      { prompt: 'She asks you to write a statement saying she had the work done at your clinic.', options: [
        { label: 'Refuse — that\'s fraudulent', response: 'Hard line. She is angry; she leaves. Your insurance underwriter sleeps soundly.', fx: { ethics: 12, compliance: 10, safety: 5 } },
        { label: 'Offer to write a clinical statement of management only', response: 'A truthful middle ground. She accepts. The statement is useful to her insurer; not fraudulent.', fx: { ethics: 6, compliance: 6, brand: 4 } },
        { label: 'Agree, in exchange for her signing up to a year of follow-up', response: 'You\'ve crossed a professional line for a business win. The GMC frowns on this.', fx: { cash: 2, ethics: -15, compliance: -15, safety: -5 } },
      ]},
    ],
  },
];

// ---------- LAUNCH PHASE (Month Zero — before Q1) ----------

const LAUNCH_FOUNDING_CHANNEL = [
  { id: 'ig', label: 'Instagram-First', desc: 'Polished grid, Reels, before/afters. Where the demographic lives, with the most ASA exposure.', fx: { brand: 6, nps: 3, compliance: -3 }, costPerQ: 4 },
  { id: 'tiktok', label: 'TikTok-Forward', desc: 'Educational short-form. Lower ad cost. Younger demographic. Watch the trending-sounds trap.', fx: { brand: 4, innovation: 6, compliance: -4 }, costPerQ: 3 },
  { id: 'linkedin', label: 'LinkedIn & Editorial', desc: 'Long-form thought leadership. Slower burn. Pulls professional clientele and B2B referrals.', fx: { brand: 9, innovation: 5, compliance: 3 }, costPerQ: 3 },
  { id: 'wom', label: 'Word-of-Mouth Only', desc: 'No social presence. Referral-only practice. Hardest start. Most defensible if it works.', fx: { brand: 4, nps: 8, compliance: 6, margin: 4 }, costPerQ: 0 },
  { id: 'press', label: 'Local Press & PR', desc: 'Regional paper features, podcast guests, community-magazine columns. Boomer-friendly demographic.', fx: { brand: 7, compliance: 4 }, costPerQ: 2 },
];

const LAUNCH_SEED_ACTIONS = [
  { id: 'free10', label: 'Treat 10 Friends-of-Friends Free', desc: 'Build a portfolio. Each treated patient becomes a referrer.', fx: { brand: 5, nps: 6, safety: -2, cash: -3 } },
  { id: 'opennight', label: 'Open House Launch Night', desc: 'Champagne, demos, press list. Splashy. Sets the brand tone publicly.', fx: { brand: 10, nps: 3, cash: -8 } },
  { id: 'gpoutreach', label: 'GP & Dermatology Outreach', desc: 'Letter to local GPs/derms introducing your service. Slow burn, highest-quality referral pipeline.', fx: { brand: 6, compliance: 5, safety: 4, cash: -1 } },
  { id: 'beforebook', label: 'Pre-Launch Waiting List', desc: 'Build a list before opening. 100 names = full books for Q1.', fx: { nps: 5, brand: 4, margin: 3 } },
  { id: 'micropartner', label: 'Micro-Influencer Partnerships', desc: '5 local micro-influencers (sub-10k). Authentic, regional. Lower ASA risk than mega-influencers.', fx: { brand: 7, compliance: -3, cash: -2 } },
];

// ---------- FACE INJECTION MINI-GAME ----------
// Anatomical zones on a stylised face. Player picks zone, depth, technique.

// First patient consultation — guaranteed, happens immediately after launch
const FIRST_PATIENT = {
  id: 'first-patient',
  persona: 'F · 29 · First-ever cosmetic enquiry',
  brief: "Your first-ever booking. Sarah, 29, marketing manager. She's been thinking about it for two years. She mentions her wedding is in eight months. She's printed photos of three different celebrities — none of whom look like her — and asks 'can you make me look like this?'",
  stages: [
    {
      cue: "She opens by asking what you'd recommend. She has no clear idea what she wants treated; she's relying on you. The wedding-deadline anxiety is sitting under everything she says.",
      choices: [
        { label: "Recommend the full package she's hinting at — every area she pointed to. £1,400 today.", fx: { cash: 12, nps: -8, ethics: -12, safety: -6, brand: -4 }, outcome: "She books everything you suggested. She leaves £1,400 lighter and visibly changed. She isn't sure she likes it. Her sister cries at the wedding for the wrong reason.", upsell: true },
        { label: "Recommend a single subtle treatment — modest lip hydration only. £280.", fx: { cash: 2.8, nps: 8, ethics: 10, brand: 6, safety: 4 }, outcome: "She's surprised you didn't push more. She tells four friends. Two of them book within the month.", upsell: false },
        { label: "Decline to treat today. Suggest she comes back a month before the wedding having thought about it.", fx: { cash: 0, nps: 12, ethics: 15, brand: 10, safety: 8 }, outcome: "She's stunned. Nobody's ever told her not to spend money. She returns in seven months, having decided exactly what she wants. She becomes a lifetime patient.", upsell: false },
      ],
    },
    {
      cue: "Whatever you chose, she now asks: 'Can you do it slightly cheaper if I leave a Google review and tag you on Instagram?'",
      choices: [
        { label: "Agree — 15% off in exchange for the review and tag.", fx: { brand: -8, ethics: -10, compliance: -8, cash: -0.3 }, outcomeFn: (regulator) => `You've now incentivised a review. The ASA is interested. So is ${regulator === 'Local Authority (under emerging licensing)' ? 'your local council under the emerging licensing scheme' : `the ${regulator}`}.` },
        { label: "Decline politely. Explain why incentivising reviews would compromise the integrity of feedback.", fx: { brand: 6, ethics: 8, compliance: 6, nps: 4 }, outcome: "She respects it. She writes the review anyway, unprompted, and it's better than any incentivised one would have been." },
        { label: "Offer her a complimentary follow-up review instead — no posting required.", fx: { brand: 4, ethics: 5, nps: 6 }, outcome: "Middle ground. She appreciates the gesture, posts about you organically." },
      ],
    },
  ],
};

// ---------- CONSULTATION BEATS (reusable consultation craft moments before treatment) ----------
// Each beat is a single decision moment. Face cases reference 2-3 beats by id.
const CONSULT_BEATS = {
  'history-vascular': {
    prompt: 'Before discussing the treatment, you take a history. What\'s your first priority?',
    options: [
      { label: 'Anticoagulants, antiplatelets, supplements (fish oil, vitamin E, ginkgo)', response: 'She mentions daily aspirin for a family history of cardiac disease, and ibuprofen "as needed". You note both. Bruising risk discussed.', fx: { safety: 6, compliance: 4, brand: 3 }, correct: true },
      { label: 'Allergies and prior aesthetic treatments only', response: 'You captured allergies. You missed the bleeding-risk medications she\'s taking.', fx: { safety: 0, compliance: 1 }, correct: false },
      { label: 'General health overview — "do you feel well?"', response: 'Too broad. She nods. The history will not survive a complications review.', fx: { safety: -4, compliance: -3 }, correct: false },
    ],
  },
  'history-autoimmune': {
    prompt: 'Medical history. Autoimmune disease changes risk profile substantially. How do you ask?',
    options: [
      { label: 'Specific screen: lupus, RA, Hashimoto\'s, family autoimmune history', response: 'She has an aunt with lupus. She herself was investigated for fatigue last year. Worth a delay and a letter to her GP.', fx: { safety: 7, ethics: 4, compliance: 5 }, correct: true },
      { label: '"Any chronic conditions I should know about?"', response: 'She says no. The aunt doesn\'t come up. You haven\'t earned a complete answer.', fx: { safety: -1 }, correct: false },
      { label: 'Skip — she looks healthy', response: 'You skipped a foundational screen. The notes will not pass an audit.', fx: { safety: -6, compliance: -6 }, correct: false },
    ],
  },
  'history-dental': {
    prompt: 'Recent dental work matters for lower-face filler — risk of biofilm and delayed nodules.',
    options: [
      { label: 'Ask specifically about dental work in the last 4 weeks and any planned', response: 'Two weeks ago — a root canal. You defer lower-face filler by 4 weeks. She\'s frustrated but trusts the reasoning.', fx: { safety: 6, ethics: 4, brand: 4, cash: -0.5 }, correct: true },
      { label: 'Generic "any other medical things?"', response: 'She doesn\'t volunteer the root canal. You may inject into an inflammatory window.', fx: { safety: -3, compliance: -2 }, correct: false },
      { label: 'Skip — not relevant to her area of concern', response: 'Anatomically wrong assumption. Bloodstream connects facial planes.', fx: { safety: -5 }, correct: false },
    ],
  },
  'expectations-photos': {
    prompt: 'She shows you a photo on her phone. "Can you get me that?"',
    options: [
      { label: 'Show her her own face in the mirror and discuss her actual proportions', response: 'You redirect from the reference to her face. She softens. The conversation gets honest.', fx: { ethics: 6, brand: 5, nps: 4 }, correct: true },
      { label: '"We can get you closer, but not identical"', response: 'A measured answer. She accepts, but the reference image stays in her head.', fx: { brand: 2, ethics: 2 }, correct: false },
      { label: 'Take clinical photos and discuss her face objectively', response: 'Clinical photography in good lighting changes the conversation. She sees her face better.', fx: { ethics: 5, brand: 5, safety: 3, compliance: 3 }, correct: true },
      { label: '"Yes, I can do that"', response: 'You promised what you can\'t deliver. The treatment is fine; she\'s disappointed at week 2.', fx: { cash: 1.4, ethics: -6, brand: -5, nps: -4 }, correct: false },
    ],
  },
  'expectations-timeline': {
    prompt: 'She asks when she\'ll see the final result.',
    options: [
      { label: 'Walk her through: day 1 swelling, week 2 settling, week 4-6 result', response: 'You\'ve calibrated. She knows what week 1 looks like — and won\'t panic.', fx: { nps: 5, brand: 3, safety: 3 }, correct: true },
      { label: '"You\'ll love it straight away"', response: 'She won\'t. You set yourself up for a day-2 complaint call.', fx: { nps: -4, brand: -3 }, correct: false },
      { label: 'Show her a week-by-week recovery calendar', response: 'A small tool, big effect. She returns to it during recovery. Less anxiety, fewer calls.', fx: { nps: 6, brand: 5, innovation: 3 }, correct: true },
    ],
  },
  'expectations-reversibility': {
    prompt: 'She asks: "What if I don\'t like it?"',
    options: [
      { label: 'Explain dissolving with hyaluronidase honestly — works, but not instantly', response: 'Truthful. She appreciates the calibration. Reversal isn\'t free or trivial.', fx: { ethics: 6, safety: 4, brand: 4 }, correct: true },
      { label: '"It just dissolves, no problem"', response: 'Reassuring but misleading. Reversal complications happen.', fx: { ethics: -4, safety: -2 }, correct: false },
      { label: 'Show a video of a previous patient\'s dissolving session', response: 'Concrete and educational. She sees the reality.', fx: { brand: 5, ethics: 5, innovation: 4 }, correct: true },
    ],
  },
  'consent-vascular': {
    prompt: 'Consent. You\'re about to inject in a moderate-to-high vascular-risk area. How do you handle it?',
    options: [
      { label: 'Two-stage consent: discuss at consult, sign on treatment day, named risks', response: 'Thorough. She understands vascular occlusion as a risk. Hyaluronidase is available on site.', fx: { safety: 8, compliance: 7, ethics: 4 }, correct: true },
      { label: 'Single-stage written consent on treatment day', response: 'Procedural minimum met. She didn\'t have time to consider what she was signing.', fx: { compliance: 2, safety: 0 }, correct: false },
      { label: 'Verbal consent only, documented', response: 'Sub-standard. The complaint that won\'t happen — until it does.', fx: { compliance: -5, safety: -4 }, correct: false },
    ],
  },
  'consent-photography': {
    prompt: 'You ask about clinical photography for before/after records.',
    options: [
      { label: 'Standard consent — clinical record only, never for marketing without separate written opt-in', response: 'She agrees readily. The boundary is clear.', fx: { ethics: 5, compliance: 5, brand: 3 }, correct: true },
      { label: '"I\'ll use it for marketing if you don\'t mind"', response: 'Casual. The consent isn\'t valid. ICO issue waiting.', fx: { ethics: -5, compliance: -8 }, correct: false },
      { label: 'No photos taken', response: 'You missed your audit baseline. If anything goes wrong, no clinical record.', fx: { compliance: -4, safety: -3 }, correct: false },
    ],
  },
  'consent-recovery': {
    prompt: 'Aftercare. What do you give her?',
    options: [
      { label: 'Written aftercare with named complications and 24/7 contact route', response: 'Comprehensive. She calls once at 3am about a mild bruise. You\'re glad she had the number.', fx: { safety: 7, nps: 5, brand: 4 }, correct: true },
      { label: 'Verbal aftercare instructions', response: 'She forgets half of them by tomorrow. Complications calls go to reception.', fx: { safety: -2, nps: -2 }, correct: false },
      { label: 'Generic leaflet', response: 'Not tailored. She rings a friend instead of you.', fx: { safety: -1, nps: -1 }, correct: false },
    ],
  },
};

const FACE_CASES = [
  {
    id: 'tear-trough',
    requires: 'filler',
    persona: 'F · 36 · Tired-looking infraorbital hollow',
    brief: 'Pronounced tear trough, mild infraorbital hollow. She has been told elsewhere this is "easy".',
    consultBeats: ['history-vascular', 'expectations-photos', 'consent-vascular'],
    treatmentRequest: 'She points at her under-eyes. "Everyone says I look tired. I want tear-trough filler."',
    treatmentOptions: [
      { label: 'Treat tear-trough directly with HA filler', correct: false, response: 'High-risk choice. Tear trough has the highest VO rate in the face. Decent operators avoid going straight to filler here.', fx: { safety: -3, brand: -2 } },
      { label: 'Treat the underlying midface volume loss first', correct: true, response: 'Excellent. The tear trough often resolves once cheek support is restored. Lower risk, better aesthetic outcome.', fx: { safety: 5, brand: 4, innovation: 3, nps: 3 } },
      { label: 'Recommend polynucleotides — regenerative, not volumising', correct: true, response: 'Sophisticated. The skin quality is part of the problem. Regenerative pathway is genuinely indicated.', fx: { safety: 4, brand: 5, innovation: 6 } },
      { label: 'Decline today — refer to oculoplastics for surgical assessment', correct: true, response: 'Conservative and clinically defensible. She may be a blepharoplasty candidate.', fx: { safety: 6, ethics: 5, brand: 3 } },
    ],
    targetZone: 'tear-trough',
    dangerNearby: ['angular-artery', 'infraorbital-foramen'],
    correctDepth: 'supraperiosteal',
    correctTechnique: 'cannula',
    teachingPoint: 'Tear trough is the highest-VO-risk filler area in the face. Cannula, deep, low-volume, retrograde fanning. Often, treating the midface first removes the need entirely.',
  },
  {
    id: 'lips',
    requires: 'filler',
    persona: 'F · 28 · Subtle lip volume',
    brief: 'Wants subtle, natural lip enhancement. No history of filler. Symmetrical baseline.',
    consultBeats: ['history-dental', 'expectations-photos', 'expectations-reversibility'],
    treatmentRequest: '"I want lip filler but I don\'t want anyone to know I\'ve had it done."',
    treatmentOptions: [
      { label: '0.5ml — subtle hydration only', correct: true, response: 'Right call. First-time filler patients benefit from understatement. She can always add more.', fx: { safety: 4, brand: 4, ethics: 3, nps: 4 } },
      { label: '1ml as standard', correct: false, response: 'You went bigger than she asked. She\'ll be visible, and may not return.', fx: { brand: -3, nps: -3, cash: 0.3 } },
      { label: '2ml — full transformation', correct: false, response: 'She did not consent to this scale. This is participating in body dysmorphia, not addressing it.', fx: { ethics: -8, brand: -5, safety: -2 } },
      { label: 'Decline today, suggest hyaluronic skin booster instead', correct: true, response: 'A lateral, less-is-more option. Some patients accept; some go elsewhere. The ones who accept stay loyal.', fx: { brand: 5, ethics: 4, nps: 3 } },
    ],
    targetZone: 'lips',
    dangerNearby: ['labial-artery'],
    correctDepth: 'submucosal',
    correctTechnique: 'needle',
    teachingPoint: 'Lips: needle, submucosal, small aliquots. Aspirate. The labial artery is variable in position. For first-time patients, less is almost always more.',
  },
  {
    id: 'cheek',
    requires: 'filler',
    persona: 'F · 42 · Midface volume loss',
    brief: 'Post-weight-loss midface deflation. Lateral cheek projection needed.',
    consultBeats: ['history-autoimmune', 'expectations-timeline', 'consent-photography'],
    treatmentRequest: '"I lost 3 stone last year. My face has aged a decade. Everyone says I look gaunt."',
    treatmentOptions: [
      { label: 'Lateral cheek augmentation with high-G\' filler', correct: true, response: 'Anatomically appropriate. Restores the lateral projection that weight loss removed.', fx: { safety: 4, brand: 5, innovation: 4, nps: 4 } },
      { label: 'Filler to the nasolabial folds where she points', correct: false, response: 'You treated the symptom, not the cause. The folds will deepen again within months.', fx: { safety: -2, brand: -3, nps: -2 } },
      { label: 'Bioremodelling course first, then reassess', correct: true, response: 'Sophisticated sequencing. Skin quality contributes. Restore the foundation before volumising.', fx: { brand: 6, innovation: 6, ethics: 3 } },
      { label: 'Full face balancing — cheek, jaw, chin, temple', correct: false, response: 'You upsold a patient who came for one thing. Margin up. Ethics down. She may not return.', fx: { cash: 2, ethics: -5, brand: -2 } },
    ],
    targetZone: 'cheek',
    dangerNearby: ['transverse-facial-artery'],
    correctDepth: 'supraperiosteal',
    correctTechnique: 'needle',
    teachingPoint: 'Cheek: deep bolus on bone. Lateral projection is the structural change weight loss requires; medial volume isn\'t.',
  },
  {
    id: 'glabella',
    requires: 'toxin',
    persona: 'F · 45 · Glabellar lines',
    brief: 'Standard glabellar toxin treatment. Five-point injection.',
    consultBeats: ['history-autoimmune', 'expectations-timeline', 'consent-recovery'],
    treatmentRequest: '"I want my elevens gone. I look angry in every photo."',
    treatmentOptions: [
      { label: 'Standard 5-point glabellar pattern, full dose', correct: true, response: 'Textbook. Predictable, well-tolerated.', fx: { safety: 4, nps: 3 } },
      { label: 'Micro-dose ("baby tox") for a softer result', correct: true, response: 'Modern approach. Preserves expressive movement, suits her demographic.', fx: { brand: 4, innovation: 4, nps: 4 } },
      { label: 'Combine with forehead — sells better as a package', correct: false, response: 'Upsold treatment she didn\'t ask for. She accepts, then her brow drops, and she blames you.', fx: { cash: 0.6, safety: -4, brand: -3, nps: -3 } },
      { label: 'Discuss frontalis recruitment first, then decide', correct: true, response: 'You explained why treating glabella alone can sometimes worsen forehead lines. She trusts the depth of analysis.', fx: { brand: 5, innovation: 5, ethics: 3 } },
    ],
    targetZone: 'glabella',
    dangerNearby: ['supratrochlear-artery'],
    correctDepth: 'intramuscular',
    correctTechnique: 'needle',
    teachingPoint: 'Toxin in glabella: intramuscular, small volumes. Avoid the supratrochlear neurovascular bundle. Combination with frontalis requires careful assessment.',
  },
  {
    id: 'nasolabial',
    requires: 'filler',
    persona: 'F · 50 · Deep nasolabial folds',
    brief: 'Asks for filler directly into the nasolabial folds. Strong opinion on what she wants.',
    consultBeats: ['history-vascular', 'expectations-photos', 'consent-vascular'],
    treatmentRequest: '"Just inject these lines. That\'s all I want."',
    treatmentOptions: [
      { label: 'Treat the folds as she requested', correct: false, response: 'She got what she asked for. The result is short-lived because you treated downstream.', fx: { cash: 1, safety: -2, brand: -2 } },
      { label: 'Explain midface descent and treat the cheek instead', correct: true, response: 'Initial resistance, then she trusts the explanation. Better, longer result.', fx: { brand: 6, innovation: 4, safety: 4, nps: 4 } },
      { label: 'Conservative: small volume cannula, deep plane', correct: true, response: 'Lower-risk than her request, decent compromise. Reasonable middle ground.', fx: { safety: 3, brand: 2 } },
      { label: 'Decline — refer for radiofrequency / energy device first', correct: true, response: 'Surface skin quality is part of the problem. Energy-based devices are genuinely indicated.', fx: { brand: 4, innovation: 5, ethics: 4 } },
    ],
    targetZone: 'nasolabial',
    dangerNearby: ['angular-artery', 'facial-artery'],
    correctDepth: 'subdermal',
    correctTechnique: 'cannula',
    teachingPoint: 'Nasolabial folds: high-risk zone for VO. Cannula preferred. Often, treating the cause (midface) beats treating the fold.',
  },
  {
    id: 'jawline',
    requires: 'filler',
    persona: 'F · 32 · Definition-seeker',
    brief: 'Wants a sharper jawline. Saw a TikTok on jaw filler. Comes with a reference photo.',
    consultBeats: ['history-dental', 'expectations-photos', 'consent-vascular'],
    treatmentRequest: '"I want my jaw to look like this." [shows a heavily filtered photo]',
    treatmentOptions: [
      { label: 'Match the reference — gonial angle and chin filler', correct: false, response: 'You delivered what she asked for. The result is masculinising. She\'ll be back for reversal in 6 months.', fx: { cash: 2, ethics: -6, brand: -3, safety: -2 } },
      { label: 'Show her her own face in good lighting first', correct: true, response: 'She actually likes what she sees. You agree to lateral jaw definition only — 0.5ml each side.', fx: { brand: 6, ethics: 5, innovation: 3, nps: 4 } },
      { label: 'Decline — refer for body dysmorphia screening', correct: true, response: 'Hard conversation. She leaves. Two years later she sends a thank-you message.', fx: { brand: 5, ethics: 8, safety: 4 } },
      { label: 'Recommend masseter toxin if bruxism is contributing', correct: true, response: 'Clinically intelligent. Masseter hypertrophy may be making her jaw appear wider. Toxin solves it.', fx: { brand: 5, innovation: 6, safety: 3 } },
    ],
    targetZone: 'jawline',
    dangerNearby: ['facial-artery', 'marginal-mandibular-nerve'],
    correctDepth: 'supraperiosteal',
    correctTechnique: 'needle',
    teachingPoint: 'Jaw filler: respect the marginal mandibular nerve. Filtered photos are not informed consent. Masseter toxin may be the right answer entirely.',
  },
  {
    id: 'masseter',
    requires: 'toxin',
    persona: 'M · 38 · Bruxism + jaw width concern',
    brief: 'Grinding teeth at night. Wide jaw he\'s self-conscious about. Dentist suggested toxin.',
    consultBeats: ['history-dental', 'expectations-timeline', 'consent-recovery'],
    treatmentRequest: '"My dentist said this might help my grinding and slim my face."',
    treatmentOptions: [
      { label: 'Standard masseter toxin dose, both sides', correct: true, response: 'Textbook indication. Treats the bruxism, slims the lower face over 6-8 weeks.', fx: { safety: 4, innovation: 4, nps: 5 } },
      { label: 'High dose for faster slimming effect', correct: false, response: 'Risk of paradoxical bulging and chewing fatigue. He\'s unhappy at week 2.', fx: { safety: -3, brand: -4, nps: -3 } },
      { label: 'Decline — refer back to dentist for splint first', correct: true, response: 'Cautious sequencing. A custom splint may resolve the grinding without toxin.', fx: { ethics: 4, safety: 3, brand: 3 } },
      { label: 'Combine with chin filler to balance', correct: false, response: 'You added a treatment he didn\'t ask for. Income up. Trust down.', fx: { cash: 1.5, ethics: -3, brand: -2 } },
    ],
    targetZone: 'masseter',
    dangerNearby: ['parotid-gland', 'facial-artery'],
    correctDepth: 'intramuscular',
    correctTechnique: 'needle',
    teachingPoint: 'Masseter toxin: deep IM injection, lateral mandible. Avoid risorius (anterior border) to prevent asymmetric smile. 25-50 units per side typical.',
  },
  {
    id: 'forehead',
    requires: 'toxin',
    persona: 'F · 38 · Frontalis lines',
    brief: 'Horizontal forehead lines at rest. Has tried "baby tox" before with mixed results.',
    consultBeats: ['history-autoimmune', 'expectations-photos', 'consent-recovery'],
    treatmentRequest: '"My forehead lines are visible even when I don\'t move my face. Can we fix it?"',
    treatmentOptions: [
      { label: 'Full-dose frontalis treatment', correct: false, response: 'Risk of brow ptosis. She can\'t raise her brows for 3 months. Major complaint.', fx: { safety: -5, brand: -5, nps: -4 } },
      { label: 'Micro-dose pattern with glabella balancing', correct: true, response: 'Modern technique. Preserves brow function while softening lines.', fx: { safety: 5, brand: 5, innovation: 5, nps: 4 } },
      { label: 'Energy-device first to address static lines', correct: true, response: 'You explain toxin treats movement, not etched lines. RF or laser is the right primary intervention.', fx: { brand: 6, innovation: 6, ethics: 3 } },
      { label: 'Decline — she\'s a poor candidate (low brow position)', correct: true, response: 'Hard but right. Treating her frontalis would drop her brows. She thanks you for the assessment.', fx: { safety: 6, ethics: 5, brand: 4 } },
    ],
    targetZone: 'forehead',
    dangerNearby: ['supraorbital-nerve'],
    correctDepth: 'intramuscular',
    correctTechnique: 'needle',
    teachingPoint: 'Frontalis is the only brow elevator. Treat it carefully or you drop the brow. Static lines need surface treatment, not toxin.',
  },
  {
    id: 'chin',
    requires: 'filler',
    persona: 'F · 29 · Receding chin',
    brief: 'Mild retrogenia. Wants more chin projection. Has consulted with an orthognathic surgeon.',
    consultBeats: ['history-dental', 'expectations-reversibility', 'consent-vascular'],
    treatmentRequest: '"The surgeon quoted £15,000 for jaw surgery. Can filler do the same job?"',
    treatmentOptions: [
      { label: 'Inject chin filler — temporary, ~£800', correct: true, response: 'Honest framing. Filler is temporary but lets her trial the look before committing to surgery.', fx: { ethics: 5, brand: 4, nps: 4, cash: 0.8 } },
      { label: 'Promote filler as a "surgery alternative"', correct: false, response: 'Misleading. Filler can\'t replicate skeletal augmentation. She\'ll be disappointed.', fx: { ethics: -6, brand: -4, safety: -2 } },
      { label: 'Treat with HA + signpost to surgical follow-up', correct: true, response: 'Best of both. She gets the trial; you keep the surgical option open if she wants it.', fx: { ethics: 5, brand: 6, innovation: 4 } },
      { label: 'Decline — orthognathic is the right answer for retrogenia', correct: true, response: 'Conservative. She respects the honesty even though she leaves disappointed.', fx: { ethics: 6, safety: 3, brand: 3 } },
    ],
    targetZone: 'chin',
    dangerNearby: ['mental-foramen'],
    correctDepth: 'supraperiosteal',
    correctTechnique: 'needle',
    teachingPoint: 'Chin filler: deep on bone. Avoid the mental foramen. For true retrogenia, surgical genioplasty gives a permanent result.',
  },
  {
    id: 'temple',
    requires: 'filler',
    persona: 'F · 55 · Temporal hollowing',
    brief: 'Significant temporal hollowing post-menopause. Skeletonised appearance.',
    consultBeats: ['history-vascular', 'history-autoimmune', 'consent-vascular'],
    treatmentRequest: '"My face looks skull-like. I avoid photos. What can you do?"',
    treatmentOptions: [
      { label: 'Deep temple filler, supraperiosteal, both sides', correct: true, response: 'High-risk zone, but anatomically the right treatment. Soft, structural restoration.', fx: { safety: 4, brand: 5, innovation: 5, nps: 6 } },
      { label: 'Superficial temple filler (faster, easier)', correct: false, response: 'You hit the temporal vein. She\'s bruised for three weeks and complains.', fx: { safety: -5, brand: -4, nps: -4 } },
      { label: 'Decline — refer to oculoplastic surgeon for fat transfer', correct: true, response: 'Lipofilling gives longer-lasting results. Some patients prefer the permanence.', fx: { ethics: 4, brand: 3 } },
      { label: 'Bioremodelling + small-volume temple filler', correct: true, response: 'Combination approach. Skin quality plus structural restoration. The most sophisticated answer.', fx: { brand: 6, innovation: 7, nps: 5 } },
    ],
    targetZone: 'temple',
    dangerNearby: ['superficial-temporal-artery', 'temporal-vein'],
    correctDepth: 'supraperiosteal',
    correctTechnique: 'cannula',
    teachingPoint: 'Temple: deep, on bone, between layers. The middle temporal vein is the main hazard. Cannula reduces risk significantly.',
  },
];

const FACE_ZONES = [
  // Treatment zones (clickable)
  { id: 'temple', label: 'Temple', x: 56, y: 60, r: 12, type: 'treatment' },
  { id: 'temple-r', label: 'Temple', x: 144, y: 60, r: 12, type: 'treatment', mirrors: 'temple' },
  { id: 'glabella', label: 'Glabella', x: 100, y: 60, r: 14, type: 'treatment' },
  { id: 'forehead', label: 'Forehead', x: 100, y: 38, r: 18, type: 'treatment' },
  { id: 'tear-trough', label: 'Tear trough', x: 76, y: 92, r: 11, type: 'treatment' },
  { id: 'tear-trough-r', label: 'Tear trough', x: 124, y: 92, r: 11, type: 'treatment', mirrors: 'tear-trough' },
  { id: 'cheek', label: 'Cheek', x: 62, y: 122, r: 14, type: 'treatment' },
  { id: 'cheek-r', label: 'Cheek', x: 138, y: 122, r: 14, type: 'treatment', mirrors: 'cheek' },
  { id: 'masseter', label: 'Masseter', x: 50, y: 158, r: 11, type: 'treatment' },
  { id: 'masseter-r', label: 'Masseter', x: 150, y: 158, r: 11, type: 'treatment', mirrors: 'masseter' },
  { id: 'nasolabial', label: 'Nasolabial', x: 82, y: 152, r: 10, type: 'treatment' },
  { id: 'nasolabial-r', label: 'Nasolabial', x: 118, y: 152, r: 10, type: 'treatment', mirrors: 'nasolabial' },
  { id: 'lips', label: 'Lips', x: 100, y: 172, r: 13, type: 'treatment' },
  { id: 'chin', label: 'Chin', x: 100, y: 200, r: 11, type: 'treatment' },
  { id: 'jawline', label: 'Jawline', x: 64, y: 188, r: 9, type: 'treatment' },
  { id: 'jawline-r', label: 'Jawline', x: 136, y: 188, r: 9, type: 'treatment', mirrors: 'jawline' },
];

const FACE_DANGER_ZONES = [
  { id: 'supratrochlear-artery', label: 'Supratrochlear a.', path: 'M 90 75 Q 88 55 92 35', color: '#8B2C3C' },
  { id: 'supratrochlear-artery-r', label: '', path: 'M 110 75 Q 112 55 108 35', color: '#8B2C3C' },
  { id: 'angular-artery', label: 'Angular a.', path: 'M 88 100 Q 84 115 86 135', color: '#8B2C3C' },
  { id: 'angular-artery-r', label: '', path: 'M 112 100 Q 116 115 114 135', color: '#8B2C3C' },
  { id: 'facial-artery', label: 'Facial a.', path: 'M 78 158 Q 70 175 72 195', color: '#8B2C3C' },
  { id: 'facial-artery-r', label: '', path: 'M 122 158 Q 130 175 128 195', color: '#8B2C3C' },
  { id: 'infraorbital-foramen', label: 'Infraorbital f.', cx: 78, cy: 108, color: '#B8945F', isPoint: true },
  { id: 'infraorbital-foramen-r', label: '', cx: 122, cy: 108, color: '#B8945F', isPoint: true },
  { id: 'labial-artery', label: 'Labial a.', path: 'M 86 170 Q 100 178 114 170', color: '#8B2C3C' },
  { id: 'transverse-facial-artery', label: 'Transverse facial a.', path: 'M 55 130 L 75 132', color: '#8B2C3C' },
  { id: 'transverse-facial-artery-r', label: '', path: 'M 145 130 L 125 132', color: '#8B2C3C' },
];

const DEPTH_OPTIONS = [
  { id: 'subdermal', label: 'Subdermal' },
  { id: 'submucosal', label: 'Submucosal (lip)' },
  { id: 'supraperiosteal', label: 'Supraperiosteal (on bone)' },
  { id: 'intramuscular', label: 'Intramuscular' },
];

const TECHNIQUE_OPTIONS = [
  { id: 'needle', label: 'Needle' },
  { id: 'cannula', label: 'Cannula (25g, blunt)' },
];

// ---------- MARKETING CHANNELS (post-launch) ----------

const LAUNCH_CHANNELS = [
  { id: 'ig', label: 'Instagram', desc: 'Reach is still here. ASA-watched.', boost: { brand: 3, nps: 1 }, cost: 4, risk: 'ASA exposure if you mention POMs.' },
  { id: 'tiktok', label: 'TikTok', desc: 'Younger demographic. Educational angle is the safer route.', boost: { brand: 2, innovation: 4 }, cost: 3, risk: 'Trending-sound traps and ASA flag-bait.' },
  { id: 'press', label: 'Editorial PR', desc: 'Broadsheets, podcasts, magazine columns.', boost: { brand: 5, compliance: 2 }, cost: 5, risk: 'Slow. PR firms cost more than they admit.' },
  { id: 'gp', label: 'Medical Referral Pipeline', desc: 'GPs and dermatologists send you their cosmetic queries.', boost: { brand: 4, safety: 3, nps: 2 }, cost: 2, risk: 'Slow to build, requires medical credentials.' },
  { id: 'community', label: 'Community Word-of-Mouth', desc: 'Patient stories, ambassador programme, local events.', boost: { brand: 4, nps: 5 }, cost: 1, risk: 'Plateaus without a brand catalyst.' },
];

const SUITORS = [
  // Real UK aesthetics M&A: small clinics trade at 3-5x EBITDA, well-run at 5-7x, only true differentiation gets 8-10x+.
  // Pharma acquirers pay premium ONLY for clinical IP, training programmes, or research pipeline.
  { id: 'galde', name: 'Galderma Aesthetics', archetype: 'Clinical Pharma Acquirer',
    blurb: 'Wants clinical credibility, trainable IP, UK education footprint. Pays a premium multiple — but only for practices with a research story and credible scale.',
    multiplierFn: (s) => 6 + (s.innovation > 80 ? 2 : 0) + (s.safety > 80 ? 2 : 0) + (s.compliance > 75 ? 1 : 0), // 6x baseline, up to 11x with excellence
    minBrand: 70, minInnovation: 75, minSafety: 75, minCompliance: 65, minEbitda: 80, // requires £80k+ annualised EBITDA
    ending: 'integrated your protocols into the Galderma Aesthetics Academy. Your fellowship runs at 14 sites across Europe.',
    valued: ['Innovation', 'Brand', 'Safety'] },
  { id: 'allergan', name: 'AbbVie Allergan Aesthetics', archetype: 'Volume Acquirer',
    blurb: 'Wants patient volume, retention, brand they can scale through their UK injector network. Pays for proven unit economics.',
    multiplierFn: (s) => 5 + (s.brand > 75 ? 2 : 0) + (s.nps > 75 ? 1 : 0), // 5x baseline, up to 8x
    minBrand: 65, minNps: 70, minEbitda: 60,
    ending: 'rolled the model to 40 UK sites in 18 months. Volume metrics held. The clinical voice is a different question.',
    valued: ['NPS', 'Brand', 'Margin'] },
  { id: 'merz', name: 'Merz Aesthetics', archetype: 'Research-Led Acquirer',
    blurb: 'Wants the data, research pipeline, UK opinion-leader platform. The most selective bidder — acquires once a decade. Premium multiple, very high bar.',
    multiplierFn: (s) => 7 + (s.innovation > 85 ? 3 : 0) + (s.compliance > 80 ? 2 : 0), // 7x to 12x
    minInnovation: 82, minCompliance: 75, minBrand: 65, minSafety: 70, minEbitda: 100,
    ending: 'absorbed the research arm into global clinical affairs. Your name appears on every major UK safety paper for the next decade.',
    valued: ['Innovation', 'Compliance', 'Safety'] },
  { id: 'cont', name: 'Continental Health Partners', archetype: 'Financial Acquirer (PE Roll-up)',
    blurb: 'PE roll-up. Pure EBITDA multiple. They\'ll buy anything that makes money. Lowball, but they close.',
    multiplierFn: (s) => 3 + (s.brand > 60 ? 1 : 0), // 3-4x — the real PE range for small clinics
    minBrand: 25,
    ending: 'cut overhead 38% in 90 days. The clinical voice on the board became non-binding. Three senior clinicians left by Q2.',
    valued: ['Margin', 'Cash'] },
];

const CAT = { CL: { label: 'Clinical', color: '#1A4D5E' }, BR: { label: 'Brand', color: '#3D2548' }, PT: { label: 'Patients', color: '#8B2C3C' }, GR: { label: 'Growth', color: '#5C7A52' }, OP: { label: 'Operations', color: '#B8945F' } };

const CANVAS_FACTORS = [
  { id: 'volume', label: 'Treatment Volume', industry: 75, fromMoves: m => m.includes('cl8') ? -35 : 0, drivers: ['cl8'], hint: 'Industry norm is high throughput. Reducing volume signals quality positioning.' },
  { id: 'marketing', label: 'Paid Marketing', industry: 80, fromMoves: m => (m.includes('br5') ? -30 : 0) + (m.includes('br6') ? -25 : 0), drivers: ['br5', 'br6'], hint: 'Most clinics live on paid social. Cutting paid spend forces earned media.' },
  { id: 'discount', label: 'Price Discounting', industry: 70, fromMoves: m => (m.includes('br1') ? -45 : 0) + (m.includes('pt3') ? -15 : 0), drivers: ['br1', 'pt3'], hint: 'Discounts train patients to shop on price.' },
  { id: 'menu', label: 'Menu Breadth', industry: 75, fromMoves: m => m.includes('pt8') ? -40 : 0, drivers: ['pt8'], hint: 'Industry tries to be all things. A focused menu is more defensible.' },
  { id: 'sameday', label: 'Same-Day Treatment', industry: 70, fromMoves: m => m.includes('cl6') ? -50 : 0, drivers: ['cl6'], hint: 'A 14-day cooling period is above-standard safety practice.' },
  { id: 'training', label: 'Training Investment', industry: 30, fromMoves: m => (m.includes('cl1') ? 40 : 0) + (m.includes('cl3') ? 20 : 0), drivers: ['cl1', 'cl3'], hint: 'Most injectors trained on a one-day course. Cadaver training is a step-change.' },
  { id: 'consult', label: 'Consultation Depth', industry: 25, fromMoves: m => m.includes('pt1') ? 45 : 0, drivers: ['pt1'], hint: 'Most consults are 15 minutes, sales-led. An hour is a different category.' },
  { id: 'safety', label: 'Safety Protocols', industry: 30, fromMoves: m => (m.includes('cl2') ? 30 : 0) + (m.includes('cl3') ? 30 : 0), drivers: ['cl2', 'cl3'], hint: 'Public, drilled protocols change what patients can verify.' },
  { id: 'discretion', label: 'Brand Discretion', industry: 20, fromMoves: m => (m.includes('br2') ? 25 : 0) + (m.includes('br3') ? 25 : 0) + (m.includes('br4') ? 15 : 0), drivers: ['br2', 'br3', 'br4'], hint: 'Loud marketing dominates. Quiet brands attract different patients.' },
  { id: 'innov', label: 'Clinical Innovation', industry: 25, fromMoves: m => (m.includes('br10') ? 15 : 0) + (m.includes('gr11') ? 20 : 0) + (m.includes('gr4') ? 25 : 0) + (m.includes('gr9') ? 20 : 0), drivers: ['br10', 'gr11', 'gr4', 'gr9'], hint: 'Innovation in protocols, IP, research is rare.' },
  { id: 'aftercare', label: 'Aftercare Depth', industry: 30, fromMoves: m => m.includes('pt2') ? 35 : 0, drivers: ['pt2'], hint: 'Aftercare usually ends at the treatment room door.' },
  { id: 'transparency', label: 'Outcome Transparency', industry: 15, fromMoves: m => (m.includes('cl2') ? 30 : 0) + (m.includes('gr11') ? 40 : 0), drivers: ['cl2', 'gr11'], hint: 'Publishing outcome data is the most defensible moat available.' },
];

// ---------- SVG ICONS ----------

const Icon = ({ kind, id, size = 48, color = '#1A4D5E' }) => {
  const p = { width: size, height: size, viewBox: "0 0 48 48", fill: "none", stroke: color, strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" };
  if (kind === 'premises') {
    if (id === 'home') return <svg {...p}><path d="M7 24 L24 10 L41 24" /><path d="M11 22 V40 H37 V22" /><path d="M19 40 V28 H29 V40" /><line x1="24" y1="32" x2="24" y2="36" /></svg>;
    if (id === 'rented') return <svg {...p}><rect x="8" y="12" width="32" height="28" rx="1" /><line x1="8" y1="19" x2="40" y2="19" /><path d="M14 26 L18 22 L22 26 M14 33 L18 29 L22 33" /><line x1="28" y1="25" x2="36" y2="25" /><line x1="28" y1="29" x2="36" y2="29" /><line x1="28" y1="33" x2="32" y2="33" /></svg>;
    if (id === 'room') return <svg {...p}><rect x="8" y="10" width="32" height="30" /><path d="M24 19 V28 M20 23.5 H28" strokeWidth="1.8" /><line x1="17" y1="40" x2="17" y2="33" /><line x1="31" y1="40" x2="31" y2="33" /></svg>;
    if (id === 'flagship') return <svg {...p}><path d="M5 40 V17 L24 7 L43 17 V40" /><line x1="3" y1="40" x2="45" y2="40" strokeWidth="1.8" /><line x1="12" y1="40" x2="12" y2="20" /><line x1="18" y1="40" x2="18" y2="18" /><line x1="24" y1="40" x2="24" y2="17" /><line x1="30" y1="40" x2="30" y2="18" /><line x1="36" y1="40" x2="36" y2="20" /><path d="M21 40 V31 H27 V40" /></svg>;
  }
  if (kind === 'bg') {
    if (id === 'surgeon') return <svg {...p}><path d="M14 14 Q24 8 34 14" /><path d="M10 17 H38 V30 Q24 38 10 30 Z" /><line x1="16" y1="22" x2="32" y2="22" /><line x1="16" y1="26" x2="32" y2="26" /></svg>;
    if (id === 'doctor') return <svg {...p}><path d="M14 10 V22 Q14 28 20 28 V31" /><path d="M34 10 V22 Q34 28 28 28 V31" /><circle cx="24" cy="36" r="4" /><circle cx="24" cy="36" r="1.6" fill={color} /></svg>;
    if (id === 'nurse-ip') return <svg {...p}><path d="M12 20 L24 10 L36 20 H12 Z" /><line x1="24" y1="14" x2="24" y2="20" strokeWidth="1.8" /><line x1="21" y1="17" x2="27" y2="17" strokeWidth="1.8" /><text x="24" y="34" textAnchor="middle" fontSize="11" fontFamily="Fraunces, serif" fontWeight="600" fill={color} stroke="none">Rx</text></svg>;
    if (id === 'nurse') return <svg {...p}><path d="M12 20 L24 10 L36 20 H12 Z" /><line x1="24" y1="14" x2="24" y2="20" strokeWidth="1.8" /><line x1="21" y1="17" x2="27" y2="17" strokeWidth="1.8" /><path d="M14 24 H34 V38 H14 Z" /></svg>;
    if (id === 'dentist') return <svg {...p}><path d="M16 12 Q16 9 19 9 Q22 9 24 12 Q26 9 29 9 Q32 9 32 12 V26 Q32 38 28 38 Q26 38 25 32 Q24 28 23 32 Q22 38 20 38 Q16 38 16 26 Z" /></svg>;
    if (id === 'nm') return <svg {...p}><circle cx="24" cy="17" r="6" /><path d="M12 38 Q12 27 24 27 Q36 27 36 38" /></svg>;
  }
  if (kind === 'bio') {
    if (id === 'none') return <svg {...p}><circle cx="24" cy="24" r="14" /><line x1="14" y1="14" x2="34" y2="34" /></svg>;
    if (id === 'plla') return <svg {...p}><rect x="18" y="8" width="12" height="32" rx="1" /><line x1="20" y1="14" x2="28" y2="14" /><circle cx="22" cy="24" r="1" fill={color} /><circle cx="26" cy="28" r="1" fill={color} /><circle cx="24" cy="32" r="1" fill={color} /><circle cx="22" cy="36" r="1" fill={color} /></svg>;
    if (id === 'caha') return <svg {...p}><path d="M24 6 L36 18 L24 42 L12 18 Z" /><circle cx="24" cy="22" r="3" fill={color} opacity="0.4" /></svg>;
    if (id === 'biorem') return <svg {...p}><circle cx="24" cy="24" r="16" /><path d="M14 20 Q24 30 34 20 M14 28 Q24 18 34 28" /></svg>;
    if (id === 'poly') return <svg {...p}><circle cx="24" cy="24" r="5" /><circle cx="14" cy="14" r="3" /><circle cx="34" cy="14" r="3" /><circle cx="14" cy="34" r="3" /><circle cx="34" cy="34" r="3" /><line x1="19" y1="22" x2="16" y2="16" /><line x1="29" y1="22" x2="32" y2="16" /><line x1="19" y1="26" x2="16" y2="32" /><line x1="29" y1="26" x2="32" y2="32" /></svg>;
    if (id === 'full') return <svg {...p}><circle cx="16" cy="16" r="5" /><circle cx="32" cy="16" r="5" /><circle cx="16" cy="32" r="5" /><circle cx="32" cy="32" r="5" /><line x1="20" y1="16" x2="28" y2="16" /><line x1="20" y1="32" x2="28" y2="32" /><line x1="16" y1="20" x2="16" y2="28" /><line x1="32" y1="20" x2="32" y2="28" /></svg>;
  }
  if (kind === 'cat') {
    const ep = { ...p, viewBox: "0 0 16 16", strokeWidth: 1.5 };
    if (id === 'CL') return <svg {...ep}><circle cx="8" cy="8" r="6.5" /><line x1="8" y1="4.5" x2="8" y2="11.5" /><line x1="4.5" y1="8" x2="11.5" y2="8" /></svg>;
    if (id === 'BR') return <svg {...ep}><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5 L9 7 L11.5 7.3 L9.6 9 L10.1 11.5 L8 10.2 L5.9 11.5 L6.4 9 L4.5 7.3 L7 7 Z" strokeWidth="1" /></svg>;
    if (id === 'PT') return <svg {...ep}><circle cx="8" cy="8" r="6.5" /><circle cx="8" cy="6.5" r="1.8" /><path d="M5 11.5 Q5 9 8 9 Q11 9 11 11.5" /></svg>;
    if (id === 'GR') return <svg {...ep}><circle cx="8" cy="8" r="6.5" /><path d="M5 11 L8 5 L11 11" /><path d="M8 5 L8 9" /></svg>;
  }
  if (kind === 'suitor') {
    const sp = { width: size, height: size, viewBox: "0 0 56 56" };
    if (id === 'galde') return <svg {...sp}><path d="M28 4 L48 16 V40 L28 52 L8 40 V16 Z" fill="rgba(26,77,94,0.06)" stroke="#1A4D5E" strokeWidth="1.4" /><text x="28" y="36" textAnchor="middle" fontSize="22" fontFamily="Fraunces, serif" fontWeight="500" fill="#1A4D5E">G</text></svg>;
    if (id === 'allergan') return <svg {...sp}><ellipse cx="28" cy="28" rx="22" ry="20" fill="rgba(139,44,60,0.06)" stroke="#8B2C3C" strokeWidth="1.4" /><text x="28" y="36" textAnchor="middle" fontSize="22" fontFamily="Fraunces, serif" fontWeight="500" fill="#8B2C3C">A</text></svg>;
    if (id === 'merz') return <svg {...sp}><path d="M28 4 Q50 6 52 28 Q50 50 28 52 Q6 50 4 28 Q6 6 28 4" fill="rgba(61,37,72,0.06)" stroke="#3D2548" strokeWidth="1.4" /><text x="28" y="36" textAnchor="middle" fontSize="22" fontFamily="Fraunces, serif" fontWeight="500" fill="#3D2548">M</text></svg>;
    if (id === 'cont') return <svg {...sp}><rect x="6" y="6" width="44" height="44" fill="rgba(90,85,96,0.06)" stroke="#5A5560" strokeWidth="1.4" /><text x="28" y="36" textAnchor="middle" fontSize="22" fontFamily="Fraunces, serif" fontWeight="500" fill="#5A5560">C</text></svg>;
  }
  return null;
};

const PersonaAvatar = ({ persona, size = 56 }) => {
  const isB2B = persona && persona.toLowerCase().includes('b2b');
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(26,77,94,0.08)', border: '1px solid rgba(26,77,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32" fill="none" stroke="#1A4D5E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {isB2B ? <><rect x="4" y="10" width="24" height="18" /><path d="M12 10 V6 H20 V10" /><line x1="4" y1="18" x2="28" y2="18" /></> : <><circle cx="16" cy="12" r="5" /><path d="M6 26 Q6 18 16 18 Q26 18 26 26" /></>}
      </svg>
    </div>
  );
};

// ---------- HELPERS ----------

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// ---------- AUDIO ----------
// Lightweight Web Audio API click sounds. Soft, brief, non-intrusive.
// Stores a singleton AudioContext lazily so we don't request audio rights until first use.
let audioCtxSingleton = null;
const getAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtxSingleton) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxSingleton = new AC();
    } catch (e) { return null; }
  }
  return audioCtxSingleton;
};
const playTone = (freq, duration = 0.06, type = 'sine', vol = 0.06) => {
  if (typeof window === 'undefined') return;
  // Respect user's sound-off preference if stored
  try { if (localStorage.getItem('ai_sound_off') === '1') return; } catch (e) {}
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};
const sfx = {
  tap: () => playTone(880, 0.04, 'sine', 0.04),
  select: () => playTone(1100, 0.06, 'sine', 0.05),
  confirm: () => { playTone(660, 0.08, 'sine', 0.06); setTimeout(() => playTone(880, 0.08, 'sine', 0.06), 60); },
  milestone: () => { playTone(523, 0.12, 'sine', 0.07); setTimeout(() => playTone(659, 0.12, 'sine', 0.07), 90); setTimeout(() => playTone(784, 0.16, 'sine', 0.07), 180); },
  warn: () => playTone(220, 0.18, 'sawtooth', 0.05),
};

const applyFx = (state, fx) => {
  const next = { ...state };
  for (const k in fx) {
    if (k === 'cash') next.cash += fx[k];
    else if (k === 'locked' || k === 'retention' || k === 'streak' || k === 'debt' || k === 'equity') continue;
    else {
      const current = next[k] || 0;
      const delta = fx[k];
      // Diminishing returns on positive stat gains — higher stats gain less from new moves.
      // This forces strategic identity rather than stat-maxing across the board.
      // At 0-40: full gain. At 50: 80%. At 65: 55%. At 75: 35%. At 85: 20%. At 90+: 10%.
      // Penalties (negative deltas) always apply at full magnitude.
      let effective = delta;
      if (delta > 0) {
        const dampener = current < 40 ? 1.0
                       : current < 50 ? 0.92
                       : current < 60 ? 0.78
                       : current < 70 ? 0.58
                       : current < 80 ? 0.38
                       : current < 90 ? 0.22
                       : 0.10;
        effective = delta * dampener;
      }
      next[k] = clamp(current + effective);
    }
  }
  return next;
};
const drawHand = (used, locked) => {
  const pool = MOVES.filter(m => !used.includes(m.id) && !locked.includes(m.id));
  if (pool.length <= 6) return pool;
  // Try to get representation across categories where possible
  const byCategory = { CL: [], BR: [], PT: [], GR: [], OP: [] };
  pool.forEach(m => { if (byCategory[m.cat]) byCategory[m.cat].push(m); });
  const hand = [];
  // Take one from each category that has any
  ['CL', 'BR', 'PT', 'GR', 'OP'].forEach(c => {
    if (byCategory[c].length > 0) {
      const pick = byCategory[c][Math.floor(Math.random() * byCategory[c].length)];
      hand.push(pick);
    }
  });
  // Top up to 6 with random remainder
  const remaining = pool.filter(m => !hand.includes(m));
  while (hand.length < 6 && remaining.length > 0) {
    const i = Math.floor(Math.random() * remaining.length);
    hand.push(remaining.splice(i, 1)[0]);
  }
  return hand;
};

const calcEV = (s) => {
  // Enterprise Value composite — MBA-grade
  // Brand equity 30%, Clinical foundation 30%, Ethics moat 20%, Compliance hygiene 20%
  const brandC = s.brand * 0.3;
  const clinical = (s.safety + s.innovation) / 2;
  const clinicalC = clinical * 0.3;
  const ethicsC = s.ethics * 0.2;
  const complianceC = s.compliance * 0.2;
  // Stat coherence penalty (Porter would call this "fit")
  const stats = [s.safety, s.nps, s.innovation, s.compliance, s.brand, s.ethics];
  const coherence = 1 - ((Math.max(...stats) - Math.min(...stats)) / 100);
  const coherenceMult = 0.7 + coherence * 0.3;
  const total = Math.round((brandC + clinicalC + ethicsC + complianceC) * coherenceMult);
  return { brand: Math.round(brandC), clinical: Math.round(clinicalC), ethics: Math.round(ethicsC), compliance: Math.round(complianceC), clinicalAvg: Math.round(clinical), coherence, coherenceMult, total };
};

const calcQuarterly = (state, setup, hiredStaff = [], opts = {}) => {
  const { marketingPolicy = 'standard', supplierStrategy = 'standard', workingCapitalPolicy = 'standard', activeCapex = [], treatmentMix = null, ebdUnlocked = false, sites = [], channelMix = null } = opts;
  const prem = PREMISES.find(p => p.id === setup.premises);
  const loc = LOCATIONS.find(l => l.id === setup.location);
  const rentMult = loc ? loc.rentMult : 1;
  const capMult = loc ? loc.capacityMult : 1;
  const baseCeiling = prem ? prem.capacity : 100;
  // Add ceiling from each healthy additional site
  const healthySites = sites.filter(s => s.health !== 'failed');
  const sitesCeilingBoost = healthySites.reduce((sum, s) => sum + (s.capacity * (s.health === 'struggling' ? 0.65 : 1.0)), 0);
  const ceiling = Math.round(baseCeiling * capMult + sitesCeilingBoost);

  // Throughput model
  // Solo: you deliver ~25% of premises capacity sustainably (you also run the business, do consults, handle admin)
  // Clinical hires are required to scale; non-clinical hires unlock a smaller bonus.
  let clinicalCapacity = 0.25; // you, solo — slightly tighter than before to reflect admin burden
  let nonClinicalBonus = 0;
  hiredStaff.forEach(s => {
    if (s.roleId === 'senior-injector') clinicalCapacity += 0.45;
    if (s.roleId === 'junior-nurse') clinicalCapacity += 0.28;
    if (s.roleId === 'reception') nonClinicalBonus += 0.08;
    if (s.roleId === 'patient-coord') nonClinicalBonus += 0.06;
    if (s.roleId === 'marketing') nonClinicalBonus += 0.03;
  });
  // Each additional healthy site adds its throughputBoost (each site is independently staffed, baked in)
  const sitesThroughputBoost = healthySites.reduce((sum, s) => sum + (s.throughputBoost * (s.health === 'struggling' ? 0.5 : 1.0)), 0);
  // Coordination tax: managing multiple sites distracts from each. 5% per site beyond the first.
  const coordinationTax = healthySites.length * 0.05;
  const throughputMult = Math.max(0.15, Math.min(clinicalCapacity + nonClinicalBonus + sitesThroughputBoost - coordinationTax, 1.5));

  // Demand model — what patients want to book
  // Demand needs sufficient brand AND nps before it materialises. New clinics struggle.
  // demandStrength caps at ~0.85 even with maxed stats — there's always slack.
  const rawDemand = (state.brand * 0.35 + state.nps * 0.25 + state.innovation * 0.2 + state.ethics * 0.2) / 100;
  // Cold-start penalty: demand ramps in early quarters, even with high stats
  const coldStart = state.streak < 1 ? 0.65 : (state.streak < 3 ? 0.85 : 1.0);
  // Marketing policy affects how much of latent demand actually materialises into bookings
  const marketingDemandMult = marketingPolicy === 'conservative' ? 0.78 : marketingPolicy === 'aggressive' ? 1.18 : 1.0;
  const demandStrength = Math.min(0.92, rawDemand * marketingDemandMult) * coldStart;
  const desiredBookings = demandStrength * ceiling;
  const actualBookings = Math.min(desiredBookings, ceiling * throughputMult);
  const turnedAway = Math.max(0, desiredBookings - actualBookings);
  const capacityStrain = turnedAway / Math.max(1, desiredBookings);

  // Average ticket value and COGS rate now driven by the treatment mix
  // Each category has its own ticket and COGS profile. The weighted average forms the operational economics.
  let baseAvgTicket;
  let baseCogsRate;
  let mixUsed = treatmentMix;
  if (mixUsed && Object.values(mixUsed).reduce((a, b) => a + b, 0) > 0) {
    // Use the player's chosen mix
    let totalPct = 0;
    let weightedTicket = 0;
    let weightedCogs = 0;
    TREATMENT_CATEGORIES.forEach(cat => {
      const pct = mixUsed[cat.id] || 0;
      if (pct > 0) {
        totalPct += pct;
        weightedTicket += pct * cat.avgTicket;
        weightedCogs += pct * cat.cogsRate;
      }
    });
    baseAvgTicket = totalPct > 0 ? weightedTicket / totalPct : 0.32;
    baseCogsRate = totalPct > 0 ? weightedCogs / totalPct : 0.22;
  } else {
    // Fallback — legacy single-product approximation
    baseAvgTicket = 0.32;
    if (prem?.id === 'flagship') baseAvgTicket = 0.55;
    else if (prem?.id === 'room') baseAvgTicket = 0.40;
    else if (prem?.id === 'rented') baseAvgTicket = 0.28;
    else if (prem?.id === 'home') baseAvgTicket = 0.24;
    baseCogsRate = (prem?.id === 'flagship') ? 0.22 : 0.20;
  }
  // Premises uplift on ticket (still real — flagship suites command more even for same product)
  const premisesTicketMult = (prem?.id === 'flagship') ? 1.18 : (prem?.id === 'room') ? 1.08 : (prem?.id === 'rented') ? 0.92 : (prem?.id === 'home') ? 0.85 : 1.0;
  // Brand uplift on ticket — modest, not multiplicative
  let avgTicket = baseAvgTicket * premisesTicketMult * (1 + Math.max(0, (state.brand - 50)) * 0.006);
  avgTicket = Math.round(avgTicket * 100) / 100;

  // Revenue = bookings × ticket value
  const revenue = Math.round(actualBookings * avgTicket * 10) / 10;

  // COGS — supplier strategy adjusts the rate; mix already encodes per-product COGS
  const supplierCogsMult = supplierStrategy === 'premium' ? 1.20 : supplierStrategy === 'generic' ? 0.78 : 1.0;
  const cogsRate = baseCogsRate * supplierCogsMult;
  const cogs = Math.round(revenue * cogsRate * 10) / 10;
  const grossProfit = Math.round((revenue - cogs) * 10) / 10;
  const grossMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;

  // Operating expenses
  const effRentMult = (prem && prem.id === 'home') ? 1 : rentMult;
  const baseRent = Math.round((prem ? prem.rentPerQ : 20) * effRentMult * 10) / 10;
  // Each additional site adds its own monthly running cost (rent + utilities + insurance + staff overhead)
  // Failed sites cost nothing (closed); struggling sites still cost full
  const sitesRunningCost = sites.filter(s => s.health !== 'failed').reduce((sum, s) => sum + (s.monthlyCost || 0), 0);
  const rent = Math.round((baseRent + sitesRunningCost) * 10) / 10;

  // Real staff wages from hired roster
  const staffWages = hiredStaff.reduce((sum, s) => {
    const role = STAFF_ROLES.find(r => r.id === s.roleId);
    return sum + (role?.wagePerQ || 0);
  }, 0);
  const staff = Math.round(staffWages * 10) / 10;

  // Marketing — player-controllable: conservative cuts spend (and demand), aggressive raises both
  const marketingMult = marketingPolicy === 'conservative' ? 0.55 : marketingPolicy === 'aggressive' ? 1.7 : 1.0;
  const marketing = Math.round(Math.max(3, revenue * 0.12 * marketingMult) * 10) / 10;
  // Overheads: utilities, professional fees, insurance, software, CQC fees — scales with size
  const overheads = Math.round((5 + rent * 0.18 + hiredStaff.length * 0.8) * 10) / 10;

  // Depreciation from capex — non-cash but reduces taxable profit
  const depreciation = Math.round(activeCapex.reduce((sum, c) => sum + (c.quarterlyDepreciation || 0), 0) * 10) / 10;

  // Compliance investment reduces friction-cost; ethics reduces churn — smaller bonuses
  const complianceEfficiency = Math.round(Math.max(0, (state.compliance - 60) * 0.08) * 10) / 10;
  const ethicsRetention = Math.round(Math.max(0, (state.ethics - 60) * 0.06) * 10) / 10;

  const opex = Math.round((rent + staff + marketing + overheads - complianceEfficiency - ethicsRetention) * 10) / 10;
  const ebitda = Math.round((grossProfit - opex) * 10) / 10;

  // Debt service (5% APR / 4 = 1.25% per quarter)
  const interest = Math.round((state.debt || 0) * 0.0125 * 10) / 10;
  // EBIT = EBITDA − Depreciation. EBIT is the taxable base.
  const ebit = Math.round((ebitda - depreciation - interest) * 10) / 10;
  const tax = ebit > 0 ? Math.round(ebit * 0.25 * 10) / 10 : 0;
  const netIncome = Math.round((ebit - tax) * 10) / 10;

  // CASH FLOW (≠ Net Income because of non-cash items + working capital)
  // Start with net income, add back non-cash depreciation, adjust for working capital
  // Working capital policy: pay-early increases cash drain (suppliers happy, you cash-tight)
  // Stretch terms gives short-term cash boost but supplier relationships/brand erode
  const wcSwing = workingCapitalPolicy === 'pay-early' ? -Math.round(revenue * 0.08 * 10) / 10
                : workingCapitalPolicy === 'stretch' ? Math.round(revenue * 0.06 * 10) / 10
                : 0;
  // Cash from operations = Net Income + Depreciation + WC change
  const cashFromOps = Math.round((netIncome + depreciation + wcSwing) * 10) / 10;
  // CapEx outflow this quarter (full cash hit; depreciation amortises over time)
  const capexCashOut = opts.capexThisQ || 0;
  // Net cash change
  const net = Math.round((cashFromOps - capexCashOut) * 10) / 10;

  // CAC and CLV — channel-weighted from the marketing channel mix
  let weightedCAC = 165; // default Instagram-led
  let brandFxFromChannels = 0;
  let asaRiskFromChannels = 0;
  let ethicsFxFromChannels = 0;
  if (channelMix) {
    const totalChanPct = Object.values(channelMix).reduce((a, b) => a + b, 0);
    if (totalChanPct > 0) {
      weightedCAC = 0;
      MARKETING_CHANNELS.forEach(ch => {
        const pct = (channelMix[ch.id] || 0) / totalChanPct;
        weightedCAC += pct * ch.cac;
        brandFxFromChannels += pct * ch.brandFx;
        asaRiskFromChannels += pct * ch.asaRisk;
        ethicsFxFromChannels += pct * ch.ethicsFx;
      });
    }
  }
  // newPatients responds to spend AND effective CAC. Lower CAC = more patients for same spend.
  const cacInflationFromBrand = Math.max(0.8, 1 - (state.brand - 50) * 0.004); // strong brand reduces effective CAC
  const effectiveCAC = Math.round(weightedCAC * cacInflationFromBrand);
  const newPatients = Math.max(1, Math.round((marketing * 1000) / Math.max(effectiveCAC, 1)));
  const cac = effectiveCAC;
  const retention = 0.50 + (state.nps + state.ethics) / 500;
  const clv = Math.round((avgTicket * 3.5 * retention / (1 - retention)) * 10) / 10;

  // Runway in quarters
  const runwayQ = net < 0 && state.cash > 0 ? Math.floor(state.cash / Math.abs(net)) : null;

  return {
    revenue, cogs, grossProfit, grossMarginPct, rent, staff, marketing, overheads,
    complianceEfficiency, ethicsRetention, opex, ebitda, depreciation, interest, tax, ebit, netIncome,
    cashFromOps, wcSwing, capexCashOut, net,
    newPatients, cac, clv, retention, runwayQ, ceiling, throughputMult, avgTicket,
    desiredBookings: Math.round(desiredBookings), actualBookings: Math.round(actualBookings),
    turnedAway: Math.round(turnedAway), capacityStrain,
    // Echo the policies for the dashboard
    marketingPolicy, supplierStrategy, workingCapitalPolicy,
    // Multi-site exposure
    chainSize: 1 + healthySites.length,
    sitesRunningCost,
    coordinationTax: Math.round(coordinationTax * 100),
    // Marketing channel exposure
    weightedCAC, effectiveCAC, brandFxFromChannels, asaRiskFromChannels, ethicsFxFromChannels,
  };
};

// Calculate exit offers based on trailing-twelve-months EBITDA × multiple of clinical quality
// Real UK aesthetics M&A: 3-5x EBITDA for small clinics, up to 8x with genuine differentiation.
// EBITDA gates the conversation — sub-£60k annual EBITDA means a "lifestyle business", not an acquisition target.
const calculateOffers = (s, financialHistory, bustCount, treatmentMix = null, sites = []) => {
  // Trailing-4-quarter EBITDA (or all quarters if <4 played)
  const recentQs = financialHistory.slice(-4);
  const annualEbitda = recentQs.reduce((sum, h) => sum + (h.ebitda || 0), 0); // in £k

  // EBITDA quality penalty: volatile or loss-making quarters discount the multiple
  const negativeQuarters = recentQs.filter(h => (h.ebitda || 0) < 0).length;
  const volatilityPenalty = negativeQuarters === 0 ? 1 : negativeQuarters === 1 ? 0.8 : negativeQuarters === 2 ? 0.55 : 0.3;
  const ebitdaPenalty = annualEbitda <= 0 ? 0.2 : volatilityPenalty;

  // Bust history is brutal in diligence
  const bustPenalty = bustCount === 0 ? 1 : bustCount === 1 ? 0.5 : 0.2;

  // === ROLL-UP BONUS ===
  // Healthy chain count drives multiple expansion. Pharma pays a premium for chains because
  // integration is easier (existing operating model) and brand has been proven replicable.
  const chainSize = 1 + sites.filter(site => site.health !== 'failed').length;
  let chainMultiplierBonus = 1.0;
  if (chainSize >= 6) chainMultiplierBonus = 2.5;
  else if (chainSize >= 4) chainMultiplierBonus = 2.0;
  else if (chainSize >= 3) chainMultiplierBonus = 1.5;
  else if (chainSize === 2) chainMultiplierBonus = 1.2;

  // === MIX-ALIGNED ACQUIRER SIGNAL ===
  // Each suitor has a preferred mix; clinics whose mix aligns earn a multiple uplift.
  const computeMixSignal = (suitorId) => {
    if (!treatmentMix) return 1.0;
    const totalPct = Object.values(treatmentMix).reduce((a, b) => a + b, 0);
    if (totalPct === 0) return 1.0;
    let signalScore = 0;
    TREATMENT_CATEGORIES.forEach(cat => {
      const pct = (treatmentMix[cat.id] || 0) / totalPct;
      const sig = cat.acquirerSignal?.[suitorId] || 0.5;
      signalScore += pct * sig;
    });
    // signalScore range ~0.3 - 1.0 → multiplier modifier 0.85x - 1.25x
    return 0.85 + (signalScore - 0.3) * (0.40 / 0.7);
  };

  return SUITORS.map(suitor => {
    // EBITDA gate — most acquirers won't even engage below threshold
    if (suitor.minEbitda && annualEbitda < suitor.minEbitda) {
      return { suitor, offer: 0, passed: false, reason: `Trailing EBITDA at ${formatGBPInline(annualEbitda)} — below their ${formatGBPInline(suitor.minEbitda)} minimum.` };
    }
    // Stat thresholds
    if (suitor.minBrand && s.brand < suitor.minBrand) return { suitor, offer: 0, passed: false, reason: `Brand at ${s.brand}/100 — below their ${suitor.minBrand} threshold.` };
    if (suitor.minInnovation && s.innovation < suitor.minInnovation) return { suitor, offer: 0, passed: false, reason: `Innovation at ${s.innovation}/100 — below their ${suitor.minInnovation} threshold.` };
    if (suitor.minSafety && s.safety < suitor.minSafety) return { suitor, offer: 0, passed: false, reason: `Safety at ${s.safety}/100 — below their ${suitor.minSafety} threshold.` };
    if (suitor.minCompliance && s.compliance < suitor.minCompliance) return { suitor, offer: 0, passed: false, reason: `Compliance at ${s.compliance}/100 — below their ${suitor.minCompliance} threshold.` };
    if (suitor.minNps && s.nps < suitor.minNps) return { suitor, offer: 0, passed: false, reason: `NPS at ${s.nps}/100 — below their ${suitor.minNps} threshold.` };

    // EBITDA multiple — now boosted by mix alignment
    const baseMultiplier = suitor.multiplierFn(s);
    const mixSignal = computeMixSignal(suitor.id);
    const multiplier = baseMultiplier * mixSignal;
    let offer = annualEbitda * multiplier * ebitdaPenalty * bustPenalty * chainMultiplierBonus;

    // PE will buy almost anything — but for loss-makers, asset value only
    if (suitor.id === 'cont' && annualEbitda <= 0) {
      offer = Math.max(20, (s.cash > 0 ? s.cash * 0.3 : 0) + 25); // £25-50k asset offer
    }

    // Failed to make a sensible offer
    if (offer < 30) return { suitor, offer: 0, passed: false, reason: bustCount > 0 ? `Your bust history disqualifies you from a meaningful offer.` : `Trailing EBITDA is too weak for a credible bid.` };

    return { suitor, offer: Math.round(offer), passed: true, multiplier, annualEbitda: Math.round(annualEbitda) };
  });
};

// Small inline helper for the offer-rejection text
const formatGBPInline = (n) => {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(2)}M`;
  if (Math.abs(n) >= 10) return `£${Math.round(n)}k`;
  if (Math.abs(n) >= 1) return `£${n.toFixed(1)}k`;
  return `£${Math.round(n * 1000)}`;
};

const buildCanvasData = (moves) => CANVAS_FACTORS.map(f => ({ ...f, yours: clamp(f.industry + f.fromMoves(moves)) }));

const formatGBP = (n) => {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(2)}M`;
  if (Math.abs(n) >= 10) return `£${Math.round(n)}k`;
  if (Math.abs(n) >= 1) return `£${n.toFixed(1)}k`;
  if (n === 0) return '£0';
  return `£${(n * 1000).toFixed(0)}`;
};

// ---------- UI ----------

function StatRow({ label, value, color }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3D2548', fontWeight: 600 }}>{label}</div>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#0E1726', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ height: 2, background: 'rgba(14,23,38,0.07)' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, transition: 'width 0.7s' }} />
      </div>
    </div>
  );
}

function FxChip({ stat, val }) {
  const isCash = stat === 'cash';
  const color = val > 0 ? '#5C7A52' : '#8B2C3C';
  const label = isCash ? '£' : (STAT_LABELS[stat] ? STAT_LABELS[stat].split(' ').slice(-1)[0] : stat);
  const display = isCash ? `${val > 0 ? '+' : ''}${formatGBP(val)}` : `${val > 0 ? '+' : ''}${val}`;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fontWeight: 600, color, border: `1px solid ${color}40`, padding: '3px 7px', borderRadius: 2, marginRight: 5, marginBottom: 5, letterSpacing: '0.03em' }}>{display} {label}</span>;
}

function MoveCard({ move, selected, onClick, disabled }) {
  const c = CAT[move.cat];
  return (
    <button onClick={onClick} disabled={disabled && !selected} style={{
      width: '100%', textAlign: 'left',
      background: selected ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
      border: `1px solid ${selected ? c.color : 'rgba(14,23,38,0.1)'}`,
      borderLeft: `3px solid ${c.color}`,
      padding: '14px 16px', marginBottom: 10,
      cursor: disabled && !selected ? 'not-allowed' : 'pointer',
      opacity: disabled && !selected ? 0.42 : 1,
      transition: 'all 0.2s', fontFamily: 'inherit', color: 'inherit',
      boxShadow: selected ? `0 6px 24px ${c.color}30` : 'none', borderRadius: 2,
      transform: selected ? 'translateY(-1px)' : 'none',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
        {Array.from({ length: move.ap }).map((_, i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: selected ? c.color : `${c.color}50`, transition: 'background 0.2s' }} />
        ))}
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: c.color, fontWeight: 700, marginLeft: 3, letterSpacing: '0.08em' }}>{move.ap}AP</span>
      </div>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 500, margin: '0 0 4px', paddingRight: 72, color: '#0E1726', letterSpacing: '-0.015em', lineHeight: 1.15 }}>{move.title}</h3>
      <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, color: '#5A5560', margin: '0 0 8px', lineHeight: 1.45 }}>{move.desc}</p>
      {move.concept && BUSINESS_CONCEPTS[move.concept] && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', marginBottom: 8, background: 'rgba(184,148,95,0.12)', border: '1px solid rgba(184,148,95,0.3)', borderRadius: 2, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: '#B8945F', fontWeight: 600, letterSpacing: '0.06em' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em' }}>TEACHES</span>
          <span>{BUSINESS_CONCEPTS[move.concept].title}</span>
        </div>
      )}
      <div>{Object.entries(move.fx).filter(([k]) => k !== 'locked' && k !== 'retention').map(([k, v]) => <FxChip key={k} stat={k} val={v} />)}</div>
    </button>
  );
}

function VisualCard({ option, selected, onClick, icon, costLabel }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left',
      background: selected ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
      border: `1px solid ${selected ? '#1A4D5E' : 'rgba(14,23,38,0.1)'}`,
      padding: '14px 16px', marginBottom: 9, cursor: 'pointer', transition: 'all 0.2s',
      fontFamily: 'inherit', color: 'inherit',
      boxShadow: selected ? '0 4px 16px rgba(26,77,94,0.12)' : 'none', borderRadius: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {icon && <div style={{ flexShrink: 0, marginTop: 2, opacity: selected ? 1 : 0.7 }}>{icon}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 500, color: '#0E1726', letterSpacing: '-0.01em' }}>{option.label}</div>
            {costLabel && <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#B8945F', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{costLabel}</div>}
          </div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12.5, color: '#5A5560', margin: '4px 0 0', lineHeight: 1.45 }}>{option.desc}</p>
        </div>
      </div>
    </button>
  );
}

function RadioCard({ option, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left',
      background: selected ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
      border: `1px solid ${selected ? '#1A4D5E' : 'rgba(14,23,38,0.1)'}`,
      padding: '13px 15px', marginBottom: 9, cursor: 'pointer', transition: 'all 0.2s',
      fontFamily: 'inherit', color: 'inherit', borderRadius: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 3, border: `1.5px solid ${selected ? '#1A4D5E' : 'rgba(14,23,38,0.25)'}`, background: selected ? '#1A4D5E' : 'transparent' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: '#0E1726' }}>{option.label}</div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12.5, color: '#5A5560', margin: '4px 0 0', lineHeight: 1.45 }}>{option.desc}</p>
        </div>
      </div>
    </button>
  );
}

function CheckCard({ option, selected, onClick, locked }) {
  return (
    <button onClick={locked ? undefined : onClick} disabled={locked} style={{
      width: '100%', textAlign: 'left',
      background: selected ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
      border: `1px solid ${selected ? '#1A4D5E' : 'rgba(14,23,38,0.1)'}`,
      padding: '12px 14px', marginBottom: 8, cursor: locked ? 'default' : 'pointer',
      fontFamily: 'inherit', color: 'inherit', borderRadius: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <div style={{ width: 16, height: 16, flexShrink: 0, marginTop: 3, border: `1.5px solid ${selected ? '#1A4D5E' : 'rgba(14,23,38,0.25)'}`, background: selected ? '#1A4D5E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selected && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#FAF6EE" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726' }}>{option.label}{locked && <span style={{ fontSize: 11, color: '#9B9098', marginLeft: 6, fontStyle: 'italic' }}>— required</span>}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: '#B8945F', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{option.cost < 1 ? `£${Math.round(option.cost * 1000)}` : `£${option.cost}k`}</div>
          </div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#5A5560', margin: '3px 0 0', lineHeight: 1.4 }}>{option.desc}</p>
        </div>
      </div>
    </button>
  );
}

const Primary = ({ children, onClick, disabled }) => (
  <button onClick={(e) => { if (!disabled) { sfx.tap(); onClick && onClick(e); } }} disabled={disabled} style={{
    width: '100%', background: disabled ? 'rgba(14,23,38,0.1)' : '#0E1726',
    color: disabled ? '#9B9098' : '#FAF6EE', border: 'none', padding: '16px',
    fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, borderRadius: 2,
    cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.02em',
  }}>{children}</button>
);

function EVBreakdown({ state }) {
  const b = calcEV(state);
  const Bar = ({ label, value, max, color, sub }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3D2548', fontWeight: 700 }}>{label}</span>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color, fontWeight: 500 }}>+{value}</span>
      </div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginBottom: 4, lineHeight: 1.4 }}>{sub}</div>
      <div style={{ height: 3, background: 'rgba(14,23,38,0.07)' }}>
        <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, transition: 'width 0.7s' }} />
      </div>
    </div>
  );
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,77,94,0.18)', padding: 16, borderRadius: 2, marginBottom: 14 }}>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 4 }}>Enterprise Value · Composite Score</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(14,23,38,0.08)' }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, margin: 0 }}>EV Score</h3>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 500, color: '#1A4D5E' }}>{b.total}</span>
      </div>
      <Bar label="Brand Equity" value={b.brand} max={30} color="#0E1726" sub={`30% × brand (${state.brand}). Intangible asset, drives pricing power.`} />
      <Bar label="Clinical Foundation" value={b.clinical} max={30} color="#1A4D5E" sub={`30% × avg of safety, innovation (${b.clinicalAvg}). The defensible core.`} />
      <Bar label="Ethics Moat" value={b.ethics} max={20} color="#B8945F" sub={`20% × ethics culture (${state.ethics}). Drives retention, reduces churn, attracts referrals.`} />
      <Bar label="Compliance Hygiene" value={b.compliance} max={20} color="#5C7A52" sub={`20% × compliance (${state.compliance}). The cost of being audited.`} />
      <div style={{ marginTop: 8, padding: 10, background: 'rgba(184,148,95,0.08)', borderRadius: 2, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12.5, color: '#3D2548', lineHeight: 1.5 }}>
        Score multiplied by <strong>{Math.round(b.coherenceMult * 100)}%</strong> for strategic coherence ("fit", per Porter). Lopsided clinics trade at a discount.
      </div>
    </div>
  );
}

// ---------- CONCEPT CARD ----------
// A small, expandable definitional panel that surfaces business concepts in-context.
// Pass conceptId matching a BUSINESS_CONCEPTS entry.
function ConceptCard({ conceptId, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const concept = BUSINESS_CONCEPTS[conceptId];
  if (!concept) return null;

  if (compact) {
    return (
      <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#1A4D5E', color: '#FAF6EE', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>?</span>
        {expanded && (
          <div style={{ position: 'absolute', marginTop: 200, marginLeft: -200, zIndex: 100, width: 320, background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.12)', borderLeft: '3px solid #1A4D5E', padding: 14, borderRadius: 2, boxShadow: '0 8px 24px rgba(14,23,38,0.12)', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 4 }}>{concept.chapter}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{concept.title}</div>
            <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#3D2548', lineHeight: 1.5, margin: '0 0 8px' }}>{concept.short}</p>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Formula</div>
            <pre style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#0E1726', margin: 0, padding: '6px 8px', background: 'rgba(26,77,94,0.06)', borderRadius: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{concept.formula}</pre>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700, marginTop: 10, marginBottom: 4 }}>Worked Example</div>
            <p style={{ fontFamily: 'Fraunces, serif', fontSize: 12, color: '#3D2548', fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>{concept.example}</p>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginTop: 10, marginBottom: 4 }}>Why It Matters</div>
            <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', lineHeight: 1.55, margin: 0 }}>{concept.why}</p>
          </div>
        )}
      </button>
    );
  }

  // Full inline card
  return (
    <div style={{ background: 'rgba(26,77,94,0.04)', border: '1px solid rgba(26,77,94,0.18)', borderLeft: '3px solid #1A4D5E', padding: 12, marginBottom: 10, borderRadius: 2 }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 3 }}>Concept · {concept.chapter}</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500 }}>{concept.title}</div>
        </div>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18, color: '#1A4D5E', fontWeight: 300 }}>{expanded ? '−' : '+'}</span>
      </button>
      <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12.5, color: '#3D2548', lineHeight: 1.55, margin: '8px 0 0' }}>{concept.short}</p>
      {expanded && (
        <div className="ai-fade-in">
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700, marginTop: 12, marginBottom: 4 }}>Formula</div>
          <pre style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#0E1726', margin: 0, padding: '8px 10px', background: 'rgba(255,255,255,0.55)', borderRadius: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{concept.formula}</pre>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700, marginTop: 10, marginBottom: 4 }}>Worked Example</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 12.5, color: '#3D2548', fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>{concept.example}</p>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginTop: 10, marginBottom: 4 }}>Why It Matters</div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#5A5560', lineHeight: 1.55, margin: 0 }}>{concept.why}</p>
        </div>
      )}
    </div>
  );
}

function MBADashboard({ q, state, activeCapex = [] }) {
  const [showLearn, setShowLearn] = useState(false);
  const [activeConcept, setActiveConcept] = useState(null);

  // Helper: line item with optional concept-id link to open a learning panel
  const Line = ({ label, value, sub, isHeader, positive, conceptId, formula }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: isHeader ? 'none' : '1px solid rgba(14,23,38,0.06)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: isHeader ? '#0E1726' : '#5A5560', fontWeight: isHeader ? 600 : 400 }}>{label}</span>
          {conceptId && (
            <button onClick={(e) => { e.stopPropagation(); setActiveConcept(activeConcept === conceptId ? null : conceptId); }} style={{ background: activeConcept === conceptId ? '#1A4D5E' : 'transparent', color: activeConcept === conceptId ? '#FAF6EE' : '#1A4D5E', border: `1px solid #1A4D5E`, padding: '0px 5px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.04em', lineHeight: 1.5 }}>LEARN</button>
          )}
        </div>
        {showLearn && formula && (
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#1A4D5E', marginTop: 3, fontStyle: 'italic', fontWeight: 500 }}>{formula}</div>
        )}
        {sub && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#9B9098', marginTop: 1 }}>{sub}</div>}
      </div>
      <span style={{ fontFamily: 'Fraunces, serif', fontSize: isHeader ? 18 : 14, fontWeight: 500, color: isHeader ? (q.net >= 0 ? '#5C7A52' : '#8B2C3C') : (positive ? '#5C7A52' : '#0E1726'), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', marginLeft: 12 }}>{value}</span>
    </div>
  );

  const formatNum = (n) => n.toFixed(1).replace(/\.0$/, '');

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 14, marginBottom: 14, borderRadius: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700 }}>Quarter P&amp;L · MBA View</div>
        <button onClick={() => setShowLearn(!showLearn)} style={{ background: showLearn ? '#1A4D5E' : 'transparent', color: showLearn ? '#FAF6EE' : '#1A4D5E', border: '1px solid #1A4D5E', padding: '4px 9px', fontSize: 9.5, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.1em' }}>{showLearn ? '✓ ' : ''}TEACH MODE</button>
      </div>

      {showLearn && (
        <div style={{ background: 'rgba(184,148,95,0.06)', border: '1px solid rgba(184,148,95,0.25)', padding: 10, marginBottom: 10, borderRadius: 2 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#3D2548', lineHeight: 1.5 }}>
            Teach mode shows the formula behind every line. Click <strong>LEARN</strong> next to any concept for the full definition, worked example, and why it matters.
          </div>
        </div>
      )}

      {/* === INCOME STATEMENT === */}
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Income Statement</div>

      <Line label="Revenue" value={`+${formatGBP(q.revenue)}`} positive conceptId="revenue"
            formula={`= ${q.actualBookings} treatments × £${(q.avgTicket * 1000).toFixed(0)} avg ticket`} />
      {activeConcept === 'revenue' && <ConceptCard conceptId="revenue" />}

      <Line label="Cost of Goods Sold" value={`−${formatGBP(q.cogs)}`} sub="Consumables, toxin, filler, products" conceptId="cogs"
            formula={`= Revenue ${formatGBP(q.revenue)} × COGS rate ${Math.round((q.cogs / Math.max(q.revenue, 0.01)) * 100)}%`} />
      {activeConcept === 'cogs' && <ConceptCard conceptId="cogs" />}

      <Line label={`Gross Profit · ${q.grossMarginPct}% margin`} value={formatGBP(q.grossProfit)} isHeader conceptId="gross-profit"
            formula={`= Revenue ${formatGBP(q.revenue)} − COGS ${formatGBP(q.cogs)}`} />
      {activeConcept === 'gross-profit' && <ConceptCard conceptId="gross-profit" />}

      <div style={{ height: 6 }} />
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Operating Expenses</div>

      <Line label="Rent (location-weighted)" value={`−${formatGBP(q.rent)}`} sub="Borough rent multiplier applied" />
      <Line label="Staff costs" value={`−${formatGBP(q.staff)}`} sub="Wages for hired team this quarter" />
      <Line label="Marketing" value={`−${formatGBP(q.marketing)}`} sub="Drives new patient acquisition" />
      <Line label="Other overheads" value={`−${formatGBP(q.overheads)}`} sub="Software, insurance, professional fees" />
      {q.complianceEfficiency > 0 && <Line label="Compliance efficiency credit" value={`+${formatGBP(q.complianceEfficiency)}`} sub="Audit-ready clinics have less friction-cost" positive />}
      {q.ethicsRetention > 0 && <Line label="Ethics retention credit" value={`+${formatGBP(q.ethicsRetention)}`} sub="Loyal patients reduce acquisition burden" positive />}

      <Line label="Total Operating Expenses" value={`−${formatGBP(q.opex)}`} conceptId="opex"
            formula={`= Rent + Staff + Marketing + Overheads ${q.complianceEfficiency > 0 || q.ethicsRetention > 0 ? '− Credits' : ''}`} />
      {activeConcept === 'opex' && <ConceptCard conceptId="opex" />}

      <div style={{ marginTop: 6 }}>
        <Line label="EBITDA" value={`${q.ebitda >= 0 ? '+' : ''}${formatGBP(q.ebitda)}`} isHeader conceptId="ebitda"
              formula={`= Gross Profit ${formatGBP(q.grossProfit)} − OpEx ${formatGBP(q.opex)}`} />
        {activeConcept === 'ebitda' && <ConceptCard conceptId="ebitda" />}
      </div>

      {(q.depreciation > 0 || q.interest > 0 || q.tax > 0) && (
        <>
          <div style={{ height: 4 }} />
          {q.depreciation > 0 && <Line label="Depreciation (non-cash)" value={`−${formatGBP(q.depreciation)}`} sub="Capital assets amortising over useful life" formula={`Sum of (CapEx amount ÷ useful life Q) for ${activeCapex?.length || 0} active asset(s)`} conceptId="capex-vs-opex" />}
          {q.depreciation > 0 && activeConcept === 'capex-vs-opex' && <ConceptCard conceptId="capex-vs-opex" />}
          {q.interest > 0 && <Line label="Interest on debt" value={`−${formatGBP(q.interest)}`} sub={`5% APR on ${formatGBP(state.debt || 0)} outstanding`} formula={`= Debt × 1.25% per quarter`} />}
          {q.tax > 0 && <Line label="Corporation Tax (25%)" value={`−${formatGBP(q.tax)}`} sub="On positive operating profit" formula={`= EBIT × 25%`} />}
        </>
      )}

      <div style={{ borderTop: '2px solid #0E1726', marginTop: 8, paddingTop: 6 }}>
        <Line label="Net Income (this quarter)" value={`${q.netIncome >= 0 ? '+' : ''}${formatGBP(q.netIncome)}`} isHeader conceptId="net-income"
              formula={`= EBITDA ${formatGBP(q.ebitda)} − Depreciation ${formatGBP(q.depreciation)} − Interest ${formatGBP(q.interest)} − Tax ${formatGBP(q.tax)}`} />
        {activeConcept === 'net-income' && <ConceptCard conceptId="net-income" />}
      </div>

      {/* === CASH FLOW STATEMENT === */}
      <div style={{ marginTop: 14, padding: 12, background: 'rgba(92,122,82,0.05)', borderRadius: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5C7A52', fontWeight: 700 }}>Cash Flow Statement</span>
          <button onClick={() => setActiveConcept(activeConcept === 'cash-flow-statement' ? null : 'cash-flow-statement')} style={{ background: activeConcept === 'cash-flow-statement' ? '#5C7A52' : 'transparent', color: activeConcept === 'cash-flow-statement' ? '#FAF6EE' : '#5C7A52', border: '1px solid #5C7A52', padding: '2px 6px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>LEARN</button>
        </div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#3D2548', marginBottom: 8, lineHeight: 1.5, fontStyle: 'italic' }}>Net Income {q.netIncome >= 0 ? '+' : ''}{formatGBP(q.netIncome)} is profit. Cash change is different — and that's why businesses go bust on profit.</div>
        <div style={{ background: 'rgba(255,255,255,0.6)', padding: 10, borderRadius: 2 }}>
          <Line label="Net Income" value={`${q.netIncome >= 0 ? '+' : ''}${formatGBP(q.netIncome)}`} />
          {q.depreciation > 0 && <Line label="+ Depreciation (non-cash)" value={`+${formatGBP(q.depreciation)}`} sub="Added back — no actual cash left the business" formula="From active CapEx amortising over useful life" />}
          {q.wcSwing !== 0 && <Line label={`${q.wcSwing > 0 ? '+' : ''}Working capital change`} value={`${q.wcSwing > 0 ? '+' : ''}${formatGBP(q.wcSwing)}`} sub={q.wcSwing > 0 ? 'Stretching supplier terms freed cash' : 'Paying suppliers early absorbed cash'} />}
          <Line label="Cash from operations" value={`${q.cashFromOps >= 0 ? '+' : ''}${formatGBP(q.cashFromOps)}`} isHeader />
          {q.capexCashOut > 0 && <Line label="− CapEx (asset purchase)" value={`−${formatGBP(q.capexCashOut)}`} sub="Full cash outflow now; depreciates over time" />}
          <div style={{ borderTop: '1px solid rgba(14,23,38,0.12)', marginTop: 4, paddingTop: 4 }}>
            <Line label="NET CASH CHANGE THIS QUARTER" value={`${q.net >= 0 ? '+' : ''}${formatGBP(q.net)}`} isHeader />
          </div>
        </div>
        {activeConcept === 'cash-flow-statement' && <div style={{ marginTop: 10 }}><ConceptCard conceptId="cash-flow-statement" /></div>}
        {Math.abs(q.net - q.netIncome) > 1 && (
          <div style={{ marginTop: 8, padding: 8, background: 'rgba(184,148,95,0.08)', borderLeft: '2px solid #B8945F', borderRadius: 2 }}>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#3D2548', lineHeight: 1.5 }}>
              <strong>Cash ≠ Profit this quarter.</strong> Net income of {formatGBP(q.netIncome)} vs cash change of {formatGBP(q.net)} — a {formatGBP(Math.abs(q.net - q.netIncome))} gap. {q.net < q.netIncome ? 'You earned more than you collected.' : 'You collected more than you earned.'}
            </span>
          </div>
        )}
      </div>

      {/* === UNIT ECONOMICS === */}
      <div style={{ marginTop: 14, padding: 11, background: 'rgba(26,77,94,0.05)', borderRadius: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700 }}>Unit Economics</span>
          <button onClick={() => setActiveConcept(activeConcept === 'ltv-cac' ? null : 'ltv-cac')} style={{ background: activeConcept === 'ltv-cac' ? '#1A4D5E' : 'transparent', color: activeConcept === 'ltv-cac' ? '#FAF6EE' : '#1A4D5E', border: '1px solid #1A4D5E', padding: '2px 6px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>LEARN</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>CAC</span>
              <button onClick={() => setActiveConcept(activeConcept === 'cac' ? null : 'cac')} style={{ background: 'transparent', border: 'none', color: '#1A4D5E', cursor: 'pointer', padding: 0, fontSize: 9, fontWeight: 700 }}>ⓘ</button>
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>£{q.cac.toFixed(0)}</div>
            {showLearn && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#1A4D5E', marginTop: 2, fontStyle: 'italic' }}>= Mkt £{formatNum(q.marketing)}k ÷ {q.newPatients} pts</div>}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>CLV</span>
              <button onClick={() => setActiveConcept(activeConcept === 'clv' ? null : 'clv')} style={{ background: 'transparent', border: 'none', color: '#1A4D5E', cursor: 'pointer', padding: 0, fontSize: 9, fontWeight: 700 }}>ⓘ</button>
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{formatGBP(q.clv)}</div>
            {showLearn && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#1A4D5E', marginTop: 2, fontStyle: 'italic' }}>= GP × visits × retention</div>}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>LTV:CAC</span>
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: q.clv * 1000 / Math.max(q.cac, 1) > 3000 ? '#5C7A52' : '#8B2C3C', fontVariantNumeric: 'tabular-nums' }}>
              {(q.clv * 1000 / Math.max(q.cac, 1)).toFixed(1)}×
            </div>
            {showLearn && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#1A4D5E', marginTop: 2, fontStyle: 'italic' }}>3× = healthy</div>}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>Retention</span>
              <button onClick={() => setActiveConcept(activeConcept === 'retention' ? null : 'retention')} style={{ background: 'transparent', border: 'none', color: '#1A4D5E', cursor: 'pointer', padding: 0, fontSize: 9, fontWeight: 700 }}>ⓘ</button>
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{Math.round(q.retention * 100)}%</div>
            {showLearn && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#1A4D5E', marginTop: 2, fontStyle: 'italic' }}>NPS+Ethics-driven</div>}
          </div>
        </div>
        {activeConcept === 'ltv-cac' && <div style={{ marginTop: 10 }}><ConceptCard conceptId="ltv-cac" /></div>}
        {activeConcept === 'cac' && <div style={{ marginTop: 10 }}><ConceptCard conceptId="cac" /></div>}
        {activeConcept === 'clv' && <div style={{ marginTop: 10 }}><ConceptCard conceptId="clv" /></div>}
        {activeConcept === 'retention' && <div style={{ marginTop: 10 }}><ConceptCard conceptId="retention" /></div>}
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11.5, color: '#5A5560', marginTop: 8, lineHeight: 1.5 }}>
          {q.clv * 1000 / Math.max(q.cac, 1) < 1000 ? 'You are losing money on every patient acquired.' : q.clv * 1000 / Math.max(q.cac, 1) < 3000 ? 'Marketing economics are sustainable but not strong.' : q.clv * 1000 / Math.max(q.cac, 1) < 6000 ? 'Healthy unit economics. Acquisition pays back fast.' : 'Excellent ratio — you may be under-investing in growth.'}
        </div>
      </div>

      {/* === CHAIN === */}
      {q.chainSize > 1 && (
        <div style={{ marginTop: 10, padding: 11, background: 'rgba(184,148,95,0.06)', borderRadius: 2, border: '1px solid rgba(184,148,95,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700 }}>Chain Position</span>
            <button onClick={() => setActiveConcept(activeConcept === 'roll-up-strategy' ? null : 'roll-up-strategy')} style={{ background: activeConcept === 'roll-up-strategy' ? '#B8945F' : 'transparent', color: activeConcept === 'roll-up-strategy' ? '#FAF6EE' : '#B8945F', border: '1px solid #B8945F', padding: '2px 6px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>LEARN</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 6 }}>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>Sites</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{q.chainSize}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>Roll-up Mult.</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: q.chainSize >= 3 ? '#5C7A52' : '#0E1726', fontVariantNumeric: 'tabular-nums' }}>×{q.chainSize >= 6 ? '2.5' : q.chainSize >= 4 ? '2.0' : q.chainSize >= 3 ? '1.5' : q.chainSize === 2 ? '1.2' : '1.0'}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>Coord. Tax</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: q.coordinationTax > 20 ? '#8B2C3C' : '#0E1726', fontVariantNumeric: 'tabular-nums' }}>−{q.coordinationTax}%</div>
            </div>
          </div>
          {showLearn && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#1A4D5E', fontStyle: 'italic', lineHeight: 1.5 }}>Chain running cost £{q.sitesRunningCost}k/Q added to OpEx. Coordination tax compresses throughput by 5% per site beyond the first.</div>}
          {activeConcept === 'roll-up-strategy' && <div style={{ marginTop: 8 }}><ConceptCard conceptId="roll-up-strategy" /></div>}
        </div>
      )}

      {/* === CAPACITY === */}
      <div style={{ marginTop: 10, padding: 11, background: 'rgba(61,37,72,0.04)', borderRadius: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3D2548', fontWeight: 700 }}>Capacity & Throughput</span>
          <button onClick={() => setActiveConcept(activeConcept === 'capacity' ? null : 'capacity')} style={{ background: activeConcept === 'capacity' ? '#3D2548' : 'transparent', color: activeConcept === 'capacity' ? '#FAF6EE' : '#3D2548', border: '1px solid #3D2548', padding: '2px 6px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>LEARN</button>
        </div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#3D2548', lineHeight: 1.5 }}>
          {q.actualBookings} treatments delivered of {q.desiredBookings} demanded.
          {q.turnedAway > 0 && <span style={{ color: '#8B2C3C', fontWeight: 600 }}> {q.turnedAway} turned away — lost revenue of ~£{Math.round(q.turnedAway * q.avgTicket * 1000).toLocaleString()}.</span>}
          {showLearn && <div style={{ fontStyle: 'italic', color: '#1A4D5E', marginTop: 4, fontSize: 10.5 }}>Throughput = {Math.round(q.throughputMult * 100)}% of {q.ceiling}-treatment capacity. Each additional clinical hire roughly doubles deliverable volume.</div>}
        </div>
        {activeConcept === 'capacity' && <div style={{ marginTop: 10 }}><ConceptCard conceptId="capacity" /></div>}
      </div>

      {/* === CASH RUNWAY === */}
      {q.runwayQ !== null && (
        <div style={{ marginTop: 10, padding: 10, background: 'rgba(139,44,60,0.08)', border: '1px solid rgba(139,44,60,0.25)', borderRadius: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#8B2C3C', fontWeight: 600 }}><strong style={{ fontFamily: 'Fraunces, serif' }}>Cash runway:</strong> ~{q.runwayQ} quarter{q.runwayQ === 1 ? '' : 's'}</span>
            <button onClick={() => setActiveConcept(activeConcept === 'runway' ? null : 'runway')} style={{ background: activeConcept === 'runway' ? '#8B2C3C' : 'transparent', color: activeConcept === 'runway' ? '#FAF6EE' : '#8B2C3C', border: '1px solid #8B2C3C', padding: '2px 6px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>LEARN</button>
          </div>
          {showLearn && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#8B2C3C', fontStyle: 'italic' }}>= Cash £{formatNum(state.cash)}k ÷ Net burn £{formatNum(Math.abs(q.net))}k/Q</div>}
          {q.runwayQ < 3 && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#8B2C3C', marginTop: 4 }}>Below 3 quarters of runway is the danger zone. Either improve net income or raise capital before runway hits zero.</div>}
          {activeConcept === 'runway' && <div style={{ marginTop: 10 }}><ConceptCard conceptId="runway" /></div>}
        </div>
      )}
    </div>
  );
}

function StrategyCanvas({ data, selectedFactor, onSelectFactor }) {
  const W = 580, H = 380, PAD_L = 18, PAD_R = 18, PAD_T = 20, PAD_B = 110;
  const innerW = W - PAD_L - PAD_R, innerH = H - PAD_T - PAD_B;
  const stepX = innerW / (data.length - 1);
  const pointsI = data.map((d, i) => `${PAD_L + i * stepX},${PAD_T + innerH - (d.industry / 100) * innerH}`).join(' ');
  const pointsY = data.map((d, i) => `${PAD_L + i * stepX},${PAD_T + innerH - (d.yours / 100) * innerH}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#1A4D5E" /><stop offset="100%" stopColor="#3D2548" /></linearGradient></defs>
      {[0, 25, 50, 75, 100].map(v => { const y = PAD_T + innerH - (v / 100) * innerH; return <g key={v}><line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(14,23,38,0.07)" /><text x={W - PAD_R + 4} y={y + 3} fontSize="9" fill="#9B9098">{v}</text></g>; })}
      <polyline points={pointsI} fill="none" stroke="#9B9098" strokeWidth="1.5" strokeDasharray="3 3" />
      {data.map((d, i) => <circle key={`i${i}`} cx={PAD_L + i * stepX} cy={PAD_T + innerH - (d.industry / 100) * innerH} r="3" fill="#9B9098" />)}
      <polyline points={pointsY} fill="none" stroke="url(#g)" strokeWidth="2.5" style={{ strokeDasharray: 1600, strokeDashoffset: 1600, animation: 'dl 1.6s ease 0.3s forwards' }} />
      {data.map((d, i) => { const cx = PAD_L + i * stepX, cy = PAD_T + innerH - (d.yours / 100) * innerH, sel = selectedFactor === d.id; return (
        <g key={`y${i}`} onClick={() => onSelectFactor(d.id)} style={{ cursor: 'pointer' }}><circle cx={cx} cy={cy} r="14" fill="transparent" /><circle cx={cx} cy={cy} r={sel ? 6 : 4} fill="#1A4D5E" stroke={sel ? "#FAF6EE" : 'none'} strokeWidth="2" /></g>
      ); })}
      {data.map((d, i) => { const x = PAD_L + i * stepX, sel = selectedFactor === d.id; return (
        <g key={`l${i}`} transform={`translate(${x}, ${PAD_T + innerH + 8})`} style={{ cursor: 'pointer' }} onClick={() => onSelectFactor(d.id)}>
          <rect x={-50} y={-2} width="100" height="80" fill="transparent" />
          <text fontSize="9.5" fill={sel ? "#1A4D5E" : "#5A5560"} fontWeight={sel ? 700 : 500} transform="rotate(-45)" textAnchor="end">{d.label}</text>
        </g>
      ); })}
      <style>{`@keyframes dl { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

function FactorPanel({ factor, played }) {
  if (!factor) return <div style={{ background: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(14,23,38,0.15)', padding: 16, borderRadius: 2, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#9B9098' }}>Tap any factor on the canvas to see what drove your position.</div>;
  const drivers = factor.drivers.map(id => MOVES.find(m => m.id === id)).filter(m => m && played.includes(m.id));
  const gap = factor.yours - factor.industry;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,77,94,0.2)', padding: 15, borderRadius: 2 }}>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 4 }}>Strategy Factor</div>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 500, margin: '0 0 10px', letterSpacing: '-0.015em' }}>{factor.label}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[['Industry', factor.industry, '#9B9098'], ['Your Clinic', factor.yours, '#1A4D5E'], ['Gap', `${gap > 0 ? '+' : ''}${gap}`, gap > 0 ? '#5C7A52' : gap < 0 ? '#8B2C3C' : '#5A5560']].map(([l, v, c]) => (
          <div key={l}><div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: c, fontWeight: 600, marginBottom: 2 }}>{l}</div><div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: c, fontWeight: 500 }}>{v}</div></div>
        ))}
      </div>
      <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13.5, color: '#3D2548', margin: '0 0 10px', lineHeight: 1.5 }}>{factor.hint}</p>
      {drivers.length > 0 ? (
        <>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5A5560', fontWeight: 700, marginBottom: 6 }}>Driven by your moves</div>
          {drivers.map(m => { const c = CAT[m.cat]; return (
            <div key={m.id} style={{ padding: '7px 9px', background: 'rgba(26,77,94,0.04)', borderLeft: `2px solid ${c.color}`, marginBottom: 5, borderRadius: 2 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500 }}>{m.title}</div>
            </div>
          ); })}
        </>
      ) : <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#9B9098' }}>You did not play moves that shift this factor.</div>}
    </div>
  );
}

// ---------- FACE MAP COMPONENT ----------

function FaceMap({ targetCase, selectedZone, onSelectZone, showAnatomy, locked }) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto' }}>
      <svg viewBox="0 0 200 240" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <radialGradient id="faceFill" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#F5E8D8" />
            <stop offset="100%" stopColor="#E8D4BC" />
          </radialGradient>
        </defs>

        {/* Face shape */}
        <path d="M 100 22 Q 140 22 158 50 Q 168 82 162 120 Q 158 150 148 175 Q 138 205 120 220 Q 100 230 80 220 Q 62 205 52 175 Q 42 150 38 120 Q 32 82 42 50 Q 60 22 100 22 Z" fill="url(#faceFill)" stroke="#3D2548" strokeWidth="1.3" />

        {/* Hairline */}
        <path d="M 50 38 Q 100 18 150 38" fill="none" stroke="#3D2548" strokeWidth="1" opacity="0.5" />

        {/* Eyebrows */}
        <path d="M 64 70 Q 78 64 90 70" fill="none" stroke="#3D2548" strokeWidth="2" strokeLinecap="round" />
        <path d="M 110 70 Q 122 64 136 70" fill="none" stroke="#3D2548" strokeWidth="2" strokeLinecap="round" />

        {/* Eyes */}
        <path d="M 64 84 Q 76 78 88 84 Q 76 90 64 84" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <path d="M 112 84 Q 124 78 136 84 Q 124 90 112 84" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <circle cx="76" cy="84" r="2" fill="#3D2548" />
        <circle cx="124" cy="84" r="2" fill="#3D2548" />

        {/* Nose */}
        <path d="M 100 92 L 96 130 Q 96 138 100 140 Q 104 138 104 130 L 100 92" fill="none" stroke="#3D2548" strokeWidth="1" opacity="0.6" />
        <path d="M 93 138 Q 100 142 107 138" fill="none" stroke="#3D2548" strokeWidth="1" opacity="0.6" />

        {/* Mouth */}
        <path d="M 84 170 Q 100 165 116 170 Q 100 178 84 170" fill="#C8867A" stroke="#3D2548" strokeWidth="1" />
        <line x1="84" y1="170" x2="116" y2="170" stroke="#3D2548" strokeWidth="0.6" opacity="0.5" />

        {/* Anatomy danger overlay */}
        {showAnatomy && FACE_DANGER_ZONES.map(d => {
          if (d.isPoint) return <circle key={d.id} cx={d.cx} cy={d.cy} r="2" fill={d.color} opacity="0.85" />;
          return <path key={d.id} d={d.path} fill="none" stroke={d.color} strokeWidth="1.8" opacity="0.7" strokeLinecap="round" />;
        })}

        {/* Treatment zones (clickable) */}
        {FACE_ZONES.map(z => {
          const baseId = z.mirrors || z.id;
          const isTarget = targetCase && (baseId === targetCase.targetZone || z.id === targetCase.targetZone);
          const isSelected = selectedZone === baseId;
          const isDangerous = targetCase && targetCase.dangerNearby.some(d => {
            // Approximate proximity check by zone-name keywords
            const map = { 'angular-artery': ['tear-trough', 'nasolabial'], 'facial-artery': ['nasolabial', 'jaw'], 'labial-artery': ['lips'], 'supratrochlear-artery': ['glabella', 'forehead'], 'transverse-facial-artery': ['cheek'], 'infraorbital-foramen': ['tear-trough', 'cheek'] };
            return map[d] && map[d].includes(baseId);
          });
          return (
            <g key={z.id} onClick={() => !locked && onSelectZone(baseId)} style={{ cursor: locked ? 'default' : 'pointer' }}>
              <circle
                cx={z.x} cy={z.y} r={z.r}
                fill={isSelected ? 'rgba(26,77,94,0.35)' : (isTarget && showAnatomy ? 'rgba(92,122,82,0.18)' : 'rgba(184,148,95,0.12)')}
                stroke={isSelected ? '#1A4D5E' : (isTarget && showAnatomy ? '#5C7A52' : '#B8945F')}
                strokeWidth={isSelected ? 2 : 1}
                strokeDasharray={isTarget && showAnatomy && !isSelected ? '2 2' : 'none'}
              />
              {isSelected && <circle cx={z.x} cy={z.y} r="2.5" fill="#8B2C3C" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function scoreFaceCase(caseData, zone, depth, technique) {
  let score = 0;
  let feedback = [];
  if (zone === caseData.targetZone) { score += 40; feedback.push({ ok: true, text: 'Correct treatment zone identified.' }); }
  else { score -= 20; feedback.push({ ok: false, text: `Wrong zone — patient asked for ${caseData.targetZone.replace('-', ' ')} treatment.` }); }
  if (depth === caseData.correctDepth) { score += 30; feedback.push({ ok: true, text: `Correct depth: ${depth}.` }); }
  else { score -= 25; feedback.push({ ok: false, text: `Wrong plane — should be ${caseData.correctDepth}.` }); }
  if (technique === caseData.correctTechnique) { score += 30; feedback.push({ ok: true, text: `Correct technique: ${technique}.` }); }
  else { score -= 15; feedback.push({ ok: false, text: `Suboptimal technique — should be ${caseData.correctTechnique} for this zone.` }); }
  return { score: Math.max(-60, Math.min(100, score)), feedback };
}

// ---------- LAUNCH PHASE COMPONENT (Month Zero) ----------

function LaunchPhase({ launch, setLaunch, onComplete, setupCash }) {
  const valid = launch.channel;
  const ch = launch.channel ? LAUNCH_FOUNDING_CHANNEL.find(c => c.id === launch.channel) : null;
  const seedCost = launch.seeds.reduce((sum, id) => {
    const s = LAUNCH_SEED_ACTIONS.find(x => x.id === id);
    return sum + Math.abs(s.fx.cash || 0);
  }, 0);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, borderBottom: '1px solid rgba(14,23,38,0.1)', paddingBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700 }}>Month Zero · Before Opening</div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, margin: '4px 0 0', letterSpacing: '-0.025em' }}>Launching the Clinic</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 600 }}>Cash</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{formatGBP(setupCash)}</div>
        </div>
      </div>

      <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#5A5560', marginBottom: 18, lineHeight: 1.5 }}>
        Before the first patient, the first ad, the first treatment — the brand has to exist. Choose your founding voice and your launch tactics.
      </p>

      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#3D2548', marginBottom: 10, textTransform: 'uppercase', fontWeight: 700 }}>1. Founding Marketing Channel</div>
      <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12.5, color: '#5A5560', marginBottom: 12, lineHeight: 1.5 }}>Pick the channel you will lead with. You can add others later, but this defines your starting voice.</p>
      {LAUNCH_FOUNDING_CHANNEL.map(c => (
        <button key={c.id} onClick={() => setLaunch({ ...launch, channel: c.id })} style={{
          width: '100%', textAlign: 'left',
          background: launch.channel === c.id ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
          border: `1px solid ${launch.channel === c.id ? '#1A4D5E' : 'rgba(14,23,38,0.1)'}`,
          padding: '12px 14px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: '#0E1726' }}>{c.label}</div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#B8945F', fontWeight: 600 }}>{c.costPerQ === 0 ? 'No spend' : `${formatGBP(c.costPerQ)}/Q`}</div>
          </div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#5A5560', margin: 0, lineHeight: 1.45 }}>{c.desc}</p>
          <div style={{ marginTop: 6 }}>{Object.entries(c.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
        </button>
      ))}

      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#3D2548', marginTop: 22, marginBottom: 10, textTransform: 'uppercase', fontWeight: 700 }}>2. Seed Actions <span style={{ color: '#9B9098', fontWeight: 500, letterSpacing: '0.1em' }}>· optional</span></div>
      <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12.5, color: '#5A5560', marginBottom: 12, lineHeight: 1.5 }}>How you fill your first books. Stack as many as your cash allows — or none. Word will spread either way, just slower.</p>
      {LAUNCH_SEED_ACTIONS.map(s => {
        const isSelected = launch.seeds.includes(s.id);
        return (
          <button key={s.id} onClick={() => setLaunch({ ...launch, seeds: isSelected ? launch.seeds.filter(x => x !== s.id) : [...launch.seeds, s.id] })} style={{
            width: '100%', textAlign: 'left',
            background: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            border: `1px solid ${isSelected ? '#1A4D5E' : 'rgba(14,23,38,0.1)'}`,
            padding: '11px 13px', marginBottom: 7, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 16, height: 16, flexShrink: 0, marginTop: 3, border: `1.5px solid ${isSelected ? '#1A4D5E' : 'rgba(14,23,38,0.25)'}`, background: isSelected ? '#1A4D5E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isSelected && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#FAF6EE" strokeWidth="1.5" fill="none" /></svg>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726' }}>{s.label}</div>
                <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#5A5560', margin: '3px 0 5px', lineHeight: 1.4 }}>{s.desc}</p>
                <div>{Object.entries(s.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
              </div>
            </div>
          </button>
        );
      })}

      <div style={{ background: 'rgba(184,148,95,0.08)', border: '1px solid rgba(184,148,95,0.25)', padding: 11, marginTop: 14, marginBottom: 14, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12.5, color: '#5A5560', borderRadius: 2 }}>
        <strong style={{ color: '#0E1726', fontFamily: 'Fraunces, serif' }}>Launch cost: {formatGBP(seedCost)}</strong>{ch && ch.costPerQ > 0 && <> · Channel: {formatGBP(ch.costPerQ)}/Q from here</>}
      </div>

      <Primary onClick={onComplete} disabled={!valid}>Open the Clinic →</Primary>
    </div>
  );
}

// ---------- INJECTION GAME COMPONENT ----------

function FirstPatientConsult({ onComplete, regulator }) {
  const [stage, setStage] = useState(0);
  const [chosen, setChosen] = useState([]);
  const [revealOutcome, setRevealOutcome] = useState(false);

  const currentStage = FIRST_PATIENT.stages[stage];
  const currentChoice = chosen[stage] !== undefined ? currentStage.choices[chosen[stage]] : null;

  const submit = (i) => {
    const newChosen = [...chosen];
    newChosen[stage] = i;
    setChosen(newChosen);
    setRevealOutcome(true);
  };

  const next = () => {
    setRevealOutcome(false);
    if (stage < FIRST_PATIENT.stages.length - 1) {
      setStage(stage + 1);
    } else {
      // Aggregate fx across all chosen stages
      const aggregate = chosen.reduce((acc, choiceIdx, sIdx) => {
        const fx = FIRST_PATIENT.stages[sIdx].choices[choiceIdx].fx;
        for (const k in fx) acc[k] = (acc[k] || 0) + fx[k];
        return acc;
      }, {});
      onComplete(aggregate);
    }
  };

  return (
    <div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Your First Patient · Consultation</div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, margin: '0 0 16px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>Sarah sits down across from you.</h2>

      {/* Visual face */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.1)', padding: 16, marginBottom: 14, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg viewBox="0 0 100 130" style={{ width: 90, height: 117, flexShrink: 0 }}>
          <defs>
            <radialGradient id="firstPatientFace" cx="50%" cy="40%"><stop offset="0%" stopColor="#F5E8D8" /><stop offset="100%" stopColor="#E8D4BC" /></radialGradient>
          </defs>
          <path d="M 50 12 Q 72 12 80 28 Q 86 48 82 70 Q 78 90 70 105 Q 60 118 50 120 Q 40 118 30 105 Q 22 90 18 70 Q 14 48 20 28 Q 28 12 50 12 Z" fill="url(#firstPatientFace)" stroke="#3D2548" strokeWidth="0.8" />
          {/* Hair */}
          <path d="M 22 30 Q 30 8 50 6 Q 70 8 78 30 Q 80 18 70 12 Q 50 0 30 12 Q 20 18 22 30 Z" fill="#5C4030" stroke="#3D2548" strokeWidth="0.6" />
          {/* Eyebrows */}
          <path d="M 32 42 Q 38 39 44 42" fill="none" stroke="#3D2548" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 56 42 Q 62 39 68 42" fill="none" stroke="#3D2548" strokeWidth="1.2" strokeLinecap="round" />
          {/* Eyes — soft, slightly anxious */}
          <ellipse cx="38" cy="51" rx="3.5" ry="2.2" fill="#FAF6EE" stroke="#3D2548" strokeWidth="0.5" />
          <ellipse cx="62" cy="51" rx="3.5" ry="2.2" fill="#FAF6EE" stroke="#3D2548" strokeWidth="0.5" />
          <circle cx="38" cy="51" r="1.3" fill="#3D2548" />
          <circle cx="62" cy="51" r="1.3" fill="#3D2548" />
          {/* Nose */}
          <path d="M 50 56 Q 48 72 50 78 Q 52 72 50 56" fill="none" stroke="#3D2548" strokeWidth="0.5" opacity="0.5" />
          {/* Mouth — small, slightly nervous smile */}
          <path d="M 44 92 Q 50 89 56 92" fill="#C8867A" stroke="#3D2548" strokeWidth="0.6" />
          <path d="M 44 92 Q 50 95 56 92" fill="#C8867A" stroke="#3D2548" strokeWidth="0.6" />
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginBottom: 3 }}>{FIRST_PATIENT.persona}</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13.5, color: '#3D2548', margin: 0, lineHeight: 1.45 }}>{FIRST_PATIENT.brief}</p>
        </div>
      </div>

      {/* Stage indicator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {FIRST_PATIENT.stages.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, background: i <= stage ? '#8B2C3C' : 'rgba(14,23,38,0.12)', transition: 'background 0.4s' }} />
        ))}
      </div>

      {/* Stage cue */}
      <div style={{ background: 'rgba(139,44,60,0.04)', borderLeft: '3px solid #8B2C3C', padding: '11px 14px', marginBottom: 14, borderRadius: 2 }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', color: '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Stage {stage + 1} of {FIRST_PATIENT.stages.length}</div>
        <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#3D2548', margin: 0, lineHeight: 1.5 }}>{currentStage.cue}</p>
      </div>

      {!revealOutcome ? (
        currentStage.choices.map((choice, i) => (
          <button key={i} onClick={() => submit(i)} style={{
            width: '100%', textAlign: 'left',
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(14,23,38,0.1)',
            borderLeft: choice.upsell ? '3px solid #8B2C3C' : '3px solid #1A4D5E',
            padding: '12px 14px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2,
          }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', lineHeight: 1.35 }}>{choice.label}</div>
            {choice.upsell && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#8B2C3C', fontWeight: 700, marginTop: 5, textTransform: 'uppercase' }}>Upsell pressure</div>}
          </button>
        ))
      ) : (
        <>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.12)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.22em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Outcome</div>
            <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#0E1726', margin: '0 0 10px', lineHeight: 1.5 }}>{currentChoice.outcomeFn ? currentChoice.outcomeFn(regulator) : currentChoice.outcome}</p>
            <div>{Object.entries(currentChoice.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
          </div>
          <Primary onClick={next}>{stage < FIRST_PATIENT.stages.length - 1 ? 'Continue →' : 'Finish Consultation →'}</Primary>
        </>
      )}
    </div>
  );
}

function InjectionGame({ faceCase, onComplete }) {
  // Step progression: beats (if any) → plan → inject → result
  const hasBeats = faceCase.consultBeats && faceCase.consultBeats.length > 0;
  const [step, setStep] = useState(hasBeats ? 'beats' : (faceCase.treatmentOptions ? 'plan' : 'inject'));
  const [beatIdx, setBeatIdx] = useState(0);
  const [beatChoice, setBeatChoice] = useState(null); // current beat's chosen option
  const [beatFx, setBeatFx] = useState({}); // accumulated fx from beats
  const [beatHistory, setBeatHistory] = useState([]); // {beatId, chosenLabel, correct}
  const [planChoice, setPlanChoice] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [depth, setDepth] = useState(null);
  const [technique, setTechnique] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const ready = selectedZone && depth && technique;

  const submit = () => {
    const r = scoreFaceCase(faceCase, selectedZone, depth, technique);
    setResult(r);
    setSubmitted(true);
  };

  // Convert injection score to stat effects
  const scoreToFx = (score) => {
    if (score >= 80) return { safety: 6, nps: 5, brand: 4, innovation: 3, cash: 1.5 };
    if (score >= 40) return { safety: 3, nps: 3, brand: 2, cash: 1 };
    if (score >= 0) return { safety: -2, nps: -1 };
    if (score >= -30) return { safety: -6, nps: -4, brand: -3, cash: -1 };
    return { safety: -12, nps: -8, brand: -8, compliance: -5, cash: -8 };
  };

  // ---- STEP: BEATS (consultation craft) ----
  if (step === 'beats') {
    const beatId = faceCase.consultBeats[beatIdx];
    const beat = CONSULT_BEATS[beatId];
    if (!beat) {
      // Misconfigured — skip
      setStep(faceCase.treatmentOptions ? 'plan' : 'inject');
      return null;
    }
    const totalBeats = faceCase.consultBeats.length;

    if (!beatChoice) {
      return (
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Consultation · Beat {beatIdx + 1} of {totalBeats}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <PersonaAvatar persona={faceCase.persona} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560' }}>{faceCase.persona}</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontStyle: 'italic', color: '#3D2548', marginTop: 3 }}>{faceCase.brief}</div>
            </div>
          </div>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {faceCase.consultBeats.map((_, i) => <div key={i} style={{ flex: 1, height: 3, background: i < beatIdx ? '#5C7A52' : i === beatIdx ? '#1A4D5E' : 'rgba(14,23,38,0.12)', borderRadius: 1 }} />)}
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 500, margin: '0 0 14px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{beat.prompt}</h3>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', fontStyle: 'italic', marginBottom: 6, letterSpacing: '0.04em' }}>Effects shown below each choice.</div>
          {beat.options.map((opt, i) => (
            <button key={i} onClick={() => setBeatChoice(opt)} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)', borderLeft: '3px solid #1A4D5E', padding: '11px 14px', marginBottom: 7, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14.5, fontWeight: 500, color: '#0E1726', lineHeight: 1.35, marginBottom: 5 }}>{opt.label}</div>
              <div>{Object.entries(opt.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
            </button>
          ))}
        </div>
      );
    }

    // Show beat response
    return (
      <div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Beat {beatIdx + 1} of {totalBeats} · Response</div>
        <div style={{ background: 'rgba(255,255,255,0.75)', padding: 13, borderLeft: '3px solid #1A4D5E', marginBottom: 10, borderRadius: 2 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700 }}>You chose</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14.5, fontWeight: 500, marginTop: 3 }}>{beatChoice.label}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.55)', padding: 13, marginBottom: 14, borderRadius: 2 }}>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, margin: '0 0 8px', lineHeight: 1.55, color: '#3D2548' }}>{beatChoice.response}</p>
          <div>{Object.entries(beatChoice.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
        </div>
        <Primary onClick={() => {
          // Accumulate fx
          const merged = { ...beatFx };
          for (const k in beatChoice.fx) merged[k] = (merged[k] || 0) + beatChoice.fx[k];
          setBeatFx(merged);
          setBeatHistory([...beatHistory, { beatId, label: beatChoice.label, correct: beatChoice.correct }]);
          // Advance
          if (beatIdx < totalBeats - 1) {
            setBeatIdx(beatIdx + 1);
            setBeatChoice(null);
          } else {
            // All beats done, move to plan
            setStep(faceCase.treatmentOptions ? 'plan' : 'inject');
            setBeatChoice(null);
          }
        }}>{beatIdx < totalBeats - 1 ? 'Next Beat →' : 'Move to Treatment Plan →'}</Primary>
      </div>
    );
  }

  // ---- STEP: PLAN ----
  if (step === 'plan') {
    if (!planChoice) {
      return (
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Consultation · Treatment Planning</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <PersonaAvatar persona={faceCase.persona} />
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560' }}>{faceCase.persona}</div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 500, margin: '3px 0 0', letterSpacing: '-0.02em', lineHeight: 1.15 }}>What do you recommend?</h2>
            </div>
          </div>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14.5, color: '#3D2548', margin: '0 0 8px', lineHeight: 1.55, padding: 12, background: 'rgba(26,77,94,0.04)', borderRadius: 2 }}>{faceCase.brief}</p>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 15.5, color: '#0E1726', margin: '14px 0 14px', lineHeight: 1.5, paddingLeft: 12, borderLeft: '3px solid #B8945F' }}>"{faceCase.treatmentRequest}"</p>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', fontStyle: 'italic', marginBottom: 6, letterSpacing: '0.04em' }}>Effects shown below each choice. Right answer is rarely the loudest.</div>
          {faceCase.treatmentOptions.map((opt, i) => (
            <button key={i} onClick={() => setPlanChoice(opt)} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)', borderLeft: '3px solid #1A4D5E', padding: '12px 15px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', lineHeight: 1.35, marginBottom: 6 }}>{opt.label}</div>
              <div>{Object.entries(opt.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
            </button>
          ))}
        </div>
      );
    }
    // Show response, offer to proceed or decline
    const declined = planChoice.label.toLowerCase().startsWith('decline') || planChoice.label.toLowerCase().includes('refer');
    return (
      <div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Consultation · Outcome</div>
        <div style={{ background: 'rgba(255,255,255,0.75)', padding: 14, borderLeft: '3px solid #1A4D5E', marginBottom: 10, borderRadius: 2 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700 }}>You recommended</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginTop: 3 }}>{planChoice.label}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.55)', padding: 14, marginBottom: 14, borderRadius: 2 }}>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14.5, margin: '0 0 8px', lineHeight: 1.55, color: '#3D2548' }}>{planChoice.response}</p>
          <div>{Object.entries(planChoice.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
        </div>
        {declined ? (
          <Primary onClick={() => {
            const merged = { ...beatFx };
            for (const k in planChoice.fx) merged[k] = (merged[k] || 0) + planChoice.fx[k];
            onComplete(merged, 50);
          }}>Close Consultation →</Primary>
        ) : (
          <>
            <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13.5, color: '#5A5560', margin: '0 0 12px', lineHeight: 1.5 }}>She agrees. Now to the injection itself — pick the right zone, depth, and technique.</p>
            <Primary onClick={() => { setStep('inject'); }}>Proceed to Treatment →</Primary>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Treatment Suite</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <PersonaAvatar persona={faceCase.persona} />
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560' }}>{faceCase.persona}</div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 500, margin: '3px 0 0', letterSpacing: '-0.02em', lineHeight: 1.15 }}>Treatment Planning</h2>
        </div>
      </div>

      <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#3D2548', margin: '0 0 14px', lineHeight: 1.5, padding: 11, background: 'rgba(26,77,94,0.04)', borderRadius: 2 }}>{faceCase.brief}</p>

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.1)', padding: 12, marginBottom: 12, borderRadius: 2 }}>
        <FaceMap targetCase={faceCase} selectedZone={selectedZone} onSelectZone={setSelectedZone} showAnatomy={submitted} locked={submitted} />
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(184,148,95,0.3)', border: '1px solid #B8945F' }} />Treatment zones</span>
          {submitted && <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: '#8B2C3C' }} />Vessels</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#B8945F' }} />Foramen</span>
          </>}
        </div>
        {selectedZone && !submitted && (
          <div style={{ marginTop: 10, padding: 8, background: 'rgba(26,77,94,0.06)', borderRadius: 2, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#1A4D5E', textAlign: 'center' }}>
            Selected: <strong style={{ fontFamily: 'Fraunces, serif', fontWeight: 600 }}>{(FACE_ZONES.find(z => z.id === selectedZone || z.mirrors === selectedZone) || {}).label || selectedZone}</strong>
          </div>
        )}
      </div>

      {!submitted && (
        <>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#3D2548', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Depth / Plane</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
            {DEPTH_OPTIONS.map(d => (
              <button key={d.id} onClick={() => setDepth(d.id)} style={{
                background: depth === d.id ? '#0E1726' : 'rgba(255,255,255,0.6)',
                color: depth === d.id ? '#FAF6EE' : '#0E1726',
                border: `1px solid ${depth === d.id ? '#0E1726' : 'rgba(14,23,38,0.15)'}`,
                padding: '10px 8px', fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', borderRadius: 2, textAlign: 'left',
              }}>{d.label}</button>
            ))}
          </div>

          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#3D2548', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Technique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
            {TECHNIQUE_OPTIONS.map(t => (
              <button key={t.id} onClick={() => setTechnique(t.id)} style={{
                background: technique === t.id ? '#0E1726' : 'rgba(255,255,255,0.6)',
                color: technique === t.id ? '#FAF6EE' : '#0E1726',
                border: `1px solid ${technique === t.id ? '#0E1726' : 'rgba(14,23,38,0.15)'}`,
                padding: '10px 8px', fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', borderRadius: 2, textAlign: 'center',
              }}>{t.label}</button>
            ))}
          </div>

          <Primary onClick={submit} disabled={!ready}>Inject →</Primary>
        </>
      )}

      {submitted && result && (
        <>
          <div style={{ background: result.score >= 60 ? 'rgba(92,122,82,0.1)' : result.score >= 0 ? 'rgba(184,148,95,0.1)' : 'rgba(139,44,60,0.1)', border: `1px solid ${result.score >= 60 ? 'rgba(92,122,82,0.3)' : result.score >= 0 ? 'rgba(184,148,95,0.3)' : 'rgba(139,44,60,0.3)'}`, padding: 16, marginBottom: 12, borderRadius: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: result.score >= 60 ? '#5C7A52' : result.score >= 0 ? '#B8945F' : '#8B2C3C', textTransform: 'uppercase', fontWeight: 700 }}>
                {result.score >= 80 ? 'Excellent technique' : result.score >= 40 ? 'Acceptable' : result.score >= 0 ? 'Suboptimal' : result.score >= -30 ? 'Poor outcome' : 'Catastrophic'}
              </span>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, color: result.score >= 0 ? '#0E1726' : '#8B2C3C' }}>{result.score >= 0 ? '+' : ''}{result.score}</span>
            </div>
            {result.feedback.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, color: '#0E1726' }}>
                <span style={{ color: f.ok ? '#5C7A52' : '#8B2C3C', fontWeight: 700, flexShrink: 0 }}>{f.ok ? '✓' : '✗'}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.7)', borderLeft: '3px solid #1A4D5E', padding: 14, marginBottom: 14, borderRadius: 2 }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 5 }}>Teaching Point</div>
            <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, margin: 0, lineHeight: 1.55, color: '#3D2548' }}>{faceCase.teachingPoint}</p>
          </div>

          {/* Consultation report card — shows which consultation beats they got right/wrong */}
          {beatHistory && beatHistory.length > 0 && (() => {
            const correctCount = beatHistory.filter(b => b.correct).length;
            const totalBeats = beatHistory.length;
            const planCorrect = planChoice && planChoice.correct;
            const totalScore = correctCount + (planCorrect ? 1 : 0);
            const totalPossible = totalBeats + (planChoice ? 1 : 0);
            return (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.1)', padding: 14, marginBottom: 14, borderRadius: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700 }}>Consultation Card</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#5A5560', fontVariantNumeric: 'tabular-nums' }}>{totalScore} of {totalPossible} key decisions on-pattern</div>
                </div>
                {beatHistory.map((b, i) => {
                  const beat = CONSULT_BEATS[b.beatId];
                  const beatLabel = b.beatId.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
                  return (
                    <div key={i} style={{ display: 'flex', gap: 9, padding: '7px 0', borderBottom: i < beatHistory.length - 1 ? '1px solid rgba(14,23,38,0.06)' : 'none', alignItems: 'flex-start' }}>
                      <div style={{ flexShrink: 0, marginTop: 2 }}>
                        {b.correct ? (
                          <div style={{ width: 14, height: 14, background: '#5C7A52', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="9" height="7" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#FAF6EE" strokeWidth="1.5" fill="none" /></svg>
                          </div>
                        ) : (
                          <div style={{ width: 14, height: 14, background: 'rgba(139,44,60,0.85)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="7" height="7" viewBox="0 0 8 8"><path d="M1 1l6 6 M7 1l-6 6" stroke="#FAF6EE" strokeWidth="1.5" fill="none" /></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>{beatLabel}</div>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: '#0E1726', lineHeight: 1.35, marginTop: 1 }}>{b.label}</div>
                      </div>
                    </div>
                  );
                })}
                {planChoice && (
                  <div style={{ display: 'flex', gap: 9, padding: '7px 0', alignItems: 'flex-start', borderTop: '1px solid rgba(14,23,38,0.06)', marginTop: 4 }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      {planCorrect ? (
                        <div style={{ width: 14, height: 14, background: '#5C7A52', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="9" height="7" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#FAF6EE" strokeWidth="1.5" fill="none" /></svg>
                        </div>
                      ) : (
                        <div style={{ width: 14, height: 14, background: 'rgba(139,44,60,0.85)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="7" height="7" viewBox="0 0 8 8"><path d="M1 1l6 6 M7 1l-6 6" stroke="#FAF6EE" strokeWidth="1.5" fill="none" /></svg>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>Treatment plan</div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: '#0E1726', lineHeight: 1.35, marginTop: 1 }}>{planChoice.label}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <Primary onClick={() => {
            const injFx = scoreToFx(result.score);
            const merged = { ...injFx };
            // Layer planChoice fx
            if (planChoice) {
              for (const k in planChoice.fx) merged[k] = (merged[k] || 0) + planChoice.fx[k];
            }
            // Layer beat fx
            for (const k in beatFx) merged[k] = (merged[k] || 0) + beatFx[k];
            onComplete(merged, result.score);
          }}>Continue →</Primary>
        </>
      )}
    </div>
  );
}

function LocationMap({ selected, onSelect }) {
  // Stylised UK map with London inset
  return (
    <svg viewBox="0 0 360 400" style={{ width: '100%', height: 'auto', display: 'block', background: '#FAF6EE' }}>
      <defs>
        <filter id="locShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="0" dy="1" />
          <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* UK landmass — simplified outline */}
      <path d="M 140 20 Q 130 50 145 80 L 150 100 Q 140 110 145 130 L 160 150 Q 155 170 170 180 Q 180 200 165 220 Q 155 245 175 260 Q 195 285 180 310 Q 175 335 195 360 Q 215 370 235 360 Q 250 340 245 320 Q 260 290 245 270 Q 255 245 235 225 Q 245 200 225 180 Q 235 155 220 140 L 225 115 Q 215 95 205 75 Q 200 55 195 35 Q 175 15 140 20 Z" fill="rgba(184,148,95,0.12)" stroke="#B8945F" strokeWidth="1.4" strokeLinejoin="round" />

      {/* Scotland border line */}
      <line x1="160" y1="55" x2="220" y2="50" stroke="#B8945F" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />

      {/* London box */}
      <rect x="200" y="155" width="120" height="200" fill="rgba(26,77,94,0.04)" stroke="rgba(26,77,94,0.25)" strokeWidth="0.8" strokeDasharray="3 2" />
      <text x="260" y="370" fontSize="9" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle" letterSpacing="0.2em" textTransform="uppercase">GREATER LONDON</text>

      {/* Thames sketch in London inset */}
      <path d="M 205 230 Q 230 240 245 235 Q 270 240 290 230 Q 310 235 320 240" fill="none" stroke="#1A4D5E" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />

      {/* Location pins */}
      {LOCATIONS.map(l => {
        const isSelected = selected === l.id;
        const isLondon = ['marylebone', 'chelsea', 'shoreditch', 'wimbledon', 'croydon', 'richmond'].includes(l.id);
        const pinColor = isSelected ? '#8B2C3C' : (isLondon ? '#1A4D5E' : '#3D2548');
        return (
          <g key={l.id} onClick={() => onSelect(l.id)} style={{ cursor: 'pointer' }} filter={isSelected ? 'url(#locShadow)' : ''}>
            <circle cx={l.mx} cy={l.my} r="14" fill="transparent" />
            <circle cx={l.mx} cy={l.my} r={isSelected ? 8 : 5} fill={pinColor} stroke="#FAF6EE" strokeWidth="1.5" style={{ transition: 'r 0.2s' }} />
            {isSelected && <circle cx={l.mx} cy={l.my} r="14" fill="none" stroke={pinColor} strokeWidth="1" opacity="0.4">
              <animate attributeName="r" from="8" to="18" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>}
            <text x={l.mx} y={l.my - 12} fontSize="9" fill={isSelected ? '#0E1726' : '#5A5560'} fontFamily="Plus Jakarta Sans, sans-serif" fontWeight={isSelected ? 700 : 500} textAnchor="middle">{l.shortLabel}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- WEEKLY TICKER COMPONENT ----------

function WeeklyTicker({ events, onComplete, onMicroChoice }) {
  const [revealed, setRevealed] = useState(0);
  const [microResult, setMicroResult] = useState(null);

  useEffect(() => {
    if (revealed < events.length) {
      const timer = setTimeout(() => setRevealed(revealed + 1), 600);
      return () => clearTimeout(timer);
    }
  }, [revealed, events.length]);

  const currentMicro = events[revealed - 1]?.microChoice;
  const allRevealed = revealed >= events.length;

  return (
    <div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>The Twelve Weeks</div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, margin: '0 0 16px', letterSpacing: '-0.025em' }}>What the quarter actually looked like.</h2>

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', borderRadius: 2, marginBottom: 14 }}>
        {events.slice(0, revealed).map((ev, i) => {
          const catColor = { patient: '#5C7A52', brand: '#3D2548', ops: '#5A5560', risk: '#8B2C3C', competitor: '#B8945F', staff: '#1A4D5E', roster: '#5C7A52' }[ev.cat] || '#5A5560';
          return (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '10px 13px', borderBottom: i < revealed - 1 || (i === revealed - 1 && !allRevealed) ? '1px solid rgba(14,23,38,0.06)' : 'none', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, paddingTop: 1 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#9B9098', fontWeight: 600, letterSpacing: '0.05em' }}>WK</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: catColor, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{ev.week}</div>
              </div>
              <div style={{ width: 2, alignSelf: 'stretch', background: catColor, opacity: 0.5, borderRadius: 1 }} />
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, color: '#0E1726', margin: 0, lineHeight: 1.5, flex: 1 }}>{ev.text}</p>
            </div>
          );
        })}
        {!allRevealed && (
          <div style={{ padding: 14, textAlign: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#9B9098', fontStyle: 'italic' }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>·</span> the weeks unfold ·
          </div>
        )}
      </div>

      {currentMicro && !microResult && (
        <div style={{ background: 'rgba(184,148,95,0.08)', border: '1px solid rgba(184,148,95,0.3)', padding: 13, marginBottom: 12, borderRadius: 2 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.2em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Quick Decision</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13.5, color: '#3D2548', margin: '0 0 10px' }}>{currentMicro.prompt}</p>
          {currentMicro.options.map((o, i) => (
            <button key={i} onClick={() => { setMicroResult({ option: o, idx: i }); onMicroChoice(o, currentMicro); }} style={{
              width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)',
              padding: '9px 12px', marginBottom: 5, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2,
            }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 500, color: '#0E1726', marginBottom: 4 }}>{o.label}</div>
              <div>
                {o.fx && Object.entries(o.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}
                {o.loyaltyBoost !== undefined && (
                  <span style={{ display: 'inline-block', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, fontWeight: 600, color: o.loyaltyBoost > 0 ? '#5C7A52' : '#8B2C3C', background: o.loyaltyBoost > 0 ? 'rgba(92,122,82,0.1)' : 'rgba(139,44,60,0.08)', padding: '2px 6px', borderRadius: 2, marginRight: 4 }}>
                    Loyalty {o.loyaltyBoost > 0 ? '+' : ''}{o.loyaltyBoost}
                  </span>
                )}
                {o.removeStaff && <span style={{ display: 'inline-block', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, fontWeight: 600, color: '#8B2C3C', background: 'rgba(139,44,60,0.08)', padding: '2px 6px', borderRadius: 2 }}>They leave</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {allRevealed && (
        <Primary onClick={onComplete}>See the Q-End Review →</Primary>
      )}
    </div>
  );
}

// ---------- STAFF PANEL ----------

function StaffPanel({ hiredStaff, onHire, onFire, cash, hasPrescriber }) {
  const [view, setView] = useState('roster'); // 'roster' or 'hire'

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.1)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700 }}>Your Team</div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, margin: '3px 0 0' }}>{hiredStaff.length} on payroll</h3>
        </div>
        <button onClick={() => setView(view === 'roster' ? 'hire' : 'roster')} style={{ background: '#0E1726', color: '#FAF6EE', border: 'none', padding: '8px 14px', fontFamily: 'Fraunces, serif', fontSize: 12, cursor: 'pointer', borderRadius: 2 }}>{view === 'roster' ? 'Hire +' : '← Back'}</button>
      </div>

      {view === 'roster' ? (
        hiredStaff.length === 0 ? (
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#5A5560', margin: 0, lineHeight: 1.5 }}>It's just you for now. Hire your first team member when cash flow allows.</p>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {hiredStaff.map(s => {
              const role = STAFF_ROLES.find(r => r.id === s.roleId);
              return (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', background: 'rgba(255,255,255,0.6)', borderLeft: '2px solid #1A4D5E', borderRadius: 2 }}>
                  <div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>{s.name}</div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560' }}>{role.label} · {formatGBP(role.wagePerQ)}/Q · loyalty {s.loyalty}/100</div>
                  </div>
                  <button onClick={() => onFire(s.id)} style={{ background: 'transparent', color: '#8B2C3C', border: '1px solid rgba(139,44,60,0.3)', padding: '5px 10px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, cursor: 'pointer', borderRadius: 2 }}>Let go</button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {STAFF_ROLES.map(r => {
            const alreadyHired = hiredStaff.some(s => s.roleId === r.id);
            const canAfford = cash >= r.hireCost;
            const canHire = !alreadyHired && canAfford && (!r.requiresPrescriber || hasPrescriber);
            return (
              <div key={r.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.6)', border: `1px solid ${canHire ? 'rgba(14,23,38,0.1)' : 'rgba(14,23,38,0.05)'}`, borderRadius: 2, opacity: canHire ? 1 : 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726' }}>{r.label}</div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#B8945F', fontWeight: 600 }}>{formatGBP(r.hireCost)} hire · {formatGBP(r.wagePerQ)}/Q</div>
                </div>
                <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#5A5560', margin: '3px 0 6px', lineHeight: 1.4 }}>{r.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>{Object.entries(r.fx).filter(([k, v]) => v !== 0 && k !== 'retention').map(([k, v]) => <FxChip key={k} stat={k} val={v} />)}</div>
                  <button onClick={() => canHire && onHire(r.id)} disabled={!canHire} style={{ background: canHire ? '#1A4D5E' : 'rgba(14,23,38,0.1)', color: canHire ? '#FAF6EE' : '#9B9098', border: 'none', padding: '7px 14px', fontFamily: 'Fraunces, serif', fontSize: 12, cursor: canHire ? 'pointer' : 'not-allowed', borderRadius: 2 }}>
                    {alreadyHired ? 'Hired' : (!canAfford ? 'Cash short' : (r.requiresPrescriber && !hasPrescriber ? 'Needs prescriber' : 'Hire'))}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- PATIENT ROSTER PANEL ----------

function PatientRosterPanel({ patients }) {
  if (!patients || patients.length === 0) return null;
  const sortedByValue = [...patients].sort((a, b) => b.cumulativeValue - a.cumulativeValue);
  const top = sortedByValue.slice(0, 5);
  const totalValue = patients.reduce((s, p) => s + p.cumulativeValue, 0);
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.1)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700 }}>Patient Roster</div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, margin: '3px 0 0' }}>{patients.length} on file · {formatGBP(totalValue)} cumulative</h3>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 5 }}>
        {top.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', background: 'rgba(255,255,255,0.6)', borderLeft: `2px solid ${p.status === 'lost' ? '#8B2C3C' : p.status === 'churned' ? '#9B9098' : '#5C7A52'}`, borderRadius: 2 }}>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 500, color: '#0E1726' }}>{p.name}</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560' }}>{p.archetypeLabel} · {p.visits} visits · {p.status}</div>
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: '#1A4D5E', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatGBP(p.cumulativeValue)}</div>
          </div>
        ))}
        {patients.length > 5 && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#9B9098', textAlign: 'center', fontStyle: 'italic', marginTop: 3 }}>+ {patients.length - 5} more</div>}
      </div>
    </div>
  );
}

// ---------- SUITOR TRACKER ----------
// Shows live progress toward each acquirer's thresholds. Updates every results screen.
// ---------- OPERATIONAL PANEL ----------
// The player's operational cost levers. Three policy dials + a CapEx commitment for this quarter.
// Each dial is tied to a business concept. Each choice has direct, visible consequences.
// ---------- TREATMENT MIX PANEL ----------
// Player allocates 100% of clinical time across six product categories.
// Each category has its own ticket, margin, and acquirer signal. Mix IS positioning.
// ---------- EXPANSION PANEL ----------
// Multi-site decisions. Gated behind Brand 65+ and trailing 2Q EBITDA ≥ £30k.
// Two paths: organic open (premium capex, clean brand) vs acquire (cheaper, integration risk).
function ExpansionPanel({ state, sites, financialHistory, cash, brand, setSites, setPendingExpansion, quarter, log, setLog }) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('organic'); // 'organic' | 'acquire'

  // Gating logic
  const trailing2Q = financialHistory.slice(-2).reduce((s, h) => s + (h.ebitda || 0), 0);
  const meetsBrandGate = brand >= 65;
  const meetsEbitdaGate = trailing2Q >= 30;
  const isUnlocked = meetsBrandGate && meetsEbitdaGate;

  const chainSize = 1 + sites.filter(s => s.health !== 'failed').length;
  const failedCount = sites.filter(s => s.health === 'failed').length;
  const strugglingCount = sites.filter(s => s.health === 'struggling').length;

  const openSite = (option, type) => {
    if (cash < option.cost) return;
    const newSite = {
      id: `site-${quarter}-${Math.floor(Math.random() * 1000)}`,
      name: option.label,
      monthlyCost: option.monthlyCost,
      capacity: option.capacity,
      throughputBoost: option.throughputBoost,
      brandCarry: option.brandStartingPct,
      health: type === 'acquisition' && Math.random() < option.assimilationRisk ? 'struggling' : 'healthy',
      origin: type,
      openedQ: quarter,
      capexCost: option.cost,
    };
    setSites([...sites, newSite]);
    setLog([...log, { quarter, event: `${type === 'organic' ? 'Opened' : 'Acquired'}: ${option.label} (£${option.cost}k)`, expansion: true }]);
    setPendingExpansion({ type, option, site: newSite });
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(184,148,95,0.4)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
      <button onClick={() => setShowPanel(!showPanel)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700 }}>Chain Expansion · Q{quarter}</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#0E1726', marginTop: 2 }}>
            {chainSize === 1 ? 'One site — your founding clinic.' : `${chainSize} sites operating${failedCount > 0 ? `, ${failedCount} closed` : ''}${strugglingCount > 0 ? `, ${strugglingCount} struggling` : ''}.`}
          </div>
        </div>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, color: '#B8945F', fontWeight: 300 }}>{showPanel ? '−' : '+'}</span>
      </button>

      {showPanel && (
        <div className="ai-fade-in" style={{ marginTop: 12 }}>
          {!isUnlocked ? (
            <div style={{ padding: 10, background: 'rgba(14,23,38,0.04)', borderLeft: '2px solid rgba(14,23,38,0.2)', borderRadius: 2 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, letterSpacing: '0.08em', color: '#5A5560', fontWeight: 600, marginBottom: 6 }}>EXPANSION LOCKED</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: '#3D2548', lineHeight: 1.55, marginBottom: 8 }}>
                Open a second site once you've proven the model. Two gates must be cleared:
              </div>
              <div style={{ display: 'grid', gap: 4, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: meetsBrandGate ? '#5C7A52' : '#8B2C3C' }}>{meetsBrandGate ? '✓' : '○'} Brand ≥ 65</span>
                  <span style={{ color: '#5A5560', fontVariantNumeric: 'tabular-nums' }}>Current: {brand}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: meetsEbitdaGate ? '#5C7A52' : '#8B2C3C' }}>{meetsEbitdaGate ? '✓' : '○'} Trailing 2Q EBITDA ≥ £30k</span>
                  <span style={{ color: '#5A5560', fontVariantNumeric: 'tabular-nums' }}>Current: {formatGBPInline(trailing2Q)}</span>
                </div>
              </div>
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11.5, color: '#5A5560', marginTop: 10, lineHeight: 1.5, margin: '10px 0 0' }}>
                Replication needs a proven model. Pharma acquirers pay premiums (1.5–2.5×) for healthy chains. Below the gates, expansion destroys value.
              </p>
            </div>
          ) : (
            <>
              {/* Existing sites status */}
              {sites.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 600, marginBottom: 5 }}>Your Sites</div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {sites.map((site, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 9px', background: 'rgba(255,255,255,0.6)', borderLeft: `2px solid ${site.health === 'failed' ? '#9B9098' : site.health === 'struggling' ? '#8B2C3C' : '#5C7A52'}`, borderRadius: 2, opacity: site.health === 'failed' ? 0.55 : 1 }}>
                        <div>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 12.5, color: '#0E1726' }}>{site.name}</div>
                          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560', marginTop: 1 }}>{site.origin === 'organic' ? 'Built' : 'Acquired'} Q{site.openedQ} · £{site.monthlyCost}k/Q · {site.capacity} ceiling</div>
                        </div>
                        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: site.health === 'failed' ? '#9B9098' : site.health === 'struggling' ? '#8B2C3C' : '#5C7A52' }}>{site.health}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid rgba(14,23,38,0.1)' }}>
                {['organic', 'acquire'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '7px 10px', background: 'transparent', border: 'none', borderBottom: activeTab === tab ? '2px solid #B8945F' : '2px solid transparent', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? '#B8945F' : '#5A5560', cursor: 'pointer', letterSpacing: '0.06em' }}>
                    {tab === 'organic' ? 'OPEN A NEW SITE' : 'ACQUIRE A COMPETITOR'}
                  </button>
                ))}
              </div>

              {activeTab === 'organic' && (
                <div style={{ display: 'grid', gap: 6 }}>
                  {ORGANIC_SITE_OPTIONS.map(opt => {
                    const canAfford = cash >= opt.cost;
                    return (
                      <button key={opt.id} onClick={() => canAfford && openSite(opt, 'organic')} disabled={!canAfford} style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px',
                        background: 'rgba(255,255,255,0.6)',
                        border: '1px solid rgba(184,148,95,0.3)',
                        borderLeft: '3px solid #B8945F',
                        cursor: canAfford ? 'pointer' : 'not-allowed', opacity: canAfford ? 1 : 0.5,
                        borderRadius: 2, fontFamily: 'inherit'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500 }}>{opt.label}</span>
                          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontVariantNumeric: 'tabular-nums', color: '#B8945F' }}>£{opt.cost}k</span>
                        </div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 3, lineHeight: 1.45 }}>{opt.desc}</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', marginTop: 4, letterSpacing: '0.04em' }}>+{opt.capacity} capacity · £{opt.monthlyCost}k/Q running cost · +{Math.round(opt.throughputBoost * 100)}% throughput</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'acquire' && (
                <div style={{ display: 'grid', gap: 6 }}>
                  {ACQUISITION_TARGETS.map(opt => {
                    const canAfford = cash >= opt.cost;
                    return (
                      <button key={opt.id} onClick={() => canAfford && openSite(opt, 'acquisition')} disabled={!canAfford} style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px',
                        background: 'rgba(255,255,255,0.6)',
                        border: '1px solid rgba(139,44,60,0.25)',
                        borderLeft: '3px solid #8B2C3C',
                        cursor: canAfford ? 'pointer' : 'not-allowed', opacity: canAfford ? 1 : 0.5,
                        borderRadius: 2, fontFamily: 'inherit'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500 }}>{opt.label}</span>
                          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontVariantNumeric: 'tabular-nums', color: '#8B2C3C' }}>£{opt.cost}k</span>
                        </div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 3, lineHeight: 1.45 }}>{opt.desc}</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', marginTop: 4, letterSpacing: '0.04em' }}>+{opt.capacity} capacity · £{opt.monthlyCost}k/Q · {Math.round(opt.assimilationRisk * 100)}% integration risk</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {chainSize >= 3 && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(184,148,95,0.1)', borderLeft: '2px solid #B8945F', borderRadius: 2 }}>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#3D2548', fontWeight: 600 }}>Roll-up Multiple Active:</span>
                  <span style={{ fontFamily: 'Fraunces, serif', fontSize: 12, color: '#3D2548', marginLeft: 6, fontStyle: 'italic' }}>
                    Chain of {chainSize} sites → ×{chainSize >= 6 ? '2.5' : chainSize >= 4 ? '2.0' : '1.5'} on all exit multiples.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- MARKETING CHANNEL PANEL ----------
// Player allocates marketing budget across 4 channels. Each has CAC, ASA risk, brand fx.
function MarketingChannelPanel({ channelMix, setChannelMix, quarter }) {
  const [open, setOpen] = useState(false);
  const [openConcept, setOpenConcept] = useState(null);
  const total = Object.values(channelMix).reduce((a, b) => a + b, 0);
  const isValid = total === 100;

  // Compute weighted stats for preview
  let weightedCAC = 0, totalAsa = 0, totalBrandFx = 0;
  MARKETING_CHANNELS.forEach(ch => {
    const pct = (channelMix[ch.id] || 0) / 100;
    weightedCAC += pct * ch.cac;
    totalAsa += pct * ch.asaRisk;
    totalBrandFx += pct * ch.brandFx;
  });

  const adjust = (chId, delta) => {
    const newPct = Math.max(0, Math.min(100, (channelMix[chId] || 0) + delta));
    setChannelMix({ ...channelMix, [chId]: newPct });
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 12, marginBottom: 12, borderRadius: 2 }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5C7A52', fontWeight: 700 }}>Marketing Channels · Q{quarter}</div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginTop: 1 }}>Blended CAC £{Math.round(weightedCAC)} · {isValid ? 'mix balanced' : `${total}% allocated`}</div>
        </div>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, color: '#5C7A52', fontWeight: 300 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="ai-fade-in" style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginBottom: 6 }}>
            <button onClick={() => setOpenConcept(openConcept === 'channel-mix' ? null : 'channel-mix')} style={{ background: openConcept === 'channel-mix' ? '#5C7A52' : 'transparent', color: openConcept === 'channel-mix' ? '#FAF6EE' : '#5C7A52', border: '1px solid #5C7A52', padding: '3px 7px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em' }}>LEARN: MIX</button>
            <button onClick={() => setOpenConcept(openConcept === 'asa-compliance' ? null : 'asa-compliance')} style={{ background: openConcept === 'asa-compliance' ? '#8B2C3C' : 'transparent', color: openConcept === 'asa-compliance' ? '#FAF6EE' : '#8B2C3C', border: '1px solid #8B2C3C', padding: '3px 7px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em' }}>LEARN: ASA</button>
          </div>
          {openConcept === 'channel-mix' && <div style={{ marginBottom: 10 }}><ConceptCard conceptId="channel-mix" /></div>}
          {openConcept === 'asa-compliance' && <div style={{ marginBottom: 10 }}><ConceptCard conceptId="asa-compliance" /></div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
            <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.5)', borderRadius: 2, borderLeft: '2px solid #5C7A52' }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#5A5560', letterSpacing: '0.08em' }}>BLENDED CAC</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>£{Math.round(weightedCAC)}</div>
            </div>
            <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.5)', borderRadius: 2, borderLeft: `2px solid ${totalAsa > 0.12 ? '#8B2C3C' : '#1A4D5E'}` }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#5A5560', letterSpacing: '0.08em' }}>ASA RISK</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: totalAsa > 0.12 ? '#8B2C3C' : '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{Math.round(totalAsa * 100)}%</div>
            </div>
            <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.5)', borderRadius: 2, borderLeft: '2px solid #3D2548' }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#5A5560', letterSpacing: '0.08em' }}>BRAND FX</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: totalBrandFx >= 1.5 ? '#5C7A52' : '#0E1726', fontVariantNumeric: 'tabular-nums' }}>+{totalBrandFx.toFixed(1)}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {MARKETING_CHANNELS.map(ch => {
              const pct = channelMix[ch.id] || 0;
              return (
                <div key={ch.id} style={{ padding: '8px 10px', background: pct > 0 ? `${ch.color}10` : 'rgba(255,255,255,0.5)', border: pct > 0 ? `1px solid ${ch.color}40` : '1px solid rgba(14,23,38,0.08)', borderLeft: `3px solid ${pct > 0 ? ch.color : 'rgba(14,23,38,0.15)'}`, borderRadius: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 500, color: '#0E1726' }}>{ch.label}</span>
                        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>· {ch.sub}</span>
                      </div>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginTop: 2, lineHeight: 1.4 }}>£{ch.cac} CAC · {Math.round(ch.asaRisk * 100)}% ASA risk · brand fx +{ch.brandFx}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => adjust(ch.id, -5)} disabled={pct <= 0} style={{ width: 20, height: 20, background: pct > 0 ? ch.color : 'rgba(14,23,38,0.1)', color: pct > 0 ? '#FAF6EE' : '#9B9098', border: 'none', borderRadius: 2, cursor: pct > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 600, padding: 0, lineHeight: 1 }}>−</button>
                      <div style={{ width: 34, textAlign: 'center', fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
                      <button onClick={() => adjust(ch.id, +5)} disabled={total >= 100} style={{ width: 20, height: 20, background: total < 100 ? ch.color : 'rgba(14,23,38,0.1)', color: total < 100 ? '#FAF6EE' : '#9B9098', border: 'none', borderRadius: 2, cursor: total < 100 ? 'pointer' : 'not-allowed', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 600, padding: 0, lineHeight: 1 }}>+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!isValid && (
            <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(184,148,95,0.08)', borderLeft: '2px solid #B8945F', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#3D2548', borderRadius: 2 }}>{total < 100 ? `Allocate ${100 - total}% more.` : `Reduce by ${total - 100}%.`}</div>
          )}
          {totalAsa > 0.12 && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(139,44,60,0.08)', borderLeft: '2px solid #8B2C3C', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#8B2C3C', borderRadius: 2 }}>High ASA breach risk this quarter. Reduce TikTok exposure or expect a compliance hit.</div>
          )}
        </div>
      )}
    </div>
  );
}

function TreatmentMixPanel({ treatmentMix, setTreatmentMix, ebdUnlocked, setEbdUnlocked, setActiveCapex, activeCapex, state, cash, quarter }) {
  const [openConcept, setOpenConcept] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const totalPct = Object.values(treatmentMix).reduce((a, b) => a + b, 0);
  const isValid = totalPct === 100;

  // Compute weighted ticket and margin for live feedback
  let weightedTicket = 0;
  let weightedMargin = 0;
  TREATMENT_CATEGORIES.forEach(cat => {
    const pct = treatmentMix[cat.id] || 0;
    weightedTicket += pct * cat.avgTicket;
    weightedMargin += pct * (1 - cat.cogsRate);
  });
  weightedTicket = totalPct > 0 ? weightedTicket / totalPct : 0;
  weightedMargin = totalPct > 0 ? weightedMargin / totalPct : 0;

  const adjust = (catId, delta) => {
    const newPct = Math.max(0, Math.min(100, (treatmentMix[catId] || 0) + delta));
    setTreatmentMix({ ...treatmentMix, [catId]: newPct });
  };

  const unlockEBD = () => {
    if (cash < 24) return;
    setEbdUnlocked(true);
    setActiveCapex([...activeCapex, {
      name: 'RF Microneedling Platform',
      amount: 24,
      quartersRemaining: 8,
      quarterlyDepreciation: 3,
    }]);
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3D2548', fontWeight: 700 }}>Treatment Mix · Q{quarter}</div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560', marginTop: 2 }}>The mix IS your positioning. Six categories. 100% to allocate.</div>
        </div>
        <button onClick={() => setOpenConcept(openConcept === 'product-mix' ? null : 'product-mix')} style={{ background: openConcept === 'product-mix' ? '#3D2548' : 'transparent', color: openConcept === 'product-mix' ? '#FAF6EE' : '#3D2548', border: '1px solid #3D2548', padding: '4px 9px', fontSize: 9.5, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.08em' }}>LEARN</button>
      </div>

      {openConcept === 'product-mix' && <div style={{ marginBottom: 10 }}><ConceptCard conceptId="product-mix" /></div>}

      {/* Total pct indicator */}
      <div style={{ marginBottom: 12, padding: '8px 10px', background: isValid ? 'rgba(92,122,82,0.08)' : 'rgba(139,44,60,0.08)', border: `1px solid ${isValid ? 'rgba(92,122,82,0.3)' : 'rgba(139,44,60,0.3)'}`, borderRadius: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: isValid ? '#5C7A52' : '#8B2C3C', fontWeight: 700, letterSpacing: '0.08em' }}>{isValid ? 'MIX BALANCED' : `${totalPct}% ALLOCATED — TARGET 100%`}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 11.5, fontStyle: 'italic', color: '#5A5560', marginTop: 2 }}>
              Avg ticket £{(weightedTicket * 1000).toFixed(0)} · Margin {(weightedMargin * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Per-category allocators */}
      <div style={{ display: 'grid', gap: 7 }}>
        {TREATMENT_CATEGORIES.map(cat => {
          const pct = treatmentMix[cat.id] || 0;
          const isLocked = cat.requires && !cat.requires({ ...state, ebdUnlocked });
          const needsEBDUnlock = cat.id === 'ebd' && !ebdUnlocked;
          return (
            <div key={cat.id} style={{
              padding: '9px 11px',
              background: pct > 0 ? `${cat.color}10` : 'rgba(255,255,255,0.5)',
              border: pct > 0 ? `1px solid ${cat.color}40` : '1px solid rgba(14,23,38,0.08)',
              borderLeft: `3px solid ${pct > 0 ? cat.color : 'rgba(14,23,38,0.15)'}`,
              borderRadius: 2,
              opacity: isLocked ? 0.55 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>{cat.label}</span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>· {cat.sub}</span>
                  </div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', lineHeight: 1.4 }}>
                    £{Math.round(cat.avgTicket * 1000)} ticket · {Math.round((1 - cat.cogsRate) * 100)}% margin
                    {showDetail && <span> · {cat.desc}</span>}
                  </div>
                  {isLocked && !needsEBDUnlock && (
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#8B2C3C', marginTop: 3, fontStyle: 'italic' }}>
                      {cat.id === 'biostim' ? 'Requires Innovation 50+' : cat.id === 'poly' ? 'Requires Innovation 55+' : 'Locked'}
                    </div>
                  )}
                  {needsEBDUnlock && (
                    <button onClick={unlockEBD} disabled={cash < 24} style={{ marginTop: 5, padding: '4px 8px', background: cash >= 24 ? cat.color : 'rgba(14,23,38,0.1)', color: cash >= 24 ? '#FAF6EE' : '#9B9098', border: 'none', borderRadius: 2, cursor: cash >= 24 ? 'pointer' : 'not-allowed', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                      UNLOCK · £24K RF PLATFORM →
                    </button>
                  )}
                </div>
                {!isLocked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => adjust(cat.id, -5)} disabled={pct <= 0} style={{ width: 22, height: 22, background: pct > 0 ? cat.color : 'rgba(14,23,38,0.1)', color: pct > 0 ? '#FAF6EE' : '#9B9098', border: 'none', borderRadius: 2, cursor: pct > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 600, padding: 0, lineHeight: 1 }}>−</button>
                    <div style={{ width: 38, textAlign: 'center', fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
                    <button onClick={() => adjust(cat.id, +5)} disabled={totalPct >= 100} style={{ width: 22, height: 22, background: totalPct < 100 ? cat.color : 'rgba(14,23,38,0.1)', color: totalPct < 100 ? '#FAF6EE' : '#9B9098', border: 'none', borderRadius: 2, cursor: totalPct < 100 ? 'pointer' : 'not-allowed', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 600, padding: 0, lineHeight: 1 }}>+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowDetail(!showDetail)} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#5A5560', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, cursor: 'pointer', padding: 0, letterSpacing: '0.04em' }}>{showDetail ? '− Hide category descriptions' : '+ Show category descriptions'}</button>

      {!isValid && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(184,148,95,0.08)', borderLeft: '2px solid #B8945F', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#3D2548', lineHeight: 1.5, borderRadius: 2 }}>
          {totalPct < 100 ? `Allocate ${100 - totalPct}% more to reach a balanced mix. Unallocated capacity is wasted.` : `Reduce by ${totalPct - 100}% — overallocation forces you into unsustainable double-booking.`}
        </div>
      )}
    </div>
  );
}

function OperationalPanel({
  marketingPolicy, setMarketingPolicy,
  supplierStrategy, setSupplierStrategy,
  workingCapitalPolicy, setWorkingCapitalPolicy,
  capexThisQ, setCapexThisQ, setActiveCapex, activeCapex,
  cash, quarter
}) {
  const [openConcept, setOpenConcept] = useState(null);
  const [capexOpen, setCapexOpen] = useState(false);

  const policyOptions = {
    marketing: [
      { id: 'conservative', label: 'Conservative', sub: '−45% spend · −22% demand', tone: '#5C7A52' },
      { id: 'standard', label: 'Standard', sub: 'Industry default', tone: '#5A5560' },
      { id: 'aggressive', label: 'Aggressive', sub: '+70% spend · +18% demand', tone: '#8B2C3C' },
    ],
    supplier: [
      { id: 'generic', label: 'Generic', sub: '−28% COGS · brand drag', tone: '#5C7A52' },
      { id: 'standard', label: 'Standard', sub: 'Mixed formulary', tone: '#5A5560' },
      { id: 'premium', label: 'Premium', sub: '+35% COGS · brand lift', tone: '#3D2548' },
    ],
    wc: [
      { id: 'stretch', label: 'Stretch Terms', sub: '+cash · ethics hit', tone: '#5C7A52' },
      { id: 'standard', label: 'Standard', sub: 'Pay on time', tone: '#5A5560' },
      { id: 'pay-early', label: 'Pay Early', sub: '−cash · trust+', tone: '#3D2548' },
    ],
  };

  const PolicyButton = ({ active, onClick, label, sub, tone }) => (
    <button onClick={onClick} style={{
      flex: 1, padding: '8px 6px', background: active ? `${tone}15` : 'rgba(255,255,255,0.5)',
      border: active ? `1px solid ${tone}` : '1px solid rgba(14,23,38,0.1)',
      borderLeft: active ? `3px solid ${tone}` : '1px solid rgba(14,23,38,0.1)',
      cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', textAlign: 'left'
    }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 12.5, fontWeight: active ? 600 : 500, color: active ? tone : '#0E1726' }}>{label}</div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: '#5A5560', marginTop: 2, lineHeight: 1.3 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3D2548', fontWeight: 700 }}>Operational Levers · Q{quarter}</div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098' }}>3 policies · 1 capex window</div>
      </div>

      {/* Marketing Spend */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#0E1726', fontWeight: 600 }}>Marketing Spend Policy</span>
          <button onClick={() => setOpenConcept(openConcept === 'marketing-spend-policy' ? null : 'marketing-spend-policy')} style={{ background: 'transparent', border: '1px solid #1A4D5E', color: '#1A4D5E', padding: '1px 6px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>LEARN</button>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {policyOptions.marketing.map(p => <PolicyButton key={p.id} active={marketingPolicy === p.id} onClick={() => setMarketingPolicy(p.id)} label={p.label} sub={p.sub} tone={p.tone} />)}
        </div>
        {openConcept === 'marketing-spend-policy' && <div style={{ marginTop: 8 }}><ConceptCard conceptId="marketing-spend-policy" /></div>}
      </div>

      {/* Supplier Strategy */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#0E1726', fontWeight: 600 }}>Supplier Strategy</span>
          <button onClick={() => setOpenConcept(openConcept === 'supplier-strategy' ? null : 'supplier-strategy')} style={{ background: 'transparent', border: '1px solid #1A4D5E', color: '#1A4D5E', padding: '1px 6px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>LEARN</button>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {policyOptions.supplier.map(p => <PolicyButton key={p.id} active={supplierStrategy === p.id} onClick={() => setSupplierStrategy(p.id)} label={p.label} sub={p.sub} tone={p.tone} />)}
        </div>
        {openConcept === 'supplier-strategy' && <div style={{ marginTop: 8 }}><ConceptCard conceptId="supplier-strategy" /></div>}
      </div>

      {/* Working Capital */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#0E1726', fontWeight: 600 }}>Working Capital Policy</span>
          <button onClick={() => setOpenConcept(openConcept === 'working-capital' ? null : 'working-capital')} style={{ background: 'transparent', border: '1px solid #1A4D5E', color: '#1A4D5E', padding: '1px 6px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>LEARN</button>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {policyOptions.wc.map(p => <PolicyButton key={p.id} active={workingCapitalPolicy === p.id} onClick={() => setWorkingCapitalPolicy(p.id)} label={p.label} sub={p.sub} tone={p.tone} />)}
        </div>
        {openConcept === 'working-capital' && <div style={{ marginTop: 8 }}><ConceptCard conceptId="working-capital" /></div>}
      </div>

      {/* CapEx commitment */}
      <div style={{ borderTop: '1px solid rgba(14,23,38,0.06)', paddingTop: 10 }}>
        <button onClick={() => setCapexOpen(!capexOpen)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#0E1726', fontWeight: 600 }}>Capital Investment {capexThisQ > 0 && <span style={{ color: '#B8945F' }}>· £{capexThisQ}k committed</span>}</div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: '#9B9098', marginTop: 1 }}>{activeCapex.length > 0 ? `${activeCapex.length} prior asset(s) depreciating` : 'No active CapEx'}</div>
          </div>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, color: '#1A4D5E', fontWeight: 300 }}>{capexOpen ? '−' : '+'}</span>
        </button>
        {capexOpen && (
          <div className="ai-fade-in" style={{ marginTop: 10 }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginBottom: 8, lineHeight: 1.5 }}>
              Capital investments hit cash now but depreciate over their useful life — protecting EBITDA. Cash position falls; reported profit does not.
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {[
                { name: '3D Imaging System', amount: 12, quarters: 8, fxBoost: { innovation: 4, nps: 3, brand: 2 } },
                { name: 'RF Microneedling Device', amount: 24, quarters: 8, fxBoost: { innovation: 6, brand: 3 } },
                { name: 'Premium Treatment Furniture', amount: 8, quarters: 12, fxBoost: { brand: 4, nps: 2 } },
                { name: 'Clinic Refurbishment', amount: 18, quarters: 16, fxBoost: { brand: 6, nps: 3 } },
              ].map((item, i) => {
                const canAfford = cash >= item.amount;
                const selected = capexThisQ === item.amount;
                return (
                  <button key={i} onClick={() => canAfford && setCapexThisQ(selected ? 0 : item.amount)} disabled={!canAfford} style={{
                    width: '100%', textAlign: 'left', padding: '8px 11px',
                    background: selected ? 'rgba(184,148,95,0.12)' : 'rgba(255,255,255,0.5)',
                    border: selected ? '1px solid #B8945F' : '1px solid rgba(14,23,38,0.08)',
                    borderLeft: selected ? '3px solid #B8945F' : '1px solid rgba(14,23,38,0.08)',
                    cursor: canAfford ? 'pointer' : 'not-allowed', opacity: canAfford ? 1 : 0.45, borderRadius: 2, fontFamily: 'inherit'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: '#0E1726' }}>{item.name}</span>
                      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>£{item.amount}k</span>
                    </div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560', marginTop: 2, lineHeight: 1.4 }}>Depreciates over {item.quarters} quarters · ~£{(item.amount / item.quarters).toFixed(1)}k/Q</div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setOpenConcept(openConcept === 'capex-vs-opex' ? null : 'capex-vs-opex')} style={{ marginTop: 8, background: 'transparent', border: '1px solid #1A4D5E', color: '#1A4D5E', padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.08em' }}>LEARN: CAPEX VS OPEX</button>
            {openConcept === 'capex-vs-opex' && <div style={{ marginTop: 8 }}><ConceptCard conceptId="capex-vs-opex" /></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- RIVALS TRACKER ----------
// Compact panel showing the four named rivals and their current trajectory.
function RivalsTracker({ rivals, playerBrand }) {
  const [open, setOpen] = useState(false);
  const [showConcept, setShowConcept] = useState(false);
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 12, marginBottom: 12, borderRadius: 2 }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B2C3C', fontWeight: 700 }}>Competitive Landscape</div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560', marginTop: 1 }}>{rivals.filter(r => r.status === 'active' || r.status === 'ascendant').length} active rivals · {rivals.filter(r => r.status === 'failing').length} faltering</div>
        </div>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, color: '#8B2C3C', fontWeight: 300 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="ai-fade-in" style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={(e) => { e.stopPropagation(); setShowConcept(!showConcept); }} style={{ background: showConcept ? '#8B2C3C' : 'transparent', color: showConcept ? '#FAF6EE' : '#8B2C3C', border: '1px solid #8B2C3C', padding: '3px 7px', fontSize: 9, fontWeight: 700, borderRadius: 2, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em' }}>LEARN</button>
          </div>
          {showConcept && <ConceptCard conceptId="competitive-intel" />}
          {rivals.map((r, i) => {
            const delta = r.currentBrand - r.startingBrand;
            const tone = r.status === 'failing' ? '#8B2C3C' : r.status === 'ascendant' ? '#5C7A52' : r.color;
            return (
              <div key={i} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.55)', borderLeft: `2px solid ${tone}`, borderRadius: 2, opacity: r.status === 'failing' ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <div>
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 500, color: '#0E1726' }}>{r.name}</span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560', marginLeft: 6 }}>· {r.currentSites} site{r.currentSites === 1 ? '' : 's'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{r.currentBrand}</span>
                    {delta !== 0 && <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, fontWeight: 700, color: delta > 0 ? '#5C7A52' : '#8B2C3C' }}>{delta > 0 ? '+' : ''}{delta}</span>}
                  </div>
                </div>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', lineHeight: 1.45 }}>{r.desc}</div>
                {r.status === 'failing' && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: '#8B2C3C', marginTop: 3, fontStyle: 'italic', letterSpacing: '0.04em' }}>STATUS: FAILING</div>}
                {r.status === 'ascendant' && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: '#5C7A52', marginTop: 3, fontStyle: 'italic', letterSpacing: '0.04em' }}>STATUS: ASCENDANT</div>}
              </div>
            );
          })}
          <div style={{ marginTop: 4, padding: '6px 10px', background: 'rgba(184,148,95,0.06)', borderRadius: 2, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: '#5A5560', lineHeight: 1.5 }}>
            Your brand: <strong style={{ color: '#0E1726', fontStyle: 'normal' }}>{playerBrand}/100</strong>. {playerBrand > rivals.reduce((m, r) => Math.max(m, r.currentBrand), 0) ? 'You lead the market.' : playerBrand > 60 ? 'Competitive within the premium tier.' : 'Below the leading pack.'}
          </div>
        </div>
      )}
    </div>
  );
}

function SuitorTracker({ state, financialHistory }) {
  const recentQs = financialHistory.slice(-4);
  const annualEbitda = recentQs.reduce((sum, h) => sum + (h.ebitda || 0), 0);
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 12, marginBottom: 12, borderRadius: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700 }}>Suitor Tracker</div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560' }}>Annual EBITDA <strong style={{ color: '#0E1726', fontFamily: 'Fraunces, serif', fontSize: 13 }}>{annualEbitda >= 1 ? `£${Math.round(annualEbitda)}k` : annualEbitda > 0 ? `£${Math.round(annualEbitda * 1000)}` : '—'}</strong></div>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {SUITORS.map(suitor => {
          const checks = [];
          if (suitor.minEbitda) checks.push({ label: `EBITDA £${suitor.minEbitda}k`, met: annualEbitda >= suitor.minEbitda, current: annualEbitda, target: suitor.minEbitda });
          if (suitor.minBrand) checks.push({ label: `Brand ${suitor.minBrand}`, met: state.brand >= suitor.minBrand, current: state.brand, target: suitor.minBrand });
          if (suitor.minInnovation) checks.push({ label: `Innov ${suitor.minInnovation}`, met: state.innovation >= suitor.minInnovation, current: state.innovation, target: suitor.minInnovation });
          if (suitor.minSafety) checks.push({ label: `Safety ${suitor.minSafety}`, met: state.safety >= suitor.minSafety, current: state.safety, target: suitor.minSafety });
          if (suitor.minCompliance) checks.push({ label: `Compl ${suitor.minCompliance}`, met: state.compliance >= suitor.minCompliance, current: state.compliance, target: suitor.minCompliance });
          if (suitor.minNps) checks.push({ label: `NPS ${suitor.minNps}`, met: state.nps >= suitor.minNps, current: state.nps, target: suitor.minNps });
          const metCount = checks.filter(c => c.met).length;
          const qualified = metCount === checks.length;
          const suitorColors = { galde: '#1A4D5E', allergan: '#8B2C3C', merz: '#3D2548', cont: '#5C7A52' };
          const c = suitorColors[suitor.id] || '#5A5560';
          return (
            <div key={suitor.id} style={{ padding: '8px 11px', background: qualified ? `${c}10` : 'rgba(255,255,255,0.5)', border: `1px solid ${qualified ? `${c}40` : 'rgba(14,23,38,0.08)'}`, borderLeft: `3px solid ${c}`, borderRadius: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: '#0E1726' }}>{suitor.name}</div>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: qualified ? c : '#9B9098', fontWeight: 700, letterSpacing: '0.04em' }}>{qualified ? '✓ QUALIFIED' : `${metCount}/${checks.length}`}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {checks.map((ck, i) => (
                  <div key={i} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, padding: '2px 6px', borderRadius: 2, background: ck.met ? '#5C7A5220' : 'rgba(139,44,60,0.08)', color: ck.met ? '#5C7A52' : '#8B2C3C', fontWeight: 600 }}>
                    {ck.met ? '✓ ' : ''}{ck.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- SET-PIECE ILLUSTRATIONS ----------
const SetPieceIllustration = ({ archetype }) => {
  const common = { width: '100%', height: 100, viewBox: '0 0 400 100', xmlns: 'http://www.w3.org/2000/svg', style: { display: 'block', borderRadius: 2 } };
  if (archetype === 'press') return (
    <svg {...common}>
      <defs><linearGradient id="presBg" x1="0" x2="1"><stop offset="0%" stopColor="#1A4D5E" stopOpacity="0.12" /><stop offset="100%" stopColor="#3D2548" stopOpacity="0.06" /></linearGradient></defs>
      <rect width="400" height="100" fill="url(#presBg)" />
      <g transform="translate(40, 22)">
        <rect width="120" height="56" fill="#FFFFFF" stroke="#0E1726" strokeWidth="1.2" />
        <rect x="6" y="6" width="108" height="6" fill="#0E1726" />
        <rect x="6" y="16" width="80" height="3" fill="#0E1726" opacity="0.7" />
        <rect x="6" y="22" width="68" height="2" fill="#5A5560" />
        <rect x="6" y="28" width="92" height="2" fill="#5A5560" />
        <rect x="6" y="33" width="76" height="2" fill="#5A5560" />
        <rect x="6" y="38" width="88" height="2" fill="#5A5560" />
        <rect x="6" y="43" width="60" height="2" fill="#5A5560" />
      </g>
      <g transform="translate(200, 28)">
        <circle cx="40" cy="20" r="18" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <ellipse cx="34" cy="18" rx="2" ry="1.5" fill="#3D2548" /><ellipse cx="46" cy="18" rx="2" ry="1.5" fill="#3D2548" />
        <path d="M 32 26 Q 40 30 48 26" fill="none" stroke="#3D2548" strokeWidth="1" strokeLinecap="round" />
        <rect x="32" y="40" width="16" height="14" fill="#1A4D5E" />
        <rect x="64" y="14" width="100" height="32" fill="#B8945F" opacity="0.25" stroke="#B8945F" strokeWidth="0.8" />
        <text x="68" y="26" fontSize="8" fill="#3D2548" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" letterSpacing="0.1em">QUOTE</text>
        <rect x="68" y="30" width="80" height="2" fill="#5A5560" /><rect x="68" y="34" width="72" height="2" fill="#5A5560" /><rect x="68" y="38" width="56" height="2" fill="#5A5560" />
      </g>
    </svg>
  );
  if (archetype === 'audit') return (
    <svg {...common}>
      <defs><linearGradient id="audBg" x1="0" x2="1"><stop offset="0%" stopColor="#8B2C3C" stopOpacity="0.08" /><stop offset="100%" stopColor="#1A4D5E" stopOpacity="0.1" /></linearGradient></defs>
      <rect width="400" height="100" fill="url(#audBg)" />
      <g transform="translate(60, 18)">
        <rect width="60" height="64" fill="#FFFFFF" stroke="#0E1726" strokeWidth="1" />
        <rect x="4" y="4" width="52" height="6" fill="#8B2C3C" />
        <text x="30" y="9" fontSize="5" fill="#FAF6EE" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" letterSpacing="0.2em" textAnchor="middle">CQC INSPECTION</text>
        {[16, 22, 28, 34, 40, 46, 52].map((y, i) => <g key={i}><rect x="6" y={y} width="3" height="3" fill={i < 4 ? '#5C7A52' : '#9B9098'} /><rect x="12" y={y+1} width="40" height="1.5" fill="#5A5560" /></g>)}
      </g>
      <g transform="translate(160, 28)">
        <circle cx="20" cy="20" r="18" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <ellipse cx="14" cy="18" rx="2" ry="1.5" fill="#3D2548" /><ellipse cx="26" cy="18" rx="2" ry="1.5" fill="#3D2548" />
        <rect x="11" y="14" width="6" height="6" fill="none" stroke="#0E1726" strokeWidth="0.8" /><rect x="23" y="14" width="6" height="6" fill="none" stroke="#0E1726" strokeWidth="0.8" /><line x1="17" y1="17" x2="23" y2="17" stroke="#0E1726" strokeWidth="0.6" />
        <path d="M 12 28 L 28 28" stroke="#3D2548" strokeWidth="1" />
        <rect x="12" y="40" width="16" height="14" fill="#0E1726" />
      </g>
      <g transform="translate(240, 30)">
        <rect width="100" height="48" fill="#FFFFFF" stroke="#5A5560" strokeWidth="0.8" />
        <rect x="0" y="0" width="100" height="10" fill="#1A4D5E" />
        <text x="50" y="7" fontSize="5" fill="#FAF6EE" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" letterSpacing="0.15em" textAnchor="middle">CHECKLIST</text>
        {[14, 20, 26, 32, 38].map((y, i) => <g key={i}><rect x="5" y={y} width="4" height="4" fill={i < 3 ? '#5C7A52' : 'none'} stroke="#5C7A52" strokeWidth="0.6" />{i < 3 && <path d={`M 5.5 ${y+2} L 7 ${y+3.5} L 9.5 ${y+0.8}`} stroke="#FAF6EE" strokeWidth="0.8" fill="none" />}<rect x="13" y={y+1} width="80" height="1.5" fill="#5A5560" opacity={i < 3 ? 1 : 0.4} /></g>)}
      </g>
    </svg>
  );
  if (archetype === 'legal') return (
    <svg {...common}>
      <defs><linearGradient id="legBg" x1="0" x2="1"><stop offset="0%" stopColor="#3D2548" stopOpacity="0.1" /><stop offset="100%" stopColor="#8B2C3C" stopOpacity="0.06" /></linearGradient></defs>
      <rect width="400" height="100" fill="url(#legBg)" />
      <g transform="translate(80, 20)">
        <rect width="92" height="62" fill="#FFFFFF" stroke="#0E1726" strokeWidth="1" />
        <text x="8" y="14" fontSize="7" fill="#3D2548" fontFamily="Fraunces, serif" fontWeight="700">CHAMBERS &amp; PARTNERS LLP</text>
        <line x1="6" y1="18" x2="86" y2="18" stroke="#3D2548" strokeWidth="0.5" />
        <text x="8" y="26" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif">Dear Practitioner,</text>
        {[32, 37, 42, 47, 52].map((y, i) => <rect key={i} x="8" y={y} width={i === 4 ? 50 : 76} height="1.5" fill="#5A5560" />)}
        <text x="8" y="60" fontSize="5" fill="#8B2C3C" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">RESPONSE REQUIRED 14 DAYS</text>
      </g>
      <g transform="translate(220, 24)">
        <rect x="0" y="20" width="36" height="32" fill="#B8945F" opacity="0.85" />
        <rect x="-4" y="16" width="44" height="6" fill="#B8945F" />
        <rect x="14" y="0" width="8" height="20" fill="#B8945F" />
        <circle cx="18" cy="3" r="4" fill="none" stroke="#B8945F" strokeWidth="1.5" />
      </g>
      <g transform="translate(290, 24)">
        <polygon points="20,0 30,18 0,18" fill="#0E1726" />
        <rect x="13" y="18" width="14" height="22" fill="#0E1726" />
        <line x1="-2" y1="44" x2="42" y2="44" stroke="#0E1726" strokeWidth="2" />
        <circle cx="0" cy="44" r="4" fill="#B8945F" /><circle cx="40" cy="44" r="4" fill="#B8945F" />
      </g>
    </svg>
  );
  if (archetype === 'offer') return (
    <svg {...common}>
      <defs><linearGradient id="offBg" x1="0" x2="1"><stop offset="0%" stopColor="#B8945F" stopOpacity="0.12" /><stop offset="100%" stopColor="#1A4D5E" stopOpacity="0.06" /></linearGradient></defs>
      <rect width="400" height="100" fill="url(#offBg)" />
      <g transform="translate(60, 30)">
        <ellipse cx="60" cy="38" rx="58" ry="8" fill="#5A5560" opacity="0.15" />
        <rect x="6" y="26" width="108" height="12" fill="#3D2548" />
        <rect x="0" y="20" width="120" height="8" fill="#4A2F5C" />
        <circle cx="30" cy="15" r="4" fill="#FAF6EE" /><line x1="30" y1="13" x2="30" y2="19" stroke="#B8945F" strokeWidth="0.8" /><line x1="28" y1="15" x2="32" y2="15" stroke="#B8945F" strokeWidth="0.8" />
        <circle cx="90" cy="15" r="4" fill="#FAF6EE" /><line x1="90" y1="13" x2="90" y2="19" stroke="#B8945F" strokeWidth="0.8" /><line x1="88" y1="15" x2="92" y2="15" stroke="#B8945F" strokeWidth="0.8" />
      </g>
      <g transform="translate(20, 38)">
        <circle cx="20" cy="14" r="11" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <rect x="11" y="22" width="18" height="22" fill="#1A4D5E" />
        <ellipse cx="14" cy="13" rx="1.5" ry="1" fill="#3D2548" /><ellipse cx="26" cy="13" rx="1.5" ry="1" fill="#3D2548" />
        <path d="M 14 18 Q 20 21 26 18" fill="none" stroke="#3D2548" strokeWidth="0.8" strokeLinecap="round" />
      </g>
      <g transform="translate(310, 38)">
        <circle cx="20" cy="14" r="11" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <rect x="11" y="22" width="18" height="22" fill="#8B2C3C" />
        <ellipse cx="14" cy="13" rx="1.5" ry="1" fill="#3D2548" /><ellipse cx="26" cy="13" rx="1.5" ry="1" fill="#3D2548" />
        <path d="M 14 17 Q 20 19 26 17" fill="none" stroke="#3D2548" strokeWidth="0.8" strokeLinecap="round" />
      </g>
    </svg>
  );
  if (archetype === 'staff') return (
    <svg {...common}>
      <defs><linearGradient id="stfBg" x1="0" x2="1"><stop offset="0%" stopColor="#1A4D5E" stopOpacity="0.08" /><stop offset="100%" stopColor="#8B2C3C" stopOpacity="0.08" /></linearGradient></defs>
      <rect width="400" height="100" fill="url(#stfBg)" />
      <g transform="translate(30, 22)">
        <circle cx="20" cy="14" r="11" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <rect x="11" y="22" width="18" height="30" fill="#1A4D5E" />
        <ellipse cx="14" cy="13" rx="1.5" ry="1" fill="#3D2548" /><ellipse cx="26" cy="13" rx="1.5" ry="1" fill="#3D2548" />
        <path d="M 14 17 Q 20 20 26 17" fill="none" stroke="#3D2548" strokeWidth="0.8" strokeLinecap="round" />
        <text x="20" y="65" fontSize="6" fill="#1A4D5E" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="0.1em">SENIOR</text>
      </g>
      <g transform="translate(100, 22)">
        <circle cx="20" cy="14" r="11" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <rect x="11" y="22" width="18" height="30" fill="#3D2548" />
        <ellipse cx="14" cy="13" rx="1.5" ry="1" fill="#3D2548" /><ellipse cx="26" cy="13" rx="1.5" ry="1" fill="#3D2548" />
        <path d="M 14 17 Q 20 20 26 17" fill="none" stroke="#3D2548" strokeWidth="0.8" strokeLinecap="round" />
        <text x="20" y="65" fontSize="6" fill="#3D2548" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="0.1em">COORD</text>
      </g>
      <g transform="translate(170, 36)">
        <line x1="0" y1="14" x2="40" y2="14" stroke="#8B2C3C" strokeWidth="1.5" strokeDasharray="3 3" />
        <polygon points="40,14 32,9 32,19" fill="#8B2C3C" />
        <text x="20" y="8" fontSize="6" fill="#8B2C3C" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="0.1em">+35%</text>
      </g>
      <g transform="translate(240, 18)">
        <rect width="120" height="68" fill="#8B2C3C" opacity="0.85" />
        <text x="60" y="14" fontSize="8" fill="#FAF6EE" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="0.2em">NORTHSTAR</text>
        <text x="60" y="22" fontSize="6" fill="#FAF6EE" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle" letterSpacing="0.1em" opacity="0.85">COSMETIC GROUP</text>
        <line x1="20" y1="28" x2="100" y2="28" stroke="#FAF6EE" strokeWidth="0.5" opacity="0.5" />
        <text x="60" y="40" fontSize="6" fill="#FAF6EE" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle">FORMAL OFFER OF EMPLOYMENT</text>
        <text x="60" y="50" fontSize="5" fill="#FAF6EE" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle" opacity="0.7">Two week notice clause</text>
        <text x="60" y="60" fontSize="5" fill="#FAF6EE" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle" opacity="0.7">Equity included</text>
      </g>
    </svg>
  );
  return null;
};

// ---------- SCENARIO ILLUSTRATIONS ----------
const ScenarioIllustration = ({ art }) => {
  const common = { width: '100%', height: 90, viewBox: '0 0 400 90', xmlns: 'http://www.w3.org/2000/svg', style: { display: 'block', borderRadius: 2 } };
  if (art === 'phone-trend') return (
    <svg {...common}>
      <defs><linearGradient id="ptBg" x1="0" x2="1"><stop offset="0%" stopColor="#FF0050" stopOpacity="0.08" /><stop offset="100%" stopColor="#00F2EA" stopOpacity="0.08" /></linearGradient></defs>
      <rect width="400" height="90" fill="url(#ptBg)" />
      <g transform="translate(150, 12)">
        <rect width="60" height="68" rx="6" fill="#0E1726" />
        <rect x="3" y="3" width="54" height="58" rx="3" fill="#FAF6EE" />
        <circle cx="30" cy="22" r="9" fill="#FAF6EE" stroke="#3D2548" strokeWidth="0.8" />
        <ellipse cx="26" cy="21" rx="1.2" ry="0.9" fill="#3D2548" />
        <ellipse cx="34" cy="21" rx="1.2" ry="0.9" fill="#3D2548" />
        <path d="M 26 25 Q 30 27 34 25" fill="none" stroke="#3D2548" strokeWidth="0.7" />
        <rect x="8" y="38" width="44" height="2" fill="#FF0050" />
        <rect x="8" y="42" width="36" height="1.5" fill="#5A5560" />
        <rect x="8" y="46" width="40" height="1.5" fill="#5A5560" />
        <g transform="translate(8, 51)">
          <path d="M 0 4 L 3 0 L 3 8 Z" fill="#FF0050" /><circle cx="10" cy="4" r="2" fill="none" stroke="#FF0050" strokeWidth="0.8" /><path d="M 16 0 L 22 8 M 22 0 L 16 8" stroke="#FF0050" strokeWidth="0.8" />
        </g>
      </g>
      <text x="80" y="48" fontSize="9" fill="#0E1726" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" letterSpacing="0.18em">TRENDING</text>
      <text x="220" y="48" fontSize="9" fill="#0E1726" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" letterSpacing="0.18em">7.2M VIEWS</text>
    </svg>
  );
  if (art === 'turkey') return (
    <svg {...common}>
      <defs><linearGradient id="tkBg" x1="0" x2="1"><stop offset="0%" stopColor="#E30A17" stopOpacity="0.08" /><stop offset="100%" stopColor="#FAF6EE" stopOpacity="0" /></linearGradient></defs>
      <rect width="400" height="90" fill="url(#tkBg)" />
      <g transform="translate(40, 18)">
        <rect width="60" height="54" fill="#E30A17" rx="2" />
        <circle cx="22" cy="27" r="14" fill="#FAF6EE" />
        <circle cx="26" cy="27" r="11" fill="#E30A17" />
        <polygon points="34,27 38,24 36,29 40,28 36,30 38,33" fill="#FAF6EE" />
      </g>
      <g transform="translate(150, 22)">
        <circle cx="20" cy="20" r="14" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <ellipse cx="14" cy="18" rx="1.5" ry="1" fill="#3D2548" />
        <ellipse cx="26" cy="18" rx="1.5" ry="1" fill="#3D2548" />
        <path d="M 18 25 L 22 25 L 23 30 L 17 30 Z" fill="#8B2C3C" opacity="0.5" />
        <path d="M 14 20 Q 17 22 13 24" fill="none" stroke="#8B2C3C" strokeWidth="0.8" />
        <text x="20" y="50" fontSize="6" fill="#8B2C3C" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle">MIGRATED</text>
      </g>
      <g transform="translate(230, 28)">
        <rect width="120" height="40" fill="#FFFFFF" stroke="#0E1726" strokeWidth="0.8" />
        <text x="8" y="12" fontSize="7" fill="#3D2548" fontFamily="Fraunces, serif" fontWeight="700">RECEIPT — ISTANBUL</text>
        <line x1="6" y1="15" x2="114" y2="15" stroke="#5A5560" strokeWidth="0.4" />
        <text x="8" y="22" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif">Rhinoplasty + 6ml HA + facial</text>
        <text x="8" y="28" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif">3-day all-inclusive package</text>
        <text x="8" y="36" fontSize="7" fill="#0E1726" fontFamily="Fraunces, serif" fontWeight="700">£2,200</text>
      </g>
    </svg>
  );
  if (art === 'wedding') return (
    <svg {...common}>
      <defs><linearGradient id="wdBg" x1="0" x2="1"><stop offset="0%" stopColor="#B8945F" stopOpacity="0.15" /><stop offset="100%" stopColor="#FAF6EE" stopOpacity="0" /></linearGradient></defs>
      <rect width="400" height="90" fill="url(#wdBg)" />
      <g transform="translate(40, 14)">
        <path d="M 30 8 Q 18 0 8 16 Q 0 30 30 56 Q 60 30 52 16 Q 42 0 30 8 Z" fill="#FAF6EE" stroke="#B8945F" strokeWidth="1" />
        <circle cx="30" cy="22" r="6" fill="none" stroke="#B8945F" strokeWidth="0.6" opacity="0.6" />
        <circle cx="20" cy="36" r="4" fill="none" stroke="#B8945F" strokeWidth="0.6" opacity="0.6" />
        <circle cx="40" cy="36" r="4" fill="none" stroke="#B8945F" strokeWidth="0.6" opacity="0.6" />
      </g>
      <g transform="translate(140, 20)">
        <circle cx="22" cy="22" r="16" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <ellipse cx="22" cy="22" rx="8" ry="3" fill="#8B2C3C" opacity="0.25" />
        <ellipse cx="15" cy="20" rx="1.5" ry="1.2" fill="#3D2548" />
        <ellipse cx="29" cy="20" rx="1.5" ry="1.2" fill="#3D2548" />
        <path d="M 17 30 Q 22 27 27 30" fill="none" stroke="#3D2548" strokeWidth="0.8" strokeLinecap="round" />
        <text x="22" y="56" fontSize="6" fill="#8B2C3C" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle">SWOLLEN</text>
      </g>
      <g transform="translate(240, 18)">
        <rect width="110" height="54" fill="#FFFFFF" stroke="#B8945F" strokeWidth="1" />
        <text x="55" y="14" fontSize="8" fill="#3D2548" fontFamily="Fraunces, serif" fontWeight="700" textAnchor="middle" letterSpacing="0.1em">SATURDAY</text>
        <line x1="20" y1="18" x2="90" y2="18" stroke="#B8945F" strokeWidth="0.5" />
        <text x="55" y="30" fontSize="14" fill="#B8945F" fontFamily="Fraunces, serif" fontWeight="500" textAnchor="middle">36h</text>
        <text x="55" y="44" fontSize="6" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle" letterSpacing="0.15em">UNTIL THE WEDDING</text>
      </g>
    </svg>
  );
  if (art === 'glp1') return (
    <svg {...common}>
      <defs><linearGradient id="glBg" x1="0" x2="1"><stop offset="0%" stopColor="#5C7A52" stopOpacity="0.08" /><stop offset="100%" stopColor="#3D2548" stopOpacity="0.06" /></linearGradient></defs>
      <rect width="400" height="90" fill="url(#glBg)" />
      <g transform="translate(40, 18)">
        <circle cx="22" cy="22" r="18" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <ellipse cx="14" cy="20" rx="1.5" ry="1" fill="#3D2548" />
        <ellipse cx="30" cy="20" rx="1.5" ry="1" fill="#3D2548" />
        <path d="M 14 27 Q 22 30 30 27" fill="none" stroke="#3D2548" strokeWidth="0.8" />
        <text x="22" y="56" fontSize="6" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600" textAnchor="middle">BEFORE</text>
      </g>
      <g transform="translate(160, 14)">
        <path d="M 0 20 L 40 20 L 36 16 M 40 20 L 36 24" stroke="#5C7A52" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <text x="20" y="14" fontSize="6" fill="#5C7A52" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="0.1em">−4 STONE</text>
        <text x="20" y="36" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle" fontStyle="italic">18 months</text>
      </g>
      <g transform="translate(220, 18)">
        <circle cx="22" cy="22" r="14" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <path d="M 8 26 Q 22 18 36 26" fill="none" stroke="#3D2548" strokeWidth="0.6" />
        <ellipse cx="15" cy="20" rx="1.5" ry="1" fill="#3D2548" />
        <ellipse cx="29" cy="20" rx="1.5" ry="1" fill="#3D2548" />
        <path d="M 16 27 Q 22 29 28 27" fill="none" stroke="#3D2548" strokeWidth="0.7" />
        <line x1="12" y1="24" x2="16" y2="28" stroke="#3D2548" strokeWidth="0.4" />
        <line x1="32" y1="24" x2="28" y2="28" stroke="#3D2548" strokeWidth="0.4" />
        <text x="22" y="56" fontSize="6" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600" textAnchor="middle">AFTER</text>
      </g>
      <g transform="translate(310, 28)">
        <rect width="70" height="36" fill="#FFFFFF" stroke="#0E1726" strokeWidth="0.8" />
        <rect x="0" y="0" width="70" height="8" fill="#1A4D5E" />
        <text x="35" y="6" fontSize="5" fill="#FAF6EE" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="0.15em">BUDGET</text>
        <text x="35" y="22" fontSize="11" fill="#0E1726" fontFamily="Fraunces, serif" fontWeight="500" textAnchor="middle">£15k</text>
        <text x="35" y="32" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle" letterSpacing="0.1em">EARMARKED</text>
      </g>
    </svg>
  );
  if (art === 'moonlight') return (
    <svg {...common}>
      <defs><linearGradient id="mnBg" x1="0" x2="1"><stop offset="0%" stopColor="#1A4D5E" stopOpacity="0.08" /><stop offset="100%" stopColor="#B8945F" stopOpacity="0.06" /></linearGradient></defs>
      <rect width="400" height="90" fill="url(#mnBg)" />
      <g transform="translate(40, 20)">
        <circle cx="22" cy="22" r="14" fill="#FAF6EE" stroke="#3D2548" strokeWidth="1" />
        <ellipse cx="15" cy="20" rx="1.5" ry="1" fill="#3D2548" />
        <ellipse cx="29" cy="20" rx="1.5" ry="1" fill="#3D2548" />
        <path d="M 14 28 L 30 28" stroke="#3D2548" strokeWidth="0.8" />
        <rect x="14" y="36" width="16" height="14" fill="#FAF6EE" stroke="#0E1726" strokeWidth="0.6" />
        <line x1="22" y1="36" x2="22" y2="48" stroke="#0E1726" strokeWidth="0.5" />
        <text x="22" y="60" fontSize="6" fill="#1A4D5E" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="0.04em">NHS DR</text>
      </g>
      <g transform="translate(140, 16)">
        <rect width="110" height="58" fill="#FFFFFF" stroke="#0E1726" strokeWidth="0.8" />
        <text x="8" y="14" fontSize="7" fill="#3D2548" fontFamily="Fraunces, serif" fontWeight="700">PROPOSAL</text>
        <line x1="8" y1="17" x2="102" y2="17" stroke="#5A5560" strokeWidth="0.4" />
        <text x="8" y="26" fontSize="6" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif">Weekend clinics, your premises</text>
        <text x="8" y="34" fontSize="6" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif">Own indemnity, own patients</text>
        <text x="8" y="42" fontSize="6" fill="#8B2C3C" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">No aesthetic training</text>
        <text x="8" y="52" fontSize="8" fill="#5C7A52" fontFamily="Fraunces, serif" fontWeight="700">30% revenue share</text>
      </g>
      <g transform="translate(280, 20)">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#B8945F" strokeWidth="1" strokeDasharray="3 2" />
        <text x="20" y="18" fontSize="9" fill="#B8945F" fontFamily="Fraunces, serif" fontWeight="700" textAnchor="middle">?</text>
        <text x="20" y="28" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" textAnchor="middle">your call</text>
      </g>
    </svg>
  );
  if (art === 'reviews') return (
    <svg {...common}>
      <defs><linearGradient id="rvBg" x1="0" x2="1"><stop offset="0%" stopColor="#FFC107" stopOpacity="0.10" /><stop offset="100%" stopColor="#8B2C3C" stopOpacity="0.06" /></linearGradient></defs>
      <rect width="400" height="90" fill="url(#rvBg)" />
      <g transform="translate(30, 14)">
        <rect width="160" height="62" fill="#FFFFFF" stroke="#0E1726" strokeWidth="0.6" />
        <g transform="translate(8, 8)">
          {[0, 1, 2, 3, 4].map(i => <polygon key={i} transform={`translate(${i * 14}, 0)`} points="6,0 7.5,4 12,4 8.5,7 10,11 6,9 2,11 3.5,7 0,4 4.5,4" fill="#FFC107" />)}
        </g>
        <line x1="8" y1="24" x2="152" y2="24" stroke="#5A5560" strokeWidth="0.4" opacity="0.5" />
        <rect x="8" y="28" width="100" height="2" fill="#5A5560" />
        <rect x="8" y="33" width="120" height="2" fill="#5A5560" />
        <rect x="8" y="38" width="90" height="2" fill="#5A5560" />
        <text x="8" y="52" fontSize="5" fill="#9B9098" fontFamily="Plus Jakarta Sans, sans-serif" fontStyle="italic">— "Sarah J." · 2 hours ago</text>
      </g>
      <g transform="translate(220, 26)">
        <text x="0" y="0" fontSize="9" fill="#8B2C3C" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" letterSpacing="0.15em">×25/month</text>
        <text x="0" y="14" fontSize="8" fill="#3D2548" fontFamily="Fraunces, serif" fontWeight="500">£400/mo</text>
        <text x="0" y="28" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="0.05em">ROTATING IP ADDRESSES</text>
        <text x="0" y="36" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="0.05em">STOCK PHOTOS</text>
        <text x="0" y="44" fontSize="5" fill="#5A5560" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="0.05em">UNDETECTABLE — THEY CLAIM</text>
      </g>
    </svg>
  );
  return null;
};

function PatientBattle({ battle, state, onResolve }) {
  const [selected, setSelected] = useState([]);
  const [resolved, setResolved] = useState(null);

  const PITCHES = [
    { id: 'safety', label: 'Lead with safety record', stat: 'safety', desc: 'Cite your published protocols, drills, and complications rate.' },
    { id: 'ethics', label: 'Lead with patient-first culture', stat: 'ethics', desc: 'Walk her through your no-upsell, hour-long consult policy.' },
    { id: 'innovation', label: 'Lead with clinical differentiation', stat: 'innovation', desc: 'Demonstrate your unique pathway or technology.' },
    { id: 'brand', label: 'Lead with brand prestige', stat: 'brand', desc: 'Mention the press, the patient list, the editorial.' },
    { id: 'nps', label: 'Lead with patient testimonials', stat: 'nps', desc: 'Share recent patient stories and outcomes.' },
  ];

  const toggle = (id) => {
    if (selected.includes(id)) setSelected(selected.filter(x => x !== id));
    else if (selected.length < 2) setSelected([...selected, id]);
  };

  const submit = () => {
    const patient = battle.patient;
    // Player score = sum of state stat × patient bias × selected pitch
    let playerScore = 0;
    selected.forEach(pid => {
      const pitch = PITCHES.find(p => p.id === pid);
      const statVal = state[pitch.stat] || 0;
      const bias = patient.biases[pitch.stat] || 1;
      playerScore += statVal * bias;
    });
    if (selected.length === 0) playerScore = 10;

    // Each competitor scores
    const compScores = battle.competitors.map(c => {
      const threat = c.threat[battle.archetype] || 5;
      return { name: c.name, score: 30 + threat * 5 + Math.random() * 15 };
    });

    const allScores = [{ name: 'You', score: playerScore, isPlayer: true }, ...compScores];
    allScores.sort((a, b) => b.score - a.score);
    const won = allScores[0].isPlayer;

    setResolved({ won, scores: allScores, patient, lifetimeValue: patient.lifetimeValue });
  };

  return (
    <div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Patient Acquisition Battle</div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>Three clinics. One patient. One pitch.</h2>
      <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#5A5560', margin: '0 0 16px', lineHeight: 1.5 }}>She's calling three clinics today. You get one shot.</p>

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.1)', padding: 14, marginBottom: 14, borderRadius: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <PersonaAvatar persona={battle.patient.label} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500 }}>{battle.patient.label}</div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#5A5560', marginTop: 2 }}>{battle.patient.desc}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5A5560', fontWeight: 600 }}>CLV</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: '#1A4D5E', fontWeight: 500 }}>{formatGBP(battle.patient.lifetimeValue)}</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(14,23,38,0.08)', paddingTop: 8, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560' }}>
          <span style={{ fontWeight: 600, color: '#3D2548', letterSpacing: '0.05em' }}>She prioritises:</span> {Object.entries(battle.patient.biases).filter(([k, v]) => v >= 1.2).map(([k]) => STAT_LABELS[k] || k).join(' · ')}
        </div>
      </div>

      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#5A5560', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Your competition</div>
      <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
        {battle.competitors.map(c => (
          <div key={c.id} style={{ background: 'rgba(255,255,255,0.5)', padding: '8px 11px', borderLeft: '2px solid #8B2C3C', borderRadius: 2 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>{c.name}</div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 1 }}>{c.style}</div>
          </div>
        ))}
      </div>

      {!resolved ? (<>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#3D2548', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Pick 1–2 angles for your pitch</div>
        {PITCHES.map(p => (
          <button key={p.id} onClick={() => toggle(p.id)} disabled={selected.length >= 2 && !selected.includes(p.id)} style={{
            width: '100%', textAlign: 'left',
            background: selected.includes(p.id) ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            border: `1px solid ${selected.includes(p.id) ? '#1A4D5E' : 'rgba(14,23,38,0.1)'}`,
            borderLeft: '3px solid #1A4D5E',
            padding: '10px 12px', marginBottom: 7,
            cursor: selected.length >= 2 && !selected.includes(p.id) ? 'not-allowed' : 'pointer',
            opacity: selected.length >= 2 && !selected.includes(p.id) ? 0.4 : 1,
            fontFamily: 'inherit', borderRadius: 2,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14.5, fontWeight: 500 }}>{p.label}</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#1A4D5E', fontWeight: 600 }}>{STAT_LABELS[p.stat]}: {state[p.stat]}</div>
            </div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.45 }}>{p.desc}</div>
          </button>
        ))}
        <Primary onClick={submit} disabled={selected.length === 0}>Make the Pitch →</Primary>
      </>) : (<>
        <div style={{ background: resolved.won ? 'rgba(92,122,82,0.12)' : 'rgba(139,44,60,0.08)', border: `1px solid ${resolved.won ? 'rgba(92,122,82,0.35)' : 'rgba(139,44,60,0.3)'}`, padding: 14, marginBottom: 12, borderRadius: 2 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: resolved.won ? '#5C7A52' : '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            {resolved.won ? 'Won the patient' : 'Lost the patient'}
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, margin: '0 0 10px' }}>{resolved.won ? `She booked. ${formatGBP(resolved.lifetimeValue)} CLV.` : `She booked with ${resolved.scores[0].name}.`}</h3>
          <div style={{ marginBottom: 8 }}>
            {resolved.scores.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12 }}>
                <span style={{ color: s.isPlayer ? '#1A4D5E' : '#5A5560', fontWeight: s.isPlayer ? 700 : 400 }}>{i + 1}. {s.name}{s.isPlayer ? ' (you)' : ''}</span>
                <span style={{ color: '#5A5560', fontFamily: 'Fraunces, serif', fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.score)}</span>
              </div>
            ))}
          </div>
        </div>
        <Primary onClick={() => onResolve(resolved)}>Continue →</Primary>
      </>)}
    </div>
  );
}



export default function AestheticInnovator() {
  const [phase, setPhase] = useState('intro');
  const [state, setState] = useState(INITIAL);
  const [setupStep, setSetupStep] = useState(1);
  const [setup, setSetup] = useState({ background: null, training: null, structure: null, location: null, premises: null, compliance: [], toxin: null, filler: null, biostim: null, savings: null, loan: null, investor: null });
  const [isRestarting, setIsRestarting] = useState(false);
  const [hiredStaff, setHiredStaff] = useState([]);
  const [staffPanelOpen, setStaffPanelOpen] = useState(false);
  const [pendingPoach, setPendingPoach] = useState(null);
  const [pendingSetPiece, setPendingSetPiece] = useState(null);
  // Operational dials — player-controllable cost levers that override the auto-formulas
  const [marketingPolicy, setMarketingPolicy] = useState('standard'); // 'conservative' | 'standard' | 'aggressive'
  const [supplierStrategy, setSupplierStrategy] = useState('standard'); // 'premium' | 'standard' | 'generic'
  const [workingCapitalPolicy, setWorkingCapitalPolicy] = useState('standard'); // 'pay-early' | 'standard' | 'stretch'
  const [capexThisQ, setCapexThisQ] = useState(0); // capex chosen this quarter
  const [activeCapex, setActiveCapex] = useState([]); // { amount, quartersRemaining, monthlyDepreciation }
  const [showOperationalPanel, setShowOperationalPanel] = useState(false);
  const [usedSetPieces, setUsedSetPieces] = useState([]);
  const [streakCounters, setStreakCounters] = useState({ ethics: 0, safety: 0, consult: 0, profit: 0 });
  const [activeCampaigns, setActiveCampaigns] = useState([]); // [{id, quartersRemaining, startedQ}]
  const [completedCampaigns, setCompletedCampaigns] = useState([]);
  const [milestones, setMilestones] = useState([]); // Identity-aligned achievements unlocked across the run
  const [latestMilestone, setLatestMilestone] = useState(null); // The most recently triggered, surfaced on results
  // Treatment mix — percentage allocation across categories. Must sum to 100.
  const [treatmentMix, setTreatmentMix] = useState(() => {
    const m = {};
    TREATMENT_CATEGORIES.forEach(c => { m[c.id] = c.defaultPct; });
    return m;
  });
  const [ebdUnlocked, setEbdUnlocked] = useState(false);
  const [showMixPanel, setShowMixPanel] = useState(false);
  // Multi-site state: an array of additional sites beyond the flagship.
  // sites[0] always represents the founding clinic (the existing one) — it's implicit.
  // Additional sites are tracked here with their own economics, health, and origin.
  const [sites, setSites] = useState([]); // each: {id, name, opening, monthlyCost, capacity, throughputBoost, health, brandCarry, origin}
  const [pendingExpansion, setPendingExpansion] = useState(null); // {type:'organic'|'acquisition', option}
  const [siteFailureLog, setSiteFailureLog] = useState([]);
  // Rival network — quarterly simulated. Each rival has live brand and sites count that shift across the run.
  const [rivals, setRivals] = useState(() => RIVAL_NETWORK.map(r => ({ ...r, currentBrand: r.startingBrand, currentSites: r.startingSites, status: 'active' })));
  const [usedRivalEvents, setUsedRivalEvents] = useState([]);
  const [lastRivalEvent, setLastRivalEvent] = useState(null);
  // Marketing channel allocation — must sum to 100%
  const [channelMix, setChannelMix] = useState({ instagram: 60, tiktok: 10, youtube: 10, google: 20 });
  const [soundOn, setSoundOn] = useState(() => {
    try { return localStorage.getItem('ai_sound_off') !== '1'; } catch (e) { return true; }
  });
  const toggleSound = () => {
    setSoundOn(prev => {
      const next = !prev;
      try { localStorage.setItem('ai_sound_off', next ? '0' : '1'); } catch (e) {}
      return next;
    });
  };
  const [patients, setPatients] = useState([]);
  const [weeklyTickerEvents, setWeeklyTickerEvents] = useState([]);
  const [pendingMicroFx, setPendingMicroFx] = useState({});
  const [pendingTargetPhase, setPendingTargetPhase] = useState(null);
  const [launch, setLaunch] = useState({ channel: null, seeds: [] });
  const [usedFaceCases, setUsedFaceCases] = useState([]);
  const [pendingFaceCase, setPendingFaceCase] = useState(null);
  const [pendingBattle, setPendingBattle] = useState(null);
  const [quarter, setQuarter] = useState(1);
  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState([]);
  const [usedMoves, setUsedMoves] = useState([]);
  const [played, setPlayed] = useState([]);
  const [usedScenarios, setUsedScenarios] = useState([]);
  const [usedConsults, setUsedConsults] = useState([]);
  const [results, setResults] = useState(null);
  const [pendingScenario, setPendingScenario] = useState(null);
  const [scenarioOutcome, setScenarioOutcome] = useState(null);
  const [pendingConsult, setPendingConsult] = useState(null);
  const [consultStage, setConsultStage] = useState(0);
  const [consultStageId, setConsultStageId] = useState(null); // For branching consultations
  const [consultFlags, setConsultFlags] = useState([]); // Flags accumulated during consultation
  const [consultHistory, setConsultHistory] = useState([]); // Choices made so far (for the summary)
  const [consultMood, setConsultMood] = useState('calm');
  const [consultChoice, setConsultChoice] = useState(null);
  const [log, setLog] = useState([]);
  const [financialHistory, setFinancialHistory] = useState([]); // Per-quarter EBITDA/revenue for exit valuation
  const [bustCount, setBustCount] = useState(0); // Number of times the player has gone insolvent
  const [offers, setOffers] = useState([]);
  const [chosenSuitor, setChosenSuitor] = useState(null);
  const [lockedMoves, setLockedMoves] = useState([]);
  const [canvasFactor, setCanvasFactor] = useState(null);
  const [showBOI, setShowBOI] = useState(false);
  const MAX_Q = 8;
  const SAVE_KEY = 'aesthetic-innovator-save-v1';

  useEffect(() => { if (phase === 'play' && hand.length === 0) { setHand(drawHand(usedMoves, lockedMoves)); setSelected([]); } }, [phase, hand.length, usedMoves, lockedMoves]);

  // ---------- localStorage save/load ----------
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saved | loaded
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Load on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { setHasLoadedFromStorage(true); return; }
      const snap = JSON.parse(raw);
      if (snap && snap.phase && snap.phase !== 'intro' && snap.phase !== 'setup') {
        setPhase(snap.phase);
        setState(snap.state || INITIAL);
        setQuarter(snap.quarter || 1);
        setSetup(snap.setup || setup);
        setLaunch(snap.launch || launch);
        setHand(snap.hand || []);
        setSelected(snap.selected || []);
        setPlayed(snap.played || []);
        setUsedMoves(snap.usedMoves || []);
        setUsedScenarios(snap.usedScenarios || []);
        setUsedConsults(snap.usedConsults || []);
        setUsedFaceCases(snap.usedFaceCases || []);
        setLog(snap.log || []);
        setLockedMoves(snap.lockedMoves || []);
        setHiredStaff(snap.hiredStaff || []);
        setPatients(snap.patients || []);
        setSaveStatus('loaded');
        setTimeout(() => setSaveStatus('idle'), 2500);
      }
    } catch (e) { /* corrupt save, ignore */ }
    setHasLoadedFromStorage(true);
  }, []);

  // Save on key state changes (only after first load completes, only for in-game phases)
  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const persistentPhases = ['play', 'results', 'ticker', 'faceCase', 'battle', 'consultation', 'scenario'];
    if (!persistentPhases.includes(phase)) return;
    try {
      const snap = {
        phase, state, quarter, setup, launch, hand, selected, played,
        usedMoves, usedScenarios, usedConsults, usedFaceCases, log,
        lockedMoves, hiredStaff, patients, financialHistory, bustCount,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
      setSaveStatus('saved');
      const t = setTimeout(() => setSaveStatus('idle'), 1500);
      return () => clearTimeout(t);
    } catch (e) { /* quota or serialise error, ignore */ }
  }, [phase, state, quarter, hand, selected, hiredStaff, patients, financialHistory, bustCount, hasLoadedFromStorage]);

  const clearSavedGame = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  };

  const hasOffering = !(setup.toxin === 'none' && setup.filler === 'none' && setup.biostim === 'none');
  const setupValid = setup.background && setup.training && setup.savings && setup.loan && setup.investor && setup.structure && setup.location && setup.premises && setup.toxin && setup.filler && setup.biostim && hasOffering;

  const finalizeSetup = () => {
    let s = { ...INITIAL };
    const bg = BACKGROUNDS.find(b => b.id === setup.background);
    s = applyFx(s, bg.fx);
    // Apply capital sources (savings + loan + investor)
    const sav = SAVINGS_TIERS.find(x => x.id === setup.savings);
    const ln = LOANS.find(x => x.id === setup.loan);
    const inv = INVESTORS.find(x => x.id === setup.investor);
    s.cash += (sav?.cash || 0) + (ln?.cash || 0) + (inv?.cash || 0);
    s.debt = (ln?.debt || 0);
    s.equity = (inv?.equity || 0);
    // Training pathway
    const tr = TRAINING_PATHS.find(x => x.id === setup.training);
    if (tr) { s = applyFx(s, tr.fx); s.cash -= tr.cost; }
    s = applyFx(s, STRUCTURES.find(x => x.id === setup.structure).fx);
    const loc = LOCATIONS.find(l => l.id === setup.location);
    if (loc) s = applyFx(s, loc.fx);
    s = applyFx(s, PREMISES.find(x => x.id === setup.premises).fx);
    setup.compliance.forEach(c => { const opt = COMPLIANCE_OPTIONS.find(x => x.id === c); s = applyFx(s, opt.fx); s.cash -= opt.cost; });
    s = applyFx(s, TOXINS.find(x => x.id === setup.toxin).fx);
    s = applyFx(s, FILLERS.find(x => x.id === setup.filler).fx);
    s = applyFx(s, BIOSTIMS.find(x => x.id === setup.biostim).fx);
    // Company formation cost (legals + Companies House + accountant setup)
    s.cash -= COMPANY_FORMATION_COST;
    // Premium location capex modifier — flagship in Marylebone costs more than flagship in Croydon
    if (loc && setup.premises === 'flagship') s.cash -= Math.round((loc.rentMult - 1) * 30 * 10) / 10;
    s.cash = Math.round(s.cash * 10) / 10;
    setState(s);
    setLockedMoves(bg.locked || []);
    setPhase('launch');
  };

  const finalizeLaunch = () => {
    let s = { ...state };
    const ch = LAUNCH_FOUNDING_CHANNEL.find(c => c.id === launch.channel);
    s = applyFx(s, ch.fx);
    launch.seeds.forEach(id => {
      const seed = LAUNCH_SEED_ACTIONS.find(x => x.id === id);
      s = applyFx(s, seed.fx);
    });
    setState(s);
    setPhase('firstPatient');
  };

  const completeFirstPatient = (aggregateFx) => {
    setState(applyFx(state, aggregateFx));
    setPhase('play');
  };

  const AP_PER_QUARTER = 3;
  const apUsed = selected.reduce((sum, id) => sum + (hand.find(m => m.id === id)?.ap || 0), 0);
  const apRemaining = AP_PER_QUARTER - apUsed;

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(x => x !== id));
    } else {
      const move = hand.find(m => m.id === id);
      if (move && move.ap <= apRemaining) setSelected([...selected, id]);
    }
  };

  const commit = () => {
    let next = { ...state };
    // Apply expansion cash cost if a site was opened this quarter
    if (pendingExpansion) {
      next.cash = (next.cash || 0) - pendingExpansion.option.cost;
      setPendingExpansion(null);
    }
    const playedMoves = hand.filter(m => selected.includes(m.id));
    playedMoves.forEach(m => { next = applyFx(next, m.fx); });

    // Apply any mix-pivot moves — these auto-rebalance the treatment mix
    playedMoves.forEach(m => {
      if (m.mixPivot) {
        setTreatmentMix({ ...m.mixPivot });
      }
    });

    // Register any campaign-start moves
    const newCampaigns = [];
    playedMoves.forEach(m => {
      if (m.startsCampaign) {
        const campaign = CAMPAIGNS.find(c => c.id === m.startsCampaign);
        if (campaign && !activeCampaigns.find(c => c.id === m.startsCampaign) && !completedCampaigns.find(c => c.id === m.startsCampaign)) {
          newCampaigns.push({ id: campaign.id, quartersRemaining: campaign.duration, startedQ: quarter });
        }
      }
    });
    if (newCampaigns.length > 0) {
      setActiveCampaigns([...activeCampaigns, ...newCampaigns]);
    }

    // Staff are now built into calcQuarterly — wages, throughput, capacity all flow through
    const q = calcQuarterly(next, setup, hiredStaff, { marketingPolicy, supplierStrategy, workingCapitalPolicy, activeCapex, capexThisQ, treatmentMix, ebdUnlocked, sites, channelMix });
    next.cash = Math.round((next.cash + q.net) * 10) / 10;
    q.staffWages = q.staff;

    // Capacity strain: if demand exceeds your team's ability to deliver, brand and NPS take a hit.
    // Turning patients away gets noticed.
    if (q.capacityStrain > 0.15) {
      const strainHit = Math.round(q.capacityStrain * 12);
      next.brand = clamp((next.brand || 0) - strainHit);
      next.nps = clamp((next.nps || 0) - Math.round(strainHit * 0.7));
    }

    // Track quarterly financials for exit valuation
    setFinancialHistory([...financialHistory, {
      q: quarter,
      revenue: q.revenue || 0,
      ebitda: q.ebitda || 0,
      cash: next.cash,
    }]);

    // Policy side-effects on stats
    // Generic suppliers erode brand and safety perception; premium suppliers boost them
    if (supplierStrategy === 'generic') {
      next.brand = clamp((next.brand || 0) - 2);
      next.safety = clamp((next.safety || 0) - 1);
    } else if (supplierStrategy === 'premium') {
      next.brand = clamp((next.brand || 0) + 1);
      next.safety = clamp((next.safety || 0) + 1);
    }
    // Stretching supplier payments hurts ethics and brand (suppliers gossip)
    if (workingCapitalPolicy === 'stretch') {
      next.ethics = clamp((next.ethics || 0) - 2);
      next.brand = clamp((next.brand || 0) - 1);
    } else if (workingCapitalPolicy === 'pay-early') {
      next.ethics = clamp((next.ethics || 0) + 1);
    }
    // Aggressive marketing slightly compresses ethics (more upsell pressure); conservative marketing buys time
    if (marketingPolicy === 'aggressive') {
      next.ethics = clamp((next.ethics || 0) - 1);
    }

    // === MULTI-SITE LIFECYCLE ===
    // Each quarter, evaluate site health based on quarter performance.
    // Sites that have been open for more than a quarter and underperform start to struggle.
    // Struggling sites that aren't supported (by chain cash being healthy) fail.
    if (sites.length > 0) {
      const updatedSites = sites.map(site => {
        if (site.health === 'failed') return site;
        // Age the site
        const quartersOpen = quarter - site.openedQ;
        // Brand carry: each quarter, the site's brand% slowly catches up to the chain (if chain is doing well)
        const brandTarget = next.brand / 100;
        const newBrandCarry = site.brandCarry + (brandTarget - site.brandCarry) * 0.18;
        // Health evaluation
        let newHealth = site.health;
        if (q.net < -15 && quartersOpen >= 2) {
          // Chain in crisis — struggling site under sustained negative cash fails
          if (site.health === 'struggling') newHealth = 'failed';
          else newHealth = 'struggling';
        } else if (q.net < 0 && q.capacityStrain < 0.1) {
          // Negative quarter with capacity going unused — sites underperforming
          if (site.health === 'healthy' && Math.random() < 0.25) newHealth = 'struggling';
        } else if (q.net > 5 && site.health === 'struggling') {
          // Strong quarter recovers a struggling site
          if (Math.random() < 0.4) newHealth = 'healthy';
        }
        return { ...site, brandCarry: newBrandCarry, health: newHealth };
      });
      setSites(updatedSites);
      // Log failures
      const newlyFailed = updatedSites.filter((s, i) => s.health === 'failed' && sites[i].health !== 'failed');
      if (newlyFailed.length > 0) {
        setSiteFailureLog(prev => [...prev, ...newlyFailed.map(s => ({ quarter, site: s }))]);
        // Each failure: stat damage
        next.brand = clamp((next.brand || 0) - 5);
        next.ethics = clamp((next.ethics || 0) - 3);
      }
    }

    // === CHANNEL DRIFT ===
    // Each marketing channel exerts a small per-quarter influence on brand and ethics
    if (channelMix && q.brandFxFromChannels) {
      const brandDelta = q.brandFxFromChannels;
      if (Math.abs(brandDelta) >= 0.3) next.brand = clamp((next.brand || 0) + Math.round(brandDelta * 10) / 10);
      if (Math.abs(q.ethicsFxFromChannels) >= 0.3) next.ethics = clamp((next.ethics || 0) + Math.round(q.ethicsFxFromChannels * 10) / 10);
      // ASA risk: cumulative breach risk per quarter from over-relying on high-risk channels
      if (q.asaRiskFromChannels > 0.10 && Math.random() < q.asaRiskFromChannels) {
        // Breach this quarter
        next.compliance = clamp((next.compliance || 0) - 4);
        next.brand = clamp((next.brand || 0) - 3);
        next.ethics = clamp((next.ethics || 0) - 2);
      }
    }

    // === TREATMENT MIX DRIFT ===
    // Each category's statBoost applies proportional to its allocation in the mix.
    // 30% biostimulators → +0.6 brand + 0.6 innovation per quarter.
    const totalMixPct = Object.values(treatmentMix || {}).reduce((a, b) => a + b, 0);
    if (totalMixPct > 0) {
      const mixDriftFx = {};
      TREATMENT_CATEGORIES.forEach(cat => {
        const pct = (treatmentMix[cat.id] || 0) / 100;
        if (pct > 0 && cat.statBoost) {
          Object.entries(cat.statBoost).forEach(([stat, val]) => {
            mixDriftFx[stat] = (mixDriftFx[stat] || 0) + val * pct;
          });
        }
      });
      // Apply drift (small per-quarter effects compound)
      Object.entries(mixDriftFx).forEach(([stat, val]) => {
        if (Math.abs(val) >= 0.3) {
          next[stat] = clamp((next[stat] || 0) + Math.round(val * 10) / 10);
        }
      });
    }

    // Reset capex for next quarter, age existing capex, register any new capex from this quarter
    const CAPEX_CATALOG = {
      12: { name: '3D Imaging System', quarters: 8, fx: { innovation: 4, nps: 3, brand: 2 } },
      24: { name: 'RF Microneedling Device', quarters: 8, fx: { innovation: 6, brand: 3 } },
      8: { name: 'Premium Treatment Furniture', quarters: 12, fx: { brand: 4, nps: 2 } },
      18: { name: 'Clinic Refurbishment', quarters: 16, fx: { brand: 6, nps: 3 } },
    };
    setActiveCapex(prev => {
      const aged = prev.map(c => ({ ...c, quartersRemaining: c.quartersRemaining - 1 })).filter(c => c.quartersRemaining > 0);
      if (capexThisQ > 0 && CAPEX_CATALOG[capexThisQ]) {
        const item = CAPEX_CATALOG[capexThisQ];
        aged.push({
          name: item.name,
          amount: capexThisQ,
          quartersRemaining: item.quarters,
          quarterlyDepreciation: capexThisQ / item.quarters,
        });
        // Apply stat boost from the asset
        Object.entries(item.fx).forEach(([k, v]) => { next[k] = clamp((next[k] || 0) + v); });
      }
      return aged;
    });
    // capex cash has already been subtracted via q.net = q.cashFromOps − q.capexCashOut
    setCapexThisQ(0);

    // Streak bonus: positive net for 2+ quarters → +brand momentum
    if (q.net > 0) {
      next.streak = (next.streak || 0) + 1;
      if (next.streak >= 2) {
        next.brand = clamp((next.brand || 0) + 2);
      }
    } else {
      next.streak = 0;
    }

    // Per-quarter stat decay — high stats erode without reinvestment.
    // This prevents stat-banking. You can't just stat-max once and ride it.
    // Only stats above 50 decay; lower stats are stable. NPS and brand decay slightly faster
    // (patients forget, market noise accumulates).
    const decayStat = (val, rate) => {
      if (val <= 50) return val;
      const excess = val - 50;
      return Math.max(50, val - Math.round(excess * rate * 10) / 10);
    };
    next.brand = decayStat(next.brand || 0, 0.06);
    next.nps = decayStat(next.nps || 0, 0.06);
    next.innovation = decayStat(next.innovation || 0, 0.04);
    next.safety = decayStat(next.safety || 0, 0.04);
    next.compliance = decayStat(next.compliance || 0, 0.05);
    next.ethics = decayStat(next.ethics || 0, 0.03);

    // Streak updates and bonus application
    const newStreaks = { ...streakCounters };
    // Profit streak — already tracked in next.streak but let's mirror
    newStreaks.profit = (next.streak || 0);
    // Ethics streak — increments if ethics didn't drop this quarter and there are no aggressive-upsell moves played
    const ethicsHeld = next.ethics >= state.ethics - 2;
    newStreaks.ethics = ethicsHeld ? (newStreaks.ethics + 1) : 0;
    // Safety streak — increments if no complication-style event fired (simplified: no big safety hit)
    const noSafetyHit = next.safety >= state.safety - 5;
    newStreaks.safety = noSafetyHit ? (newStreaks.safety + 1) : 0;
    // Consult streak: incremented elsewhere (in face case completion)

    // Apply streak bonuses when thresholds first hit
    STREAKS.forEach(streak => {
      const key = streak.id.replace('-streak', '');
      const prev = streakCounters[key] || 0;
      const now = newStreaks[key] || 0;
      if (now === streak.threshold && prev < streak.threshold) {
        // Bonus fires once when threshold first reached
        for (const k in streak.bonus) {
          if (k === 'cash') next.cash += streak.bonus[k];
          else next[k] = clamp((next[k] || 0) + streak.bonus[k]);
        }
      }
    });
    setStreakCounters(newStreaks);

    // Progress active multi-quarter campaigns
    if (activeCampaigns.length > 0) {
      const stillActive = [];
      const justCompleted = [];
      activeCampaigns.forEach(c => {
        const campaign = CAMPAIGNS.find(x => x.id === c.id);
        if (!campaign) return;
        // Apply quarterly progress fx
        for (const k in campaign.progressFx) next[k] = clamp((next[k] || 0) + campaign.progressFx[k]);
        const remaining = c.quartersRemaining - 1;
        if (remaining <= 0) {
          // Check if completion requirements still met
          if (!campaign.requires || campaign.requires(next)) {
            for (const k in campaign.completeFx) {
              if (k === 'cash') next.cash += campaign.completeFx[k];
              else next[k] = clamp((next[k] || 0) + campaign.completeFx[k]);
            }
            justCompleted.push({ ...c, success: true });
          } else {
            // Failed completion — apply fail fx
            for (const k in (campaign.failFx || {})) {
              if (k === 'cash') next.cash += campaign.failFx[k];
              else next[k] = clamp((next[k] || 0) + campaign.failFx[k]);
            }
            justCompleted.push({ ...c, success: false });
          }
        } else {
          stillActive.push({ ...c, quartersRemaining: remaining });
        }
      });
      setActiveCampaigns(stillActive);
      if (justCompleted.length > 0) setCompletedCampaigns([...completedCampaigns, ...justCompleted]);
    }

    // Staff loyalty drift each quarter
    // Good ethics + cash + low strain → loyalty rises
    // Poor ethics + cash crunch + high strain → loyalty falls
    if (hiredStaff.length > 0) {
      const updatedStaff = hiredStaff.map(s => {
        let drift = 0;
        if (state.ethics > 60) drift += 2;
        if (state.ethics < 35) drift -= 4;
        if (next.cash < 10) drift -= 3; // cash-strapped clinics feel risky to staff
        if (q.capacityStrain > 0.3) drift -= 2; // burnout
        if (state.nps > 65) drift += 1; // happy clinic
        if (drift === 0) drift = -1; // gradual default decay
        return { ...s, loyalty: Math.max(0, Math.min(100, s.loyalty + drift)) };
      });
      setHiredStaff(updatedStaff);
    }

    setPlayed([...played, ...selected]);
    setUsedMoves([...usedMoves, ...selected]);

    // Staff loyalty dynamics — loyalty drifts down 2-4 points/quarter, faster if cash is tight
    // Marketing Lead and Patient Coordinator partially insulate the team
    if (hiredStaff.length > 0) {
      const hasMarketing = hiredStaff.some(s => s.roleId === 'marketing');
      const hasCoord = hiredStaff.some(s => s.roleId === 'patient-coord');
      const cultureBuffer = (hasMarketing ? 1 : 0) + (hasCoord ? 1 : 0);
      const cashStress = next.cash < 10 ? 3 : next.cash < 25 ? 1 : 0;
      const baseDrift = 2 + cashStress - cultureBuffer; // 0-5 points/quarter
      const decayed = hiredStaff.map(s => ({ ...s, loyalty: Math.max(0, s.loyalty - baseDrift) }));
      setHiredStaff(decayed);

      // Poaching event: a senior injector with loyalty < 55 might be approached from Q4 onwards
      const seniorAtRisk = decayed.find(s => s.roleId === 'senior-injector' && s.loyalty < 55 && quarter >= 3);
      if (seniorAtRisk && Math.random() < 0.6 && !pendingPoach) {
        // Trigger poaching event AFTER ticker
        setPendingPoach(seniorAtRisk);
      }
    }

    // Generate weekly ticker — shown before the event/scenario
    const ticker = generateWeeklyTicker(next, hiredStaff, patients);
    setWeeklyTickerEvents(ticker);
    setPendingMicroFx({}); // reset

    const offersFiller = setup.filler && setup.filler !== 'none';
    const offersToxin = setup.toxin && setup.toxin !== 'none';
    const canDo = (req) => {
      if (!req || req === 'any') return true;
      if (req === 'filler') return offersFiller;
      if (req === 'toxin') return offersToxin;
      if (req === 'both') return offersFiller && offersToxin;
      return true;
    };
    const availC = CONSULTATIONS.filter(c => !usedConsults.includes(c.id) && canDo(c.requires));
    const availS = SCENARIOS.filter(s => !usedScenarios.includes(s.id) && canDo(s.requires));
    const availF = FACE_CASES.filter(f => !usedFaceCases.includes(f.id) && canDo(f.requires));
    const roll = Math.random();

    // Set-piece events fire at scheduled quarters, overriding the random roll
    const dueSetPiece = SET_PIECES.find(sp => sp.quarter === quarter && !usedSetPieces.includes(sp.id));

    let targetPhase, payload;
    if (dueSetPiece) {
      setPendingSetPiece(dueSetPiece);
      setResults({ moves: playedMoves, kind: 'setpiece', q });
      targetPhase = 'setpiece';
    } else if (availF.length > 0 && roll < 0.45) {
      const fc = availF[Math.floor(Math.random() * availF.length)];
      setPendingFaceCase(fc);
      setResults({ moves: playedMoves, kind: 'face', q });
      targetPhase = 'faceCase';
    } else if (roll < 0.60) {
      // Patient acquisition battle
      const patient = PATIENT_TYPES[Math.floor(Math.random() * PATIENT_TYPES.length)];
      const shuffled = [...COMPETITOR_POOL].sort(() => Math.random() - 0.5);
      const archetype = LOCATIONS.find(l => l.id === setup.location)?.archetype || 'aspirational';
      const archetypeMap = { premium: 'premium', aspirational: 'aspirational', 'social-led': 'social', loyalist: 'loyalist', volume: 'volume' };
      const competitors = shuffled.slice(0, 3);
      setPendingBattle({ patient, competitors, archetype: archetypeMap[archetype] || 'aspirational' });
      setResults({ moves: playedMoves, kind: 'battle', q });
      targetPhase = 'battle';
    } else if (availC.length > 0 && roll < 0.75) {
      const c = availC[Math.floor(Math.random() * availC.length)];
      setPendingConsult(c);
      setConsultStage(0);
      setConsultStageId(c.branching ? c.startStage : null);
      setConsultFlags([]);
      setConsultHistory([]);
      setConsultChoice(null);
      setConsultMood(c.branching && c.stages[c.startStage]?.moodHint || 'calm');
      setResults({ moves: playedMoves, kind: 'consult', q });
      targetPhase = 'consultation';
    } else if (availS.length > 0 && roll < 0.90) {
      const sc = availS[Math.floor(Math.random() * availS.length)];
      setPendingScenario(sc);
      setResults({ moves: playedMoves, kind: 'scenario', q });
      targetPhase = 'scenario';
    } else {
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      const passed = ev.check(next);
      let fx = passed ? ev.win : ev.lose;
      const hasIndemnity = setup.compliance.includes('indemnity');
      const hasICO = setup.compliance.includes('ico');
      const uninsured = !hasIndemnity && ev.complicationEvent && !passed;
      const unregistered = !hasICO && ev.icoEvent;
      if (uninsured) fx = { ...fx, cash: (fx.cash || 0) - 40, brand: (fx.brand || 0) - 10, compliance: (fx.compliance || 0) - 8 };
      if (unregistered) fx = { ...fx, cash: (fx.cash || 0) - 12, compliance: (fx.compliance || 0) - 10, brand: (fx.brand || 0) - 6 };
      next = applyFx(next, fx);
      setResults({ moves: playedMoves, kind: 'event', event: ev, passed, eventFx: fx, q, uninsured, unregistered });
      setLog([...log, { quarter, moves: playedMoves.map(m => m.title), event: ev.title, passed }]);
      targetPhase = 'results';
    }

    // Milestone detection — check each unmet milestone against new state
    const ctx = {
      q,
      previousMilestones: milestones.map(m => m.id),
      movesPlayedThisQ: playedMoves.map(m => m.id),
      streakCounters,
      bustCount,
      treatmentMix,
      ebdUnlocked,
      sites,
    };
    const newlyTriggered = MILESTONES.filter(m =>
      !milestones.find(x => x.id === m.id) && m.check(next, state, ctx)
    );
    if (newlyTriggered.length > 0) {
      setMilestones([...milestones, ...newlyTriggered]);
      setLatestMilestone(newlyTriggered[0]); // surface the first one
      setTimeout(() => sfx.milestone(), 250);
    } else {
      setLatestMilestone(null);
    }

    // === RIVAL EVENT TRIGGER ===
    // 38% chance per quarter (skipped Q1-Q2), one event maximum, with cooldown
    let triggeredRivalEvent = null;
    if (quarter >= 2 && Math.random() < 0.38) {
      const eligible = RIVAL_EVENTS.filter(ev => !usedRivalEvents.includes(ev.id) && quarter >= ev.minQ);
      if (eligible.length > 0) {
        triggeredRivalEvent = eligible[Math.floor(Math.random() * eligible.length)];
        setUsedRivalEvents(prev => [...prev, triggeredRivalEvent.id]);
        // Apply stat fx to player
        if (triggeredRivalEvent.fx) {
          Object.entries(triggeredRivalEvent.fx).forEach(([k, v]) => {
            if (k === 'cash') next.cash = (next.cash || 0) + v;
            else next[k] = clamp((next[k] || 0) + v);
          });
        }
        // Apply brandShift to the named rival
        if (triggeredRivalEvent.target || triggeredRivalEvent.rival) {
          const targetId = triggeredRivalEvent.target || triggeredRivalEvent.rival;
          setRivals(prev => prev.map(r => {
            if (r.id !== targetId) return r;
            const newBrand = clamp(r.currentBrand + (triggeredRivalEvent.brandShift || 0));
            // Status: if brand crashed below 20, mark as failing; if rose past 75, ascendant
            let status = 'active';
            if (newBrand < 20) status = 'failing';
            else if (newBrand >= 75) status = 'ascendant';
            return { ...r, currentBrand: newBrand, status };
          }));
        }
        setLastRivalEvent({ event: triggeredRivalEvent, quarter });
      }
    } else {
      setLastRivalEvent(null);
    }

    setState(next);
    setPendingTargetPhase(targetPhase);
    setPhase('ticker');
  };

  const completeTicker = () => {
    // Apply any micro-choice fx accumulated during the ticker
    if (Object.keys(pendingMicroFx).length > 0) {
      setState(applyFx(state, pendingMicroFx));
    }
    // If a senior staff member is being poached, interrupt with that decision first
    if (pendingPoach) {
      setPhase('staffPoach');
      return;
    }
    setPhase(pendingTargetPhase || 'results');
  };

  const resolvePoach = (action) => {
    // action: 'match' (counter-offer, costs cash, restores loyalty), 'let-go' (they leave, no cost), 'ignore' (50/50 they leave anyway)
    if (action === 'match') {
      // Counter-offer: one-off £8k retention bonus + permanent £4k/Q salary bump (modelled as immediate cash hit)
      const cost = 8 + 4; // £12k total this quarter
      setState({ ...state, cash: state.cash - cost });
      setHiredStaff(hiredStaff.map(s => s.id === pendingPoach.id ? { ...s, loyalty: Math.min(100, s.loyalty + 30), salaryBump: (s.salaryBump || 0) + 4 } : s));
    } else if (action === 'let-go') {
      // They leave, you lose them but no cost. -brand because seniors talk.
      setHiredStaff(hiredStaff.filter(s => s.id !== pendingPoach.id));
      setState({ ...state, brand: clamp((state.brand || 0) - 4) });
    } else {
      // ignore — 60% they leave on bad terms
      if (Math.random() < 0.6) {
        setHiredStaff(hiredStaff.filter(s => s.id !== pendingPoach.id));
        setState({ ...state, brand: clamp((state.brand || 0) - 8), nps: clamp((state.nps || 0) - 4) });
      } else {
        // they stay but resentful
        setHiredStaff(hiredStaff.map(s => s.id === pendingPoach.id ? { ...s, loyalty: Math.max(15, s.loyalty - 10) } : s));
      }
    }
    setPendingPoach(null);
    setPhase(pendingTargetPhase || 'results');
  };

  const handleMicroChoice = (option, eventCtx) => {
    // Apply fx
    if (option.fx) {
      const merged = { ...pendingMicroFx };
      for (const k in option.fx) merged[k] = (merged[k] || 0) + option.fx[k];
      setPendingMicroFx(merged);
    }
    // Loyalty change
    if (option.loyaltyBoost !== undefined && eventCtx?.targetStaffId) {
      setHiredStaff(hiredStaff.map(s => s.id === eventCtx.targetStaffId
        ? { ...s, loyalty: Math.max(0, Math.min(100, s.loyalty + option.loyaltyBoost)), _poachThreat: false }
        : s
      ));
    }
    // Staff removal (poach event, choose to let them go)
    if (option.removeStaff) {
      setHiredStaff(hiredStaff.filter(s => s.roleId !== option.removeStaff));
    }
  };

  const resolveScenario = (choice) => {
    const next = applyFx(state, choice.fx);
    setState(next);
    setUsedScenarios([...usedScenarios, pendingScenario.id]);
    setScenarioOutcome({ choice, scenario: pendingScenario });
    setLog([...log, { quarter, moves: results.moves.map(m => m.title), event: pendingScenario.title, scenario: true, choice: choice.label }]);
    setPhase('scenarioOutcome');
  };

  // Helper: get current consultation stage object (handles linear array OR branching object)
  const getCurrentConsultStage = () => {
    if (!pendingConsult) return null;
    if (pendingConsult.branching) {
      return pendingConsult.stages[consultStageId];
    }
    return pendingConsult.stages[consultStage];
  };
  const getConsultProgress = () => {
    if (!pendingConsult) return { current: 0, total: 0 };
    if (pendingConsult.branching) {
      return { current: consultHistory.length + 1, total: 4 }; // approximate
    }
    return { current: consultStage + 1, total: pendingConsult.stages.length };
  };

  const makeConsultChoice = (option) => {
    setState(applyFx(state, option.fx));
    setConsultChoice(option);
    // Track for summary
    setConsultHistory([...consultHistory, { stageId: consultStageId || `stage-${consultStage}`, label: option.label }]);
    // Add flag if option sets one
    if (option.addsFlag) setConsultFlags([...consultFlags, option.addsFlag]);
    // Mood: explicit moodTo wins; otherwise infer from fx
    if (option.moodTo) {
      setConsultMood(option.moodTo);
    } else {
      const f = option.fx || {};
      const goodSignal = (f.nps || 0) + (f.ethics || 0) + (f.brand || 0);
      const badSignal = -goodSignal + (f.cash > 1 ? 3 : 0);
      if (goodSignal > 8) setConsultMood('interested');
      else if (goodSignal > 3) setConsultMood('calm');
      else if (badSignal > 6) setConsultMood('defensive');
      else if (badSignal > 2) setConsultMood('anxious');
      else setConsultMood('closing');
    }
  };

  const advanceConsult = () => {
    if (pendingConsult.branching) {
      // Branching: jump to the nextId from the chosen option
      const nextId = consultChoice?.nextId;
      if (!nextId) {
        // No next — treat as terminal
        finishConsult();
        return;
      }
      const nextStage = pendingConsult.stages[nextId];
      if (!nextStage) {
        finishConsult();
        return;
      }
      if (nextStage.terminal) {
        // Show the terminal stage briefly, then finish
        setConsultStageId(nextId);
        setConsultChoice(null);
      } else {
        setConsultStageId(nextId);
        setConsultChoice(null);
        if (nextStage.moodHint) setConsultMood(nextStage.moodHint);
      }
    } else {
      // Linear path (legacy)
      if (consultStage < pendingConsult.stages.length - 1) {
        setConsultStage(consultStage + 1);
        setConsultChoice(null);
      } else {
        finishConsult();
      }
    }
  };

  const finishConsult = () => {
    setUsedConsults([...usedConsults, pendingConsult.id]);
    setLog([...log, { quarter, moves: results.moves.map(m => m.title), event: `Consultation: ${pendingConsult.persona}`, consult: true, flags: [...consultFlags] }]);
    // Consultation-mastery streak: if the consultation ended with mood interested/calm and ethics+brand were preserved
    const masteryOnPattern = (consultMood === 'interested' || consultMood === 'calm') && consultFlags.length > 0;
    setStreakCounters(prev => ({ ...prev, consult: masteryOnPattern ? (prev.consult + 1) : 0 }));
    setConsultMood('calm');
    setConsultFlags([]);
    setConsultHistory([]);
    setConsultStageId(null);
    nextQuarter();
  };


  const completeFaceCase = (fx, score) => {
    setState(applyFx(state, fx));
    setUsedFaceCases([...usedFaceCases, pendingFaceCase.id]);
    setLog([...log, { quarter, moves: results.moves.map(m => m.title), event: `Treatment: ${pendingFaceCase.persona}`, face: true, score }]);
    setPendingFaceCase(null);
    nextQuarter();
  };

  const resolveBattle = (outcome) => {
    let next = { ...state };
    if (outcome.won) {
      next.cash = Math.round((next.cash + outcome.lifetimeValue * 0.2) * 10) / 10; // 20% of CLV booked immediately
      next.nps = clamp((next.nps || 0) + 3);
      next.brand = clamp((next.brand || 0) + 2);
      // Add won patient to roster
      addPatient(outcome.patient.id, outcome.lifetimeValue * 0.2);
    } else {
      next.brand = clamp((next.brand || 0) - 2);
    }
    setState(next);
    setLog([...log, { quarter, moves: results.moves.map(m => m.title), event: `Battle: ${outcome.patient.label}`, battle: true, won: outcome.won }]);
    setPendingBattle(null);
    nextQuarter();
  };

  const nextQuarter = () => {
    if (state.cash < 0) { sfx.warn(); setBustCount(bustCount + 1); setPhase('insolvent'); return; }
    if (quarter >= MAX_Q) { setOffers(calculateOffers(state, financialHistory, bustCount, treatmentMix, sites)); setPhase('canvas'); return; }
    setQuarter(quarter + 1);
    setHand([]); setSelected([]); setResults(null); setPendingScenario(null); setScenarioOutcome(null); setPendingConsult(null); setConsultStage(0); setConsultStageId(null); setConsultFlags([]); setConsultHistory([]); setConsultChoice(null);
    setPhase('play');
  };

  // Staff hire/fire
  const hireStaff = (roleId) => {
    const role = STAFF_ROLES.find(r => r.id === roleId);
    if (!role) return;
    const firstName = ['Alex', 'Jordan', 'Sam', 'Riley', 'Morgan', 'Taylor', 'Cameron', 'Jamie', 'Drew', 'Casey'][Math.floor(Math.random() * 10)];
    const lastName = ['Wells', 'Khan', 'Patel', 'O\'Brien', 'Hughes', 'Sinclair', 'Ade', 'Mortimer', 'Holst', 'Devereux'][Math.floor(Math.random() * 10)];
    const newMember = { id: `staff-${Date.now()}-${Math.random()}`, roleId, name: `${firstName} ${lastName}`, loyalty: 70, joinedQ: quarter };
    setHiredStaff([...hiredStaff, newMember]);
    setState(applyFx({ ...state, cash: state.cash - role.hireCost }, role.fx));
  };
  const fireStaff = (id) => {
    const member = hiredStaff.find(s => s.id === id);
    if (!member) return;
    const role = STAFF_ROLES.find(r => r.id === member.roleId);
    setHiredStaff(hiredStaff.filter(s => s.id !== id));
    // Remove their stat contribution
    const reversed = {};
    for (const k in role.fx) reversed[k] = -role.fx[k];
    setState(applyFx(state, reversed));
  };

  // Add a patient to the persistent roster
  const addPatient = (archetypeId, initialValue) => {
    const archetype = PATIENT_TYPES.find(a => a.id === archetypeId);
    const pool = NAMED_PATIENTS.filter(n => n.archetype === archetypeId && !patients.some(p => p.name.startsWith(n.first)));
    const nameSource = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : { first: 'Patient', archetype: archetypeId };
    const surnames = ['Bennett', 'Clarke', 'Davies', 'Edwards', 'Foster', 'Hughes', 'Jameson', 'King', 'Lawson', 'Mortimer'];
    const newPatient = {
      id: `pat-${Date.now()}-${Math.random()}`,
      name: `${nameSource.first} ${surnames[Math.floor(Math.random() * surnames.length)]}`,
      archetypeId,
      archetypeLabel: archetype?.label || archetypeId,
      visits: 1,
      cumulativeValue: initialValue,
      status: 'active',
      joinedQ: quarter,
    };
    setPatients([...patients, newPatient]);
    return newPatient;
  };

  // Generate weekly ticker for a quarter — 5-7 events
  const generateWeeklyTicker = (currentState, currentStaff, currentPatients) => {
    const eligible = WEEKLY_EVENTS.filter(e => {
      try { return e.condition(currentState, currentStaff, currentPatients); } catch (err) { return false; }
    });
    const weighted = [];
    eligible.forEach(e => { for (let i = 0; i < (e.weight || 1); i++) weighted.push(e); });
    const count = 5 + Math.floor(Math.random() * 2); // 5-6 events
    const chosen = [];
    const usedIds = new Set();
    for (let i = 0; i < count && weighted.length > 0; i++) {
      const candidate = weighted[Math.floor(Math.random() * weighted.length)];
      if (usedIds.has(candidate.id)) { i--; continue; }
      usedIds.add(candidate.id);
      // Resolve dynamic content
      let text = candidate.text;
      let resolvedMicro = candidate.microChoice;
      if (candidate.dynamic && currentPatients && currentPatients.length > 0) {
        const p = currentPatients[Math.floor(Math.random() * currentPatients.length)];
        if (candidate.dynamic === 'return') text = `${p.name} books in for a follow-up. She's brought a photo from a recent holiday. She wants subtle.`;
        if (candidate.dynamic === 'refer') text = `${p.name} refers a colleague — apparently you came up at brunch.`;
        if (candidate.dynamic === 'leave') text = `${p.name} cancels her standing appointment. She doesn't say why.`;
      }
      if (candidate.dynamic && currentStaff && currentStaff.length > 0) {
        if (candidate.dynamic === 'payrise') {
          const target = currentStaff.find(m => m.loyalty < 65) || currentStaff[0];
          text = `${target.name} requests a meeting. She walks in calmly: "I love it here, but I've been doing some research. I want to talk about my pay."`;
          resolvedMicro = { ...candidate.microChoice, targetStaffId: target.id };
        }
        if (candidate.dynamic === 'poach') {
          const target = currentStaff.find(m => m.roleId === 'senior-injector' && (m._poachThreat || m.loyalty < 50));
          if (target) {
            text = `${target.name} closes your office door. "I had to tell you face to face. NorthStar Cosmetic Group made me an offer. Equity, ownership track, 30% more pay. I haven't said yes."`;
            resolvedMicro = { ...candidate.microChoice, targetStaffId: target.id };
          }
        }
        if (candidate.dynamic === 'disengaged') {
          const target = currentStaff.find(m => m.loyalty < 40);
          if (target) {
            text = `${target.name} has been quiet all week. The patient feedback dropped. The team noticed.`;
          }
        }
      }
      chosen.push({ ...candidate, text, microChoice: resolvedMicro, week: i * 2 + 1 });
    }
    return chosen;
  };

  const startGame = () => {
    clearSavedGame();
    setState(INITIAL); setQuarter(1);
    setUsedMoves([]); setPlayed([]); setUsedScenarios([]); setUsedConsults([]); setLog([]);
    setHand([]); setSelected([]); setResults(null);
    setOffers([]); setChosenSuitor(null); setLockedMoves([]); setSetupStep(1); setCanvasFactor(null);
    setSetup({ background: null, training: null, structure: null, location: null, premises: null, compliance: [], toxin: null, filler: null, biostim: null, savings: null, loan: null, investor: null });
    setLaunch({ channel: null, seeds: [] });
    setUsedFaceCases([]);
    setPendingFaceCase(null);
    setPendingBattle(null);
    setHiredStaff([]); setPatients([]); setWeeklyTickerEvents([]); setPendingMicroFx({}); setPendingPoach(null); setStaffPanelOpen(false);
    setFinancialHistory([]); setBustCount(0);
    setPendingSetPiece(null); setUsedSetPieces([]); setMarketingPolicy('standard'); setSupplierStrategy('standard'); setWorkingCapitalPolicy('standard'); setCapexThisQ(0); setActiveCapex([]);
    setStreakCounters({ ethics: 0, safety: 0, consult: 0, profit: 0 });
    setActiveCampaigns([]); setCompletedCampaigns([]); setMilestones([]); setLatestMilestone(null); setEbdUnlocked(false); setTreatmentMix(Object.fromEntries(TREATMENT_CATEGORIES.map(c => [c.id, c.defaultPct]))); setSites([]); setPendingExpansion(null); setSiteFailureLog([]); setRivals(RIVAL_NETWORK.map(r => ({ ...r, currentBrand: r.startingBrand, currentSites: r.startingSites, status: 'active' }))); setUsedRivalEvents([]); setLastRivalEvent(null); setChannelMix({ instagram: 60, tiktok: 10, youtube: 10, google: 20 });
    setIsRestarting(false);
    setPhase('setup');
  };

  // Restart after bust — same person, second attempt. Keep identity, training, and location.
  // Reset finances, premises, compliance, formulary, capital structure.
  const restartAfterBust = () => {
    setState(INITIAL); setQuarter(1);
    setUsedMoves([]); setPlayed([]); setUsedScenarios([]); setUsedConsults([]); setLog([]);
    setHand([]); setSelected([]); setResults(null);
    setOffers([]); setChosenSuitor(null); setCanvasFactor(null);
    // Preserve background, training, location — the rest is reset
    setSetup({
      background: setup.background,
      training: setup.training,
      location: setup.location,
      structure: null,
      premises: null,
      compliance: [],
      toxin: null,
      filler: null,
      biostim: null,
      savings: null,
      loan: null,
      investor: null,
    });
    setLockedMoves(BACKGROUNDS.find(b => b.id === setup.background)?.locked || []);
    setLaunch({ channel: null, seeds: [] });
    setUsedFaceCases([]);
    setPendingFaceCase(null);
    setPendingBattle(null);
    setHiredStaff([]); setPatients([]); setWeeklyTickerEvents([]); setPendingMicroFx({}); setPendingPoach(null); setStaffPanelOpen(false);
    setFinancialHistory([]); // fresh financial track, but bustCount stays incremented
    setPendingSetPiece(null); setUsedSetPieces([]); setMarketingPolicy('standard'); setSupplierStrategy('standard'); setWorkingCapitalPolicy('standard'); setCapexThisQ(0); setActiveCapex([]);
    setStreakCounters({ ethics: 0, safety: 0, consult: 0, profit: 0 });
    setActiveCampaigns([]); setCompletedCampaigns([]); setMilestones([]); setLatestMilestone(null); setEbdUnlocked(false); setTreatmentMix(Object.fromEntries(TREATMENT_CATEGORIES.map(c => [c.id, c.defaultPct]))); setSites([]); setPendingExpansion(null); setSiteFailureLog([]); setRivals(RIVAL_NETWORK.map(r => ({ ...r, currentBrand: r.startingBrand, currentSites: r.startingSites, status: 'active' }))); setUsedRivalEvents([]); setLastRivalEvent(null); setChannelMix({ instagram: 60, tiktok: 10, youtube: 10, google: 20 });
    setIsRestarting(true);
    // Jump to page 1 — they still need to re-decide capital (new financial reality after a bust)
    setSetupStep(1);
    setPhase('setup');
  };

  const evScore = useMemo(() => calcEV(state), [state]);
  const canvasData = useMemo(() => buildCanvasData(played), [played]);
  const validOffers = offers.filter(o => o.passed);
  const topOffer = validOffers.length > 0 ? Math.max(...validOffers.map(o => o.offer)) : 0;
  const selFactor = canvasFactor ? canvasData.find(f => f.id === canvasFactor) : null;
  const setupCost = setup.compliance.reduce((sum, id) => sum + COMPLIANCE_OPTIONS.find(c => c.id === id).cost, 0);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(184,148,95,0); } 50% { box-shadow: 0 0 0 4px rgba(184,148,95,0.18); } }
        @keyframes barFill { from { width: 0; } }
        @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
        @keyframes streakBounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .ai-fade-in { animation: fadeSlideIn 0.35s ease-out; }
        .ai-pulse { animation: pulseGlow 2.4s ease-in-out infinite; }
        .ai-streak-glow { animation: streakBounce 1.8s ease-in-out infinite; }
        button { transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease; }
        button:active:not(:disabled) { transform: scale(0.98); }
        button:hover:not(:disabled) { filter: brightness(1.04); }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FAF6EE 0%, #F2EBDC 100%)', color: '#0E1726', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', padding: '22px 18px 80px' }}>
        {/* Persistent sound toggle — top-right corner */}
        <button onClick={toggleSound} aria-label={soundOn ? 'Mute sound' : 'Enable sound'} style={{ position: 'fixed', top: 14, right: 14, width: 32, height: 32, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(14,23,38,0.12)', borderRadius: 16, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, color: soundOn ? '#1A4D5E' : '#9B9098', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(14,23,38,0.08)' }}>
          {soundOn ? '♪' : '∅'}
        </button>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {phase === 'intro' && (() => {
            let hasSaved = false;
            try { hasSaved = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
            const isReturning = hasSaved || bustCount > 0 || milestones.length > 0;
            return (
            <div style={{ paddingTop: 16 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#B8945F', marginBottom: 14, fontWeight: 700 }}>A Strategic Simulation · UK · 2026</div>
              <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: isReturning ? 42 : 56, lineHeight: 0.92, fontWeight: 400, margin: '0 0 4px', letterSpacing: '-0.04em' }}>The Aesthetic<br />Innovator<span style={{ color: '#B8945F' }}>.</span></h1>
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: isReturning ? 15 : 19, color: '#3D2548', marginTop: 14, marginBottom: 20, lineHeight: 1.35 }}>Open a clinic. Win patients. Survive the regulator. Sell — if you can.</p>

              {/* Returning-player fast path */}
              {isReturning && (
                <div className="ai-fade-in" style={{ background: 'rgba(26,77,94,0.06)', border: '1px solid rgba(26,77,94,0.3)', borderLeft: '3px solid #1A4D5E', padding: 14, marginBottom: 16, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Welcome Back</div>
                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#0E1726', lineHeight: 1.5, margin: '0 0 10px' }}>
                    {hasSaved ? 'You have a clinic in progress.' : `Round ${(bustCount || 0) + 1}. ${bustCount > 0 ? `${bustCount} prior bust on the record — diligence flag in effect.` : ''}`}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {hasSaved && (
                      <button onClick={() => {
                        try {
                          const raw = localStorage.getItem(SAVE_KEY);
                          const snap = JSON.parse(raw);
                          if (snap?.phase) {
                            setPhase(snap.phase); setState(snap.state || INITIAL); setQuarter(snap.quarter || 1);
                            setSetup(snap.setup || setup); setLaunch(snap.launch || launch);
                            setHand(snap.hand || []); setSelected(snap.selected || []); setPlayed(snap.played || []);
                            setUsedMoves(snap.usedMoves || []); setUsedScenarios(snap.usedScenarios || []);
                            setUsedConsults(snap.usedConsults || []); setUsedFaceCases(snap.usedFaceCases || []);
                            setLog(snap.log || []); setLockedMoves(snap.lockedMoves || []);
                            setHiredStaff(snap.hiredStaff || []); setPatients(snap.patients || []);
                            setFinancialHistory(snap.financialHistory || []); setBustCount(snap.bustCount || 0);
                          }
                        } catch (e) {}
                      }} style={{ flex: 1, background: '#0E1726', color: '#FAF6EE', border: 'none', padding: '11px 14px', fontFamily: 'Fraunces, serif', fontSize: 14, cursor: 'pointer', borderRadius: 2 }}>Continue →</button>
                    )}
                    <button onClick={startGame} style={{ flex: 1, background: 'transparent', color: '#1A4D5E', border: '1px solid #1A4D5E', padding: '11px 14px', fontFamily: 'Fraunces, serif', fontSize: 14, cursor: 'pointer', borderRadius: 2 }}>{hasSaved ? 'New Game' : 'Start Round ' + ((bustCount || 0) + 1)}</button>
                  </div>
                  <button onClick={() => setPhase('glossary')} style={{ marginTop: 8, width: '100%', background: 'transparent', color: '#5A5560', border: '1px solid rgba(14,23,38,0.12)', padding: '8px 12px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.04em' }}>Business Concepts Glossary →</button>
                </div>
              )}

              {/* Full editorial hero — first-time players only */}
              {!isReturning && (
                <>
                  <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: '22px 18px', marginBottom: 18, borderRadius: 2, position: 'relative' }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#B8945F', marginBottom: 18, fontWeight: 700 }}>The Premise</div>
                <p style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#0E1726', lineHeight: 1.55, margin: '0 0 14px', fontWeight: 400 }}>
                  You are a UK clinician. You have decided to leave salaried medicine — or never entered it — and to build a non-surgical aesthetics practice.
                </p>
                <p style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#0E1726', lineHeight: 1.55, margin: '0 0 14px', fontWeight: 400 }}>
                  You will treat patients. You will compete for them. You will be tested by complications, regulators, the press, and the temptation to upsell what nobody asked for.
                </p>
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 17, color: '#8B2C3C', lineHeight: 1.55, margin: 0 }}>
                  Two years. Eight quarters. One question — what kind of practice did you build?
                </p>
              </div>

              {/* What you'll do — numbered pillars */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { num: '01', title: 'Treat', desc: 'Live anatomy mini-game on a facial map. Pick zone, depth, technique. Get it right.' },
                  { num: '02', title: 'Compete', desc: 'Three rival clinics. One patient. Pitch your angle — win their lifetime value.' },
                  { num: '03', title: 'Decide', desc: 'Multi-stage consultations. Upsell the bride? Refuse the influencer? Your ethics shape your exit.' },
                  { num: '04', title: 'Sell', desc: 'Four named acquirers at year two. Each wants a different clinic.' },
                ].map((p, i) => (
                  <div key={i} style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: '11px 12px', borderRadius: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#B8945F', fontWeight: 700, letterSpacing: '0.1em' }}>{p.num}</span>
                      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: '#0E1726' }}>{p.title}</span>
                    </div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', margin: 0, lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                ))}
              </div>

              {/* Pull quote */}
              <div style={{ background: 'rgba(26,77,94,0.05)', borderLeft: '3px solid #1A4D5E', padding: '14px 16px', marginBottom: 18, borderRadius: 2 }}>
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14.5, color: '#1A4D5E', margin: 0, lineHeight: 1.5 }}>
                  "The UK aesthetics market is worth ~£3.5bn. It is also unregulated, unevenly trained, and increasingly under public scrutiny. <strong style={{ fontStyle: 'normal' }}>This is the simulation of building inside that.</strong>"
                </p>
              </div>

              {/* Mechanics teaser */}
              <div style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(14,23,38,0.08)', padding: 14, marginBottom: 20, borderRadius: 2 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#3D2548', marginBottom: 10, textTransform: 'uppercase', fontWeight: 700 }}>Under the Hood</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['8 quarters', 'Two-year arc'],
                    ['3 AP / quarter', 'Spend strategically'],
                    ['9 UK locations', 'Map-based selection'],
                    ['Full P&L', 'EBITDA · CAC · CLV'],
                    ['6 patient types', 'Each with biases'],
                    ['Porter\'s Five Forces', 'On exit'],
                  ].map(([k, v], i) => (
                    <div key={i} style={{ borderLeft: '2px solid #B8945F', paddingLeft: 9 }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>{k}</div>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business glossary entry */}
              <button onClick={() => setPhase('glossary')} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(26,77,94,0.4)', color: '#1A4D5E', padding: '11px 14px', marginBottom: 12, fontFamily: 'Fraunces, serif', fontSize: 14, cursor: 'pointer', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Business Concepts Glossary</span>
                <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#B8945F', fontWeight: 700 }}>{Object.keys(BUSINESS_CONCEPTS).length} CONCEPTS</span>
              </button>

              <Primary onClick={startGame}>Begin Setup →</Primary>
                </>
              )}
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11.5, color: '#9B9098', textAlign: 'center', marginTop: 22, lineHeight: 1.6 }}>Designed by A. Zargaran. © 2026.</div>
            </div>
            );
          })()}

          {phase === 'glossary' && (() => {
            // Group concepts by chapter
            const chapters = {};
            Object.entries(BUSINESS_CONCEPTS).forEach(([id, c]) => {
              if (!chapters[c.chapter]) chapters[c.chapter] = [];
              chapters[c.chapter].push({ id, ...c });
            });
            return (
              <div className="ai-fade-in" style={{ paddingTop: 4 }}>
                <button onClick={() => setPhase('intro')} style={{ background: 'transparent', border: 'none', color: '#5A5560', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, marginBottom: 14 }}>← Back</button>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 8 }}>Reference</div>
                <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 40, lineHeight: 0.95, fontWeight: 400, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Business<br />Glossary<span style={{ color: '#B8945F' }}>.</span></h1>
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: '#3D2548', marginTop: 8, marginBottom: 22, lineHeight: 1.4 }}>The mechanics this simulator runs on, defined formally — with a worked example from your domain and a note on why each one matters.</p>
                {Object.entries(chapters).map(([chapterName, concepts]) => (
                  <div key={chapterName} style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 24, height: 1, background: '#B8945F' }} />
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700 }}>{chapterName}</div>
                      <div style={{ flex: 1, height: 1, background: 'rgba(184,148,95,0.3)' }} />
                    </div>
                    {concepts.map(c => <ConceptCard key={c.id} conceptId={c.id} />)}
                  </div>
                ))}
                <Primary onClick={() => setPhase('intro')}>Back to Game →</Primary>
              </div>
            );
          })()}

          {phase === 'ledger' && (() => {
            // Group log entries by quarter
            const byQ = {};
            log.forEach(entry => {
              if (!byQ[entry.quarter]) byQ[entry.quarter] = [];
              byQ[entry.quarter].push(entry);
            });
            const playerIdentity = (() => {
              // Infer dominant identity from state
              if (state.innovation >= 70 && state.compliance >= 65) return 'Research-Led Path';
              if (state.safety >= 65 && state.compliance >= 55) return 'Clinical Pharma Path';
              if (state.brand >= 60 && state.nps >= 60) return 'Brand & Volume Path';
              return 'PE Flip Path';
            })();
            return (
              <div className="ai-fade-in" style={{ paddingTop: 4 }}>
                <button onClick={() => setPhase('results')} style={{ background: 'transparent', border: 'none', color: '#5A5560', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, marginBottom: 14 }}>← Back to Quarter</button>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 8 }}>Decision Ledger</div>
                <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 38, lineHeight: 0.95, fontWeight: 400, margin: '0 0 8px', letterSpacing: '-0.03em' }}>What you<br />did<span style={{ color: '#B8945F' }}>.</span></h1>
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#3D2548', marginTop: 8, marginBottom: 16, lineHeight: 1.45 }}>Every meaningful choice across Q1 to Q{quarter}, reviewed in sequence. Your current identity reads as: <strong>{playerIdentity}</strong>.</p>

                {Object.entries(byQ).map(([qNum, entries]) => (
                  <div key={qNum} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, background: '#0E1726', color: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500 }}>Q{qNum}</div>
                      <div style={{ flex: 1, height: 1, background: 'rgba(14,23,38,0.12)' }} />
                      {financialHistory[qNum - 1] && (
                        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', letterSpacing: '0.04em' }}>EBITDA {financialHistory[qNum - 1].ebitda >= 1 ? `£${Math.round(financialHistory[qNum - 1].ebitda)}k` : financialHistory[qNum - 1].ebitda > 0 ? `£${Math.round(financialHistory[qNum - 1].ebitda * 1000)}` : '—'}</span>
                      )}
                    </div>
                    {entries.map((entry, i) => (
                      <div key={i} style={{ padding: '9px 11px', marginBottom: 5, background: 'rgba(255,255,255,0.55)', borderLeft: `2px solid ${entry.face ? '#1A4D5E' : entry.consult ? '#3D2548' : entry.battle ? '#8B2C3C' : entry.scenario ? '#B8945F' : entry.setpiece ? '#8B2C3C' : '#5A5560'}`, borderRadius: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', color: entry.face ? '#1A4D5E' : entry.consult ? '#3D2548' : entry.battle ? '#8B2C3C' : entry.scenario ? '#B8945F' : entry.setpiece ? '#8B2C3C' : '#5A5560', textTransform: 'uppercase', fontWeight: 700 }}>
                            {entry.face ? 'Treatment' : entry.consult ? 'Consultation' : entry.battle ? 'Patient Battle' : entry.scenario ? 'Scenario' : entry.setpiece ? 'Set-Piece' : 'Quarter'}
                          </span>
                          {entry.score !== undefined && <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: entry.score >= 60 ? '#5C7A52' : entry.score >= 0 ? '#B8945F' : '#8B2C3C', fontWeight: 700 }}>{entry.score >= 0 ? '+' : ''}{entry.score}</span>}
                        </div>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, color: '#0E1726', lineHeight: 1.4 }}>{entry.event}</div>
                        {entry.choice && <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12.5, color: '#5A5560', marginTop: 3, lineHeight: 1.4 }}>→ {entry.choice}</div>}
                        {entry.moves && entry.moves.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                            {entry.moves.map((m, j) => (
                              <span key={j} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, padding: '2px 6px', background: 'rgba(184,148,95,0.1)', color: '#B8945F', borderRadius: 2, fontWeight: 600 }}>{m}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <Primary onClick={() => setPhase('results')}>Back to Quarter →</Primary>
              </div>
            );
          })()}

          {phase === 'setup' && (() => {
            // Reusable Select component for compact dropdowns
            const Select = ({ value, onChange, options, placeholder }) => (
              <select value={value || ''} onChange={(e) => onChange(e.target.value || null)} style={{
                width: '100%', padding: '11px 12px', fontFamily: 'Fraunces, serif', fontSize: 14, color: '#0E1726',
                background: '#FFFFFF', border: `1px solid ${value ? '#1A4D5E' : 'rgba(14,23,38,0.2)'}`,
                borderRadius: 2, cursor: 'pointer', appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'><path d=\'M1 1l4 4 4-4\' fill=\'none\' stroke=\'%231A4D5E\' stroke-width=\'1.5\'/></svg>")',
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32,
              }}>
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o.id} value={o.id}>{o.label}{o.cost !== undefined ? ` — ${o.cost < 1 ? `£${Math.round(o.cost * 1000)}` : `£${o.cost}k`}` : ''}{o.cash !== undefined && o.cash > 0 ? ` (+£${o.cash}k)` : ''}</option>)}
              </select>
            );
            const SectionLabel = ({ children, sub }) => (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#3D2548', textTransform: 'uppercase', fontWeight: 700 }}>{children}</div>
                {sub && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
              </div>
            );
            const InlineDetail = ({ obj, showFx = true }) => obj ? (
              <div style={{ background: 'rgba(255,255,255,0.55)', borderLeft: '2px solid #B8945F', padding: '8px 11px', marginTop: 6, marginBottom: 12, borderRadius: 2 }}>
                <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', margin: 0, lineHeight: 1.45 }}>{obj.desc}</p>
                {showFx && obj.fx && <div style={{ marginTop: 5 }}>{Object.entries(obj.fx).filter(([k]) => k !== 'cash').map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>}
              </div>
            ) : null;

            // Compute cash preview
            const sav = SAVINGS_TIERS.find(s => s.id === setup.savings);
            const ln = LOANS.find(l => l.id === setup.loan);
            const inv = INVESTORS.find(i => i.id === setup.investor);
            const tr = TRAINING_PATHS.find(t => t.id === setup.training);
            const totalCash = (sav?.cash || 0) + (ln?.cash || 0) + (inv?.cash || 0) - (tr?.cost || 0) - COMPANY_FORMATION_COST;

            const page1Valid = setup.background && setup.training && setup.savings && setup.loan && setup.investor && setup.structure;
            const page2Valid = setup.location && setup.premises && setup.toxin && setup.filler && setup.biostim && hasOffering;

            return (
              <div>
                {isRestarting && (
                  <div style={{ background: 'rgba(184,148,95,0.1)', border: '1px solid rgba(184,148,95,0.3)', padding: '11px 14px', marginBottom: 14, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#B8945F', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>Round 2</span>
                    <span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#3D2548', lineHeight: 1.45 }}>Same you, same training, same area. Different plan. Background and location are locked — refine your capital, structure, and offer.</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700 }}>Setup · Step {setupStep} of 2</div>
                    <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, margin: '4px 0 0', letterSpacing: '-0.025em' }}>
                      {setupStep === 1 ? 'Who You Are' : 'Where & What'}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 600 }}>Starting Cash</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 500, color: totalCash < 5 ? '#8B2C3C' : '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{formatGBP(Math.max(0, totalCash))}</div>
                  </div>
                </div>
                {/* Step progress bar — visually shows where you are */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(14,23,38,0.1)' }}>
                  <div style={{ flex: 1, height: 3, background: '#1A4D5E', borderRadius: 1 }} />
                  <div style={{ flex: 1, height: 3, background: setupStep >= 2 ? '#1A4D5E' : 'rgba(14,23,38,0.12)', borderRadius: 1, transition: 'background 0.3s' }} />
                </div>

                {setupStep === 1 && (
                  <div className="ai-fade-in">
                    {/* Background — keeping visual cards because it's the identity choice */}
                    <SectionLabel sub={isRestarting ? 'Locked from your first attempt.' : null}>Your Background</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                      {BACKGROUNDS.map(b => (
                        <button key={b.id} onClick={() => !isRestarting && setSetup({ ...setup, background: b.id })} disabled={isRestarting} style={{
                          background: setup.background === b.id ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                          border: `1px solid ${setup.background === b.id ? '#1A4D5E' : 'rgba(14,23,38,0.1)'}`,
                          borderRadius: 2, padding: '10px 11px', textAlign: 'left',
                          cursor: isRestarting ? 'not-allowed' : 'pointer',
                          opacity: isRestarting && setup.background !== b.id ? 0.35 : 1,
                          fontFamily: 'inherit',
                        }}>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 500, color: '#0E1726', lineHeight: 1.25 }}>{b.label}</div>
                        </button>
                      ))}
                    </div>
                    {setup.background && <InlineDetail obj={BACKGROUNDS.find(b => b.id === setup.background)} />}

                    {/* Training */}
                    <SectionLabel sub={isRestarting ? "Training stays with you. You can't unlearn cadaver dissection." : "Patients ask. Insurers ask. The good ones stick."}>Training Pathway</SectionLabel>
                    <Select value={setup.training} onChange={(v) => !isRestarting && setSetup({ ...setup, training: v })} options={TRAINING_PATHS} placeholder="Select training pathway…" />
                    {setup.training && <InlineDetail obj={TRAINING_PATHS.find(t => t.id === setup.training)} />}

                    {/* Capital — three compact rows */}
                    <SectionLabel sub="Bootstrap, borrow, or dilute. Each path costs something later.">Starting Capital</SectionLabel>
                    <div style={{ display: 'grid', gap: 8, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginBottom: 3, fontWeight: 600 }}>Personal savings</div>
                        <Select value={setup.savings} onChange={(v) => setSetup({ ...setup, savings: v })} options={SAVINGS_TIERS} placeholder="How much of your own money…" />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginBottom: 3, fontWeight: 600 }}>Loan (optional)</div>
                        <Select value={setup.loan} onChange={(v) => setSetup({ ...setup, loan: v })} options={LOANS} placeholder="Take on debt?" />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginBottom: 3, fontWeight: 600 }}>Investor (optional)</div>
                        <Select value={setup.investor} onChange={(v) => setSetup({ ...setup, investor: v })} options={INVESTORS} placeholder="Give up equity?" />
                      </div>
                    </div>
                    {sav && ln && inv && (
                      <div style={{ background: 'rgba(26,77,94,0.06)', border: '1px solid rgba(26,77,94,0.2)', padding: 10, marginTop: 8, marginBottom: 14, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>£{sav.cash}k savings{ln.cash > 0 && ` + £${ln.cash}k debt @ ${Math.round(ln.apr * 100)}%`}{inv.cash > 0 && ` + £${inv.cash}k for ${inv.equity}% equity`}</span>
                        <strong style={{ color: '#0E1726', fontFamily: 'Fraunces, serif', fontSize: 14 }}>= £{sav.cash + ln.cash + inv.cash}k</strong>
                      </div>
                    )}

                    {/* Structure */}
                    <SectionLabel sub={`Formation costs £${Math.round(COMPANY_FORMATION_COST * 1000)} either way.`}>Business Structure</SectionLabel>
                    <Select value={setup.structure} onChange={(v) => setSetup({ ...setup, structure: v })} options={STRUCTURES} placeholder="Sole trader or limited company…" />
                    {setup.structure && <InlineDetail obj={STRUCTURES.find(s => s.id === setup.structure)} />}
                  </div>
                )}

                {setupStep === 2 && (
                  <div className="ai-fade-in">
                    {/* Location with map */}
                    <SectionLabel sub={isRestarting ? 'Your location is locked — same area, fresh attempt.' : 'Tap a pin. Each location has its own rent, capacity, and competition profile.'}>{isRestarting ? 'Your Location' : 'Choose Your Location'}</SectionLabel>
                    <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.1)', padding: 8, marginBottom: 8, borderRadius: 2 }}>
                      <LocationMap selected={setup.location} onSelect={(id) => !isRestarting && setSetup({ ...setup, location: id })} />
                    </div>
                    {setup.location && (() => {
                      const l = LOCATIONS.find(x => x.id === setup.location);
                      const compBadge = { high: { label: 'High competition', color: '#8B2C3C' }, medium: { label: 'Medium competition', color: '#B8945F' }, low: { label: 'Low competition', color: '#5C7A52' } }[l.competition];
                      return (
                        <div style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(26,77,94,0.2)', padding: '10px 13px', marginBottom: 16, borderRadius: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726' }}>{l.label}</div>
                            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: compBadge.color, fontWeight: 700, letterSpacing: '0.04em' }}>{compBadge.label}</div>
                          </div>
                          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', margin: '3px 0 5px', lineHeight: 1.4 }}>{l.desc}</p>
                          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560' }}>Rent <strong style={{ color: '#0E1726' }}>×{l.rentMult}</strong> · Capacity <strong style={{ color: '#0E1726' }}>×{l.capacityMult}</strong></div>
                        </div>
                      );
                    })()}

                    {/* Premises */}
                    <SectionLabel sub="Sets your revenue ceiling. Rent gets multiplied by location — except for home, which is flat.">Premises</SectionLabel>
                    <Select value={setup.premises} onChange={(v) => setSetup({ ...setup, premises: v })} options={PREMISES.map(p => {
                      const loc = LOCATIONS.find(l => l.id === setup.location);
                      const mult = (p.id === 'home' || !loc) ? 1 : loc.rentMult;
                      const r = Math.round(p.rentPerQ * mult * 10) / 10;
                      return { ...p, label: `${p.label} (rent ${formatGBP(r)}/Q)` };
                    })} placeholder="Where will you treat patients…" />
                    {setup.premises && <InlineDetail obj={PREMISES.find(p => p.id === setup.premises)} />}

                    {/* Formulary in three compact dropdowns */}
                    <SectionLabel sub="Mix and match. Toxin-only, filler-only — both are valid.">Starting Formulary</SectionLabel>
                    <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginBottom: 3, fontWeight: 600 }}>Toxin</div>
                        <Select value={setup.toxin} onChange={(v) => setSetup({ ...setup, toxin: v })} options={TOXINS} placeholder="Pick a toxin…" />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginBottom: 3, fontWeight: 600 }}>Filler</div>
                        <Select value={setup.filler} onChange={(v) => setSetup({ ...setup, filler: v })} options={FILLERS} placeholder="Pick a filler…" />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginBottom: 3, fontWeight: 600 }}>Biostimulator / Regenerative</div>
                        <Select value={setup.biostim} onChange={(v) => setSetup({ ...setup, biostim: v })} options={BIOSTIMS} placeholder="Pick a biostimulator pathway…" />
                      </div>
                    </div>
                    {setup.toxin && setup.filler && setup.biostim && !hasOffering && (
                      <div style={{ background: 'rgba(139,44,60,0.08)', border: '1px solid rgba(139,44,60,0.3)', padding: 10, marginBottom: 12, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12.5, color: '#8B2C3C', borderRadius: 2 }}>
                        You've picked "none" across all three. A clinic needs to offer at least one service.
                      </div>
                    )}

                    {/* Compliance — checkbox grid, fits inline */}
                    <SectionLabel sub="Cowboys skip what they can get away with. Without indemnity, complications get catastrophic.">Compliance & Insurance</SectionLabel>
                    <div style={{ display: 'grid', gap: 5, marginBottom: 10 }}>
                      {COMPLIANCE_OPTIONS.map(c => (
                        <button key={c.id} onClick={() => setSetup({ ...setup, compliance: setup.compliance.includes(c.id) ? setup.compliance.filter(x => x !== c.id) : [...setup.compliance, c.id] })} style={{
                          width: '100%', textAlign: 'left',
                          background: setup.compliance.includes(c.id) ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                          border: `1px solid ${setup.compliance.includes(c.id) ? '#1A4D5E' : 'rgba(14,23,38,0.1)'}`,
                          padding: '9px 11px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2,
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <div style={{ width: 14, height: 14, flexShrink: 0, border: `1.5px solid ${setup.compliance.includes(c.id) ? '#1A4D5E' : 'rgba(14,23,38,0.25)'}`, background: setup.compliance.includes(c.id) ? '#1A4D5E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1 }}>
                            {setup.compliance.includes(c.id) && <svg width="9" height="7" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#FAF6EE" strokeWidth="1.5" fill="none" /></svg>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 500, color: '#0E1726', lineHeight: 1.2 }}>{c.label}</div>
                            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginTop: 1 }}>{c.desc}</div>
                          </div>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 12, color: '#B8945F', fontWeight: 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{c.cost < 1 ? `£${Math.round(c.cost * 1000)}` : `£${c.cost}k`}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  {setupStep > 1 && <button onClick={() => setSetupStep(1)} style={{ flex: 1, background: 'transparent', color: '#0E1726', border: '1px solid rgba(14,23,38,0.2)', padding: '14px', fontFamily: 'Fraunces, serif', fontSize: 14, borderRadius: 2, cursor: 'pointer' }}>← Back</button>}
                  {setupStep === 1 ? (
                    <button onClick={() => setSetupStep(2)} disabled={!page1Valid} style={{ flex: 2, background: page1Valid ? '#0E1726' : 'rgba(14,23,38,0.1)', color: page1Valid ? '#FAF6EE' : '#9B9098', border: 'none', padding: '14px', fontFamily: 'Fraunces, serif', fontSize: 14, borderRadius: 2, cursor: page1Valid ? 'pointer' : 'not-allowed' }}>Continue to Location →</button>
                  ) : (
                    <button onClick={finalizeSetup} disabled={!setupValid} style={{ flex: 2, background: setupValid ? '#0E1726' : 'rgba(14,23,38,0.1)', color: setupValid ? '#FAF6EE' : '#9B9098', border: 'none', padding: '14px', fontFamily: 'Fraunces, serif', fontSize: 14, borderRadius: 2, cursor: setupValid ? 'pointer' : 'not-allowed' }}>Open the Clinic →</button>
                  )}
                </div>
              </div>
            );
          })()}

          {phase === 'launch' && (
            <LaunchPhase launch={launch} setLaunch={setLaunch} onComplete={finalizeLaunch} setupCash={state.cash} />
          )}

          {phase === 'firstPatient' && (
            <FirstPatientConsult onComplete={completeFirstPatient} regulator={BACKGROUNDS.find(b => b.id === setup.background)?.regulator || 'GMC'} />
          )}

          {phase === 'faceCase' && pendingFaceCase && (
            <InjectionGame faceCase={pendingFaceCase} onComplete={completeFaceCase} />
          )}

          {phase === 'battle' && pendingBattle && (
            <PatientBattle battle={pendingBattle} state={state} onResolve={resolveBattle} />
          )}

          {phase === 'ticker' && (
            <WeeklyTicker events={weeklyTickerEvents} onComplete={completeTicker} onMicroChoice={handleMicroChoice} />
          )}

          {phase === 'setpiece' && pendingSetPiece && (() => {
            const sp = pendingSetPiece;
            const visibleChoices = sp.choices.filter(c => !c.requires || c.requires(state));
            return (
              <div className="ai-fade-in">
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Set-Piece · Q{quarter}</div>
                <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.15 }}>{sp.title}</h2>
                <div style={{ marginBottom: 14, border: '1px solid rgba(14,23,38,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <SetPieceIllustration archetype={sp.archetype} />
                </div>
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: '#3D2548', margin: '0 0 16px', lineHeight: 1.5, padding: 14, background: 'rgba(139,44,60,0.04)', borderLeft: '3px solid #8B2C3C', borderRadius: 2 }}>{sp.setup}</p>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', fontStyle: 'italic', marginBottom: 6, letterSpacing: '0.04em' }}>Choices visible depend on your current standing. Effects shown below each.</div>
                {sp.choices.map((c, i) => {
                  const eligible = !c.requires || c.requires(state);
                  if (!eligible) return (
                    <div key={i} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.25)', border: '1px dashed rgba(14,23,38,0.1)', padding: '12px 15px', marginBottom: 8, borderRadius: 2, opacity: 0.4 }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#5A5560' }}>🔒 {c.label}</div>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginTop: 3 }}>Not available — your standing isn't sufficient for this option.</div>
                    </div>
                  );
                  return (
                    <button key={i} onClick={() => {
                      const newState = applyFx(state, c.fx);
                      setState(newState);
                      setUsedSetPieces([...usedSetPieces, sp.id]);
                      setLog([...log, { quarter, moves: results.moves.map(m => m.title), event: `Set-Piece: ${sp.title}`, setpiece: true, choice: c.label }]);
                      // Show outcome by storing it on pendingSetPiece as 'resolved'
                      setPendingSetPiece({ ...sp, resolved: c });
                    }} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)', borderLeft: '3px solid #1A4D5E', padding: '13px 15px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2 }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', lineHeight: 1.35, marginBottom: 6 }}>{c.label}</div>
                      <div>{Object.entries(c.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
                    </button>
                  );
                })}
                {sp.resolved && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: 14, borderLeft: '3px solid #B8945F', marginBottom: 12, borderRadius: 2 }}>
                      <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14.5, margin: 0, lineHeight: 1.55, color: '#3D2548' }}>{sp.resolved.outcome}</p>
                    </div>
                    <Primary onClick={() => { setPendingSetPiece(null); nextQuarter(); }}>{quarter >= MAX_Q ? 'See Final Position →' : `Begin Q${quarter + 1} →`}</Primary>
                  </div>
                )}
              </div>
            );
          })()}

          {phase === 'staffPoach' && pendingPoach && (() => {
            const role = STAFF_ROLES.find(r => r.id === pendingPoach.roleId);
            const matchCost = 12;
            return (
              <div>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Q{quarter} · Staff Crisis</div>
                <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>{pendingPoach.name} has had an offer.</h2>
                <div style={{ background: 'rgba(255,255,255,0.7)', borderLeft: '3px solid #8B2C3C', padding: 14, marginBottom: 14, borderRadius: 2 }}>
                  <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14.5, color: '#3D2548', margin: '0 0 8px', lineHeight: 1.55 }}>
                    "{pendingPoach.name.split(' ')[0]} sits across from you. She didn't want to bring it up. NorthStar Cosmetic Group offered her a 30% pay rise, a parking spot, and a path to clinical lead in 18 months. She's been with you for {quarter - (pendingPoach.joinedQ || 1)} quarters. Her loyalty is {pendingPoach.loyalty}/100."
                  </p>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 8 }}>
                    Role: <strong style={{ color: '#0E1726' }}>{role?.label}</strong> · Current wage: <strong style={{ color: '#0E1726' }}>{formatGBP(role?.wagePerQ || 0)}/Q</strong>
                  </div>
                </div>

                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', fontStyle: 'italic', marginBottom: 8, letterSpacing: '0.04em' }}>Three responses. Different consequences.</div>

                <button onClick={() => resolvePoach('match')} disabled={state.cash < matchCost} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)', borderLeft: '3px solid #5C7A52', padding: '13px 15px', marginBottom: 8, cursor: state.cash < matchCost ? 'not-allowed' : 'pointer', fontFamily: 'inherit', borderRadius: 2, opacity: state.cash < matchCost ? 0.5 : 1 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', lineHeight: 1.35, marginBottom: 4 }}>Counter-offer — match the rise, retention bonus</div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginBottom: 6, lineHeight: 1.4 }}>One-off £8k retention bonus + £4k/Q salary bump. She stays, loyalty +30. {state.cash < matchCost && <strong style={{ color: '#8B2C3C' }}> Not affordable.</strong>}</div>
                  <FxChip stat="cash" val={-12} />
                </button>

                <button onClick={() => resolvePoach('let-go')} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)', borderLeft: '3px solid #B8945F', padding: '13px 15px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', lineHeight: 1.35, marginBottom: 4 }}>Wish her well — she leaves with grace</div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginBottom: 6, lineHeight: 1.4 }}>You lose her capacity, but the parting is amicable. Brand takes a small hit because seniors talk.</div>
                  <FxChip stat="brand" val={-4} />
                </button>

                <button onClick={() => resolvePoach('ignore')} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)', borderLeft: '3px solid #8B2C3C', padding: '13px 15px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: '#0E1726', lineHeight: 1.35, marginBottom: 4 }}>"Take some time to think about it"</div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', lineHeight: 1.4 }}>Hope she chooses you anyway. 60% she leaves on bad terms with significant brand and NPS damage.</div>
                </button>
              </div>
            );
          })()}

          {phase === 'play' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(14,23,38,0.1)' }}>
                <div style={{ width: 60, height: 60, background: 'rgba(26,77,94,0.06)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon kind="premises" id={setup.premises} size={42} color="#1A4D5E" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700 }}>Quarter {quarter} / {MAX_Q}</div>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, margin: '4px 0 0' }}>The Clinic</h2>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 2 }}>{LOCATIONS.find(l => l.id === setup.location)?.label || ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 600 }}>Cash</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, color: state.cash < 20 ? '#8B2C3C' : '#0E1726', fontVariantNumeric: 'tabular-nums' }}>{formatGBP(state.cash)}</div>
                  {saveStatus !== 'idle' && (
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#5C7A52', marginTop: 3, letterSpacing: '0.1em', fontStyle: 'italic' }}>
                      {saveStatus === 'saved' ? '✓ saved' : '↺ restored'}
                    </div>
                  )}
                </div>
              </div>

              {/* Quarter intro — fuller in Q1, slimmer thereafter */}
              {quarter === 1 ? (
                <>
                  <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#3D2548', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>How a Quarter Works</div>
                    <p style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#0E1726', lineHeight: 1.55, margin: '0 0 8px' }}>
                      Each quarter, you draw a hand of strategic moves and spend <strong>3 Action Points</strong>. Bigger moves cost more — pick one heavy play, two mediums, or three small ones.
                    </p>
                    <p style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, color: '#5A5560', lineHeight: 1.55, margin: 0 }}>
                      After you commit, something happens. A patient walks in. A market event tests you. A scenario lands. You review the quarter, see the P&amp;L, and roll on.
                    </p>
                  </div>

                  {/* Strategic identity primer — only on Q1 */}
                  <div style={{ background: 'rgba(184,148,95,0.06)', border: '1px solid rgba(184,148,95,0.3)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>How to Succeed · Four Identities</div>
                    <p style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, color: '#3D2548', lineHeight: 1.55, margin: '0 0 10px', fontStyle: 'italic' }}>
                      Stat-maxing across the board is structurally impossible — gains shrink the higher you climb. Pick one identity and commit. Each maps to a different acquirer at exit.
                    </p>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ padding: '8px 11px', background: 'rgba(255,255,255,0.6)', borderLeft: '2px solid #1A4D5E', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>Clinical Pharma Path <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#1A4D5E', fontWeight: 700, marginLeft: 6 }}>→ GALDERMA</span></div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 2, lineHeight: 1.45 }}>Lead with safety, innovation, compliance. Cadaver training, complications protocols, published audits. Premium multiple (6–11×) but a high bar to clear.</div>
                      </div>
                      <div style={{ padding: '8px 11px', background: 'rgba(255,255,255,0.6)', borderLeft: '2px solid #3D2548', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>Research-Led Path <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#3D2548', fontWeight: 700, marginLeft: 6 }}>→ MERZ</span></div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 2, lineHeight: 1.45 }}>Innovation 82+, compliance 75+. Open outcome reporting, regenerative formulary, podcast. Highest possible multiple (7–12×) but only one of these deals a decade.</div>
                      </div>
                      <div style={{ padding: '8px 11px', background: 'rgba(255,255,255,0.6)', borderLeft: '2px solid #8B2C3C', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>Brand & Volume Path <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#8B2C3C', fontWeight: 700, marginLeft: 6 }}>→ ABBVIE ALLERGAN</span></div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 2, lineHeight: 1.45 }}>Brand 65+, NPS 70+. Retention, referrals, repeatable unit economics. Multiple 5–8×. The path most clinics take.</div>
                      </div>
                      <div style={{ padding: '8px 11px', background: 'rgba(255,255,255,0.6)', borderLeft: '2px solid #5C7A52', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>PE Flip Path <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5C7A52', fontWeight: 700, marginLeft: 6 }}>→ CONTINENTAL HEALTH</span></div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 2, lineHeight: 1.45 }}>Margin and cash only. PE roll-up takes anything that makes money — 3–4× EBITDA. The fallback if nothing else lands.</div>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'Fraunces, serif', fontSize: 12, color: '#5A5560', lineHeight: 1.5, margin: '10px 0 0', fontStyle: 'italic' }}>
                      <strong style={{ color: '#8B2C3C' }}>Going bust resets you to Round 2 with a permanent diligence flag — 50%+ discount on every future offer.</strong> Stay solvent.
                    </p>
                  </div>

                  {/* Operational levers primer — Q1 only */}
                  <div style={{ background: 'rgba(26,77,94,0.05)', border: '1px solid rgba(26,77,94,0.25)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>You Control Three Levers</div>
                    <p style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, color: '#3D2548', lineHeight: 1.55, margin: '0 0 10px' }}>
                      Below the move deck, three operational policies you can change every quarter. They make moves <em>consequential</em> — the same move plays out very differently under Conservative vs Aggressive marketing.
                    </p>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.55)', borderLeft: '2px solid #1A4D5E', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: '#0E1726' }}>Marketing Spend</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 1, lineHeight: 1.45 }}>Conservative / Standard / Aggressive — directly trades cash burn against demand.</div>
                      </div>
                      <div style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.55)', borderLeft: '2px solid #3D2548', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: '#0E1726' }}>Supplier Strategy</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 1, lineHeight: 1.45 }}>Generic / Standard / Premium — controls COGS but signals to patients.</div>
                      </div>
                      <div style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.55)', borderLeft: '2px solid #5C7A52', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: '#0E1726' }}>Working Capital</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 1, lineHeight: 1.45 }}>Stretch supplier terms for cash now — but ethics suffer. Pay early to build trust.</div>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#1A4D5E', lineHeight: 1.5, margin: '10px 0 0', fontStyle: 'italic' }}>
                      <strong>Plus:</strong> CapEx — invest cash now in assets that depreciate over time. Lower cash, healthier EBITDA — but every business that fails does so by running out of cash.
                    </p>
                  </div>
                </>
              ) : (
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#5A5560', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Draw your hand. Spend three Action Points. Then see what the quarter brings.
                </p>
              )}

              {/* Operational levers — player-controllable cost dials */}
              {/* Multi-site expansion — gated panel */}
              <ExpansionPanel
                state={state} sites={sites} financialHistory={financialHistory}
                cash={state.cash} brand={state.brand}
                setSites={setSites} setPendingExpansion={setPendingExpansion}
                quarter={quarter} log={log} setLog={setLog}
              />

              {/* Treatment mix — the product allocation. The mix IS positioning. */}
              {/* Marketing channel allocation */}
              <MarketingChannelPanel channelMix={channelMix} setChannelMix={setChannelMix} quarter={quarter} />

              <TreatmentMixPanel
                treatmentMix={treatmentMix} setTreatmentMix={setTreatmentMix}
                ebdUnlocked={ebdUnlocked} setEbdUnlocked={setEbdUnlocked}
                setActiveCapex={setActiveCapex} activeCapex={activeCapex}
                state={state} cash={state.cash} quarter={quarter}
              />

              <OperationalPanel
                marketingPolicy={marketingPolicy} setMarketingPolicy={setMarketingPolicy}
                supplierStrategy={supplierStrategy} setSupplierStrategy={setSupplierStrategy}
                workingCapitalPolicy={workingCapitalPolicy} setWorkingCapitalPolicy={setWorkingCapitalPolicy}
                capexThisQ={capexThisQ} setCapexThisQ={setCapexThisQ}
                activeCapex={activeCapex} setActiveCapex={setActiveCapex}
                cash={state.cash} quarter={quarter}
              />

              {/* Capacity & throughput preview */}
              {(() => {
                const prem = PREMISES.find(p => p.id === setup.premises);
                const loc = LOCATIONS.find(l => l.id === setup.location);
                const ceiling = Math.round((prem?.capacity || 100) * (loc?.capacityMult || 1));
                const clinicalStaff = hiredStaff.filter(s => ['senior-injector', 'junior-nurse'].includes(s.roleId)).length;
                let clinicalCap = 0.30;
                let nonClinBonus = 0;
                hiredStaff.forEach(s => {
                  if (s.roleId === 'senior-injector') clinicalCap += 0.55;
                  if (s.roleId === 'junior-nurse') clinicalCap += 0.35;
                  if (s.roleId === 'reception') nonClinBonus += 0.10;
                  if (s.roleId === 'patient-coord') nonClinBonus += 0.08;
                  if (s.roleId === 'marketing') nonClinBonus += 0.04;
                });
                const throughput = Math.min(clinicalCap + nonClinBonus, 1.15);
                const demand = (state.brand * 0.35 + state.nps * 0.25 + state.innovation * 0.2 + state.ethics * 0.2) / 100;
                const desired = Math.round(demand * ceiling);
                const deliverable = Math.round(ceiling * throughput);
                const turnedAway = Math.max(0, desired - deliverable);
                const strained = turnedAway > 0 && desired > 30;
                const bottleneck = clinicalStaff === 0 && quarter > 1 && strained;

                return (
                  <div style={{ background: bottleneck ? 'rgba(139,44,60,0.06)' : strained ? 'rgba(184,148,95,0.08)' : '#FFFFFF', border: `1px solid ${bottleneck ? 'rgba(139,44,60,0.4)' : strained ? 'rgba(184,148,95,0.4)' : 'rgba(14,23,38,0.08)'}`, padding: '12px 14px', marginBottom: 12, borderRadius: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: bottleneck ? '#8B2C3C' : strained ? '#B8945F' : '#5A5560', fontWeight: 700 }}>Clinic Capacity · This Quarter</span>
                      <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', fontVariantNumeric: 'tabular-nums' }}>{desired} demand · {deliverable} deliverable</span>
                    </div>

                    {/* Dual bar: demand (gold) vs deliverable (sage if matched, red if undershot) */}
                    <div style={{ position: 'relative', height: 18, background: 'rgba(14,23,38,0.05)', borderRadius: 2, marginBottom: 4 }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(100, (desired / ceiling) * 100)}%`, background: 'rgba(184,148,95,0.4)', borderRadius: 2, transition: 'width 0.6s' }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(100, (deliverable / ceiling) * 100)}%`, background: turnedAway > 0 ? '#8B2C3C' : '#5C7A52', borderRadius: 2, opacity: 0.88, transition: 'width 0.6s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560', marginBottom: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, background: 'rgba(184,148,95,0.55)', borderRadius: 1 }} />Patients wanting to book</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, background: turnedAway > 0 ? '#8B2C3C' : '#5C7A52', borderRadius: 1 }} />You can deliver</span>
                    </div>

                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: bottleneck ? '#8B2C3C' : strained ? '#B8945F' : '#5A5560', marginTop: 6, lineHeight: 1.45 }}>
                      {bottleneck ? (
                        <><strong>You're turning patients away.</strong> Demand for {desired} treatments but you can only deliver {deliverable} solo. {turnedAway} go to competitors — and that hits your brand. <button onClick={() => setStaffPanelOpen(true)} style={{ display: 'inline', background: 'transparent', border: 'none', padding: 0, fontFamily: 'Fraunces, serif', fontSize: 12.5, color: '#8B2C3C', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600, marginLeft: 4 }}>Hire clinical staff →</button></>
                      ) : strained ? (
                        <><strong>Approaching capacity.</strong> {turnedAway} patients turned away this quarter. Consider hiring before brand suffers.</>
                      ) : clinicalStaff === 0 ? (
                        <>Solo practice — comfortable while demand is low. Each clinical hire roughly doubles deliverable treatments.</>
                      ) : (
                        <>{hiredStaff.length} on team · delivering {deliverable} of {desired} requested treatments this quarter.</>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Inline staff panel toggle */}
              {staffPanelOpen && (
                <div style={{ marginBottom: 12 }}>
                  <StaffPanel hiredStaff={hiredStaff} onHire={hireStaff} onFire={fireStaff} cash={state.cash} hasPrescriber={['surgeon', 'doctor', 'nurse-ip', 'dentist'].includes(setup.background)} />
                  <button onClick={() => setStaffPanelOpen(false)} style={{ width: '100%', background: 'transparent', color: '#5A5560', border: '1px solid rgba(14,23,38,0.15)', padding: 8, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, borderRadius: 2, cursor: 'pointer' }}>Close Staff Panel</button>
                </div>
              )}
              {!staffPanelOpen && (
                <button onClick={() => setStaffPanelOpen(true)} style={{ width: '100%', background: 'transparent', color: '#1A4D5E', border: '1px solid rgba(26,77,94,0.25)', padding: '8px 12px', fontFamily: 'Fraunces, serif', fontSize: 12.5, borderRadius: 2, cursor: 'pointer', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Manage staff · {hiredStaff.length} on team{hiredStaff.length > 0 ? ` · ${formatGBP(hiredStaff.reduce((s, m) => s + (STAFF_ROLES.find(r => r.id === m.roleId)?.wagePerQ || 0), 0))}/Q wages` : ''}</span>
                  <span style={{ fontSize: 14 }}>→</span>
                </button>
              )}

              <div style={{ background: 'rgba(26,77,94,0.07)', border: '1px solid rgba(26,77,94,0.2)', padding: '10px 14px', marginBottom: 12, borderRadius: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700 }}>Action Points · This Quarter</span>
                  <span style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, color: '#1A4D5E', fontVariantNumeric: 'tabular-nums' }}>{apRemaining} / {AP_PER_QUARTER}</span>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: AP_PER_QUARTER }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 8, background: i < apUsed ? '#1A4D5E' : 'rgba(26,77,94,0.15)', borderRadius: 2, transition: 'background 0.3s' }} />
                  ))}
                </div>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 5, lineHeight: 1.4 }}>Pick any combination of moves whose total AP cost is ≤ 3. Bigger moves cost more.</div>
              </div>

              <StaffPanel hiredStaff={hiredStaff} onHire={hireStaff} onFire={fireStaff} cash={state.cash} hasPrescriber={['surgeon', 'doctor', 'nurse-ip', 'dentist'].includes(setup.background)} />

              {hand.map(m => m && <MoveCard key={m.id} move={m} selected={selected.includes(m.id)} disabled={!selected.includes(m.id) && m.ap > apRemaining} onClick={() => toggleSelect(m.id)} />)}

              <Primary onClick={() => { sfx.confirm(); commit(); }} disabled={selected.length === 0}>Commit Quarter ({selected.length} {selected.length === 1 ? 'move' : 'moves'}) →</Primary>
            </div>
          )}

          {phase === 'results' && results && (
            <div className="ai-fade-in">
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Q{quarter} · In Review</div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 500, margin: '0 0 18px', letterSpacing: '-0.03em' }}>The dust settles.</h2>

              {latestMilestone && (
                <div className="ai-fade-in" style={{ background: `linear-gradient(135deg, ${latestMilestone.color}18 0%, ${latestMilestone.color}06 100%)`, border: `1px solid ${latestMilestone.color}50`, borderLeft: `3px solid ${latestMilestone.color}`, padding: 14, marginBottom: 14, borderRadius: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: latestMilestone.color, fontWeight: 700 }}>Milestone Unlocked</span>
                    {latestMilestone.identity && <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#5A5560', letterSpacing: '0.1em', fontWeight: 600 }}>· {latestMilestone.identity}</span>}
                  </div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, color: latestMilestone.color, marginBottom: 4, letterSpacing: '-0.02em' }}>{latestMilestone.label}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#3D2548', lineHeight: 1.5 }}>{latestMilestone.desc}</div>
                </div>
              )}

              {/* Rival event surfaced when one fires this quarter */}
              {lastRivalEvent && lastRivalEvent.quarter === quarter - 1 && (() => {
                const ev = lastRivalEvent.event;
                const rival = ev.rival ? rivals.find(r => r.id === ev.rival) : null;
                const color = rival?.color || '#5A5560';
                return (
                  <div className="ai-fade-in" style={{ background: `linear-gradient(135deg, ${color}12 0%, ${color}04 100%)`, border: `1px solid ${color}50`, borderLeft: `3px solid ${color}`, padding: 14, marginBottom: 14, borderRadius: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color, fontWeight: 700 }}>Competitor Intel</span>
                      {rival && <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, color: '#5A5560', letterSpacing: '0.1em', fontWeight: 600 }}>· {rival.name}</span>}
                    </div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 500, color: '#0E1726', marginBottom: 4, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{ev.label}</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#3D2548', lineHeight: 1.5 }}>{ev.desc}</div>
                  </div>
                );
              })()}

              {/* Site failure surfaced when one closes this quarter */}
              {siteFailureLog.filter(f => f.quarter === quarter - 1).map((failure, i) => (
                <div key={i} className="ai-fade-in" style={{ background: 'rgba(139,44,60,0.06)', border: '1px solid rgba(139,44,60,0.3)', borderLeft: '3px solid #8B2C3C', padding: 14, marginBottom: 14, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#8B2C3C', fontWeight: 700, marginBottom: 5 }}>Site Closed</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: '#8B2C3C', marginBottom: 4, letterSpacing: '-0.015em' }}>{failure.site.name}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#3D2548', lineHeight: 1.5 }}>Sustained losses forced closure. Brand and ethics took collateral damage. The chain continues.</div>
                </div>
              ))}

              {/* Acquisition outcome surfaced when a site was opened/acquired this quarter */}
              {sites.filter(s => s.openedQ === quarter - 1).map((site, i) => (
                <div key={i} className="ai-fade-in" style={{ background: site.origin === 'organic' ? 'rgba(184,148,95,0.08)' : 'rgba(26,77,94,0.08)', border: `1px solid ${site.origin === 'organic' ? 'rgba(184,148,95,0.4)' : 'rgba(26,77,94,0.4)'}`, borderLeft: `3px solid ${site.origin === 'organic' ? '#B8945F' : '#1A4D5E'}`, padding: 14, marginBottom: 14, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: site.origin === 'organic' ? '#B8945F' : '#1A4D5E', fontWeight: 700, marginBottom: 5 }}>{site.origin === 'organic' ? 'New Site Opened' : 'Acquisition Closed'}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: site.origin === 'organic' ? '#B8945F' : '#1A4D5E', marginBottom: 4, letterSpacing: '-0.015em' }}>{site.name}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#3D2548', lineHeight: 1.5 }}>
                    {site.origin === 'organic'
                      ? `Built clean. Brand carry starts at ${Math.round(site.brandCarry * 100)}%. Health: ${site.health}.`
                      : site.health === 'struggling'
                        ? 'Integration is tough — site enters struggling. Patient defections and staff turnover ahead.'
                        : `Acquisition completed cleanly. Patient base assimilating. Brand carry ${Math.round(site.brandCarry * 100)}%.`
                    }
                  </div>
                </div>
              ))}

              <StaffPanel hiredStaff={hiredStaff} onHire={hireStaff} onFire={fireStaff} cash={state.cash} hasPrescriber={['surgeon', 'doctor', 'nurse-ip', 'dentist'].includes(setup.background)} />
              <PatientRosterPanel patients={patients} />
              <RivalsTracker rivals={rivals} playerBrand={state.brand} />
              <SuitorTracker state={state} financialHistory={financialHistory} />

              {/* Decision Ledger access */}
              {log.length > 0 && (
                <button onClick={() => setPhase('ledger')} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(61,37,72,0.3)', color: '#3D2548', padding: '10px 14px', marginBottom: 12, fontFamily: 'Fraunces, serif', fontSize: 13.5, cursor: 'pointer', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Review your decisions so far</span>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#B8945F', fontWeight: 700 }}>{log.length} ENTRIES · Q1–Q{quarter}</span>
                </button>
              )}

              {/* Active streaks */}
              {STREAKS.some(s => (streakCounters[s.id.replace('-streak','')] || 0) > 0) && (
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 12, marginBottom: 12, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 8 }}>Active Streaks</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {STREAKS.map(s => {
                      const count = streakCounters[s.id.replace('-streak','')] || 0;
                      if (count === 0) return null;
                      const reached = count >= s.threshold;
                      return (
                        <div key={s.id} style={{ padding: '7px 10px', background: reached ? 'rgba(92,122,82,0.1)' : 'rgba(184,148,95,0.06)', borderLeft: `2px solid ${reached ? '#5C7A52' : '#B8945F'}`, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: '#0E1726' }}>{reached ? '🔥 ' : ''}{s.label}</div>
                            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', lineHeight: 1.4, marginTop: 1 }}>{s.desc}</div>
                          </div>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: reached ? '#5C7A52' : '#B8945F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{count}/{s.threshold}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active campaigns */}
              {activeCampaigns.length > 0 && (
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 12, marginBottom: 12, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3D2548', fontWeight: 700, marginBottom: 8 }}>Active Campaigns</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {activeCampaigns.map(c => {
                      const campaign = CAMPAIGNS.find(x => x.id === c.id);
                      if (!campaign) return null;
                      const progress = ((campaign.duration - c.quartersRemaining) / campaign.duration) * 100;
                      return (
                        <div key={c.id} style={{ padding: '8px 10px', background: 'rgba(61,37,72,0.05)', borderLeft: '2px solid #3D2548', borderRadius: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>{campaign.label}</div>
                            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560' }}>{c.quartersRemaining}Q left</div>
                          </div>
                          <div style={{ height: 4, background: 'rgba(14,23,38,0.07)', borderRadius: 1, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: '#3D2548', transition: 'width 0.6s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* End-of-turn snapshot: demand + stats board */}
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.08)', padding: 12, marginBottom: 12, borderRadius: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5A5560', fontWeight: 600 }}>Patient Demand</span>
                  <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#0E1726', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(((state.brand + state.nps + state.innovation) / 3))}<span style={{ color: '#9B9098', fontSize: 11 }}>/100 capacity</span>
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 2 }}>
                  {Array.from({ length: 20 }).map((_, i) => {
                    const fill = Math.round(((state.brand + state.nps + state.innovation) / 3) / 5);
                    const isFilled = i < fill;
                    return <div key={i} style={{ height: 14, background: isFilled ? '#1A4D5E' : 'rgba(14,23,38,0.07)', borderRadius: 1, transition: 'background 0.4s' }} />;
                  })}
                </div>
                {(state.streak || 0) >= 2 && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(92,122,82,0.1)', border: '1px solid rgba(92,122,82,0.3)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🔥</span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5C7A52', fontWeight: 600 }}>{state.streak}-quarter profit streak · +{state.streak >= 2 ? 2 : 0} brand momentum</span>
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.5)', padding: 14, marginBottom: 12, borderRadius: 2 }}>
                {Object.keys(STAT_LABELS).map(k => <StatRow key={k} label={STAT_LABELS[k]} value={state[k]} color={STAT_COLORS[k]} />)}
                <button onClick={() => setShowBOI(!showBOI)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 8 }}>
                  <div style={{ paddingTop: 8, borderTop: '1px solid rgba(14,23,38,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1A4D5E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Enterprise Value
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', border: '1px solid #1A4D5E', fontSize: 9, fontWeight: 600, fontFamily: 'Fraunces, serif' }}>?</span>
                    </span>
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 25, fontWeight: 500, color: '#1A4D5E' }}>{evScore.total}</span>
                  </div>
                </button>
              </div>

              {showBOI && <EVBreakdown state={state} />}

              {/* Policy Impact — shows the causal link between your operational dials and the quarter's numbers */}
              {results.q && (results.q.marketingPolicy !== 'standard' || results.q.supplierStrategy !== 'standard' || results.q.workingCapitalPolicy !== 'standard' || results.q.capexCashOut > 0) && (
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(184,148,95,0.4)', padding: 12, marginBottom: 12, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 8 }}>Your Policies, Their Consequences</div>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {results.q.marketingPolicy === 'aggressive' && (
                      <div style={{ padding: '8px 10px', background: 'rgba(139,44,60,0.05)', borderLeft: '2px solid #8B2C3C', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>Aggressive Marketing</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.5 }}>
                          Marketing rose 70% to <strong>{formatGBP(results.q.marketing)}</strong>. Demand lifted ~18% → <strong>{Math.round(results.q.desiredBookings * 0.18 / 1.18)}</strong> extra bookings worth ~<strong>{formatGBP(Math.round(results.q.desiredBookings * 0.18 / 1.18 * results.q.avgTicket * 10) / 10)}</strong>. Ethics drift: <span style={{ color: '#8B2C3C' }}>−1</span>.
                        </div>
                      </div>
                    )}
                    {results.q.marketingPolicy === 'conservative' && (
                      <div style={{ padding: '8px 10px', background: 'rgba(92,122,82,0.05)', borderLeft: '2px solid #5C7A52', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>Conservative Marketing</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.5 }}>
                          Marketing cut 45% to <strong>{formatGBP(results.q.marketing)}</strong>. Demand fell ~22% → <strong>{Math.round(results.q.desiredBookings * 0.22 / 0.78)}</strong> bookings forgone. Net cash benefit ~<strong>{formatGBP(Math.round((results.q.revenue * 0.12 - results.q.marketing) * 10) / 10)}</strong>.
                        </div>
                      </div>
                    )}
                    {results.q.supplierStrategy === 'premium' && (
                      <div style={{ padding: '8px 10px', background: 'rgba(61,37,72,0.05)', borderLeft: '2px solid #3D2548', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>Premium Suppliers</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.5 }}>
                          COGS rose to <strong>{formatGBP(results.q.cogs)}</strong> ({Math.round(results.q.cogs / Math.max(results.q.revenue, 0.01) * 100)}% of revenue). Brand: <span style={{ color: '#5C7A52' }}>+1</span>, Safety: <span style={{ color: '#5C7A52' }}>+1</span>. Gross margin softer, brand defensibility stronger.
                        </div>
                      </div>
                    )}
                    {results.q.supplierStrategy === 'generic' && (
                      <div style={{ padding: '8px 10px', background: 'rgba(92,122,82,0.05)', borderLeft: '2px solid #5C7A52', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>Generic Suppliers</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.5 }}>
                          COGS fell to <strong>{formatGBP(results.q.cogs)}</strong> ({Math.round(results.q.cogs / Math.max(results.q.revenue, 0.01) * 100)}% of revenue). Brand: <span style={{ color: '#8B2C3C' }}>−2</span>, Safety: <span style={{ color: '#8B2C3C' }}>−1</span>. Margins up, defensibility down.
                        </div>
                      </div>
                    )}
                    {results.q.workingCapitalPolicy === 'stretch' && (
                      <div style={{ padding: '8px 10px', background: 'rgba(184,148,95,0.05)', borderLeft: '2px solid #B8945F', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>Stretched Supplier Terms</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.5 }}>
                          Freed <strong>+{formatGBP(results.q.wcSwing)}</strong> of working capital this quarter. Suppliers noticed. Ethics: <span style={{ color: '#8B2C3C' }}>−2</span>, Brand: <span style={{ color: '#8B2C3C' }}>−1</span>.
                        </div>
                      </div>
                    )}
                    {results.q.workingCapitalPolicy === 'pay-early' && (
                      <div style={{ padding: '8px 10px', background: 'rgba(61,37,72,0.05)', borderLeft: '2px solid #3D2548', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>Pay Suppliers Early</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.5 }}>
                          Tied up <strong>{formatGBP(Math.abs(results.q.wcSwing))}</strong> in working capital. Suppliers loyal. Ethics: <span style={{ color: '#5C7A52' }}>+1</span>.
                        </div>
                      </div>
                    )}
                    {results.q.capexCashOut > 0 && (
                      <div style={{ padding: '8px 10px', background: 'rgba(26,77,94,0.05)', borderLeft: '2px solid #1A4D5E', borderRadius: 2 }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>Capital Investment</div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.5 }}>
                          Cash out: <strong>−{formatGBP(results.q.capexCashOut)}</strong>. Depreciation hits P&amp;L gradually, not now — so <strong>EBITDA is protected</strong>. This is why acquirers price on EBITDA, not net income.
                        </div>
                      </div>
                    )}
                    {treatmentMix && Object.values(treatmentMix).reduce((a, b) => a + b, 0) === 100 && (() => {
                      // Find the dominant category and surface its mix-drift
                      const sorted = TREATMENT_CATEGORIES.map(cat => ({ cat, pct: treatmentMix[cat.id] || 0 })).sort((a, b) => b.pct - a.pct);
                      const top = sorted[0];
                      if (top.pct < 25) return null;
                      const driftStats = Object.entries(top.cat.statBoost || {}).filter(([, v]) => v > 0);
                      return (
                        <div style={{ padding: '8px 10px', background: `${top.cat.color}10`, borderLeft: `2px solid ${top.cat.color}`, borderRadius: 2 }}>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500 }}>{top.cat.label}-Led Mix</div>
                          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#5A5560', marginTop: 2, lineHeight: 1.5 }}>
                            Your {top.pct}% {top.cat.label.toLowerCase()} allocation drove {driftStats.map(([s, v]) => `${s} +${(v * top.pct / 100).toFixed(1)}`).join(', ')} this quarter. Weighted ticket £{Math.round(results.q.avgTicket * 1000)}, blended margin {Math.round((1 - results.q.cogs / Math.max(results.q.revenue, 0.01)) * 100)}%.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <MBADashboard q={results.q} state={state} activeCapex={activeCapex} />

              {/* Throughput summary for the quarter */}
              {results.q?.throughputMult !== undefined && (
                <div style={{ background: 'rgba(255,255,255,0.6)', padding: 12, marginBottom: 12, borderRadius: 2, borderLeft: '3px solid #B8945F' }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Capacity Utilisation</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#0E1726', lineHeight: 1.55 }}>
                    You delivered <strong>{Math.round(results.q.throughputMult * 100)}%</strong> of your premises' <strong>{results.q.ceiling}</strong> potential treatments this quarter.
                    {results.q.throughputMult < 0.5 && <> Hiring clinical staff is the single biggest revenue lever from here.</>}
                    {results.q.throughputMult >= 0.5 && results.q.throughputMult < 0.85 && <> Decent throughput; another injector would push you closer to capacity.</>}
                    {results.q.throughputMult >= 0.85 && <> You're near or at capacity. Premium pricing or larger premises is the next growth lever.</>}
                  </div>
                </div>
              )}

              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#5A5560', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>You played</div>
              {results.moves.map(m => { const c = CAT[m.cat]; return (
                <div key={m.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.55)', borderLeft: `3px solid ${c.color}`, marginBottom: 6, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500 }}>{m.title}</div>
                </div>
              ); })}

              <div style={{ background: results.passed ? 'rgba(92,122,82,0.1)' : 'rgba(139,44,60,0.08)', border: `1px solid ${results.passed ? 'rgba(92,122,82,0.3)' : 'rgba(139,44,60,0.3)'}`, padding: 16, marginTop: 16, marginBottom: 18, borderRadius: 2 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.22em', color: results.passed ? '#5C7A52' : '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Market Event · {results.passed ? 'Weathered' : 'Hit'}{results.uninsured ? ' · UNINSURED' : ''}{results.unregistered ? ' · UNREGISTERED' : ''}</div>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 500, margin: '0 0 6px' }}>{results.event.title}</h3>
                <p style={{ fontSize: 13, color: '#5A5560', margin: '0 0 6px', lineHeight: 1.5 }}>{results.event.desc}</p>
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13.5, color: '#7A6F76', margin: '6px 0 10px', lineHeight: 1.45 }}>"{results.event.cue}"</p>
                {results.uninsured && <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#8B2C3C', margin: '0 0 10px' }}>Without indemnity, the financial damage is catastrophic.</p>}
                {results.unregistered && <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#8B2C3C', margin: '0 0 10px' }}>Without ICO registration, the fine lands and the breach becomes public record.</p>}
                <div>{Object.entries(results.eventFx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
              </div>

              {/* Next-quarter teaser */}
              {quarter < MAX_Q && state.cash >= 0 && (() => {
                const nextQ = quarter + 1;
                const dueSetPiece = SET_PIECES.find(sp => sp.quarter === nextQ && !usedSetPieces.includes(sp.id));
                const lowLoyaltyStaff = hiredStaff.filter(s => s.loyalty < 50);
                const activeCampaignsClosing = activeCampaigns.filter(c => c.quartersRemaining === 1);
                const teaseLines = [];
                if (dueSetPiece) teaseLines.push({ icon: '⚡', text: dueSetPiece.title + ' is brewing.' });
                if (lowLoyaltyStaff.length > 0) teaseLines.push({ icon: '⚠', text: `${lowLoyaltyStaff[0].name}'s loyalty is at ${lowLoyaltyStaff[0].loyalty}/100.` });
                if (activeCampaignsClosing.length > 0) {
                  const c = CAMPAIGNS.find(x => x.id === activeCampaignsClosing[0].id);
                  if (c) teaseLines.push({ icon: '◆', text: `${c.label} resolves next quarter.` });
                }
                if (patients.length >= 3) {
                  const returningPatient = patients[Math.floor(Math.random() * Math.min(3, patients.length))];
                  if (returningPatient) teaseLines.push({ icon: '◌', text: `${returningPatient.name} has booked a follow-up.` });
                }
                if (state.brand >= 60 && (q?.capacityStrain || 0) > 0.2) teaseLines.push({ icon: '↗', text: 'Demand is approaching what your team can deliver.' });
                if (teaseLines.length === 0) teaseLines.push({ icon: '·', text: 'Quiet quarter ahead. Plan accordingly.' });
                return (
                  <div style={{ background: 'rgba(184,148,95,0.06)', border: '1px solid rgba(184,148,95,0.3)', padding: 12, marginBottom: 14, borderRadius: 2 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Q{nextQ} · Incoming</div>
                    {teaseLines.slice(0, 3).map((line, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#B8945F', fontWeight: 700, marginTop: 1 }}>{line.icon}</span>
                        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: '#3D2548', lineHeight: 1.5 }}>{line.text}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <Primary onClick={nextQuarter}>{state.cash < 0 ? 'See What Remains →' : (quarter >= MAX_Q ? 'See Final Position →' : `Begin Q${quarter + 1} →`)}</Primary>
            </div>
          )}

          {phase === 'scenario' && pendingScenario && (
            <div className="ai-fade-in">
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Q{quarter} · A Decision Lands</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <PersonaAvatar persona={pendingScenario.persona} />
                <div>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.1 }}>{pendingScenario.title}</h2>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', marginTop: 4 }}>{pendingScenario.persona}</div>
                </div>
              </div>
              {pendingScenario.art && (
                <div style={{ marginBottom: 14, border: '1px solid rgba(14,23,38,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <ScenarioIllustration art={pendingScenario.art} />
                </div>
              )}
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 16, color: '#3D2548', margin: '0 0 22px', lineHeight: 1.45 }}>{pendingScenario.setup}</p>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', fontStyle: 'italic', marginBottom: 6, letterSpacing: '0.04em' }}>Each choice has consequences. Effects are visible below.</div>
              {pendingScenario.choices.map((choice, i) => (
                <button key={i} onClick={() => resolveScenario(choice)} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)', borderLeft: '3px solid #1A4D5E', padding: '14px 16px', marginBottom: 9, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: '#0E1726', lineHeight: 1.3, marginBottom: 6 }}>{choice.label}</div>
                  <div>{Object.entries(choice.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
                </button>
              ))}
            </div>
          )}

          {phase === 'scenarioOutcome' && scenarioOutcome && (
            <div className="ai-fade-in">
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Q{quarter} · Outcome</div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, margin: '0 0 20px', letterSpacing: '-0.03em' }}>{scenarioOutcome.scenario.title}</h2>
              <div style={{ background: 'rgba(255,255,255,0.7)', padding: 16, marginBottom: 12, borderLeft: '3px solid #1A4D5E', borderRadius: 2 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>You chose</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500 }}>{scenarioOutcome.choice.label}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.5)', padding: 16, marginBottom: 20, borderRadius: 2 }}>
                <p style={{ fontFamily: 'Fraunces, serif', fontSize: 15, margin: '0 0 10px', lineHeight: 1.55 }}>{scenarioOutcome.choice.outcome}</p>
                <div>{Object.entries(scenarioOutcome.choice.fx).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
              </div>
              {/* Next-quarter teaser */}
              {quarter < MAX_Q && state.cash >= 0 && (() => {
                const nextQ = quarter + 1;
                const dueSetPiece = SET_PIECES.find(sp => sp.quarter === nextQ && !usedSetPieces.includes(sp.id));
                const lowLoyaltyStaff = hiredStaff.filter(s => s.loyalty < 50);
                const teaseLines = [];
                if (dueSetPiece) teaseLines.push({ icon: '⚡', text: dueSetPiece.title + ' is brewing.' });
                if (lowLoyaltyStaff.length > 0) teaseLines.push({ icon: '⚠', text: `${lowLoyaltyStaff[0].name}'s loyalty is at ${lowLoyaltyStaff[0].loyalty}/100.` });
                if (activeCampaigns.find(c => c.quartersRemaining === 1)) {
                  const c = CAMPAIGNS.find(x => x.id === activeCampaigns.find(c => c.quartersRemaining === 1).id);
                  if (c) teaseLines.push({ icon: '◆', text: `${c.label} resolves next quarter.` });
                }
                if (teaseLines.length === 0) return null;
                return (
                  <div style={{ background: 'rgba(184,148,95,0.06)', border: '1px solid rgba(184,148,95,0.3)', padding: 12, marginBottom: 14, borderRadius: 2 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Q{nextQ} · Incoming</div>
                    {teaseLines.slice(0, 3).map((line, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#B8945F', fontWeight: 700, marginTop: 1 }}>{line.icon}</span>
                        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: '#3D2548', lineHeight: 1.5 }}>{line.text}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <Primary onClick={nextQuarter}>{state.cash < 0 ? 'See What Remains →' : (quarter >= MAX_Q ? 'See Final Position →' : `Begin Q${quarter + 1} →`)}</Primary>
            </div>
          )}

          {phase === 'consultation' && pendingConsult && (() => {
            const currentStage = getCurrentConsultStage();
            const progress = getConsultProgress();
            const isBranching = pendingConsult.branching;
            const isTerminal = currentStage?.terminal;

            // Terminal stage — show summary and finish button
            if (isTerminal) {
              return (
                <div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Q{quarter} · Consultation Closed</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <PersonaAvatar persona={pendingConsult.persona} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', letterSpacing: '0.04em' }}>{pendingConsult.persona}</div>
                      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, margin: '3px 0 0' }}>How it ended</h3>
                    </div>
                  </div>

                  <p style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: '#0E1726', margin: '0 0 14px', lineHeight: 1.55, padding: '14px 16px', background: '#FFFFFF', borderLeft: '3px solid #B8945F', borderRadius: 2 }}>{currentStage.prompt}</p>

                  {currentStage.summary && (
                    <div style={{ background: 'rgba(184,148,95,0.08)', border: '1px solid rgba(184,148,95,0.3)', padding: '12px 14px', marginBottom: 14, borderRadius: 2 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 5 }}>The Path You Took</div>
                      <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13.5, color: '#3D2548', margin: 0, lineHeight: 1.5 }}>{currentStage.summary}</p>
                    </div>
                  )}

                  {/* Show the choice trail */}
                  {consultHistory.length > 0 && (
                    <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.6)', borderRadius: 2 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.18em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Your choices</div>
                      {consultHistory.map((h, i) => (
                        <div key={i} style={{ fontFamily: 'Fraunces, serif', fontSize: 12.5, color: '#5A5560', lineHeight: 1.45, marginBottom: 3 }}>
                          <span style={{ color: '#B8945F', marginRight: 6 }}>{i + 1}.</span>{h.label}
                        </div>
                      ))}
                    </div>
                  )}

                  <Primary onClick={finishConsult}>Close Out →</Primary>
                </div>
              );
            }

            // Active stage — normal play
            return (
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Q{quarter} · Consultation</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <PersonaAvatar persona={pendingConsult.persona} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#5A5560', letterSpacing: '0.04em' }}>{pendingConsult.persona}</div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{isBranching ? `Beat ${progress.current}` : `Stage ${progress.current} / ${progress.total}`}</div>
                </div>
                {(() => {
                  const m = MOOD_STATES[consultMood] || MOOD_STATES.calm;
                  return (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.2em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 600 }}>Her mood</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 3, padding: '4px 9px', background: `${m.color}15`, border: `1px solid ${m.color}55`, borderRadius: 2 }}>
                        <span style={{ width: 7, height: 7, background: m.color, borderRadius: '50%' }} />
                        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 12.5, color: m.color, fontWeight: 500 }}>{m.label}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#3D2548', margin: '0 0 16px', lineHeight: 1.5, padding: 12, background: 'rgba(26,77,94,0.04)', borderRadius: 2 }}>{pendingConsult.background}</p>

              {!isBranching && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                  {pendingConsult.stages.map((_, i) => <div key={i} style={{ flex: 1, height: 3, background: i <= consultStage ? '#1A4D5E' : 'rgba(14,23,38,0.12)' }} />)}
                </div>
              )}

              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{currentStage?.prompt}</h3>

              {/* Mood-driven contextual cue */}
              {(consultStage > 0 || isBranching && consultHistory.length > 0) && !consultChoice && (() => {
                const moodCue = {
                  calm: 'She remains comfortable and engaged.',
                  interested: 'She leans forward. The conversation is going well.',
                  anxious: 'Her posture has tightened. She is checking her phone.',
                  defensive: 'Her arms have crossed. The room has cooled.',
                  closing: 'She is mentally elsewhere. You are losing her.',
                }[consultMood];
                return moodCue ? (
                  <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12.5, color: MOOD_STATES[consultMood]?.color || '#5A5560', margin: '0 0 12px', lineHeight: 1.45, paddingLeft: 10, borderLeft: `2px solid ${MOOD_STATES[consultMood]?.color || '#5A5560'}50` }}>{moodCue}</p>
                ) : null;
              })()}

              {!consultChoice ? (
                <>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', fontStyle: 'italic', marginBottom: 6, letterSpacing: '0.04em' }}>Effects shown below each choice. Trade-offs are part of the conversation.</div>
                  {currentStage?.options?.filter(opt => !opt.requiresFlag || consultFlags.includes(opt.requiresFlag)).map((opt, i) => (
                    <button key={i} onClick={() => makeConsultChoice(opt)} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,23,38,0.1)', borderLeft: '3px solid #1A4D5E', padding: '13px 15px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2 }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15.5, fontWeight: 500, color: '#0E1726', lineHeight: 1.35, marginBottom: 6 }}>{opt.label}</div>
                      <div>{Object.entries(opt.fx || {}).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(255,255,255,0.75)', padding: 14, borderLeft: '3px solid #1A4D5E', marginBottom: 10, borderRadius: 2 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700 }}>You chose</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginTop: 3 }}>{consultChoice.label}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.5)', padding: 14, marginBottom: 14, borderRadius: 2 }}>
                    <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14.5, margin: '0 0 8px', lineHeight: 1.55, color: '#3D2548' }}>{consultChoice.response}</p>
                    <div>{Object.entries(consultChoice.fx || {}).map(([k, v]) => v !== 0 && <FxChip key={k} stat={k} val={v} />)}</div>
                  </div>
                  <Primary onClick={advanceConsult}>{(isBranching && pendingConsult.stages[consultChoice.nextId]?.terminal) ? 'See How It Ends →' : (isBranching ? 'Continue →' : (consultStage < pendingConsult.stages.length - 1 ? 'Next →' : 'Close Consultation →'))}</Primary>
                </>
              )}
            </div>
            );
          })()}

          {phase === 'canvas' && (
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Year Two Closes</div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.035em', lineHeight: 1 }}>The Bottom Line.</h2>
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: '#5A5560', margin: '10px 0 18px', lineHeight: 1.45 }}>Eight quarters of decisions. Time to see what the business is worth.</p>

              <EVBreakdown state={state} />

              {/* Porter's Five Forces snapshot */}
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.1)', padding: 16, marginBottom: 14, borderRadius: 2 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 4 }}>Porter's Five Forces · Your Position</div>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, margin: '0 0 12px' }}>Industry structure analysis</h3>
                {[
                  { label: 'Supplier power', val: 100 - Math.min(80, state.innovation), hint: 'Lower = better. Diverse formulary reduces dependence on single suppliers.' },
                  { label: 'Buyer power', val: 100 - Math.min(80, (state.brand + state.nps) / 2), hint: 'Lower = better. Brand and loyalty reduce price negotiation by patients.' },
                  { label: 'Threat of substitutes', val: 100 - Math.min(80, state.innovation), hint: 'Lower = better. Clinical differentiation makes substitutes less viable.' },
                  { label: 'Threat of new entrants', val: 100 - Math.min(80, (state.compliance + state.ethics) / 2), hint: 'Lower = better. Compliance moat and ethics culture raise barriers.' },
                  { label: 'Competitive rivalry', val: Math.min(95, 50 + (LOCATIONS.find(l => l.id === setup.location)?.competition === 'high' ? 25 : LOCATIONS.find(l => l.id === setup.location)?.competition === 'medium' ? 10 : -5)), hint: 'Determined by your borough. Marylebone and Chelsea = high. Croydon and Edinburgh = lower.' },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#0E1726', fontWeight: 600 }}>{f.label}</span>
                      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: f.val < 40 ? '#5C7A52' : f.val < 65 ? '#B8945F' : '#8B2C3C', fontWeight: 500 }}>{f.val < 40 ? 'Favourable' : f.val < 65 ? 'Moderate' : 'Severe'}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(14,23,38,0.07)' }}>
                      <div style={{ height: '100%', width: `${f.val}%`, background: f.val < 40 ? '#5C7A52' : f.val < 65 ? '#B8945F' : '#8B2C3C', transition: 'width 0.7s' }} />
                    </div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginTop: 3, lineHeight: 1.4 }}>{f.hint}</div>
                  </div>
                ))}
              </div>

              <Primary onClick={() => setPhase('acquisition')}>See Who's Calling →</Primary>
            </div>
          )}


          {phase === 'acquisition' && (() => {
            const annualEbitda = financialHistory.slice(-4).reduce((sum, h) => sum + (h.ebitda || 0), 0);
            return (
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>The Suitors</div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.035em', lineHeight: 1 }}>The phone's been ringing.</h2>
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: '#5A5560', margin: '10px 0 18px', lineHeight: 1.45 }}>Four parties. Different values. Different offers.</p>

              {/* The valuation basis — show the maths */}
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,77,94,0.2)', padding: 14, marginBottom: 14, borderRadius: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700 }}>The Valuation Basis</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: '#5A5560', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Annualised EBITDA</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: annualEbitda > 0 ? '#0E1726' : '#8B2C3C', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatGBP(annualEbitda)}</div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', fontStyle: 'italic' }}>Trailing 4 quarters</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, color: '#5A5560', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top offer</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#1A4D5E', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{validOffers.length > 0 ? formatGBP(topOffer) : '—'}</div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', fontStyle: 'italic' }}>{validOffers.length === 0 ? 'No qualifying bidders' : 'Implied multiple shown below'}</div>
                  </div>
                </div>
                <ConceptCard conceptId="ebitda-multiple" />
                <ConceptCard conceptId="multiple-drivers" />
                {bustCount > 0 && <ConceptCard conceptId="diligence-discount" />}
                {sites.length > 0 && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(184,148,95,0.08)', borderLeft: '3px solid #B8945F', borderRadius: 2 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 5 }}>Chain Position at Exit</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#0E1726', lineHeight: 1.5, marginBottom: 4 }}>
                      You exit as a {1 + sites.filter(s => s.health !== 'failed').length}-site chain.
                      {sites.filter(s => s.health === 'failed').length > 0 && <span style={{ color: '#5A5560', fontStyle: 'italic' }}> ({sites.filter(s => s.health === 'failed').length} previously closed.)</span>}
                    </div>
                    {(1 + sites.filter(s => s.health !== 'failed').length) >= 3 && (
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, color: '#3D2548', lineHeight: 1.5 }}>
                        Roll-up multiplier applied: <strong style={{ color: '#B8945F' }}>×{(1 + sites.filter(s => s.health !== 'failed').length) >= 6 ? '2.5' : (1 + sites.filter(s => s.health !== 'failed').length) >= 4 ? '2.0' : '1.5'}</strong> across all offers. Pharma acquirers pay premiums for proven, replicable operating models.
                      </div>
                    )}
                  </div>
                )}
                {annualEbitda <= 0 && (
                  <div style={{ background: 'rgba(139,44,60,0.08)', border: '1px solid rgba(139,44,60,0.2)', padding: '7px 10px', marginTop: 6, borderRadius: 2 }}>
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 12, color: '#5A5560', fontStyle: 'italic' }}>The business is loss-making. Most acquirers will pass — and any that engage will offer asset value, not earnings value.</span>
                  </div>
                )}
              </div>

              {offers.map(({ suitor, offer, passed, reason, multiplier }) => (
                <div key={suitor.id} style={{ background: passed ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)', border: '1px solid rgba(14,23,38,0.08)', padding: '15px 17px', marginBottom: 10, borderRadius: 2, opacity: passed ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 6 }}>
                    <Icon kind="suitor" id={suitor.id} size={50} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 3 }}>{suitor.archetype}</div>
                      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 500, margin: 0, lineHeight: 1.15 }}>{suitor.name}</h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, color: passed ? '#1A4D5E' : '#9B9098', fontVariantNumeric: 'tabular-nums' }}>{passed ? formatGBP(offer) : '—'}</div>
                      {passed && multiplier && <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#5A5560' }}>{multiplier}× EBITDA</div>}
                    </div>
                  </div>
                  <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, color: '#5A5560', margin: '0 0 8px', lineHeight: 1.5 }}>{suitor.blurb}</p>
                  <div style={{ marginBottom: 10 }}>{suitor.valued.map(v => <span key={v} style={{ display: 'inline-block', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9.5, fontWeight: 600, color: '#3D2548', background: 'rgba(61,37,72,0.08)', padding: '3px 7px', borderRadius: 2, marginRight: 4 }}>{v}</span>)}</div>
                  {passed ? (
                    <button onClick={() => { setChosenSuitor({ suitor, offer }); setPhase('endgame-announcement'); }} style={{ width: '100%', background: 'transparent', color: '#0E1726', border: '1px solid #0E1726', padding: '10px', fontFamily: 'Fraunces, serif', fontSize: 13.5, borderRadius: 2, cursor: 'pointer' }}>Accept Offer →</button>
                  ) : (<div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: '#9B9098' }}>Passed. {reason}</div>)}
                </div>
              ))}
              <button onClick={() => { setChosenSuitor(null); setPhase('exit'); }} style={{ width: '100%', background: 'transparent', color: '#0E1726', border: '1px dashed #3D2548', padding: '13px', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, borderRadius: 2, cursor: 'pointer', marginTop: 4 }}>Stay independent →</button>
            </div>
            );
          })()}

          {/* === ENDGAME SCREEN 1: THE ANNOUNCEMENT === */}
          {phase === 'endgame-announcement' && chosenSuitor && (() => {
            const suitor = chosenSuitor.suitor;
            const valueM = (chosenSuitor.offer / 1000).toFixed(1);
            const annualEbitda = financialHistory.slice(-4).reduce((s, h) => s + (h.ebitda || 0), 0);
            const impliedMultiple = annualEbitda > 0 ? (chosenSuitor.offer / annualEbitda).toFixed(1) : '—';
            const cliniName = setup.location ? `${LOCATIONS.find(l => l.id === setup.location)?.shortLabel || 'Your'} Aesthetics` : 'Your Clinic';
            const headlineByAcquirer = {
              allergan: `ALLERGAN AESTHETICS ACQUIRES ${cliniName.toUpperCase()}`,
              galde: `GALDERMA EXPANDS UK FOOTPRINT WITH ${cliniName.toUpperCase()}`,
              merz: `MERZ AESTHETICS COMPLETES UK RESEARCH-LED ACQUISITION`,
              cont: `CONTINUITY PARTNERS ADDS ${cliniName.toUpperCase()} TO UK ROLL-UP`,
            };
            const quoteByAcquirer = {
              allergan: '"Their patient retention and brand strength are exactly what we look for in a strategic partner."',
              galde: '"A clinician-led practice with genuine research engagement. This is the future of UK aesthetics."',
              merz: '"Pioneering work in regenerative aesthetics. We are proud to add this clinic to our network."',
              cont: '"A solid operating model. Disciplined unit economics. The right platform for our next phase."',
            };
            return (
              <div className="ai-fade-in" style={{ paddingTop: 14 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 6 }}>Two Years Later · Q{quarter}</div>
                <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, lineHeight: 1.05, fontWeight: 400, margin: '0 0 18px', letterSpacing: '-0.025em' }}>The press release went out at 7am.</h1>

                {/* Composed FT-style headline card */}
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,38,0.12)', padding: 0, marginBottom: 18, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ background: '#0E1726', color: '#FAF6EE', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>The Aesthetics Press</span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', color: '#B8945F' }}>2026</span>
                  </div>
                  <div style={{ padding: '18px 16px 14px' }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', color: '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 7 }}>BREAKING · UK M&amp;A</div>
                    <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, margin: '0 0 12px', letterSpacing: '-0.015em', lineHeight: 1.15 }}>{headlineByAcquirer[suitor.id] || `${suitor.name.toUpperCase()} ACQUIRES ${cliniName.toUpperCase()}`}</h2>
                    <p style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, color: '#3D2548', lineHeight: 1.55, margin: '0 0 10px' }}>
                      {suitor.name} has agreed to acquire {cliniName}{sites.filter(s => s.health !== 'failed').length > 0 ? ` and its ${1 + sites.filter(s => s.health !== 'failed').length}-site UK network` : ''} in a deal valued at <strong style={{ color: '#0E1726' }}>£{valueM}M</strong>, representing an estimated <strong>{impliedMultiple}× trailing EBITDA</strong>.
                    </p>
                    <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#5A5560', lineHeight: 1.5, margin: '0 0 6px', borderLeft: '2px solid #B8945F', paddingLeft: 10 }}>
                      {quoteByAcquirer[suitor.id] || quoteByAcquirer.cont}
                    </p>
                    <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, color: '#9B9098', margin: '8px 0 0', letterSpacing: '0.04em' }}>— {suitor.name === 'Galderma' ? 'CEO, Galderma UK' : suitor.name === 'Allergan Aesthetics' ? 'Head of M&A, Allergan' : suitor.name === 'Merz Aesthetics' ? 'Strategic Director, Merz' : 'Managing Partner, Continuity'}</p>
                  </div>
                </div>

                {/* The numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                  <div style={{ background: 'rgba(255,255,255,0.55)', padding: '10px 12px', borderRadius: 2, borderLeft: '2px solid #0E1726' }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.14em', color: '#5A5560', textTransform: 'uppercase' }}>Headline</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: '#0E1726', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>£{valueM}M</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.55)', padding: '10px 12px', borderRadius: 2, borderLeft: '2px solid #1A4D5E' }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.14em', color: '#5A5560', textTransform: 'uppercase' }}>Multiple</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: '#0E1726', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{impliedMultiple}×</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.55)', padding: '10px 12px', borderRadius: 2, borderLeft: '2px solid #B8945F' }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.14em', color: '#5A5560', textTransform: 'uppercase' }}>Sites</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: '#0E1726', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{1 + sites.filter(s => s.health !== 'failed').length}</div>
                  </div>
                </div>

                <Primary onClick={() => setPhase('endgame-people')}>Continue →</Primary>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#9B9098', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>1 of 4 · The Announcement</div>
              </div>
            );
          })()}

          {/* === ENDGAME SCREEN 2: THE PEOPLE === */}
          {phase === 'endgame-people' && chosenSuitor && (() => {
            // Generate outcomes for each named staff member
            const staffOutcomes = hiredStaff.map(s => {
              const role = STAFF_ROLES.find(r => r.id === s.roleId);
              const loyalty = s.loyalty || 50;
              let outcome;
              if (loyalty >= 75) outcome = { tone: '#5C7A52', label: 'Retained', text: `Stayed on through the transition. ${chosenSuitor.suitor.name} extended their contract.` };
              else if (loyalty >= 50) outcome = { tone: '#B8945F', label: 'Transitioned', text: `Left within 6 months for a competitor. Took some patient relationships with them.` };
              else outcome = { tone: '#8B2C3C', label: 'Departed', text: `Resigned the week the deal closed. The acquirer expected this.` };
              if (s.roleId === 'senior-injector' && loyalty >= 80) outcome = { tone: '#5C7A52', label: 'Promoted', text: `${chosenSuitor.suitor.name} appointed them Group Clinical Lead.` };
              return { staff: s, role, outcome };
            });
            const namedPatients = patients.filter(p => p.name);
            return (
              <div className="ai-fade-in" style={{ paddingTop: 14 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 6 }}>Two Years Later · The People</div>
                <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.05, fontWeight: 400, margin: '0 0 6px', letterSpacing: '-0.025em' }}>Everyone moved on.</h1>
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#5A5560', margin: '0 0 18px', lineHeight: 1.4 }}>The deal is a number. The team and the patients were the practice.</p>

                {staffOutcomes.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#1A4D5E', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Your Team</div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      {staffOutcomes.map((entry, i) => (
                        <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.55)', borderLeft: `2px solid ${entry.outcome.tone}`, borderRadius: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                            <div>
                              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: '#0E1726' }}>{entry.staff.name}</span>
                              <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#5A5560', marginLeft: 7 }}>· {entry.role?.label}</span>
                            </div>
                            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.18em', color: entry.outcome.tone, fontWeight: 700, textTransform: 'uppercase' }}>{entry.outcome.label}</span>
                          </div>
                          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12.5, color: '#3D2548', lineHeight: 1.5 }}>{entry.outcome.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {namedPatients.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#3D2548', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Your Patients</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {namedPatients.slice(0, 5).map((p, i) => {
                        // Generate where-are-they-now based on type + visits
                        const visits = p.visits || 1;
                        let coda;
                        if (visits >= 4) coda = 'Still books with the new ownership. Says they only stayed for the practitioner — and that\'s you.';
                        else if (visits >= 2) coda = 'Books elsewhere now. Sends occasional referrals.';
                        else coda = 'One visit. Never returned, never complained.';
                        return (
                          <div key={i} style={{ padding: '8px 11px', background: 'rgba(255,255,255,0.45)', borderRadius: 2, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11.5, color: '#3D2548', lineHeight: 1.45 }}>
                            <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>{p.name}</span> · {coda}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {staffOutcomes.length === 0 && namedPatients.length === 0 && (
                  <div style={{ padding: 14, background: 'rgba(255,255,255,0.55)', borderRadius: 2, marginBottom: 18, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13.5, color: '#5A5560', lineHeight: 1.55 }}>
                    You ran lean. No hired team. The patients you treated did not stay long enough to be named in their own files.
                  </div>
                )}

                <Primary onClick={() => setPhase('endgame-verdict')}>Continue →</Primary>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#9B9098', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>2 of 4 · The People</div>
              </div>
            );
          })()}

          {/* === ENDGAME SCREEN 3: THE VERDICT === */}
          {phase === 'endgame-verdict' && chosenSuitor && (() => {
            // Match emergent identity vs declared at Q1 (best inferred from suitor type)
            const declaredIdentity = (() => {
              // Use the strongest stat to infer what the player likely declared
              const stats = { brand: state.brand, innovation: state.innovation, safety: state.safety, ethics: state.ethics, nps: state.nps };
              const top = Object.entries(stats).sort((a, b) => b[1] - a[1])[0];
              if (top[0] === 'innovation') return 'Research-Led Path';
              if (top[0] === 'safety') return 'Clinical Pharma Path';
              if (top[0] === 'brand' || top[0] === 'nps') return 'Brand & Volume Path';
              return 'PE Flip Path';
            })();
            const suitorIdentityMap = {
              merz: 'Research-Led Path',
              galde: 'Clinical Pharma Path',
              allergan: 'Brand & Volume Path',
              cont: 'PE Flip Path',
            };
            const actualPath = suitorIdentityMap[chosenSuitor.suitor.id] || 'PE Flip Path';
            const verdict = declaredIdentity === actualPath
              ? { label: 'Faithful', tone: '#5C7A52', desc: `You built the practice you set out to build. The path through ${actualPath} was honoured.` }
              : { label: 'Transformed', tone: '#B8945F', desc: `You started with ${declaredIdentity} ambitions but exited to ${actualPath}. The market reshaped your identity. That's not failure — that's adaptation.` };

            // Press retrospective
            const pressLines = [];
            if (state.safety >= 70) pressLines.push('"A clinic whose safety record set the regional standard."');
            if (state.innovation >= 70) pressLines.push('"Published outcomes that other clinics studied."');
            if (state.brand >= 70) pressLines.push('"A name the press knew before the patients did."');
            if (state.ethics >= 70) pressLines.push('"Refused profitable patients on principle — and built a reputation in doing so."');
            if (bustCount > 0) pressLines.push('"Has been through the wringer once. Came back."');
            if (sites.filter(s => s.health !== 'failed').length >= 3) pressLines.push('"Built one of the more credible UK aesthetics chains of the cycle."');

            return (
              <div className="ai-fade-in" style={{ paddingTop: 14 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 6 }}>Two Years Later · The Verdict</div>
                <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.05, fontWeight: 400, margin: '0 0 18px', letterSpacing: '-0.025em' }}>Did you build the practice you said you would?</h1>

                <div style={{ background: `linear-gradient(135deg, ${verdict.tone}18 0%, ${verdict.tone}06 100%)`, border: `1px solid ${verdict.tone}50`, borderLeft: `3px solid ${verdict.tone}`, padding: 16, marginBottom: 18, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: verdict.tone, fontWeight: 700, marginBottom: 5 }}>Verdict</div>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, margin: '0 0 8px', color: verdict.tone, letterSpacing: '-0.02em' }}>{verdict.label}</h2>
                  <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#3D2548', lineHeight: 1.55, margin: 0 }}>{verdict.desc}</p>
                </div>

                {pressLines.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>What the Press Is Now Writing</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {pressLines.map((line, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.55)', borderLeft: '2px solid #B8945F', borderRadius: 2, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: '#3D2548', lineHeight: 1.5 }}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mini-stat reflection */}
                <div style={{ background: 'rgba(255,255,255,0.55)', padding: 14, marginBottom: 18, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#5A5560', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>The Numbers Behind the Story</div>
                  {Object.keys(STAT_LABELS).map(k => <StatRow key={k} label={STAT_LABELS[k]} value={state[k]} color={STAT_COLORS[k]} />)}
                </div>

                <Primary onClick={() => setPhase('endgame-legacy')}>Continue →</Primary>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#9B9098', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>3 of 4 · The Verdict</div>
              </div>
            );
          })()}

          {/* === ENDGAME SCREEN 4: YOUR LEGACY === */}
          {phase === 'endgame-legacy' && chosenSuitor && (() => {
            const suitor = chosenSuitor.suitor;
            const valueM = (chosenSuitor.offer / 1000).toFixed(1);
            const annualEbitda = financialHistory.slice(-4).reduce((s, h) => s + (h.ebitda || 0), 0);
            const impliedMultiple = annualEbitda > 0 ? (chosenSuitor.offer / annualEbitda).toFixed(1) : '—';
            const sitesAtExit = 1 + sites.filter(s => s.health !== 'failed').length;
            const topMilestones = milestones.slice(-4);
            const summaryText = `I built a ${sitesAtExit}-site UK aesthetics practice and exited to ${suitor.name} for £${valueM}M at ${impliedMultiple}× EBITDA. Played The Aesthetic Innovator.`;
            return (
              <div className="ai-fade-in" style={{ paddingTop: 14 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 6 }}>Two Years Later · Your Legacy</div>
                <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.05, fontWeight: 400, margin: '0 0 18px', letterSpacing: '-0.025em' }}>For the record.</h1>

                {/* The composed legacy card — screenshotable */}
                <div id="legacy-card" style={{ background: 'linear-gradient(160deg, #FAF6EE 0%, #FFFFFF 100%)', border: '1px solid rgba(14,23,38,0.15)', padding: '22px 18px', marginBottom: 16, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 12, right: 14, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 8.5, letterSpacing: '0.22em', color: '#B8945F', fontWeight: 700 }}>2026</div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 8.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#B8945F', fontWeight: 700, marginBottom: 6 }}>The Aesthetic Innovator</div>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 42, fontWeight: 400, margin: '0 0 4px', letterSpacing: '-0.04em', lineHeight: 0.95 }}>£{valueM}M<span style={{ color: '#B8945F' }}>.</span></h2>
                  <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#5A5560', margin: '0 0 16px', lineHeight: 1.3 }}>Exit to {suitor.name} · {impliedMultiple}× EBITDA</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 8.5, letterSpacing: '0.15em', color: '#5A5560', textTransform: 'uppercase', marginBottom: 2 }}>Sites</div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{sitesAtExit}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 8.5, letterSpacing: '0.15em', color: '#5A5560', textTransform: 'uppercase', marginBottom: 2 }}>Quarters</div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{quarter}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 8.5, letterSpacing: '0.15em', color: '#5A5560', textTransform: 'uppercase', marginBottom: 2 }}>Brand</div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{state.brand}<span style={{ fontSize: 14, color: '#9B9098' }}>/100</span></div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 8.5, letterSpacing: '0.15em', color: '#5A5560', textTransform: 'uppercase', marginBottom: 2 }}>Innovation</div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{state.innovation}<span style={{ fontSize: 14, color: '#9B9098' }}>/100</span></div>
                    </div>
                  </div>

                  {topMilestones.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(14,23,38,0.1)', paddingTop: 12 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 8.5, letterSpacing: '0.15em', color: '#5A5560', textTransform: 'uppercase', marginBottom: 7, fontWeight: 700 }}>Key Milestones</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {topMilestones.map((m, i) => (
                          <span key={i} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, padding: '3px 8px', background: `${m.color}15`, color: m.color, borderRadius: 2, fontWeight: 600, border: `1px solid ${m.color}30` }}>{m.label}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(14,23,38,0.08)', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 10.5, color: '#9B9098', textAlign: 'center' }}>aestheticinnovator.com</div>
                </div>

                {/* Share actions */}
                <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                  <button onClick={() => {
                    try {
                      if (navigator.clipboard) navigator.clipboard.writeText(summaryText);
                    } catch (e) {}
                  }} style={{ width: '100%', background: '#0E1726', color: '#FAF6EE', border: 'none', padding: '11px 14px', fontFamily: 'Fraunces, serif', fontSize: 13.5, cursor: 'pointer', borderRadius: 2 }}>Copy summary to clipboard</button>
                  <button onClick={() => {
                    try { clearSavedGame(); } catch (e) {}
                    startGame();
                  }} style={{ width: '100%', background: 'transparent', color: '#1A4D5E', border: '1px solid #1A4D5E', padding: '11px 14px', fontFamily: 'Fraunces, serif', fontSize: 13.5, cursor: 'pointer', borderRadius: 2 }}>Open Another Clinic →</button>
                  <button onClick={() => setPhase('ledger')} style={{ width: '100%', background: 'transparent', color: '#5A5560', border: '1px solid rgba(14,23,38,0.12)', padding: '9px 12px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.05em' }}>Review the full decision ledger</button>
                </div>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10.5, color: '#9B9098', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>4 of 4 · Your Legacy</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: '#9B9098', textAlign: 'center', marginTop: 16 }}>Designed by A. Zargaran. © 2026.</div>
              </div>
            );
          })()}

          {phase === 'exit' && (
            <div style={{ paddingTop: 14 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#B8945F', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>{chosenSuitor ? 'The Deal' : 'The Decision'}</div>
              {chosenSuitor ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <Icon kind="suitor" id={chosenSuitor.suitor.id} size={60} />
                    <div>
                      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 500, margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>£{(chosenSuitor.offer / 1000).toFixed(1)}M.</h2>
                      <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#5A5560', margin: '6px 0 0' }}>You signed with {chosenSuitor.suitor.name}.</p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.7)', borderLeft: '3px solid #1A4D5E', padding: 16, marginBottom: 22, borderRadius: 2 }}>
                    <p style={{ fontFamily: 'Fraunces, serif', fontSize: 15, lineHeight: 1.55, margin: 0 }}>They {chosenSuitor.suitor.ending}</p>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 44, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.04em', lineHeight: 1 }}>You said no.</h2>
                  <div style={{ background: 'rgba(255,255,255,0.7)', borderLeft: '3px solid #1A4D5E', padding: 16, marginBottom: 22, marginTop: 14, borderRadius: 2 }}>
                    <p style={{ fontFamily: 'Fraunces, serif', fontSize: 15, lineHeight: 1.55, margin: 0 }}>
                      {evScore.total > 65 ? "Three years later, the clinic is the most-cited UK injectables brand in the academic literature." : evScore.total > 45 ? "The clinic survives, comfortably profitable. A good business; not yet a remarkable one." : "You are still trading. The market is patient."}
                    </p>
                  </div>
                </>
              )}
              <div style={{ background: 'rgba(255,255,255,0.55)', padding: 16, marginBottom: 18, borderRadius: 2 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.18em', color: '#5A5560', marginBottom: 12, textTransform: 'uppercase', fontWeight: 600 }}>Final Position</div>
                {Object.keys(STAT_LABELS).map(k => <StatRow key={k} label={STAT_LABELS[k]} value={state[k]} color={STAT_COLORS[k]} />)}
              </div>
              <Primary onClick={startGame}>Open Another Clinic →</Primary>
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: '#9B9098', textAlign: 'center', marginTop: 18 }}>Designed by A. Zargaran. © 2026.</div>
            </div>
          )}

          {phase === 'insolvent' && (
            <div style={{ paddingTop: 40 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, letterSpacing: '0.3em', color: '#8B2C3C', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Insolvent · Q{quarter}</div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 44, fontWeight: 500, margin: '0 0 16px', letterSpacing: '-0.04em', lineHeight: 1 }}>The lease wasn't renewed.</h2>
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 16, color: '#5A5560', margin: '10px 0 16px', lineHeight: 1.45 }}>You ran out of runway before you ran out of ideas. The clinic closes.</p>
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#3D2548', margin: '0 0 24px', lineHeight: 1.5 }}>
                You're still <strong>{BACKGROUNDS.find(b => b.id === setup.background)?.label || 'a practitioner'}</strong>, trained at <strong>{TRAINING_PATHS.find(t => t.id === setup.training)?.label.toLowerCase() || 'your level'}</strong>. Reopen in <strong>{LOCATIONS.find(l => l.id === setup.location)?.shortLabel || 'your area'}</strong>, or start completely fresh.
              </p>
              <Primary onClick={restartAfterBust}>Try Again — Same Person, Fresh Plan →</Primary>
              <button onClick={startGame} style={{ width: '100%', background: 'transparent', color: '#5A5560', border: '1px solid rgba(14,23,38,0.15)', padding: '12px', fontFamily: 'Fraunces, serif', fontSize: 13, fontStyle: 'italic', borderRadius: 2, cursor: 'pointer', marginTop: 10 }}>Or start completely over (new background)</button>
            </div>
          )}

        </div>
      </div>
      <Analytics />
    </>
  );
}

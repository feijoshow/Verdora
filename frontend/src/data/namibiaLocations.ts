/**
 * Structured Namibian administrative geography for Verdora's location KYC step.
 * Used to drive cascading Region -> Town/Village pickers at registration/profile-edit,
 * and to key region-specific crop calendar, weather geocoding, and chat context off of.
 *
 * DATA PROVENANCE & CAVEATS (read before extending this file):
 * - Anchored on Namibia's 14 regions (stable since the 2013 delimitation) and the
 *   57 formal local authorities (municipalities/towns/village councils) within them,
 *   per CLGF Namibia country profile, ECN local authority listings, and statoids.com.
 * - Namibia has 121 constituencies total, but only some have a formal town/village
 *   council seated in them. Communal/rural constituencies with no listed local authority
 *   are NOT represented here as selectable towns - this is a real gap in the source data,
 *   not an oversight. The "Other (type your village)" fallback exists specifically to
 *   cover farmers in those areas. Do not "fill in" missing constituencies with invented
 *   town names.
 * - Kavango West in particular is thin in the source data (1 of 13 constituencies has
 *   a seated local authority). Expect "Other" to be used often for that region this
 *   round - that's expected, not a bug.
 * - constituency is shown to the user as a sub-label for context/trust ("Oshakati,
 *   Oshakati West constituency") and stored for future regional-intelligence features,
 *   but the user-facing selection unit is the TOWN, since that's what farmers actually
 *   identify with day to day.
 * - Re-verify against the Electoral Commission of Namibia (ECN) or Namibia Statistics
 *   Agency (NSA) before any release beyond this internal test round, since constituency
 *   boundaries are subject to periodic Delimitation Commission review.
 */

export type AuthorityType =
  | 'City / Part I Municipality'
  | 'Part II Municipality'
  | 'Town'
  | 'Village';

export interface NamibiaTown {
  /** Stable id for storage, e.g. "oshakati" */
  id: string;
  name: string;
  authorityType: AuthorityType;
  /** One or more constituencies this settlement falls under/spans */
  constituencies: string[];
}

export interface NamibiaRegion {
  id: string;
  name: string;
  towns: NamibiaTown[];
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const region = (name: string, towns: Omit<NamibiaTown, 'id'>[]): NamibiaRegion => ({
  id: slugify(name),
  name,
  towns: towns.map((t) => ({ ...t, id: slugify(t.name) })),
});

export const NAMIBIA_REGIONS: NamibiaRegion[] = [
  region('Khomas', [
    {
      name: 'Windhoek',
      authorityType: 'City / Part I Municipality',
      constituencies: [
        'Windhoek East',
        'Windhoek West',
        'Windhoek Rural',
        'Katutura Central',
        'Katutura East',
        'Khomasdal',
        "Moses //Garoëb",
        'Samora Machel',
        'John Pandeni',
        'Tobias Hainyeko',
      ],
    },
  ]),

  region('Erongo', [
    { name: 'Walvis Bay', authorityType: 'City / Part I Municipality', constituencies: ['Walvis Bay Urban', 'Walvis Bay Rural'] },
    { name: 'Swakopmund', authorityType: 'City / Part I Municipality', constituencies: ['Swakopmund'] },
    { name: 'Henties Bay', authorityType: 'Part II Municipality', constituencies: ['Arandis'] },
    { name: 'Omaruru', authorityType: 'Part II Municipality', constituencies: ['Omaruru'] },
    { name: 'Arandis', authorityType: 'Town', constituencies: ['Arandis'] },
    { name: 'Karibib', authorityType: 'Town', constituencies: ['Karibib'] },
    { name: 'Usakos', authorityType: 'Town', constituencies: ['Karibib'] },
  ]),

  region('//Kharas', [
    { name: 'Keetmanshoop', authorityType: 'Part II Municipality', constituencies: ['Keetmanshoop Urban', 'Keetmanshoop Rural'] },
    { name: 'Karasburg', authorityType: 'Town', constituencies: ['Karasburg East'] },
    { name: 'Lüderitz', authorityType: 'Town', constituencies: ['!Nami#nus'] },
    { name: 'Oranjemund', authorityType: 'Town', constituencies: ['Oranjemund'] },
    { name: 'Aroab', authorityType: 'Village', constituencies: ['Keetmanshoop Rural'] },
    { name: 'Berseba', authorityType: 'Village', constituencies: ['Berseba'] },
    { name: 'Bethanie', authorityType: 'Village', constituencies: ['Berseba'] },
    { name: 'Koës', authorityType: 'Village', constituencies: ['Keetmanshoop Rural'] },
    { name: 'Tses', authorityType: 'Village', constituencies: ['Berseba'] },
  ]),

  region('Hardap', [
    { name: 'Mariental', authorityType: 'Part II Municipality', constituencies: ['Mariental Urban'] },
    { name: 'Aranos', authorityType: 'Town', constituencies: ['Aranos'] },
    { name: 'Rehoboth', authorityType: 'Town', constituencies: ['Rehoboth Urban East', 'Rehoboth Urban West'] },
    { name: 'Gibeon', authorityType: 'Village', constituencies: ['Gibeon'] },
    { name: 'Gochas', authorityType: 'Village', constituencies: ['Mariental Rural'] },
    { name: 'Kalkrand', authorityType: 'Village', constituencies: ['Rehoboth Rural'] },
    { name: 'Maltahöhe', authorityType: 'Village', constituencies: ['Daweb'] },
    { name: 'Stampriet', authorityType: 'Village', constituencies: ['Mariental Rural'] },
  ]),

  region('Otjozondjupa', [
    { name: 'Grootfontein', authorityType: 'Part II Municipality', constituencies: ['Grootfontein'] },
    { name: 'Okahandja', authorityType: 'Part II Municipality', constituencies: ['Okahandja'] },
    { name: 'Otjiwarongo', authorityType: 'Part II Municipality', constituencies: ['Otjiwarongo'] },
    { name: 'Okakarara', authorityType: 'Town', constituencies: ['Okakarara'] },
    { name: 'Otavi', authorityType: 'Town', constituencies: ['Otavi'] },
  ]),

  region('Oshana', [
    { name: 'Ondangwa', authorityType: 'Town', constituencies: ['Ondangwa Urban'] },
    { name: 'Ongwediva', authorityType: 'Town', constituencies: ['Ongwediva'] },
    { name: 'Oshakati', authorityType: 'Town', constituencies: ['Oshakati East', 'Oshakati West'] },
  ]),

  region('Oshikoto', [
    { name: 'Tsumeb', authorityType: 'Part II Municipality', constituencies: ['Tsumeb'] },
    { name: 'Omuthiya', authorityType: 'Town', constituencies: ['Omuthiya'] },
    { name: 'Oniipa', authorityType: 'Town', constituencies: ['Oniipa'] },
  ]),

  region('Omusati', [
    { name: 'Okahao', authorityType: 'Town', constituencies: ['Okahao'] },
    { name: 'Oshikuku', authorityType: 'Town', constituencies: ['Oshikuku'] },
    { name: 'Outapi', authorityType: 'Town', constituencies: ['Outapi'] },
    { name: 'Ruacana', authorityType: 'Town', constituencies: ['Ruacana'] },
    { name: 'Tsandi', authorityType: 'Village', constituencies: ['Tsandi'] },
  ]),

  region('Ohangwena', [
    { name: 'Eenhana', authorityType: 'Town', constituencies: ['Eenhana'] },
    { name: 'Helao Nafidi', authorityType: 'Town', constituencies: ['Oshikango'] },
    { name: 'Okongo', authorityType: 'Village', constituencies: ['Okongo'] },
  ]),

  region('Kunene', [
    { name: 'Outjo', authorityType: 'Part II Municipality', constituencies: ['Outjo'] },
    { name: 'Khorixas', authorityType: 'Town', constituencies: ['Khorixas'] },
    { name: 'Opuwo', authorityType: 'Town', constituencies: ['Opuwo Urban'] },
    { name: 'Kamanjab', authorityType: 'Village', constituencies: ['Kamanjab'] },
  ]),

  region('Omaheke', [
    { name: 'Gobabis', authorityType: 'Part II Municipality', constituencies: ['Gobabis'] },
    { name: 'Otjinene', authorityType: 'Village', constituencies: ['Otjinene'] },
    { name: 'Leonardville', authorityType: 'Village', constituencies: ['Aminuis'] },
    { name: 'Witvlei', authorityType: 'Village', constituencies: ['Okarukambe'] },
  ]),

  region('Kavango East', [
    { name: 'Rundu', authorityType: 'Town', constituencies: ['Rundu Urban', 'Rundu Rural'] },
    { name: 'Divundu', authorityType: 'Village', constituencies: ['Mukwe'] },
  ]),

  region('Kavango West', [
    { name: 'Nkurenkuru', authorityType: 'Town', constituencies: ['Nkurenkuru'] },
  ]),

  region('Zambezi', [
    { name: 'Katima Mulilo', authorityType: 'Town', constituencies: ['Katima Mulilo Urban'] },
    { name: 'Bukalo', authorityType: 'Village', constituencies: ['Katima Mulilo Rural'] },
  ]),
];

export const REGION_BY_ID: Record<string, NamibiaRegion> = NAMIBIA_REGIONS.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<string, NamibiaRegion>,
);

export const OTHER_TOWN_ID = '__other__';

export function getTownsForRegion(regionId: string): NamibiaTown[] {
  return REGION_BY_ID[regionId]?.towns ?? [];
}

export function findTown(regionId: string, townId: string): NamibiaTown | undefined {
  return getTownsForRegion(regionId).find((t) => t.id === townId);
}

export interface VerdoraLocation {
  regionId: string;
  regionName: string;
  townId: string;
  townName: string;
  constituency?: string;
  isCustomTown: boolean;
}

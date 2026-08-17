/**
 * Site-level constants.
 *
 * One place, because a contact address that appears in five templates ends up
 * wrong in one of them.
 */
export const SITE = {
  name: 'Workshop Charts',
  domain: 'workshopcharts.com',
  url: 'https://workshopcharts.com',
  email: 'info@workshopcharts.com',
  /** Year the site went up, for the footer and the terms page. */
  since: 2026,
  tagline: 'Workshop charts you can read on your phone and print for the wall.',
} as const;

/**
 * @module components/SEOMeta
 * @description Reusable SEO meta tag component using react-helmet-async.
 * Injects per-page title, description, Open Graph tags, and canonical URL
 * into the document <head>.
 *
 * Usage:
 *   <SEOMeta
 *     title="Home"
 *     description="Discover Aruba's finest adventures with AURELION."
 *     path="/"
 *   />
 */

import { Helmet } from "react-helmet-async";

const SITE_NAME = "AURELION";
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://aurelion.vercel.app";
const OG_IMAGE = `${SITE_URL}/opengraph.jpg`;

interface SEOMetaProps {
  /** Page-specific title. Rendered as "Page Title | AURELION". */
  title: string;
  /** Page-specific meta description (keep under 160 chars). */
  description: string;
  /** Canonical path, e.g. "/" or "/activities". */
  path: string;
  /** Override the default OG image. */
  ogImage?: string;
}

export function SEOMeta({ title, description, path, ogImage }: SEOMetaProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${path}`;
  const imageUrl = ogImage || OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}

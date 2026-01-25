/**
 * Mock data for UI testing (REFERENCE ONLY - NOT USED IN PRODUCTION)
 * 
 * This file contains sample data for reference and testing purposes.
 * The application now uses Supabase RPC functions for all data queries.
 * 
 * To use this data for testing, you would need to manually import and use it.
 * The useResources hook no longer includes mock data fallbacks.
 */

import type { Resource } from '@/types/resource';

/**
 * Generate a mock vector embedding (all zeros for now)
 */
function mockVector(dimension = 1536): number[] {
  return new Array(dimension).fill(0);
}

/**
 * Mock resources for Los Angeles area
 * Includes various categories: clinical, community, farm, healer, event
 */
export const mockResources: Resource[] = [
  {
    id: '1',
    name: 'UCLA Medical Center',
    category: 'clinical',
    description:
      'Leading academic medical center providing comprehensive healthcare services including pulmonology, cardiology, and emergency care. Open 24/7.',
    location: 'POINT(-118.4446 34.0689)',
    semantic_vector: mockVector(),
  },
  {
    id: '2',
    name: 'Cedars-Sinai Medical Center',
    category: 'clinical',
    description:
      'World-renowned hospital offering specialized care in respiratory medicine, cancer treatment, and cardiac services.',
    location: 'POINT(-118.3953 34.0754)',
    semantic_vector: mockVector(),
  },
  {
    id: '3',
    name: 'Downtown LA Community Garden',
    category: 'community',
    description:
      'Urban community garden promoting food security and environmental wellness. Offers workshops on sustainable gardening and nutrition.',
    location: 'POINT(-118.2437 34.0522)',
    semantic_vector: mockVector(),
    trust_score: 85,
  },
  {
    id: '4',
    name: 'Echo Park Farmers Market',
    category: 'farm',
    description:
      'Weekly farmers market featuring local organic produce, fresh herbs, and community wellness resources. Every Saturday 9am-2pm.',
    location: 'POINT(-118.2608 34.0781)',
    semantic_vector: mockVector(),
    trust_score: 92,
    event_start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    event_end: new Date(Date.now() + 86400000 + 18000000).toISOString(), // Tomorrow + 5 hours
  },
  {
    id: '5',
    name: 'Venice Beach Acupuncture & Wellness',
    category: 'healer',
    description:
      'Licensed acupuncturist specializing in respiratory health, stress management, and holistic wellness practices.',
    location: 'POINT(-118.4695 34.0522)',
    semantic_vector: mockVector(),
    trust_score: 78,
  },
  {
    id: '6',
    name: 'Breathwork & Recovery Workshop',
    category: 'event',
    description:
      'Community-led workshop on respiratory recovery techniques and breathwork for stress relief. All levels welcome.',
    location: 'POINT(-118.3000 34.0500)',
    semantic_vector: mockVector(),
    event_start: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    event_end: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
    is_happening_now: false,
  },
  {
    id: '7',
    name: 'Kaiser Permanente Los Angeles Medical Center',
    category: 'clinical',
    description:
      'Integrated healthcare system providing primary care, specialty services, and preventive medicine to the LA community.',
    location: 'POINT(-118.2987 34.0522)',
    semantic_vector: mockVector(),
  },
  {
    id: '8',
    name: 'Silver Lake Community Health Center',
    category: 'community',
    description:
      'Non-profit community health center offering affordable healthcare, mental health services, and wellness programs.',
    location: 'POINT(-118.2708 34.0928)',
    semantic_vector: mockVector(),
    trust_score: 88,
  },
  {
    id: '9',
    name: 'LA Urban Farm Collective',
    category: 'farm',
    description:
      'Network of urban farms promoting sustainable agriculture and food justice. Offers educational programs and fresh produce.',
    location: 'POINT(-118.2350 34.0650)',
    semantic_vector: mockVector(),
    trust_score: 90,
  },
  {
    id: '10',
    name: 'Holistic Healing Arts Center',
    category: 'healer',
    description:
      'Alternative medicine center offering herbal therapy, energy healing, and traditional wellness practices.',
    location: 'POINT(-118.3500 34.0700)',
    semantic_vector: mockVector(),
    trust_score: 75,
  },
  {
    id: '11',
    name: 'Air Quality & Respiratory Health Forum',
    category: 'event',
    description:
      'Community forum discussing air quality issues, respiratory health, and environmental wellness. Free and open to all.',
    location: 'POINT(-118.2800 34.0600)',
    semantic_vector: mockVector(),
    event_start: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    event_end: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    is_happening_now: true,
  },
  {
    id: '12',
    name: 'USC Keck Hospital',
    category: 'clinical',
    description:
      'Academic medical center providing advanced medical care, research, and specialized treatment programs.',
    location: 'POINT(-118.2062 34.0606)',
    semantic_vector: mockVector(),
  },
];

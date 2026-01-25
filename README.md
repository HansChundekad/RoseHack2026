🌱 TapRoot: A GIS Health and Wellness Information Tool
TapRoot is a high-performance GIS hub designed to integrate five vital pillars of healing—Ecological, Cultural, Food/Farming, Ecorestoration, and Spirituality—directly into the modern clinical framework. We bridge the gap between "hard" clinical data and "soft" community wisdom to prove that healing the land is a prerequisite for healing the human body.
🚀 Quick Start (Judge's Guide)
To get this project running locally for evaluation, follow these steps:
1. Prerequisites
 * Node.js (v18.x or higher)
 * npm or yarn
 * Supabase Account (with PostGIS enabled)
 * API Keys (See Required Keys below)
2. Installation
# Clone the repository
git clone https://github.com/yourusername/taproot.git
cd taproot

# Install dependencies
npm install

3. Environment Setup
Create a .env.local file in the root directory and populate it with your keys:
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
JINA_API_KEY=your_jina_key

4. Run the Project
npm run dev

Navigate to http://localhost:3000 to view the application.
🛠️ The Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend/Backend | Next.js | Full-stack framework & API routes. |
| Mapping Engine | MapBox API | Interactive, high-res GIS layers. |
| Database | Supabase | PostgreSQL + PostGIS for spatial queries. |
| Data Scraping | Scrapy & JinaAI | Discovering and deep-scraping community sites. |
| Intelligence | OpenAI | Entity extraction from unstructured text. |
✨ Features: More Than a Map
 * Heuristic Wellness Hub: Aggregates "Soft Data" like community healers and organic farms alongside standard clinics.
 * Semantic Intelligence: Searches based on intent. "Respiratory recovery" suggests local urban forests, not just doctors.
 * Temporal Synchronization: Real-time municipal calendar syncing to show "happening now" community rituals or workshops.
 * Verified Trust Layer: Automatic verification of organic certifications via the CCOF member directory.
🧗 Challenges & Solutions
 * The "ETL" Hurdle: Scraping data from unpredictable municipal PDFs and social media.
   * Solution: We implemented a chain of LLM agents to standardize messy data into consistent JSON schemas.
 * Spatial Integrity: Handling complex coordinate systems across various sources.
   * Solution: Leveraged PostGIS within Supabase to ensure high-performance spatial indexing.
🧠 Lessons Learned
 * AI Agent Workflows: Chaining LLMs allows for data cleaning that preserves the "human" context of community wisdom.
 * Spatial Data Structures: Deepened our understanding of GeoJSON and the nuances of Coordinate Reference Systems (CRS) in web apps.
🔑 Required Keys
To fully utilize TapRoot's features, you will need:
 * MapBox Token: For rendering the interactive map.
 * OpenAI API Key: For the semantic search and data parsing agents.
 * JinaAI API Key: For the deep-scraping pipeline.
 * Supabase Credentials: To access the hosted PostgreSQL/PostGIS database.
🚀 Future Roadmap
 * Mobile Optimization: Progressive Web App (PWA) support for on-the-go exploration.
 * Community Trust Scores: A decentralized review system for alternative healers.
 * Civic Triggers: Automated alerts for local government meetings regarding wellness policy.
Join the Movement. TapRoot turns unstructured community wisdom into actionable data, moving us from a system that manages sickness to one that cultivates health.



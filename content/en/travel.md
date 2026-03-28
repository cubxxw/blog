---
title: '🌍 Travel Footprints | 旅行足迹'
ShowRssButtonInSectionTermList: false
ShowBreadCrumbs: false
ShowPostNavLinks: false
date: 2025-01-09T00:00:00+08:00
weight: 1
draft: false
showtoc: false
tocopen: false
type: page
author: ["Xinwei Xiong"]
keywords: ["Travel", "Adventure", "Digital Nomad", "Hiking", "World Travel", "Polarsteps"]
tags:
  - Travel
  - Adventure
  - Exploration
categories:
  - Travel
description: "Follow my travel adventures and footprints around the world. Explore my journeys, stories, and experiences from digital nomad life."
---

<div class="travel-hero">
  <div class="travel-hero-content">
    <h1>🌍 Travel Footprints</h1>
    <p class="travel-subtitle">Exploring the world, one step at a time | 探索世界，一步一个脚印</p>
    <div class="travel-cta-buttons">
      <a href="https://www.polarsteps.com/cubxxw" target="_blank" rel="noopener" class="btn-polarsteps">
        <span class="btn-icon">🧭</span> View My Polarsteps
      </a>
      <a href="#travel-articles" class="btn-articles">
        <span class="btn-icon">📝</span> Read Travel Stories
      </a>
    </div>
  </div>
</div>

<!-- Polarsteps Embed -->
<div class="polarsteps-embed">
  <h2>🗺️ My Travel Map</h2>
  <p class="embed-description">Explore my real-time travel routes and adventures on Polarsteps</p>
  <div class="polarsteps-widget">
    <iframe
      src="https://www.polarsteps.com/cubxxw/widget"
      frameborder="0"
      scrolling="no"
      width="100%"
      height="500"
      allowfullscreen>
    </iframe>
    <p class="widget-fallback">
      🌍 The interactive map is loading above. If it doesn't display properly,
      <a href="https://www.polarsteps.com/cubxxw" target="_blank" rel="noopener">view my full Polarsteps profile here</a>.
    </p>
  </div>
</div>

<!-- Travel Articles Section -->
<div id="travel-articles" class="travel-articles-section">
  <h2>📖 Travel Articles & Stories</h2>
  <p class="section-description">Deep dives, reflections, and guides from my journeys</p>

  <div class="articles-grid">
    {{ range where .Site.RegularPages "Params.tags" "intersect" ["travel", "Travel", "Adventure", "旅行"] }}
      {{ if not .Params.Draft }}
        <article class="travel-article-card">
          <a href="{{ .Permalink }}">
            <div class="article-content">
              <h3>{{ .Title }}</h3>
              <p class="article-date">{{ .Date.Format "January 2, 2006" }}</p>
              <p class="article-excerpt">{{ .Summary | truncate 120 }}</p>
              <span class="read-more">Read More →</span>
            </div>
          </a>
        </article>
      {{ end }}
    {{ end }}
  </div>
</div>

<!-- Travel Stats -->
<div class="travel-stats">
  <div class="stat-card">
    <span class="stat-number">15+</span>
    <span class="stat-label">Countries Visited</span>
  </div>
  <div class="stat-card">
    <span class="stat-number">50+</span>
    <span class="stat-label">Cities Explored</span>
  </div>
  <div class="stat-card">
    <span class="stat-number">100+</span>
    <span class="stat-label">Days on the Road</span>
  </div>
  <div class="stat-card">
    <span class="stat-number">∞</span>
    <span class="stat-label">Memories Created</span>
  </div>
</div>

<!-- Connect Section -->
<div class="travel-connect">
  <h2>🤝 Let's Connect</h2>
  <p>Want to share travel tips, collaborate, or just chat about adventures? Reach out!</p>
  <div class="connect-links">
    <a href="https://twitter.com/cubxxw" target="_blank" rel="noopener">Twitter/X</a>
    <a href="https://github.com/cubxxw" target="_blank" rel="noopener">GitHub</a>
    <a href="mailto:contact@cubxxw.com">Email</a>
  </div>
</div>

<style>
/* Hero Section */
.travel-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 20px;
  border-radius: 24px;
  margin: 40px 0;
  text-align: center;
  color: white;
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
}

.travel-hero-content h1 {
  font-size: 3rem;
  margin-bottom: 16px;
  color: white !important;
}

.travel-subtitle {
  font-size: 1.2rem;
  opacity: 0.95;
  margin-bottom: 32px;
}

.travel-cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-polarsteps, .btn-articles {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-polarsteps {
  background: white;
  color: #667eea;
}

.btn-polarsteps:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255,255,255,0.3);
}

.btn-articles {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 2px solid rgba(255,255,255,0.3);
}

.btn-articles:hover {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 1.2em;
}

/* Polarsteps Embed */
.polarsteps-embed {
  margin: 60px 0;
  padding: 40px;
  background: #f8fafc;
  border-radius: 20px;
}

.dark .polarsteps-embed {
  background: rgba(31, 41, 55, 0.5);
}

.polarsteps-embed h2 {
  text-align: center;
  margin-bottom: 8px;
}

.embed-description {
  text-align: center;
  color: #64748b;
  margin-bottom: 24px;
}

.polarsteps-widget {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.polarsteps-widget iframe {
  display: block;
}

.widget-fallback {
  padding: 20px;
  text-align: center;
  background: white;
  font-size: 14px;
  color: #64748b;
}

.dark .widget-fallback {
  background: #1e293b;
}

/* Travel Articles */
.travel-articles-section {
  margin: 60px 0;
}

.travel-articles-section h2 {
  text-align: center;
  margin-bottom: 8px;
}

.section-description {
  text-align: center;
  color: #64748b;
  margin-bottom: 32px;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.travel-article-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
}

.dark .travel-article-card {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(148, 163, 184, 0.2);
}

.travel-article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  border-color: #667eea;
}

.travel-article-card a {
  text-decoration: none;
  color: inherit;
}

.travel-article-card h3 {
  margin-bottom: 8px;
  color: #1e293b;
}

.dark .travel-article-card h3 {
  color: #f1f5f9;
}

.article-date {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 12px;
}

.article-excerpt {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 16px;
}

.read-more {
  color: #667eea;
  font-weight: 600;
  font-size: 14px;
}

/* Travel Stats */
.travel-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 24px;
  margin: 60px 0;
  padding: 40px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-number {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  color: #64748b;
}

/* Connect Section */
.travel-connect {
  text-align: center;
  padding: 60px 40px;
  background: #f8fafc;
  border-radius: 20px;
  margin: 60px 0;
}

.dark .travel-connect {
  background: rgba(31, 41, 55, 0.5);
}

.travel-connect h2 {
  margin-bottom: 16px;
}

.travel-connect p {
  color: #64748b;
  margin-bottom: 24px;
}

.connect-links {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.connect-links a {
  padding: 10px 20px;
  border: 2px solid #667eea;
  border-radius: 50px;
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.connect-links a:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .travel-hero {
    padding: 40px 20px;
  }

  .travel-hero-content h1 {
    font-size: 2rem;
  }

  .travel-subtitle {
    font-size: 1rem;
  }

  .travel-cta-buttons {
    flex-direction: column;
    align-items: center;
  }

  .btn-polarsteps, .btn-articles {
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }

  .polarsteps-embed, .travel-stats, .travel-connect {
    padding: 30px 20px;
  }

  .articles-grid {
    grid-template-columns: 1fr;
  }

  .stat-number {
    font-size: 2rem;
  }
}
</style>

---
title: '🌍 Travel Footprints | 旅行足迹'
ShowRssButtonInSectionTermList: true
ShowBreadCrumbs: false
ShowPostNavLinks: false
cover.image:
date: 2024-01-01T00:00:00+08:00
weight: 1
draft: false
showtoc: true
tocopen: true
type: page
author: ["Xinwei Xiong", "Me"]
keywords: ["Travel", "Adventure", "Digital Nomad", "Hiking", "World Travel", "Backpacking"]
tags:
  - travel
  - adventure
  - exploration
  - hiking
categories:
  - Travel
description: >
    A chronicle of my travel adventures, from hiking Korea's Olle Trails to challenging Nepal's ACT circuit, from exploring Southeast Asian cultures to deep experiences across China. Every journey marks growth, every footprint tells a story.
---

<style>
.travel-intro {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 30px;
  border-radius: 20px;
  margin: 30px 0;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.travel-intro::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
  animation: float 20s infinite linear;
}

@keyframes float {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

.travel-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin: 40px 0;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #f0f0f0;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0,0,0,0.15);
}

.stat-icon {
  font-size: 2.5em;
  margin-bottom: 10px;
  display: block;
}

.stat-number {
  font-size: 2em;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 5px;
  display: block;
}

.stat-label {
  color: #666;
  font-size: 0.9em;
  font-weight: 500;
}

.journey-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
  margin: 40px 0;
}

.journey-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #f0f0f0;
}

.journey-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

.journey-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  position: relative;
}

.journey-header h3 {
  margin: 0;
  font-size: 1.3em;
  font-weight: 600;
}

.journey-header .journey-meta {
  margin-top: 8px;
  opacity: 0.9;
  font-size: 0.9em;
}

.journey-content {
  padding: 0;
}

.polarsteps-embed {
  width: 100%;
  height: 400px;
  border: none;
  display: block;
}

.journey-description {
  padding: 20px;
  color: #555;
  line-height: 1.6;
  border-top: 1px solid #f0f0f0;
}

.highlight-card {
  border: 3px solid #ffd700;
  position: relative;
}

.highlight-card::before {
  content: '⭐ Featured Route';
  position: absolute;
  top: -12px;
  left: 20px;
  background: #ffd700;
  color: #333;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 600;
  z-index: 10;
}

.section-title {
  text-align: center;
  font-size: 2em;
  margin: 50px 0 30px 0;
  color: #333;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.travel-tips {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 15px;
  margin: 40px 0;
  border-left: 5px solid #667eea;
}

.travel-tips h3 {
  color: #667eea;
  margin-top: 0;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.tip-item {
  background: white;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #e9ecef;
}

.tip-item h4 {
  color: #667eea;
  margin-top: 0;
  margin-bottom: 10px;
}

@media (max-width: 768px) {
  .journey-grid {
    grid-template-columns: 1fr;
  }
  
  .travel-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .polarsteps-embed {
    height: 300px;
  }
  
  .tips-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<div class="travel-intro">
  <h1>🌍 Digital Nomad Footprints</h1>
  <p>This journey began with farewells to the past, traversed deep explorations of homeland, extended into Southeast Asian cultural immersion, and culminated in spiritual transformation amidst the magnificent Himalayan landscapes.</p>
  <p><strong>Every step is present, every scene is flow</strong></p>
</div>

<div class="travel-stats">
  <div class="stat-card">
    <span class="stat-icon">🌏</span>
    <span class="stat-number">6</span>
    <span class="stat-label">Countries</span>
  </div>
  <div class="stat-card">
    <span class="stat-icon">🏙️</span>
    <span class="stat-number">25+</span>
    <span class="stat-label">Cities</span>
  </div>
  <div class="stat-card">
    <span class="stat-icon">🥾</span>
    <span class="stat-number">300+</span>
    <span class="stat-label">km Hiking</span>
  </div>
  <div class="stat-card">
    <span class="stat-icon">⏰</span>
    <span class="stat-number">12</span>
    <span class="stat-label">Months</span>
  </div>
  <div class="stat-card">
    <span class="stat-icon">📸</span>
    <span class="stat-number">1000+</span>
    <span class="stat-label">Photos</span>
  </div>
</div>

## 🎯 Featured Hiking Routes

<div class="journey-grid">
  <div class="journey-card highlight-card">
    <div class="journey-header">
      <h3>🇰🇷 Korea Jeju Olle Trails</h3>
      <div class="journey-meta">
        <span>📍 Jeju Island</span>
        <span>🥾 100km</span>
        <span>⭐ Highly Recommended</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18698850-korea-jeju-island/embed" title="Korea Jeju Olle Trails"></iframe>
      <div class="journey-description">
        <strong>Every step is present, every scene is flow.</strong> Jeju Island's Olle Trails are among Korea's most famous hiking routes, following the coastline and experiencing the perfect harmony of sea breeze and nature. This 100km journey is not only a physical challenge but also a spiritual cleansing.
      </div>
    </div>
  </div>

  <div class="journey-card highlight-card">
    <div class="journey-header">
      <h3>🇳🇵 Nepal ACT Highland Trek</h3>
      <div class="journey-meta">
        <span>📍 Annapurna Circuit</span>
        <span>🥾 100km</span>
        <span>🏔️ High Altitude Challenge</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18711272-nepel-act/embed" title="Nepal ACT Trek"></iframe>
      <div class="journey-description">
        <strong>Tilicho Lake, where tears become badges of growth.</strong> The Annapurna Circuit is a world-class trekking route, from tropical jungles to highland deserts, experiencing complete geographical zone changes while finding inner strength amidst snow-capped mountains.
      </div>
    </div>
  </div>
</div>

<h2 class="section-title">🌏 Asian Cultural Journey</h2>

<div class="journey-grid">
  <div class="journey-card">
    <div class="journey-header">
      <h3>🇹🇭 Thailand Living Experience</h3>
      <div class="journey-meta">
        <span>📍 Chiang Mai • Bangkok</span>
        <span>🏠 Deep Living</span>
        <span>🍜 Food Culture</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18712139-tai-guo-lu-ju-pian/embed" title="Thailand Living"></iframe>
      <div class="journey-description">
        Experience the leisurely pace of Southeast Asia through Thailand's slow living, from Chiang Mai's temple culture to Bangkok's modern prosperity, feeling the perfect fusion of tradition and modernity. Taste authentic cuisine and experience local lifestyle.
      </div>
    </div>
  </div>

  <div class="journey-card">
    <div class="journey-header">
      <h3>🇳🇵 Pokhara Living Experience</h3>
      <div class="journey-meta">
        <span>📍 Phewa Lake</span>
        <span>🏔️ Snow Mountain Views</span>
        <span>🧘 Soul Purification</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18702178-pokhara-bo-qia-la-lu-ju/embed" title="Pokhara Living"></iframe>
      <div class="journey-description">
        Remote working in the tranquility by Phewa Lake, awakened every morning by the golden sunrise over Annapurna snow peaks. This is a paradise for trekkers and an ideal destination for digital nomads.
      </div>
    </div>
  </div>

  <div class="journey-card">
    <div class="journey-header">
      <h3>🇲🇾🇸🇬 Malaysia-Singapore</h3>
      <div class="journey-meta">
        <span>📍 Kuala Lumpur • Singapore</span>
        <span>🌆 Urban Exploration</span>
        <span>🍽️ Multicultural</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18711877-malaysia-singapore-maca/embed" title="Malaysia Singapore"></iframe>
      <div class="journey-description">
        Exploring the multicultural Malay Peninsula, from Kuala Lumpur's modern metropolis to Singapore's garden city, experiencing the unique charm of Chinese communities under different cultural backgrounds.
      </div>
    </div>
  </div>
</div>

<h2 class="section-title">🇨🇳 Deep China Exploration</h2>

<div class="journey-grid">
  <div class="journey-card">
    <div class="journey-header">
      <h3>🇭🇰 Hong Kong Camping & Hiking</h3>
      <div class="journey-meta">
        <span>📍 MacLehose Trail • Tap Mun</span>
        <span>⛺ Island Camping</span>
        <span>🌊 Coastal Hiking</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18711775-ta-men-dao-mai-er-pu-tai-qun-dao/embed" title="Hong Kong Camping Hiking"></iframe>
      <div class="journey-description">
        Beyond Victoria Harbor's prosperity, discover Hong Kong's other side. Camping and hiking on MacLehose Trail and Tap Mun Island help us rediscover the natural beauty of this international metropolis.
      </div>
    </div>
  </div>

  <div class="journey-card">
    <div class="journey-header">
      <h3>🇨🇳 Yunnan Living Experience</h3>
      <div class="journey-meta">
        <span>📍 Kunming • Dali • Lijiang</span>
        <span>🏔️ Cangshan & Erhai</span>
        <span>🎭 Ancient City Culture</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18712079-yun-nan-lu-ju-pian-kun-ming-da-li-li-jiang/embed" title="Yunnan Living"></iframe>
      <div class="journey-description">
        Slow times in Yunnan, from Kunming's eternal spring to Dali's romantic atmosphere, to Lijiang's ancient charm. Experience unique ethnic cultures between Cangshan Mountain and Erhai Lake.
      </div>
    </div>
  </div>

  <div class="journey-card">
    <div class="journey-header">
      <h3>🇨🇳 Beijing Living Experience</h3>
      <div class="journey-meta">
        <span>📍 Imperial Capital</span>
        <span>🏛️ Historical Sites</span>
        <span>🎨 Art Atmosphere</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18712045-bei-jing-lu-ju-pian/embed" title="Beijing Living"></iframe>
      <div class="journey-description">
        Deep living experience in the capital, from the Forbidden City's imperial grandeur to hutongs' local life, from modern CBD to ancient city walls, feeling the historical heritage and modern vitality of the thousand-year-old capital.
      </div>
    </div>
  </div>

  <div class="journey-card">
    <div class="journey-header">
      <h3>🇨🇳 Shanghai-Jiaxing-Hangzhou</h3>
      <div class="journey-meta">
        <span>📍 Jiangnan Water Towns</span>
        <span>🏮 Ancient Town Charm</span>
        <span>💼 Business Culture</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18712021-shang-hai-jia-xing-hang-zhou-lu-ju-san-ge-yue/embed" title="Jiangnan Three Cities"></iframe>
      <div class="journey-description">
        Three months of deep Jiangnan experience, from Shanghai's international metropolis to Jiaxing's red culture, to Hangzhou's West Lake scenery. Experience the economic vitality and cultural heritage of the Yangtze River Delta region.
      </div>
    </div>
  </div>

  <div class="journey-card">
    <div class="journey-header">
      <h3>🇨🇳 Chengdu-Chongqing-Western Sichuan</h3>
      <div class="journey-meta">
        <span>📍 Ba-Shu Culture</span>
        <span>🌶️ Spicy Cuisine</span>
        <span>🏔️ Western Sichuan Mountains</span>
      </div>
    </div>
    <div class="journey-content">
      <iframe class="polarsteps-embed" src="https://www.polarsteps.com/cubxxw/18711829-chengdu-cheng-du-zhong-qing-chuan-xi-xue-shan-zi-jia-xiang-gang-kua-nian/embed" title="Sichuan Journey"></iframe>
      <div class="journey-description">
        Cultural exploration of Ba-Shu land, from Chengdu's leisurely life to Chongqing's mountain city charm, to Western Sichuan's magnificent snow mountains. Experience the unique customs of Southwest China during a New Year journey.
      </div>
    </div>
  </div>
</div>

<div class="travel-tips">
  <h3>🎒 Travel Insights & Tips</h3>
  <div class="tips-grid">
    <div class="tip-item">
      <h4>📱 Digital Nomad Tools</h4>
      <p>Essential remote work gear: stable internet connection, portable devices, cloud sync tools. PolarSteps is an excellent choice for recording journeys!</p>
    </div>
    <div class="tip-item">
      <h4>🥾 Hiking Gear Recommendations</h4>
      <p>Lightweight principle: quality hiking boots, quick-dry clothing, lightweight backpack. Special attention to cold and sun protection at high altitudes.</p>
    </div>
    <div class="tip-item">
      <h4>🌍 Cultural Adaptation Tips</h4>
      <p>Maintain an open mind, learn basic local language, respect local customs. Every place has unique charm waiting to be discovered.</p>
    </div>
    <div class="tip-item">
      <h4>💰 Budget Management Experience</h4>
      <p>Reasonably plan accommodation, transportation, and food budgets. Choose places frequented by locals for more authentic experiences.</p>
    </div>
  </div>
</div>

## 🔗 Related Links

- **PolarSteps Homepage**: [https://www.polarsteps.com/cubxxw](https://www.polarsteps.com/cubxxw)
- **Xiaohongshu Travel Notes**: [My Xiaohongshu Profile](https://www.xiaohongshu.com/user/profile/62a33af9000000001b025dd3)
- **Instagram**: More travel photo shares
- **YouTube**: Travel video records

---

> Travel is not about escaping life, but ensuring that life doesn't escape us.
> 
> If you also love traveling, welcome to share your travel stories in the comments below!

{{< calendly-date >}} 
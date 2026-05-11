# Karma Credits - API Integration Guide
*This document outlines the standard procedure for converting the static React Native interface into a dynamic, API-driven backend. Share this with your backend developer.*

---

## The Core Concept (Standard App Architecture)
Currently, data such as "Articles" and "Transactions" is stored as static arrays within the React Native `.tsx` files (Frontend). To make this dynamic:
1. The Backend Developer must create a Database Table.
2. The Backend Developer must expose an API Endpoint (e.g. `GET /api/articles`).
3. The Frontend Developer updates the `.tsx` file to `fetch()` data from that URL.

---

## 📌 Feature: Dynamic Knowledge Hub (Articles)

### 1. Database Schema (Backend)
Create a new collection/table named `articles` with the following structure:
```json
{
  "id": "uuid",
  "title": "String",
  "source": "String (e.g., LinkedIn Picks)",
  "readTime": "String (e.g., 5 min read)",
  "category": "String (e.g., LIFESTYLE, TECH)",
  "content": "Text (Markdown or Rich Text)",
  "imageUrl": "URL String",
  "datePublished": "Date"
}
```

### 2. API Endpoint Required (Backend)
- **Method:** `GET`
- **Path:** `/api/v1/articles`
- **Response:** Must return a JSON Array of the latest articles.

### 3. Frontend Implementation Steps (React Native)
Once the API is live, update `src/screens/KnowledgeHubScreen.tsx`:

```javascript
import React, { useState, useEffect } from 'react';

// 1. Create an empty state bucket for articles
const [articles, setArticles] = useState([]); 

// 2. Fetch from Backend on Screen Load
useEffect(() => {
   fetch('https://your-server-url.com/api/v1/articles')
     .then(response => response.json())
     .then(data => setArticles(data)) // Save the data to memory
     .catch(error => console.log('Error fetching articles:', error));
}, []);

// 3. The UI will automatically loop through this array using .map()
```

---

## 📌 Feature: Wallet / Transaction History

### 1. Database Schema (Backend)
Create a table for `transactions`:
```json
{
  "userId": "uuid",
  "transactionId": "TX-9012",
  "type": "String (e.g., Plastic Pickup Reward)",
  "amount": "Integer (e.g., 50)",
  "isCredit": "Boolean (true for earned, false for spent)",
  "createdAt": "Timestamp"
}
```

### 2. API Endpoint Required (Backend)
- **Method:** `GET`
- **Path:** `/api/v1/wallet/{userId}`
- **Response:** Must return `balance` (Integer) and an array of `transactions`.

---

## 📌 Feature: Schedule A Pickup (Geofencing)

### 1. API Endpoint Required (Backend)
- **Method:** `POST`
- **Path:** `/api/v1/pickups/schedule`
- **Payload from Frontend:**
```json
{
  "userId": "uuid",
  "wasteCategories": ["plastic", "ewaste"],
  "pickupDate": "2024-04-30",
  "shift": "Morning",
  "location": {
      "lat": 28.5355,
      "lng": 77.3910
  },
  "specialInstructions": "Ring bell twice"
}
```
- **Backend Logic required:** 
  1. Validate if `lat/lng` fall inside the serviceable polygon area using a Geospatial Query.
  2. If Yes, save to database and return `{ success: true, estimatedCredits: 70 }`.
  3. If No, return `{ success: false, message: "Out of Serviceable Area" }`.

# mshr.dev Server

High-performance Express.js API for the mshr.dev URL Shortener.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Appwrite credentials.
3. `npm start` (or `node index.js`)

## Appwrite Collection Schema

Ensure your Appwrite collection (specified by `APPWRITE_COLLECTION_ID`) has the following attributes:

| Key | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `url` | URL (or String) | Yes | The destination URL |
| `urlHash` | String | Yes | SHA-256 hash of the URL for deduplication |
| `shortCode` | String | Yes | The generated short string |
| `expiresAt` | Datetime | No | Expiration timestamp |
| `createdBy` | String | No | ID of the Appwrite user who created the link |

### Indexes

For high performance, create the following indexes in Appwrite:
1. `shortCode` (Type: Key, Attributes: `shortCode`)
2. `urlHash` (Type: Key, Attributes: `urlHash`)
3. `expiresAt` (Type: Key, Attributes: `expiresAt`)

## Endpoints

### `POST /api/shorten`
Create a short URL.
**Headers:** `X-Appwrite-JWT: <session_jwt>`
**Body:**
```json
{
  "url": "https://example.com/very/long/path",
  "expiry": "2h",
  "honeypot": ""
}
```
*Valid `expiry` formats: `30m`, `2h`, `24h`, `1w`, `never`*

### `GET /:shortCode`
Redirects to the long URL. Evaluates `expiresAt`. Issues a 301 Permanent Redirect or a 410 Gone if expired.
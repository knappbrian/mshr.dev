require('dotenv').config();
const express = require('express');
const { Client, Databases, Query, ID, Account } = require('node-appwrite');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(helmet()); // Basic security headers to prevent common attacks

// --- Appwrite Configuration ---
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_COLLECTION_ID;
const apiKey = process.env.APPWRITE_API_KEY; // Requires Database API key

// Admin Client (for elevated operations: DB reads, writes, and cleanups)
const adminClient = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
const adminDatabases = new Databases(adminClient);

// --- Helpers ---

// Generate a random short code
function generateShortCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Calculate the expiration timestamp
function calculateExpiry(expiryString) {
    if (!expiryString || expiryString === 'never') return null;
    
    const now = new Date();
    const value = parseInt(expiryString.slice(0, -1));
    const unit = expiryString.slice(-1);

    if (isNaN(value)) return null;

    switch (unit) {
        case 'm':
            now.setMinutes(now.getMinutes() + value);
            break;
        case 'h':
            now.setHours(now.getHours() + value);
            break;
        case 'd':
            now.setDate(now.getDate() + value);
            break;
        case 'w':
            now.setDate(now.getDate() + value * 7);
            break;
        default:
            return null; // Invalid unit defaults to no expiry
    }
    return now.toISOString();
}

// URL validation & sanitization helper
function isValidUrl(string) {
    try {
        const url = new URL(string);
        // Only allow HTTP/HTTPS, preventing javascript:, data: attacks etc.
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

// --- Middlewares ---

// Validate Appwrite JWT to ensure a valid (anonymous) session
async function validateAppwriteJWT(req, res, next) {
    const jwt = req.headers['x-appwrite-jwt'];
    if (!jwt) {
        return res.status(401).json({ error: 'Missing X-Appwrite-JWT header' });
    }

    try {
        const userClient = new Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setJWT(jwt);
            
        const account = new Account(userClient);
        const session = await account.get();
        
        if (!session) {
            return res.status(401).json({ error: 'Invalid session' });
        }
        
        // Attach user info to request
        req.user = session;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired JWT' });
    }
}

// --- Routes ---

// POST /api/shorten
// Requires JWT header. Body: { url, expiry, honeypot }
app.post('/api/shorten', validateAppwriteJWT, async (req, res) => {
    const { url, expiry, honeypot } = req.body;

    // Bot Protection: Honeypot check
    // If the hidden 'honeypot' field is populated, silently reject the bot
    if (honeypot) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    if (!url || !isValidUrl(url)) {
        return res.status(400).json({ error: 'Invalid or unsafe URL provided' });
    }

    const expiresAt = calculateExpiry(expiry);
    
    // Hash URL for deduplication
    const urlHash = crypto.createHash('sha256').update(url).digest('hex');

    try {
        // Deduplication Check
        // Search for existing URL using the hash
        const existingDocs = await adminDatabases.listDocuments(
            databaseId,
            collectionId,
            [
                Query.equal('urlHash', urlHash)
            ]
        );

        if (existingDocs.documents.length > 0) {
            // Check if there is a match with the same active status/expiry characteristics
            const match = existingDocs.documents.find(doc => {
                // If the user wants no expiry, and we have an existing non-expiring link, use it
                if (expiresAt === null && doc.expiresAt === null) return true;
                
                // For other expiries, if we find a valid (non-expired) link for the same URL, we can reuse it
                // Note: If exact exact matching of '2h' is required vs '3h', this logic can be tightened.
                // Here we return an active existing link to prevent DB bloat.
                return doc.expiresAt && new Date(doc.expiresAt) > new Date();
            });

            if (match) {
                return res.json({
                    shortCode: match.shortCode,
                    shortUrl: `https://mshr.dev/${match.shortCode}`,
                    expiresAt: match.expiresAt,
                    isNew: false
                });
            }
        }

        // Create new short URL if no viable deduplicated link was found
        const shortCode = generateShortCode();
        
        const newDoc = await adminDatabases.createDocument(
            databaseId,
            collectionId,
            ID.unique(),
            {
                url: url, // Storing sanitized URL
                urlHash: urlHash,
                shortCode: shortCode,
                expiresAt: expiresAt,
                createdBy: req.user.$id
            }
        );

        res.status(201).json({
            shortCode: newDoc.shortCode,
            shortUrl: `https://mshr.dev/${newDoc.shortCode}`,
            expiresAt: newDoc.expiresAt,
            isNew: true
        });

    } catch (error) {
        console.error('Error creating short URL:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /:shortCode
// Redirects to original URL if valid and not expired
app.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;

    // Prevent favicon.ico and typical static file requests from running DB queries
    if (shortCode === 'favicon.ico') {
        return res.status(404).end();
    }

    try {
        const docs = await adminDatabases.listDocuments(
            databaseId,
            collectionId,
            [
                Query.equal('shortCode', shortCode),
                Query.limit(1)
            ]
        );

        if (docs.documents.length === 0) {
            return res.status(404).send('<!DOCTYPE html><html><body><h1>404 Not Found</h1><p>The requested shortlink was not found.</p></body></html>');
        }

        const doc = docs.documents[0];

        // Expiry check
        if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
            return res.status(410).send('<!DOCTYPE html><html><body><h1>410 Link Expired</h1><p>This short link has expired and is no longer available.</p></body></html>');
        }

        // 301 Permanent Redirect for SEO and caching efficiency
        res.redirect(301, doc.url);

    } catch (error) {
        console.error('Error redirecting:', error);
        res.status(500).send('Internal server error');
    }
});

// --- Cleanup Task ---
// Runs every hour to permanently delete expired links from Appwrite
setInterval(async () => {
    console.log('[Cleanup Task] Running...');
    try {
        const now = new Date().toISOString();
        let hasMore = true;
        let offset = 0;
        let deletedCount = 0;
        
        while (hasMore) {
            const expiredDocs = await adminDatabases.listDocuments(
                databaseId,
                collectionId,
                [
                    Query.lessThan('expiresAt', now),
                    Query.limit(100),
                    Query.offset(offset)
                ]
            );

            for (const doc of expiredDocs.documents) {
                await adminDatabases.deleteDocument(databaseId, collectionId, doc.$id);
                deletedCount++;
            }

            if (expiredDocs.documents.length < 100) {
                hasMore = false;
            } else {
                offset += 100;
            }
        }
        console.log(`[Cleanup Task] Completed. Deleted ${deletedCount} expired documents.`);
    } catch (error) {
        console.error('[Cleanup Task] Error:', error);
    }
}, 60 * 60 * 1000); // 1 hour in milliseconds

// Start Server
app.listen(port, () => {
    console.log(`mshr.dev high-performance server listening on port ${port}`);
});

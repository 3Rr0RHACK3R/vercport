// api/proxy.js
// This is your Vercel Serverless Function that acts as a proxy.
// It fetches content from a given URL and returns it, bypassing CORS restrictions.

export default async function handler(request, response) {
    // Set CORS headers to allow your GitHub Pages site to access this proxy.
    // This is SUPER important for cross-origin communication!
    response.setHeader('Access-Control-Allow-Origin', '*'); // Allows all origins (for maximum flexibility)
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); // Allow GET and OPTIONS requests
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allow Content-Type header

    // Handle preflight OPTIONS requests. Browsers send these before actual GET requests
    // to check if the cross-origin request is allowed.
    if (request.method === 'OPTIONS') {
        response.status(200).end(); // Respond with a 200 OK for preflight
        return;
    }

    // Get the target URL from the query parameters (e.g., /api/proxy?url=https://example.com)
    const targetUrl = request.query.url;

    // Basic validation: Check if a URL was actually provided
    if (!targetUrl) {
        // If no URL, send a 400 Bad Request error with a helpful message
        return response.status(400).send('Error: Missing "url" query parameter. Please provide a URL to fetch. Example: /api/proxy?url=https://example.com');
    }

    // Basic URL format validation (not exhaustive, but catches common mistakes)
    try {
        new URL(targetUrl); // Attempt to create a URL object to validate the format
    } catch (error) {
        return response.status(400).send('Error: The provided URL is malformed. Please ensure it is a valid web address.');
    }

    console.log(`Proxying request for: ${targetUrl}`); // Log the target URL for debugging on Vercel

    try {
        // Fetch the content from the target URL using Node.js's built-in fetch
        const fetchResponse = await fetch(targetUrl);

        // If the target server returned an error (e.g., 404, 500), pass that status through
        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error(`Error fetching from target ${targetUrl}: ${fetchResponse.status} ${fetchResponse.statusText} - ${errorText}`);
            return response.status(fetchResponse.status).send(`Failed to fetch content from target URL: ${fetchResponse.statusText}. Details: ${errorText}`);
        }

        // Get the raw text content from the target URL's response
        const content = await fetchResponse.text();

        // Send the fetched content back to the client (your GitHub Pages site)
        response.status(200).send(content);

    } catch (error) {
        // Catch any network errors or other issues during the fetch operation
        console.error(`Proxy failed to fetch ${targetUrl}:`, error);
        response.status(500).send(`Internal server error: Could not fetch content. Details: ${error.message}`);
    }
}

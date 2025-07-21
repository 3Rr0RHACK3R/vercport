// netlify/functions/proxy.js
// This is your Netlify Serverless Function that acts as a proxy.
// It fetches content from a given URL and returns it, bypassing CORS restrictions.

// Netlify Functions use a standard AWS Lambda-like handler signature:
// exports.handler = async (event, context) => { ... }

exports.handler = async function(event, context) {
    // Set CORS headers to allow your frontend (also hosted on Netlify) to access this proxy.
    const headers = {
        'Access-Control-Allow-Origin': '*', // Allows all origins (for maximum flexibility)
        'Access-Control-Allow-Methods': 'GET, OPTIONS', // Allow GET and OPTIONS requests
        'Access-Control-Allow-Headers': 'Content-Type', // Allow Content-Type header
    };

    // Handle preflight OPTIONS requests. Browsers send these before actual GET requests
    // to check if the cross-origin request is allowed.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: '', // Empty body for OPTIONS requests
        };
    }

    // Get the target URL from the query parameters (event.queryStringParameters)
    const targetUrl = event.queryStringParameters.url;

    // Basic validation: Check if a URL was actually provided
    if (!targetUrl) {
        return {
            statusCode: 400,
            headers: headers,
            body: 'Error: Missing "url" query parameter. Please provide a URL to fetch. Example: /.netlify/functions/proxy?url=https://example.com',
        };
    }

    // Basic URL format validation (not exhaustive, but catches common mistakes)
    try {
        new URL(targetUrl); // Attempt to create a URL object to validate the format
    } catch (error) {
        return {
            statusCode: 400,
            headers: headers,
            body: 'Error: The provided URL is malformed. Please ensure it is a valid web address.',
        };
    }

    console.log(`Proxying request for: ${targetUrl}`); // Log the target URL for debugging in Netlify logs

    try {
        // Fetch the content from the target URL using Node.js's built-in fetch
        const fetchResponse = await fetch(targetUrl);

        // If the target server returned an error (e.g., 404, 500), pass that status through
        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error(`Error fetching from target ${targetUrl}: ${fetchResponse.status} ${fetchResponse.statusText} - ${errorText}`);
            return {
                statusCode: fetchResponse.status,
                headers: headers,
                body: `Failed to fetch content from target URL: ${fetchResponse.statusText}. Details: ${errorText}`,
            };
        }

        // Get the raw text content from the target URL's response
        const content = await fetchResponse.text();

        // Send the fetched content back to the client (your Netlify-hosted frontend)
        return {
            statusCode: 200,
            headers: headers,
            body: content,
        };

    } catch (error) {
        // Catch any network errors or other issues during the fetch operation
        console.error(`Proxy failed to fetch ${targetUrl}:`, error);
        return {
            statusCode: 500,
            headers: headers,
            body: `Internal server error: Could not fetch content. Details: ${error.message}`,
        };
    }
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractYouTubeId = extractYouTubeId;
exports.isDirectVideoUrl = isDirectVideoUrl;
exports.resolveVideoMetadata = resolveVideoMetadata;
exports.searchYouTube = searchYouTube;
/**
 * Extracts YouTube video ID from various link formats
 */
function extractYouTubeId(urlOrId) {
    const trimmed = urlOrId.trim();
    // If already an 11-character ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }
    // Common YouTube URL regex patterns
    const patterns = [
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
        /youtube\.com\/live\/([\w-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}
/**
 * Checks if a URL points to a direct video file or stream
 */
function isDirectVideoUrl(url) {
    const cleanUrl = url.split('?')[0].toLowerCase();
    return (cleanUrl.endsWith('.mp4') ||
        cleanUrl.endsWith('.webm') ||
        cleanUrl.endsWith('.m3u8') ||
        cleanUrl.endsWith('.ogg') ||
        cleanUrl.endsWith('.mov'));
}
/**
 * Resolves video details from a URL (YouTube or Direct Video)
 */
async function resolveVideoMetadata(input, addedBy = 'User') {
    const trimmed = input.trim();
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
        const canonicalUrl = `https://www.youtube.com/watch?v=${ytId}`;
        let title = `YouTube Video (${ytId})`;
        let author = 'YouTube';
        const thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        try {
            // Use YouTube oEmbed API (official, fast, free, no API key required)
            const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`);
            if (res.ok) {
                const data = (await res.json());
                if (data.title)
                    title = data.title;
                if (data.author_name)
                    author = data.author_name;
            }
        }
        catch {
            // Fallback to default title if network fails
        }
        return {
            id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            url: canonicalUrl,
            source: 'youtube',
            videoId: ytId,
            title,
            thumbnail,
            channelTitle: author,
            addedBy,
            addedAt: Date.now(),
        };
    }
    if (isDirectVideoUrl(trimmed) || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const filename = trimmed.split('/').pop()?.split('?')[0] || 'Direct Stream';
        return {
            id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            url: trimmed,
            source: 'direct',
            title: decodeURIComponent(filename),
            thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=60',
            addedBy,
            addedAt: Date.now(),
        };
    }
    return null;
}
/**
 * In-app YouTube search without requiring an API key.
 * Queries YouTube public search suggestions and scrape for instant search.
 */
async function searchYouTube(query) {
    if (!query || query.trim().length === 0)
        return [];
    try {
        const endpoint = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
        const res = await fetch(endpoint, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });
        if (!res.ok)
            return [];
        const html = await res.text();
        // Parse ytInitialData from the response HTML
        const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/window\["ytInitialData"\] = ({.*?});<\/script>/s);
        if (!match || !match[1])
            return [];
        const data = JSON.parse(match[1]);
        const results = [];
        // Traverse the parsed JSON structure to find videoRenderer items
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
            ?.itemSectionRenderer?.contents;
        if (Array.isArray(contents)) {
            for (const item of contents) {
                const v = item.videoRenderer;
                if (v && v.videoId && v.title?.runs?.[0]?.text) {
                    const videoId = v.videoId;
                    const title = v.title.runs[0].text;
                    const thumbnail = v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
                        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    const channelTitle = v.ownerText?.runs?.[0]?.text || 'YouTube';
                    const durationText = v.lengthText?.simpleText || '';
                    results.push({
                        videoId,
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        title,
                        thumbnail,
                        channelTitle,
                        source: 'youtube',
                    });
                    if (results.length >= 10)
                        break;
                }
            }
        }
        return results;
    }
    catch (err) {
        console.error('[Search] Failed to search YouTube:', err);
        return [];
    }
}

// app/.well-known/assetlinks.json/route.ts
// Android App Links verification endpoint.
//
// When your friend's phone sees a https://treno.fun/challenges/... link,
// Android checks https://treno.fun/.well-known/assetlinks.json to verify
// that the treno.fun app is allowed to handle these URLs.
//
// Without this file, Android will always open the link in the browser
// instead of your app.

import { NextResponse } from "next/server";

export async function GET() {
    const assetLinks = [
        {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
                namespace: "android_app",
                package_name: "com.treno.fun",
                // SHA-256 fingerprint of your app's signing certificate.
                // For debug builds, get it by running:
                //   cd treno-mobile/android
                //   ./gradlew signingReport
                // Look for "SHA-256" under "debug" variant.
                //
                // For production builds via EAS Build, get it from:
                //   eas credentials --platform android
                //
                // You can list multiple fingerprints (debug + production).
                sha256_cert_fingerprints: [
                    // REPLACE with your actual SHA-256 fingerprint(s)
                    "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C",
                    // Add production fingerprint here when you have it:
                    // "YOUR_PRODUCTION_SHA256_HERE",
                ],
            },
        },
    ];

    return NextResponse.json(assetLinks, {
        headers: {
            "Content-Type": "application/json",
            // Cache for 1 hour — Android caches this aggressively anyway
            "Cache-Control": "public, max-age=3600",
        },
    });
}
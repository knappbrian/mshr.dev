const { pathToRegexp } = require('path-to-regexp');

const paths = [
    '*',
    '(.*)',
    '{/*path}',
    '/:path*',
    '/:path(.*)',
    /(.*)/,
    /.*/
];

paths.forEach(path => {
    try {
        console.log(`Testing path: ${path} (${typeof path})`);
        if (path instanceof RegExp) {
            console.log(`  Success! (RegExp is supported directly by Express)`);
        } else {
            const keys = [];
            const re = pathToRegexp(path, keys);
            console.log(`  Success! Regex: ${re}`);
        }
    } catch (e) {
        console.log(`  Failed: ${e.message}`);
    }
});

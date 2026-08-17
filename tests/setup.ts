// TODO: When NodeJS v26 becomes LTS (and DigitalOcean supports it), then we
// shouldn't need the temporal-polyfill anymore. This means:
// - Delete this entire file.
// - Delete vitest.config.js
// - Delete all other references to temporal-polyfill.

import "temporal-polyfill/global";

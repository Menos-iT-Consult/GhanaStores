/**
 * DiDwa - Platform Admin Routes (entry point).
 *
 * The super admin API now lives in routes/admin/, split by domain so each file
 * owns one surface. This file only re-exports the assembled router, so
 * server.js keeps mounting a single /api/admin router - moving the mount point
 * would be a needless breaking change for every admin client.
 */
export { default } from './admin/index.js';

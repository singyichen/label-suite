/**
 * Public entry point of the `health` feature (FR-014).
 *
 * Everything outside the feature — today only the route tree — must import
 * from here rather than reaching into `pages/` or any other internal folder,
 * so the feature's internal layout stays free to change.
 */
export { HealthCheckPage } from './pages/HealthCheckPage';

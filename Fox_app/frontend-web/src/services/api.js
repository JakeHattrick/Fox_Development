import axios from "axios";

// Create a reusable Axios instance
const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// ========================
// Fixtures CRUD
// ========================
export const getFixtures = () => API.get("/fixtures");
export const getFixtureById = (id) => API.get(`/fixtures/${id}`);
export const createFixture = (data) => API.post("/fixtures", data);
export const updateFixture = (id, data) => API.patch(`/fixtures/${id}`, data);
export const deleteFixture = (id) => API.delete(`/fixtures/${id}`);
export const getBTesters = () => API.get("/fixtures/btesters");
export const getEligibleBTesters = (slotType) =>
  API.get(`/fixtures/available-parents?slot=${slotType}`);

// ========================
// Fixture Maintenance CRUD
// ========================
export const getAllMaintenance = () => API.get("/fixture-maintenance");
export const getMaintenanceById = (id) => API.get(`/fixture-maintenance/${id}`);
export const createMaintenance = (data) => API.post("/fixture-maintenance", data);
export const updateMaintenance = (id, data) => API.patch(`/fixture-maintenance/${id}`, data);
export const deleteMaintenance = (id) => API.delete(`/fixture-maintenance/${id}`);

// ========================
// Fixture Parts CRUD
// ========================
export const getFixtureParts = () => API.get("/fixture-parts");
export const getFixturePartById = (id) => API.get(`/fixture-parts/${id}`);
export const createFixtureParts = (data) => API.post("/fixture-parts", data);
export const updateFixtureParts = (id, data) => API.patch(`/fixture-parts/${id}`, data);
export const deleteFixtureParts = (id) => API.delete(`/fixture-parts/${id}`);

// ========================
// Health CRUD
// ========================
export const getAllHealth = () => API.get("/health");
export const getHealthById = (id) => API.get(`/health/${id}`);
export const createHealth = (data) => API.post("/health", data);
export const updateHealth = (id, data) => API.patch(`/health/${id}`, data);
export const deleteHealth = (id) => API.delete(`/health/${id}`);
// Health Summary (computed)
export const getHealthSummaryAll = () => API.get("/health/summary");
export const getHealthSummaryByFixture = (fixtureId) =>
  API.get(`/health/summary/${fixtureId}`);

// ========================
// Usage CRUD
// ========================
export const getAllUsage = () => API.get("/usage");
export const getUsageById = (id) => API.get(`/usage/${id}`);
export const createUsage = (data) => API.post("/usage", data);
export const updateUsage = (id, data) => API.patch(`/usage/${id}`, data);
export const deleteUsage = (id) => API.delete(`/usage/${id}`);


// ========================
// Export Axios instance
// ========================
export default API;
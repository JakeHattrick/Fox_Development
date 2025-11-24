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
export const updateFixture = (id, data) => API.put(`/fixtures/${id}`, data);
export const deleteFixture = (id) => API.delete(`/fixtures/${id}`);
export const getBTesters = () => API.get("/fixtures/btesters");
export const getEligibleBTesters = (slotType) =>
  API.get(`/fixtures/available-parents?slot=${slotType}`);

// ========================
// Export Axios instance
// ========================
export default API;
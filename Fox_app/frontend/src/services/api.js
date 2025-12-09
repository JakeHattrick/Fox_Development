import axios from "axios";

// Create a reusable Axios instance
const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Export your API calls using the Axios instance
export const getFixtures = () => API.get("/fixtures");
export const getHealth = () => API.get("/health");
export const getMaintenance = () => API.get("/fixture-maintenance");
export const getUsage = () => API.get("/usage");
export const getUsers = () => API.get("/users");

// Export the Axios instance as default
// THIS LINE FIXES "import API from '../../services/api'"
export default API;

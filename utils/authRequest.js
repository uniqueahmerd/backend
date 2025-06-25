import axios from "axios";

export const fetchProtectedData = async (url) => {
  const token = localStorage.getItem("token"); // Retrieve token from localStorage

  if (!token) {
    console.error("No token found. Please log in again.");
    throw new Error("No token found");
  }

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`, // Include token in Authorization header
      },
    });

    return response.data; // Return the response data
  } catch (error) {
    console.error(
      "Error fetching protected data:",
      error.response || error.message
    );
    throw error.response?.data || error.message; // Throw the error for further handling
  }
};

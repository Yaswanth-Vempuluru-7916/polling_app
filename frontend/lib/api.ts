// lib/api.ts
import axios, { AxiosResponse } from 'axios';

// Base URL for your Rust backend
const API_BASE_URL = 'http://localhost:8080';

// Configure axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies for session authentication
});

// Interface for poll creation data
interface CreatePollData {
  title: string;
  options: string[];
}

// Interface for poll response (adjust based on backend response)
interface PollResponse {
  id: string; // Assuming the backend returns a poll ID
  title: string;
  options: string[];
  creatorId: string;
}

// Create a new poll
export const createPoll = async (pollData: CreatePollData): Promise<PollResponse> => {
  try {
    const response: AxiosResponse<PollResponse> = await api.post('/api/polls', pollData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to create poll');
    }
    throw new Error('An unexpected error occurred');
  }
};

// Export the api instance for direct use if needed
export default api;
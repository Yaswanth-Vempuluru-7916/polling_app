// lib/api.ts
import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

interface CreatePollData {
  title: string;
  options: string[];
}

interface PollResponse {
  id: string;
  title: string;
  options: { id: number; text: string; votes: number }[];
  isClosed: boolean; // Matches backend serialization
}

export const createPoll = async (pollData: CreatePollData): Promise<PollResponse> => {
  try {
    const response: AxiosResponse<PollResponse> = await api.post('/api/polls', pollData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data || 'Failed to create poll'; // Handle non-JSON responses
      throw new Error(typeof message === 'string' ? message : 'Failed to create poll');
    }
    throw new Error('An unexpected error occurred');
  }
};

export const getPoll = async (pollId: string): Promise<PollResponse> => {
  try {
    const response: AxiosResponse<PollResponse> = await api.get(`/api/polls/${pollId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data || 'Failed to fetch poll');
    }
    throw new Error('An unexpected error occurred');
  }
};

export const voteOnPoll = async (pollId: string, optionId: number): Promise<void> => {
  try {
    await api.post(`/api/polls/${pollId}/vote`, { optionId });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data || 'Failed to submit vote');
    }
    throw new Error('An unexpected error occurred');
  }
};

export default api;
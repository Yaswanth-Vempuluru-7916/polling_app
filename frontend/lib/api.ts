// lib/api.ts
import axios, { AxiosResponse } from 'axios';
import { useAppStore, Poll } from './store';

const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

interface CreatePollData {
  title: string;
  options: string[];
}

interface EditPollData {
  title: string;
  options: string[];
}

export const createPoll = async (pollData: CreatePollData): Promise<Poll> => {
  try {
    const response: AxiosResponse<Poll> = await api.post('/api/polls', pollData);
    useAppStore.getState().updatePoll(response.data);
    return response.data;
  } catch (error) {
    throw handleError(error, 'Failed to create poll');
  }
};

export const getPoll = async (pollId: string): Promise<Poll> => {
  try {
    const response: AxiosResponse<Poll> = await api.get(`/api/polls/${pollId}`);
    useAppStore.getState().updatePoll(response.data);
    return response.data;
  } catch (error) {
    throw handleError(error, 'Failed to fetch poll');
  }
};

export const voteOnPoll = async (pollId: string, optionId: number): Promise<void> => {
  try {
    await api.post(`/api/polls/${pollId}/vote`, { optionId });
  } catch (error) {
    throw handleError(error, 'Failed to submit vote');
  }
};

export const fetchUserPolls = async (): Promise<Poll[]> => {
  try {
    const response: AxiosResponse<Poll[]> = await api.get('/api/polls/manage');
    useAppStore.getState().setPolls(response.data);
    return response.data;
  } catch (error) {
    throw handleError(error, 'Failed to fetch your polls');
  }
};

export const closePoll = async (pollId: string): Promise<void> => {
  try {
    await api.post(`/api/polls/${pollId}/close`);
    const currentPoll = useAppStore.getState().polls.find((p) => p.id === pollId);
    if (currentPoll) {
      useAppStore.getState().updatePoll({ ...currentPoll, isClosed: true });
    }
  } catch (error) {
    throw handleError(error, 'Failed to close poll');
  }
};

export const resetPoll = async (pollId: string): Promise<void> => {
  try {
    await api.post(`/api/polls/${pollId}/reset`);
    const currentPoll = useAppStore.getState().polls.find((p) => p.id === pollId);
    if (currentPoll) {
      useAppStore.getState().updatePoll({
        ...currentPoll,
        options: currentPoll.options.map((opt) => ({ ...opt, votes: 0 })),
      });
    }
  } catch (error) {
    throw handleError(error, 'Failed to reset poll');
  }
};

export const deletePoll = async (pollId: string): Promise<void> => {
  try {
    await api.post(`/api/polls/${pollId}/delete`);
    useAppStore.getState().setPolls(
      useAppStore.getState().polls.filter((p) => p.id !== pollId)
    );
  } catch (error) {
    throw handleError(error, 'Failed to delete poll');
  }
};

export const editPoll = async (pollId: string, pollData: EditPollData): Promise<Poll> => {
  try {
    const response: AxiosResponse<Poll> = await api.post(`/api/polls/${pollId}/edit`, pollData);
    useAppStore.getState().updatePoll(response.data);
    return response.data;
  } catch (error) {
    throw handleError(error, 'Failed to edit poll');
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.get('/api/logout');
    useAppStore.getState().clearState();
  } catch (error) {
    throw handleError(error, 'Failed to logout');
  }
};

function handleError(error: unknown, defaultMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data || defaultMessage;
    return new Error(typeof message === 'string' ? message : defaultMessage);
  }
  return new Error('An unexpected error occurred');
}

export default api;
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
});

export const fetcher = async (url: string) => {
  const { data } = await api.get(url);
  return data;
};

export default api;

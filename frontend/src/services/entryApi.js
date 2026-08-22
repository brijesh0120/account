import axios from "axios";

const API_URL = new URL(
  "api/entries",
  import.meta.env.VITE_API_URL,
).toString();

export const createEntry = async (data) => {
  const response = await axios.post(API_URL, data);
  return response.data;
};

export const getActiveEntries = async () => {
  const response = await axios.get(API_URL);
  return { ...response.data, data: response.data.data.active };
};

export const getSoldEntries = async () => {
  const response = await axios.get(API_URL);
  return { ...response.data, data: response.data.data.sold };
};

export const sellEntry = async (id, sellPrice) => {
  const response = await axios.put(`${API_URL}/${id}/sell`, {
    sellPrice,
  });

  return response.data;
};

export const deleteEntry = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

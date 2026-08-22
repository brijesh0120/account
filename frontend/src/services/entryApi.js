import axios from "axios";

const API_URL = "/api/entries";

export const createEntry = async (data) => {
  const response = await axios.post(API_URL, data);
  return response.data;
};

export const getActiveEntries = async () => {
  const response = await axios.get(`${API_URL}/active`);
  return response.data;
};

export const getSoldEntries = async () => {
  const response = await axios.get(`${API_URL}/sold`);
  return response.data;
};

export const sellEntry = async (id, sellPrice) => {
  const response = await axios.put(`${API_URL}/${id}/sell`, {
    sellPrice,
  });

  return response.data;
};
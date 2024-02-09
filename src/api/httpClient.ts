import axios from 'axios';

export const httpClient = axios.create({
  timeout: 5000,
  responseType: 'json',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

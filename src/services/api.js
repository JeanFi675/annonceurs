import axios from 'axios';

const API_URL = 'https://nocodb.jpcloudkit.fr/api/v2/tables/mz7t9hogvz3ynsm/records';
const VIEW_ID = 'vwu3wskjhi5iatpc';

export const fetchEntities = async () => {
  try {
    const token = import.meta.env.VITE_API_TOKEN;
    if (!token) {
      console.error('API Token is missing! Make sure VITE_API_TOKEN is set.');
      return [];
    }

    const response = await axios.get(API_URL, {
      headers: {
        'xc-token': token,
      },
      params: {
        viewId: VIEW_ID,
        limit: 1000, // Adjust limit as needed
        offset: 0,
      },
    });

    return response.data.list || [];
  } catch (error) {
    console.error('Error fetching entities:', error);
    return [];
  }
};

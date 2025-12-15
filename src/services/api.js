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

export const createEntity = async (data) => {
  try {
    const token = import.meta.env.VITE_API_TOKEN;
    if (!token) {
      console.error('API Token is missing! Make sure VITE_API_TOKEN is set.');
      return null;
    }

    console.log('Sending data to NocoDB:', data);

    const response = await axios.post(API_URL, data, {
      headers: {
        'xc-token': token,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error creating entity:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    throw error;
  }
};

export const updateEntity = async (id, data) => {
  try {
    const token = import.meta.env.VITE_API_TOKEN;
    if (!token) {
      console.error('API Token is missing!');
      return null;
    }

    // NocoDB v2 Bulk Update format: PATCH /records with body { Id: id, ...data }
    const response = await axios.patch(API_URL, { Id: id, ...data }, {
      headers: {
        'xc-token': token,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error updating entity:', error);
    throw error;
  }
};

// --- Tracking Tables APIs ---
// TODO: Replace these VIEW_IDs or TABLE_IDs with actual IDs after NocoDB import
const TRACKING_TABLES = {
  'Encart Pub': { tableId: 'm5bbut4uy8toxt5' },
  'Tombola (Lots)': { tableId: 'mm0pgifcf72rnoj' },
  'Partenaires': { tableId: 'megvc314571rznb' },
  'Mécénat': { tableId: 'm80f7gykd2ubrfk' },
  'Stand': { tableId: 'midotel4vypc65e' }
};

const BASE_API_URL = 'https://nocodb.jpcloudkit.fr/api/v2/tables';

export const fetchTrackingData = async (type) => {
  const config = TRACKING_TABLES[type];
  if (!config) return [];

  try {
    const token = import.meta.env.VITE_API_TOKEN;
    const url = `${BASE_API_URL}/${config.tableId}/records`;

    // We might not have a viewId yet, so just fetch records
    const response = await axios.get(url, {
      headers: { 'xc-token': token },
      params: { limit: 1000, offset: 0 }
    });
    return response.data.list || [];
  } catch (error) {
    console.warn(`Could not fetch tracking data for ${type} (Table ID likely missing)`);
    return [];
  }
};

export const createTrackingRecord = async (type, data) => {
  const config = TRACKING_TABLES[type];
  if (!config) throw new Error(`Unknown type: ${type}`);

  const token = import.meta.env.VITE_API_TOKEN;
  const url = `${BASE_API_URL}/${config.tableId}/records`;

  const response = await axios.post(url, data, {
    headers: { 'xc-token': token, 'Content-Type': 'application/json' }
  });
  return response.data;
};

export const updateTrackingRecord = async (type, id, data) => {
  const config = TRACKING_TABLES[type];
  if (!config) throw new Error(`Unknown type: ${type}`);

  const token = import.meta.env.VITE_API_TOKEN;
  const url = `${BASE_API_URL}/${config.tableId}/records`;

  const response = await axios.patch(url, { Id: id, ...data }, {
    headers: { 'xc-token': token, 'Content-Type': 'application/json' }
  });
  return response.data;
};

export const deleteTrackingRecord = async (type, id) => {
  const config = TRACKING_TABLES[type];
  if (!config) throw new Error(`Unknown type: ${type}`);

  const token = import.meta.env.VITE_API_TOKEN;
  const url = `${BASE_API_URL}/${config.tableId}/records`;

  const response = await axios.delete(url, {
    headers: { 'xc-token': token },
    data: { Id: id } // NocoDB v2 delete requires body with Id
  });
  return response.data;
};
